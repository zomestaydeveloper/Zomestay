/**
 * Property access control utilities
 * Ensures hosts can only access/modify their own properties
 */

/**
 * Verifies property ownership for hosts
 * @param {Object} params
 * @param {PrismaClient} params.prisma - Prisma client instance
 * @param {string} params.propertyId - Property ID
 * @param {Object} params.user - User object from req.user (contains role and id)
 * @returns {Promise<Object>} { ok: boolean, property?: Object, error?: { status: number, message: string } }
 */
const verifyPropertyAccess = async ({ prisma, propertyId, user }) => {
  if (!propertyId) {
    return {
      ok: false,
      error: { status: 400, message: 'Property ID is required' },
    };
  }

  // Fetch property to check ownership
  const property = await prisma.property.findFirst({
    where: { id: propertyId, isDeleted: false },
    select: { id: true, ownerHostId: true },
  });

  if (!property) {
    return {
      ok: false,
      error: { status: 404, message: 'Property not found' },
    };
  }

  // If user is a host, verify ownership
  if (user?.role === 'host' && user?.id) {
    if (property.ownerHostId !== user.id) {
      return {
        ok: false,
        error: {
          status: 403,
          message: 'Access denied. You can only modify your own properties.',
        },
      };
    }
  }

  // Admin can access any property, host can only access their own (already verified)
  return { ok: true, property };
};

module.exports = {
  verifyPropertyAccess,
};

