const createErrorResult = (status, message) => ({
  ok: false,
  status,
  body: {
    success: false,
    message,
  },
});

/**
 * Ensures the current user is allowed to access the specified property.
 *
 * Admins can access every property. Hosts can only access properties they own.
 * All other roles are denied.
 *
 * @param {Object} params
 * @param {import('@prisma/client').PrismaClient} params.prisma
 * @param {string} params.propertyId
 * @param {{ role?: string|null, id?: string|null }} params.user
 * @returns {Promise<{ ok: true, property: any } | { ok: false, status: number, body: any }>}
 */
const ensurePropertyAccess = async ({ prisma, propertyId, user }) => {
  if (!user || !user.role) {
    return createErrorResult(401, 'Authentication required to access this resource.');
  }

  if (!propertyId || typeof propertyId !== 'string') {
    return createErrorResult(400, 'A valid property identifier is required.');
  }

  const property = await prisma.property.findFirst({
    where: {
      id: propertyId,
      isDeleted: false,
    },
    select: {
      id: true,
      title: true,
      status: true,
      ownerHostId: true,
    },
  });

  if (!property) {
    return createErrorResult(404, 'Property not found.');
  }

  if (user.role === 'admin') {
    return { ok: true, property };
  }

  if (user.role === 'host') {
    if (!user.id) {
      return createErrorResult(401, 'Host session is invalid. Please sign in again.');
    }

    if (property.ownerHostId !== user.id) {
      return createErrorResult(
        403,
        'You do not have permission to manage this property.'
      );
    }

    return { ok: true, property };
  }

  return createErrorResult(403, 'You do not have permission to manage this property.');
};

module.exports = {
  ensurePropertyAccess,
};

