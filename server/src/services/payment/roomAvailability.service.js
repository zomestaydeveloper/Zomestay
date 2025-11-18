/**
 * Room Availability Service
 * Handles room blocking, releasing, and status management
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Release holds for an order (delete or mark as deleted)
 * @param {string} orderId - Order ID
 * @param {object} tx - Prisma transaction client (optional)
 * @returns {Promise<number>} - Number of holds released
 */
const releaseOrderHolds = async (orderId, tx = prisma) => {
  if (!orderId) {
    console.warn('⚠️ releaseOrderHolds called without orderId');
    return 0;
  }

  try {
    // Delete blocked availability records for this order
    const result = await tx.availability.deleteMany({
      where: {
        blockedBy: orderId,
        status: 'blocked',
        isDeleted: false,
      },
    });

    console.log(`✅ Released ${result.count} hold(s) for order ${orderId}`);
    return result.count;
  } catch (error) {
    console.error(`❌ Error releasing holds for order ${orderId}:`, error);
    throw error;
  }
};

/**
 * Convert blocked rooms to booked status (for confirmed bookings)
 * @param {string} orderId - Order ID
 * @param {string} bookingId - Booking ID
 * @param {string} bookingNumber - Booking number for logging
 * @param {object} tx - Prisma transaction client
 * @returns {Promise<number>} - Number of rooms converted
 */
const convertBlockedToBooked = async (orderId, bookingId, bookingNumber, tx) => {
  if (!orderId || !bookingId) {
    throw new Error('orderId and bookingId are required');
  }

  try {
    const result = await tx.availability.updateMany({
      where: {
        blockedBy: orderId,
        status: 'blocked',
        isDeleted: false,
      },
      data: {
        status: 'booked',
        reason: `Confirmed booking ${bookingNumber}`,
        blockedBy: bookingId, // Link to booking instead of order
        holdExpiresAt: null, // Clear expiry since booking is confirmed
      },
    });

    console.log(`✅ Converted ${result.count} blocked room(s) to booked for booking ${bookingNumber}`);
    return result.count;
  } catch (error) {
    console.error(`❌ Error converting blocked to booked for order ${orderId}:`, error);
    throw error;
  }
};

/**
 * Get blocked availability records for an order
 * @param {string} orderId - Order ID
 * @param {object} tx - Prisma transaction client (optional)
 * @returns {Promise<Array>} - Array of blocked availability records
 */
const getBlockedAvailability = async (orderId, tx = prisma) => {
  if (!orderId) {
    return [];
  }

  try {
    const blockedAvailability = await tx.availability.findMany({
      where: {
        blockedBy: orderId,
        status: 'blocked',
        isDeleted: false,
      },
      include: {
        room: {
          include: {
            propertyRoomType: {
              select: {
                id: true,
                propertyId: true,
              },
            },
          },
        },
      },
    });

    return blockedAvailability;
  } catch (error) {
    console.error(`❌ Error fetching blocked availability for order ${orderId}:`, error);
    throw error;
  }
};

/**
 * Validate that blocked rooms exist for an order
 * @param {string} orderId - Order ID
 * @param {object} tx - Prisma transaction client (optional)
 * @returns {Promise<{valid: boolean, count: number, message?: string}>}
 */
const validateBlockedRooms = async (orderId, tx = prisma) => {
  if (!orderId) {
    return { valid: false, count: 0, message: 'orderId is required' };
  }

  try {
    const blockedAvailability = await getBlockedAvailability(orderId, tx);

    if (blockedAvailability.length === 0) {
      return {
        valid: false,
        count: 0,
        message: `No blocked rooms found for order ${orderId}`,
      };
    }

    return {
      valid: true,
      count: blockedAvailability.length,
      message: `Found ${blockedAvailability.length} blocked room(s) for order ${orderId}`,
    };
  } catch (error) {
    console.error(`❌ Error validating blocked rooms for order ${orderId}:`, error);
    return {
      valid: false,
      count: 0,
      message: `Error validating blocked rooms: ${error.message}`,
    };
  }
};

module.exports = {
  releaseOrderHolds,
  convertBlockedToBooked,
  getBlockedAvailability,
  validateBlockedRooms,
};

