const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const isTruthy = (value) => {
  if (value === true || value === 'true' || value === 1 || value === '1') return true;
  if (value === false || value === 'false' || value === 0 || value === '0') return false;
  return Boolean(value);
};

const normaliseRules = (input) => {
  if (!input) {
    throw new Error('Cancellation rules are required');
  }

  const parsed = Array.isArray(input) ? input : (() => {
    try {
      return JSON.parse(input);
    } catch (error) {
      throw new Error('Cancellation rules must be a valid array');
    }
  })();

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('At least one cancellation rule is required');
  }

  const rules = parsed.map((rule, index) => {
    if (!rule || typeof rule !== 'object') {
      throw new Error(`Rule ${index + 1}: invalid format`);
    }

    const daysBefore = Number(rule.daysBefore);
    if (!Number.isInteger(daysBefore) || daysBefore < 0) {
      throw new Error(`Rule ${index + 1}: daysBefore must be a non-negative integer`);
    }

    const refundPercentage = Number(rule.refundPercentage);
    if (!Number.isFinite(refundPercentage) || refundPercentage < 0 || refundPercentage > 100) {
      throw new Error(`Rule ${index + 1}: refundPercentage must be between 0 and 100`);
    }

    return {
      daysBefore,
      refundPercentage: Math.round(refundPercentage),
      sortOrder: Number(rule.sortOrder) ?? index,
    };
  });

  rules.sort((a, b) => b.daysBefore - a.daysBefore);

  return rules.map((rule, idx) => ({
    ...rule,
    sortOrder: idx,
  }));
};

const findActivePolicy = async (id) => {
  const policy = await prisma.cancellationPolicy.findUnique({
    where: { id },
    include: {
      rules: {
        orderBy: { sortOrder: 'asc' },
      },
    },
  });

  if (!policy || policy.isDeleted) {
    return null;
  }

  return policy;
};

const CancellationPolicyController = {
  /**
   * Create a new cancellation policy with associated rules.
   * Expected payload:
   * {
   *   name: string (required),
   *   description?: string,
   *   isDefault?: boolean,
   *   rules: Array<{ daysBefore: number, refundPercentage: number, sortOrder?: number }>
   * }
   */
  createCancellationPolicy: async (req, res) => {
    try {
      const { name, description = null, rules } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Policy name is required',
        });
      }

      const normalisedRules = normaliseRules(rules);

      const policy = await prisma.$transaction(async (tx) => {
        const trimmedName = name.trim();

        const existing = await tx.cancellationPolicy.findFirst({
          where: {
            name: trimmedName,
            isDeleted: false,
          },
        });

        if (existing) {
          throw new Error('A cancellation policy with this name already exists');
        }

        const created = await tx.cancellationPolicy.create({
          data: {
            name: trimmedName,
            description: description?.trim() || null,
            rules: {
              create: normalisedRules.map((rule) => ({
                daysBefore: rule.daysBefore,
                refundPercentage: rule.refundPercentage,
                sortOrder: rule.sortOrder,
              })),
            },
          },
          include: {
            rules: {
              orderBy: { sortOrder: 'asc' },
            },
          },
        });

        return created;
      });

      return res.status(201).json({
        success: true,
        message: 'Cancellation policy created successfully',
        data: policy,
      });
    } catch (error) {
      console.error('createCancellationPolicy:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to create cancellation policy',
      });
    }
  },

  /**
   * List cancellation policies with their rules.
   * Supports query params:
   *   includeDeleted (bool) – include soft-deleted policies
   */
  getCancellationPolicies: async (req, res) => {
    try {
      const includeDeleted = isTruthy(req.query.includeDeleted);

      const policies = await prisma.cancellationPolicy.findMany({
        where: includeDeleted ? {} : { isDeleted: false },
        orderBy: { createdAt: 'desc' },
        include: {
          rules: {
            where: includeDeleted ? {} : {},
            orderBy: { sortOrder: 'asc' },
          },
        },
      });

      return res.json({
        success: true,
        data: policies,
      });
    } catch (error) {
      console.error('getCancellationPolicies:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch cancellation policies',
      });
    }
  },

  /**
   * Update an existing cancellation policy.
   */
  updateCancellationPolicy: async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, rules } = req.body;

      const existing = await findActivePolicy(id);
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: 'Cancellation policy not found',
        });
      }

      if (name !== undefined) {
        if (!name || !name.trim()) {
          return res.status(400).json({
            success: false,
            message: 'Policy name cannot be empty',
          });
        }

        const duplicate = await prisma.cancellationPolicy.findFirst({
          where: {
            id: { not: id },
            name: name.trim(),
            isDeleted: false,
          },
        });

        if (duplicate) {
          return res.status(400).json({
            success: false,
            message: 'A cancellation policy with this name already exists',
          });
        }
      }

      const hasRules = rules !== undefined;
      const normalisedRules = hasRules ? normaliseRules(rules) : null;

      const updated = await prisma.$transaction(async (tx) => {
        await tx.cancellationPolicy.update({
          where: { id },
          data: {
            ...(name !== undefined ? { name: name.trim() } : {}),
            ...(description !== undefined
              ? { description: description?.trim() || null }
              : {}),
          },
        });

        if (hasRules) {
          await tx.cancellationPolicyRule.deleteMany({
            where: { cancellationPolicyId: id },
          });

          await tx.cancellationPolicyRule.createMany({
            data: normalisedRules.map((rule, sortOrder) => ({
              cancellationPolicyId: id,
              daysBefore: rule.daysBefore,
              refundPercentage: rule.refundPercentage,
              sortOrder,
            })),
          });
        }

        return tx.cancellationPolicy.findUnique({
          where: { id },
          include: {
            rules: {
              orderBy: { sortOrder: 'asc' },
            },
          },
        });
      });

      return res.json({
        success: true,
        message: 'Cancellation policy updated successfully',
        data: updated,
      });
    } catch (error) {
      console.error('updateCancellationPolicy:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to update cancellation policy',
      });
    }
  },

  /**
   * Soft delete a cancellation policy.
   */
  deleteCancellationPolicy: async (req, res) => {
    try {
      const { id } = req.params;

      const existing = await findActivePolicy(id);
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: 'Cancellation policy not found',
        });
      }

      const linkedProperties = await prisma.property.count({
        where: {
          cancellationPolicyId: id,
          isDeleted: false,
        },
      });

      if (linkedProperties > 0) {
        return res.status(400).json({
          success: false,
          message:
            'Cannot delete this policy while it is assigned to active properties',
        });
      }

      await prisma.cancellationPolicy.update({
        where: { id },
        data: {
          isDeleted: true,
        },
      });

      return res.json({
        success: true,
        message: 'Cancellation policy deleted successfully',
      });
    } catch (error) {
      console.error('deleteCancellationPolicy:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to delete cancellation policy',
      });
    }
  },
};

module.exports = CancellationPolicyController;
