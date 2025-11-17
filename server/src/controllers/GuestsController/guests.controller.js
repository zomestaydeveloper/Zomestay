const { PrismaClient } = require('@prisma/client');
const { sendSuccess, sendError } = require('../../utils/response.utils');
const { verifyPropertyAccess } = require('../adminController/propertyAccess.utils');
const prisma = new PrismaClient();

// UUID regex pattern for validation
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Check if a string is a valid UUID
 * @param {string} str - String to check
 * @returns {boolean} True if string is a valid UUID
 */
const isValidUUID = (str) => {
  return UUID_REGEX.test(str);
};

/**
 * Get all guests (Admin only - from all properties)
 * Groups bookings by guest email/phone to get unique guests
 */
const getAllGuests = async (req, res) => {
  try {
    // Get all bookings with guest information (optimized select - only needed fields)
    const bookings = await prisma.booking.findMany({
      where: {
        isDeleted: false,
        property: {
          isDeleted: false,
        },
      },
      select: {
        id: true,
        guestName: true,
        guestEmail: true,
        guestPhone: true,
        propertyId: true,
        property: {
          select: {
            id: true,
            title: true,
          },
        },
        userId: true,
        user: {
          select: {
            id: true,
            status: true,
            email: true,
            phone: true,
          },
        },
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Group bookings by guest email (primary key for guest identification)
    const guestsMap = new Map();

    bookings.forEach((booking) => {
      const email = booking.guestEmail.toLowerCase().trim();
      const phone = booking.guestPhone?.trim() || '';

      // Use email as primary key, fallback to phone if email is not unique
      const key = email || phone;

      if (!guestsMap.has(key)) {
        // Get user status if user exists
        const isBlocked = booking.user?.status === 'blocked' || false;

        // Use userId if exists, else use email as guestId (for guests without User account)
        const guestId = booking.userId || booking.guestEmail;

        guestsMap.set(key, {
          guestId, // Use userId if exists, else use email
          guestName: booking.guestName,
          guestEmail: booking.guestEmail,
          guestPhone: booking.guestPhone,
          isBlocked,
          userId: booking.userId || null,
          properties: [],
          totalBookings: 0,
          lastBookingDate: booking.createdAt,
        });
      }

      const guest = guestsMap.get(key);

      // Add property if not already added
      const propertyExists = guest.properties.some(
        (p) => p.propertyId === booking.propertyId
      );
      if (!propertyExists && booking.property) {
        guest.properties.push({
          propertyId: booking.property.id,
          propertyTitle: booking.property.title,
        });
      }

      guest.totalBookings += 1;

      // Update last booking date if this booking is newer
      if (new Date(booking.createdAt) > new Date(guest.lastBookingDate)) {
        guest.lastBookingDate = booking.createdAt;
      }
    });

    // Convert map to array
    const guests = Array.from(guestsMap.values());

    return sendSuccess(res, guests, 'Guests retrieved successfully');
  } catch (error) {
    console.error('Error fetching all guests:', error);
    return sendError(res, 'Failed to fetch guests', 500);
  }
};

/**
 * Get guests for a specific property (Host only)
 * Groups bookings by guest email/phone for the given property
 */
const getPropertyGuests = async (req, res) => {
  try {
    const { propertyId } = req.params;
    const user = req.user; // From extractRole middleware

    // Validate property ID
    if (!propertyId) {
      return sendError(res, 'Property ID is required', 400);
    }

    // Verify property access (host can only see their own property guests)
    if (user?.role === 'host') {
      const accessCheck = await verifyPropertyAccess({
        prisma,
        propertyId,
        user,
      });

      if (!accessCheck.ok) {
        return sendError(res, accessCheck.error.message, accessCheck.error.status);
      }
    }

    // Check if property exists
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { id: true, title: true },
    });

    if (!property) {
      return sendError(res, 'Property not found', 404);
    }

    // Get all bookings for this property (optimized select - only needed fields)
    const bookings = await prisma.booking.findMany({
      where: {
        propertyId,
        isDeleted: false,
      },
      select: {
        id: true,
        guestName: true,
        guestEmail: true,
        guestPhone: true,
        userId: true,
        user: {
          select: {
            id: true,
            status: true,
            email: true,
            phone: true,
          },
        },
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Group bookings by guest email (primary key for guest identification)
    const guestsMap = new Map();

    bookings.forEach((booking) => {
      const email = booking.guestEmail.toLowerCase().trim();
      const phone = booking.guestPhone?.trim() || '';
      const key = email || phone;

      if (!guestsMap.has(key)) {
        // Get user status if user exists
        const isBlocked = booking.user?.status === 'blocked' || false;

        // Use userId if exists, else use email as guestId (for guests without User account)
        const guestId = booking.userId || booking.guestEmail;

        guestsMap.set(key, {
          guestId, // Use userId if exists, else use email
          guestName: booking.guestName,
          guestEmail: booking.guestEmail,
          guestPhone: booking.guestPhone,
          isBlocked,
          userId: booking.userId || null,
          totalBookings: 0,
          lastBookingDate: booking.createdAt,
        });
      }

      const guest = guestsMap.get(key);
      guest.totalBookings += 1;

      // Update last booking date if this booking is newer
      if (new Date(booking.createdAt) > new Date(guest.lastBookingDate)) {
        guest.lastBookingDate = booking.createdAt;
      }
    });

    // Convert map to array
    const guests = Array.from(guestsMap.values());

    return sendSuccess(res, guests, 'Property guests retrieved successfully');
  } catch (error) {
    console.error('Error fetching property guests:', error);
    return sendError(res, 'Failed to fetch property guests', 500);
  }
};

/**
 * Block a guest
 * Updates User status to 'blocked' if user exists
 * For guests without User account, we track block status separately (could use a blocked_guests table in future)
 * Host can only block guests who have booked their properties
 */
const blockGuest = async (req, res) => {
  try {
    const { guestId } = req.params;
    const user = req.user; // From extractRole middleware

    if (!guestId) {
      return sendError(res, 'Guest ID is required', 400);
    }

    // If host, verify that guest has booked their property
    if (user?.role === 'host' && user?.id) {
      // Check if guest has any bookings with host's properties
      const hostProperties = await prisma.property.findMany({
        where: {
          ownerHostId: user.id,
          isDeleted: false,
        },
        select: { id: true },
      });

      const propertyIds = hostProperties.map((p) => p.id);

      if (propertyIds.length === 0) {
        return sendError(res, 'No properties found for this host', 404);
      }

      // Check if guest has bookings with host's properties
      // guestId can be userId (UUID) or guest email
      const isUserId = isValidUUID(guestId);

      const guestBookings = await prisma.booking.findFirst({
        where: {
          OR: isUserId
            ? [{ userId: guestId }]
            : [{ guestEmail: guestId }],
          propertyId: { in: propertyIds },
          isDeleted: false,
        },
      });

      if (!guestBookings) {
        return sendError(res, 'Access denied. You can only block guests who have booked your properties.', 403);
      }
    }

    // Check if guestId is a valid UUID (userId) or guest email
    const isUserId = isValidUUID(guestId);

    if (isUserId) {
      // Update User status by userId
      const dbUser = await prisma.user.findUnique({
        where: { id: guestId },
      });

      if (!dbUser) {
        return sendError(res, 'User not found', 404);
      }

      await prisma.user.update({
        where: { id: guestId },
        data: { status: 'blocked' },
      });

      return sendSuccess(res, { guestId, status: 'blocked' }, 'Guest blocked successfully');
    } else {
      // Guest without User account - try to find user by email
      const dbUser = await prisma.user.findUnique({
        where: { email: guestId },
      });

      if (dbUser) {
        // User exists with this email, update status
        await prisma.user.update({
          where: { id: dbUser.id },
          data: { status: 'blocked' },
        });

        return sendSuccess(res, { guestId: dbUser.id, status: 'blocked' }, 'Guest blocked successfully');
      } else {
        // Guest without User account - for now, return error
        // In future, we can create a blocked_guests table to track these
        return sendError(res, 'Cannot block guest without user account. Guest must register first.', 400);
      }
    }
  } catch (error) {
    console.error('Error blocking guest:', error);
    return sendError(res, 'Failed to block guest', 500);
  }
};

/**
 * Unblock a guest
 * Updates User status to 'active' if user exists
 * Host can only unblock guests who have booked their properties
 */
const unblockGuest = async (req, res) => {
  try {
    const { guestId } = req.params;
    const user = req.user; // From extractRole middleware

    if (!guestId) {
      return sendError(res, 'Guest ID is required', 400);
    }

    // If host, verify that guest has booked their property
    if (user?.role === 'host' && user?.id) {
      // Check if guest has any bookings with host's properties
      const hostProperties = await prisma.property.findMany({
        where: {
          ownerHostId: user.id,
          isDeleted: false,
        },
        select: { id: true },
      });

      const propertyIds = hostProperties.map((p) => p.id);

      if (propertyIds.length === 0) {
        return sendError(res, 'No properties found for this host', 404);
      }

      // Check if guest has bookings with host's properties
      // guestId can be userId (UUID) or guest email
      const isUserId = isValidUUID(guestId);

      const guestBookings = await prisma.booking.findFirst({
        where: {
          OR: isUserId
            ? [{ userId: guestId }]
            : [{ guestEmail: guestId }],
          propertyId: { in: propertyIds },
          isDeleted: false,
        },
      });

      if (!guestBookings) {
        return sendError(res, 'Access denied. You can only unblock guests who have booked your properties.', 403);
      }
    }

    // Check if guestId is a valid UUID (userId) or guest email
    const isUserId = isValidUUID(guestId);

    if (isUserId) {
      // Update User status by userId
      const dbUser = await prisma.user.findUnique({
        where: { id: guestId },
      });

      if (!dbUser) {
        return sendError(res, 'User not found', 404);
      }

      await prisma.user.update({
        where: { id: guestId },
        data: { status: 'active' },
      });

      return sendSuccess(res, { guestId, status: 'active' }, 'Guest unblocked successfully');
    } else {
      // Guest without User account - try to find user by email
      const dbUser = await prisma.user.findUnique({
        where: { email: guestId },
      });

      if (dbUser) {
        // User exists with this email, update status
        await prisma.user.update({
          where: { id: dbUser.id },
          data: { status: 'active' },
        });

        return sendSuccess(res, { guestId: dbUser.id, status: 'active' }, 'Guest unblocked successfully');
      } else {
        // Guest without User account - for now, return error
        return sendError(res, 'Cannot unblock guest without user account. Guest must register first.', 400);
      }
    }
  } catch (error) {
    console.error('Error unblocking guest:', error);
    return sendError(res, 'Failed to unblock guest', 500);
  }
};

/**
 * Toggle block status of a guest
 * Host can only toggle block status for guests who have booked their properties
 */
const toggleBlockGuest = async (req, res) => {
  try {
    const { guestId } = req.params;
    const user = req.user; // From extractRole middleware

    if (!guestId) {
      return sendError(res, 'Guest ID is required', 400);
    }

    // If host, verify that guest has booked their property
    if (user?.role === 'host' && user?.id) {
      // Check if guest has any bookings with host's properties
      const hostProperties = await prisma.property.findMany({
        where: {
          ownerHostId: user.id,
          isDeleted: false,
        },
        select: { id: true },
      });

      const propertyIds = hostProperties.map((p) => p.id);

      if (propertyIds.length === 0) {
        return sendError(res, 'No properties found for this host', 404);
      }

      // Check if guest has bookings with host's properties
      // guestId can be userId (UUID) or guest email
      const isUserId = isValidUUID(guestId);

      const guestBookings = await prisma.booking.findFirst({
        where: {
          OR: isUserId
            ? [{ userId: guestId }]
            : [{ guestEmail: guestId }],
          propertyId: { in: propertyIds },
          isDeleted: false,
        },
      });

      if (!guestBookings) {
        return sendError(res, 'Access denied. You can only toggle block status for guests who have booked your properties.', 403);
      }
    }

    // Check if guestId is a valid UUID (userId) or guest email
    const isUserId = isValidUUID(guestId);

    if (isUserId) {
      // Get current user status by userId
      const dbUser = await prisma.user.findUnique({
        where: { id: guestId },
        select: { id: true, status: true },
      });

      if (!dbUser) {
        return sendError(res, 'User not found', 404);
      }

      // Toggle status
      const newStatus = dbUser.status === 'blocked' ? 'active' : 'blocked';

      await prisma.user.update({
        where: { id: guestId },
        data: { status: newStatus },
      });

      return sendSuccess(
        res,
        { guestId, status: newStatus },
        `Guest ${newStatus === 'blocked' ? 'blocked' : 'unblocked'} successfully`
      );
    } else {
      // Guest without User account - try to find user by email
      const dbUser = await prisma.user.findUnique({
        where: { email: guestId },
        select: { id: true, status: true },
      });

      if (dbUser) {
        // User exists with this email, toggle status
        const newStatus = dbUser.status === 'blocked' ? 'active' : 'blocked';

        await prisma.user.update({
          where: { id: dbUser.id },
          data: { status: newStatus },
        });

        return sendSuccess(
          res,
          { guestId: dbUser.id, status: newStatus },
          `Guest ${newStatus === 'blocked' ? 'blocked' : 'unblocked'} successfully`
        );
      } else {
        // Guest without User account
        return sendError(res, 'Cannot toggle block status for guest without user account. Guest must register first.', 400);
      }
    }
  } catch (error) {
    console.error('Error toggling guest block status:', error);
    return sendError(res, 'Failed to toggle guest block status', 500);
  }
};

module.exports = {
  getAllGuests,
  getPropertyGuests,
  blockGuest,
  unblockGuest,
  toggleBlockGuest,
};

