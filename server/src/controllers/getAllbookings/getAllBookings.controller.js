const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const SUPPORTED_ROLES = new Set(['admin', 'host', 'user', 'agent']);

const parseDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const buildPagination = (page, limit, total) => {
  const safeTotal = Number.isFinite(total) && total > 0 ? total : 0;
  const safeLimit = Number.isFinite(limit) && limit > 0 ? limit : DEFAULT_LIMIT;
  const pages = Math.max(1, Math.ceil(safeTotal / safeLimit));

  return {
    page,
    limit: safeLimit,
    total: safeTotal,
    pages,
    hasNext: page < pages,
    hasPrev: page > 1,
  };
};

const normalizeRole = (value) => {
  if (!value) return '';
  return String(value).trim().toLowerCase();
};

const respondWithEmpty = (res, page, limit) =>
  res.json({
    success: true,
    data: [],
    pagination: buildPagination(page, limit, 0),
  });

const getAllBookings = async (req, res) => {
  try {
    const rawPage = parseInt(req.query.page, 10);
    const rawLimit = parseInt(req.query.limit, 10);

    const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
    const limit = Number.isFinite(rawLimit)
      ? Math.max(1, Math.min(rawLimit, MAX_LIMIT))
      : DEFAULT_LIMIT;
    const skip = (page - 1) * limit;

    const normalizedRole = normalizeRole(req.query.role || req.user?.role);
    const entityId = req.query.entityId || req.query.id || req.user?.id || null;

    if (!normalizedRole || !SUPPORTED_ROLES.has(normalizedRole)) {
      return res.status(400).json({
        success: false,
        message: 'A valid role is required to fetch bookings.',
      });
    }

    const {
      status,
      search: rawSearch,
      startDate: rawStartDate,
      endDate: rawEndDate,
      propertyId: rawPropertyId,
    } = req.query;

    const search = typeof rawSearch === 'string' ? rawSearch.trim() : '';
    const propertyId = typeof rawPropertyId === 'string' ? rawPropertyId.trim() : '';

    const where = {
      isDeleted: false,
      property: {
        is: {
          isDeleted: false,
        },
      },
    };

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { guestName: { contains: search } },
        { guestEmail: { contains: search } },
        {
          property: {
            is: {
              title: { contains: search },
            },
          },
        },
      ];
    }

    const startDate = parseDate(rawStartDate);
    const endDate = parseDate(rawEndDate);

    if (startDate || endDate) {
      where.startDate = {};
      if (startDate) {
        where.startDate.gte = startDate;
      }
      if (endDate) {
        where.startDate.lte = endDate;
      }
      if (Object.keys(where.startDate).length === 0) {
        delete where.startDate;
      }
    }

    let propertyFilterIds = propertyId ? [propertyId] : null;

    if (normalizedRole === 'user') {
      if (!entityId) {
        return res.status(400).json({
          success: false,
          message: 'User identifier is required to view bookings.',
        });
      }
      where.userId = entityId;
    } else if (normalizedRole === 'agent') {
      if (!entityId) {
        return res.status(400).json({
          success: false,
          message: 'Agent identifier is required to view bookings.',
        });
      }
      where.order = {
        is: {
          createdByType: 'agent',
          createdById: entityId,
        },
      };
    } else if (normalizedRole === 'host') {
      if (!entityId) {
        return res.status(400).json({
          success: false,
          message: 'Host identifier is required to view bookings.',
        });
      }

      const hostProperties = await prisma.property.findMany({
        where: {
          ownerHostId: entityId,
          isDeleted: false,
        },
        select: { id: true },
      });

      const hostPropertyIds = hostProperties.map((property) => property.id);

      if (hostPropertyIds.length === 0) {
        return respondWithEmpty(res, page, limit);
      }

      if (propertyFilterIds) {
        const accessible = propertyFilterIds.filter((id) => hostPropertyIds.includes(id));
        if (accessible.length === 0) {
          return res.status(403).json({
            success: false,
            message: 'You do not have permission to view bookings for the selected property.',
          });
        }
        propertyFilterIds = accessible;
      } else {
        propertyFilterIds = hostPropertyIds;
      }
    }

    if (propertyFilterIds && propertyFilterIds.length > 0) {
      where.propertyId = propertyFilterIds.length === 1
        ? propertyFilterIds[0]
        : { in: propertyFilterIds };
    }

    const [total, bookings] = await Promise.all([
      prisma.booking.count({ where }),
      prisma.booking.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          // Essential booking fields
          id: true,
          bookingNumber: true,
          
          // Guest details
          guestName: true,
          guestEmail: true,
          guestPhone: true,
          
          // Property details
          property: {
            select: {
              id: true,
              title: true,
            },
          },
          
          // Dates and nights
          startDate: true,
          endDate: true,
          nights: true,
          
          // Guest count
          totalGuests: true,
          
          // Total amount
          totalAmount: true,
          
          // Payment status
          paymentStatus: true,
          
          // Booking status
          status: true,
          
          // Room selections with room types, rooms, and meal plans
          bookingRoomSelections: {
            select: {
              id: true,
              roomTypeName: true,
              rooms: true, // Number of rooms
              guests: true,
              children: true,
              roomIds: true, // JSON array of room IDs
              mealPlan: {
                select: {
                  id: true,
                  name: true,
                  kind: true,
                },
              },
              roomType: {
                select: {
                  id: true,
                  roomType: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
    ]);

    // Collect all unique room IDs from bookingRoomSelections
    const roomIdsSet = new Set();
    bookings.forEach((booking) => {
      if (booking.bookingRoomSelections && Array.isArray(booking.bookingRoomSelections)) {
        booking.bookingRoomSelections.forEach((selection) => {
          const roomIds = Array.isArray(selection.roomIds)
            ? selection.roomIds
            : typeof selection.roomIds === 'string'
            ? JSON.parse(selection.roomIds || '[]')
            : [];
          roomIds.forEach((roomId) => {
            if (roomId) roomIdsSet.add(roomId);
          });
        });
      }
    });

    // Fetch all rooms in one query (only name needed)
    const roomIdsArray = Array.from(roomIdsSet);
    const roomsMap = new Map();
    if (roomIdsArray.length > 0) {
      const rooms = await prisma.room.findMany({
        where: {
          id: { in: roomIdsArray },
          isDeleted: false,
        },
        select: {
          id: true,
          name: true,
        },
      });

      rooms.forEach((room) => {
        roomsMap.set(room.id, room);
      });
    }

    // Format response with only essential details
    const formattedBookings = bookings.map((booking) => {
      // Format bookingRoomSelections with rooms and meal plan
      const roomSelections = booking.bookingRoomSelections?.map((selection) => {
        const roomIds = Array.isArray(selection.roomIds)
          ? selection.roomIds
          : typeof selection.roomIds === 'string'
          ? JSON.parse(selection.roomIds || '[]')
          : [];

        // Get room names for each room ID
        const roomNames = roomIds
          .map((roomId) => {
            const room = roomsMap.get(roomId);
            return room ? room.name : null;
          })
          .filter((name) => name !== null);

        return {
          roomType: selection.roomType?.roomType?.name || selection.roomTypeName,
          rooms: roomNames, // Array of room names
          guests: selection.guests,
          children: selection.children || 0,
          mealPlan: selection.mealPlan ? {
            name: selection.mealPlan.name,
            kind: selection.mealPlan.kind,
          } : null,
        };
      }) || [];

      return {
        id: booking.id,
        bookingNumber: booking.bookingNumber,
        guest: {
          name: booking.guestName,
          email: booking.guestEmail,
          phone: booking.guestPhone,
        },
        property: {
          id: booking.property.id,
          name: booking.property.title,
        },
        checkIn: booking.startDate,
        checkOut: booking.endDate,
        nights: booking.nights,
        totalGuests: booking.totalGuests,
        totalAmount: booking.totalAmount,
        paymentStatus: booking.paymentStatus,
        status: booking.status || 'pending', // Booking status for display
        roomSelections, // Array of room selections with room types, rooms, and meal plans
      };
    });

    return res.json({
      success: true,
      data: formattedBookings,
      pagination: buildPagination(page, limit, total),
    });
  } catch (error) {
    console.error('getAllBookings error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load bookings',
    });
  }
};

module.exports = {
  getAllBookings,
};
