 const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const RequestCallbackController = {
  /**
   * Create a new callback request
   * POST /api/callback-requests
   */
  createCallbackRequest: async (req, res) => {
    try {
      const { name, email, phone, notes, propertyId } = req.body;

      // Validation
      if (!name || !phone) {
        return res.status(400).json({
          success: false,
          message: 'Name and phone are required fields'
        });
      }

      // Email validation - if email is provided, validate it
      // If not provided or is a callback placeholder, generate one
      let finalEmail = email;
      if (!email || email.trim() === '' || email.includes('@zomesstay.callback')) {
        // Generate a valid email from phone number for callback-only requests
        const phoneDigits = phone.replace(/[\s-()]/g, '');
        finalEmail = `callback-${Date.now()}-${phoneDigits.slice(-6)}@zomesstay.callback`;
      } else {
        // Validate provided email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid email address'
          });
        }
        finalEmail = email.trim().toLowerCase();
      }

      // Phone validation (10-15 digits)
      const phoneDigits = phone.replace(/[\s-()]/g, '');
      if (!/^[0-9]{10,15}$/.test(phoneDigits)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid phone number. Must be 10-15 digits'
        });
      }

      // Validate propertyId if provided
      if (propertyId) {
        const property = await prisma.property.findFirst({
          where: {
            id: propertyId,
            isDeleted: false
          }
        });

        if (!property) {
          return res.status(404).json({
            success: false,
            message: 'Property not found'
          });
        }
      }

      // Create callback request
      const callbackRequest = await prisma.callbackRequest.create({
        data: {
          name: name.trim(),
          email: finalEmail,
          phone: phoneDigits,
          notes: notes?.trim() || null,
          propertyId: propertyId || null,
          status: 'pending'
        },
        include: {
          property: {
            select: {
              id: true,
              title: true
            }
          }
        }
      });

      res.status(201).json({
        success: true,
        message: 'Callback request submitted successfully. Our team will contact you within 2 hours.',
        data: {
          id: callbackRequest.id,
          name: callbackRequest.name,
          email: callbackRequest.email,
          phone: callbackRequest.phone,
          property: callbackRequest.property,
          status: callbackRequest.status,
          createdAt: callbackRequest.createdAt
        }
      });
    } catch (error) {
      console.error('Create callback request error:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating callback request',
        error: error.message
      });
    }
  },

  /**
   * Get all callback requests (for admin)
   * GET /api/callback-requests
   */
  getAllCallbackRequests: async (req, res) => {
    try {
      const { 
        page = 1, 
        limit = 10,
        status,
        propertyId,
        search
      } = req.query;

      const skip = Math.max(0, (parseInt(page) - 1) * parseInt(limit));
      const take = Math.min(100, Math.max(1, parseInt(limit)));

      // Build where clause
      const where = {
        isDeleted: false,
        ...(status && { status }),
        ...(propertyId && { propertyId }),
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search } }
          ]
        })
      };

      // Get total count
      const total = await prisma.callbackRequest.count({ where });

      // Get callback requests
      const callbackRequests = await prisma.callbackRequest.findMany({
        where,
        skip,
        take,
        orderBy: {
          createdAt: 'desc'
        },
        include: {
          property: {
            select: {
              id: true,
              title: true
            }
          }
        }
      });

      res.json({
        success: true,
        data: callbackRequests,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
          hasNext: skip + take < total,
          hasPrev: skip > 0
        }
      });
    } catch (error) {
      console.error('Get all callback requests error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching callback requests',
        error: error.message
      });
    }
  },

  /**
   * Get a single callback request by ID
   * GET /api/callback-requests/:id
   */
  getCallbackRequestById: async (req, res) => {
    try {
      const { id } = req.params;

      const callbackRequest = await prisma.callbackRequest.findFirst({
        where: {
          id,
          isDeleted: false
        },
        include: {
          property: {
            select: {
              id: true,
              title: true
            }
          }
        }
      });

      if (!callbackRequest) {
        return res.status(404).json({
          success: false,
          message: 'Callback request not found'
        });
      }

      res.json({
        success: true,
        data: callbackRequest
      });
    } catch (error) {
      console.error('Get callback request by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching callback request',
        error: error.message
      });
    }
  },

  /**
   * Update callback request status (for admin)
   * PATCH /api/callback-requests/:id/status
   */
  updateCallbackRequestStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      // Validate status
      const validStatuses = ['pending', 'contacted', 'completed', 'cancelled'];
      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Status must be one of: ${validStatuses.join(', ')}`
        });
      }

      const callbackRequest = await prisma.callbackRequest.findFirst({
        where: {
          id,
          isDeleted: false
        }
      });

      if (!callbackRequest) {
        return res.status(404).json({
          success: false,
          message: 'Callback request not found'
        });
      }

      const updated = await prisma.callbackRequest.update({
        where: { id },
        data: { status },
        include: {
          property: {
            select: {
              id: true,
              title: true
            }
          }
        }
      });

      res.json({
        success: true,
        message: 'Callback request status updated successfully',
        data: updated
      });
    } catch (error) {
      console.error('Update callback request status error:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating callback request status',
        error: error.message
      });
    }
  },

  /**
   * Delete callback request (soft delete)
   * DELETE /api/callback-requests/:id
   */
  deleteCallbackRequest: async (req, res) => {
    try {
      const { id } = req.params;

      const callbackRequest = await prisma.callbackRequest.findFirst({
        where: {
          id,
          isDeleted: false
        }
      });

      if (!callbackRequest) {
        return res.status(404).json({
          success: false,
          message: 'Callback request not found'
        });
      }

      await prisma.callbackRequest.update({
        where: { id },
        data: { isDeleted: true }
      });

      res.json({
        success: true,
        message: 'Callback request deleted successfully'
      });
    } catch (error) {
      console.error('Delete callback request error:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting callback request',
        error: error.message
      });
    }
  }
};

module.exports = RequestCallbackController;

