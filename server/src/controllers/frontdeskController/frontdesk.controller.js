const { PrismaClient } = require('@prisma/client');
const { ensurePropertyAccess } = require('./access.utils');
const {
  toDateOnly,
  addDays,
  formatISODate,
  startOfISOWeek,
  clampRange,
  buildDateRange,
  calculateNights,
} = require('../../utils/date.utils');
const { sendSuccess, sendError } = require('../../utils/response.utils');

const prisma = new PrismaClient();

const { normalizeAvailabilityStatus } = require('../../utils/frontdesk.utils');

const FrontDeskController = {
  getFrontDeskBoard: async (req, res) => {
    const { propertyId } = req.params;
    const { from: fromQuery, to: toQuery } = req.query;

    if (!propertyId) {
      return sendError(res, 'Property identifier is required', 400);
    }

    try {
      const accessResult = await ensurePropertyAccess({
        prisma,
        propertyId,
        user: req.user,
      });

      if (!accessResult.ok) {
        return res.status(accessResult.status).json(accessResult.body);
      }

      const property = accessResult.property;
      console.log("property",property)

      const today = toDateOnly(new Date());
      const defaultFrom = startOfISOWeek(today);

      const parsedFrom = fromQuery ? toDateOnly(fromQuery) : defaultFrom;
      if (!parsedFrom) {
        return sendError(res, 'Invalid from date. Expected YYYY-MM-DD', 400);
      }

      const parsedTo = toQuery ? toDateOnly(toQuery) : addDays(parsedFrom, 6);
      if (!parsedTo) {
        return sendError(res, 'Invalid to date. Expected YYYY-MM-DD', 400);
      }

      if (parsedTo < parsedFrom) {
        return sendError(res, 'End date cannot be before start date', 400);
      }

      const rangeEnd = clampRange(parsedFrom, parsedTo);

      const days = buildDateRange(parsedFrom, rangeEnd);
      const dayKeys = days.map(formatISODate);
      const dayKeyIndex = new Map(dayKeys.map((key, index) => [key, index]));

      const propertyRoomTypes = await prisma.propertyRoomType.findMany({
        where: {
          propertyId,
          isDeleted: false,
          isActive: true,
        },
        include: {
          roomType: {
            select: {
              id: true,
              name: true,
            },
          },
          rooms: {
            where: {
              isDeleted: false,
              status: { not: 'inactive' },
            },
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      });

      const roomsFlat = [];
      const roomTypePayloads = propertyRoomTypes.map((prt) => {
        const roomEntries = prt.rooms.map((room) => {
          const label = room.name || room.code || 'Room';
          const descriptor = { id: room.id, label };
          roomsFlat.push({
            ...descriptor,
            propertyRoomTypeId: prt.id,
          });
          return descriptor;
        });

        return {
          id: prt.id,
          roomTypeId: prt.roomType?.id || null,
          name: prt.roomType?.name || 'Room Type',
          rooms: roomEntries,
        };
      });

      const roomIds = roomsFlat.map((room) => room.id);

      let bookings = [];
      let availabilityOverrides = [];

      if (roomIds.length > 0) {
        const rangeStartDate = parsedFrom;
        const rangeEndDateExclusive = addDays(rangeEnd, 1);

        [bookings, availabilityOverrides] = await Promise.all([
          prisma.booking.findMany({
            where: {
              propertyId,
              isDeleted: false,
              status: { in: ['pending', 'confirmed'] },
              startDate: { lt: rangeEndDateExclusive },
              endDate: { gt: rangeStartDate },
            },
            select: {
              id: true,
              bookingNumber: true,
              guestName: true,
              startDate: true,
              endDate: true,
              bookingRoomSelections: {
                select: {
                  id: true,
                  roomIds: true,
                  checkIn: true,
                  checkOut: true,
                },
              },
            },
          }),
          prisma.availability.findMany({
            where: {
              roomId: { in: roomIds },
              isDeleted: false,
              date: {
                gte: parsedFrom,
                lte: rangeEnd,
              },
            },
            select: {
              id: true,
              roomId: true,
              date: true,
              status: true,
              reason: true,
              blockedBy: true,
            },
          }),
        ]);
      }

      // Build booking slot map from bookingRoomSelections (handles multiple rooms per booking)
      const bookingSlotMap = new Map();
      if (bookings.length > 0) {
        for (const booking of bookings) {
          // Skip if booking has no room selections
          if (!booking.bookingRoomSelections || booking.bookingRoomSelections.length === 0) continue;
          
          const bookingStart = toDateOnly(booking.startDate);
          const bookingEndDate = toDateOnly(booking.endDate);
          if (!bookingStart || !bookingEndDate) continue;

          const bookingEndExclusive = bookingEndDate;

          // Process each room selection in the booking
          for (const selection of booking.bookingRoomSelections) {
            // Parse roomIds from JSON array
            const roomIds = Array.isArray(selection.roomIds)
              ? selection.roomIds
              : typeof selection.roomIds === 'string'
              ? JSON.parse(selection.roomIds || '[]')
              : [];

            // Use selection checkIn/checkOut if available, otherwise fall back to booking dates
            const selectionStart = selection.checkIn ? toDateOnly(selection.checkIn) : bookingStart;
            const selectionEndExclusive = selection.checkOut ? toDateOnly(selection.checkOut) : bookingEndExclusive;

            if (!selectionStart || !selectionEndExclusive) continue;

            let cursor = selectionStart < parsedFrom ? new Date(parsedFrom) : selectionStart;
            const limit = selectionEndExclusive > addDays(rangeEnd, 1)
              ? addDays(rangeEnd, 1)
              : selectionEndExclusive;

            // Mark all room IDs for each day in the date range
            for (; cursor < limit; cursor = addDays(cursor, 1)) {
              const dayKey = formatISODate(cursor);
              // Mark each room in the selection as booked
              for (const roomId of roomIds) {
                if (!roomId) continue;
                const key = `${roomId}:${dayKey}`;
                bookingSlotMap.set(key, {
                  bookingId: booking.id,
                  reference: booking.bookingNumber,
                  guest: booking.guestName,
                  startDate: formatISODate(toDateOnly(booking.startDate)),
                  endDate: formatISODate(toDateOnly(booking.endDate)),
                });
              }
            }
          }
        }
      }

      const availabilityMap = new Map();
      if (availabilityOverrides.length > 0) {
        for (const availability of availabilityOverrides) {
          const dayKey = formatISODate(toDateOnly(availability.date));
          const mapKey = `${availability.roomId}:${dayKey}`;
          availabilityMap.set(mapKey, {
            id: availability.id,
            status: normalizeAvailabilityStatus(availability.status),
            reason: availability.reason || null,
            blockedBy: availability.blockedBy || null,
          });
        }
      }

      const summaryByDate = dayKeys.map((key, index) => ({
        date: key,
        weekday: days[index].toLocaleDateString('en-US', { weekday: 'short' }),
        totalRooms: roomsFlat.length,
        booked: 0,
        blocked: 0,
        maintenance: 0,
        out_of_service: 0,
        available: 0,
      }));

      const roomTypeDailyCounts = new Map();
      for (const roomType of roomTypePayloads) {
        const perDate = new Map();
        for (const key of dayKeys) {
          perDate.set(key, {
            totalRooms: roomType.rooms.length,
            booked: 0,
            blocked: 0,
            maintenance: 0,
            out_of_service: 0,
            available: 0,
          });
        }
        roomTypeDailyCounts.set(roomType.id, perDate);
      }

      for (const roomType of roomTypePayloads) {
        const perDate = roomTypeDailyCounts.get(roomType.id);

        roomType.rooms = roomType.rooms.map((room) => {
          const slots = dayKeys.map((dateKey) => {
            const bookingKey = `${room.id}:${dateKey}`;
            const availabilityKey = bookingKey;

            const booking = bookingSlotMap.get(bookingKey);
            if (booking) {
              summaryByDate[dayKeyIndex.get(dateKey)].booked += 1;
              perDate.get(dateKey).booked += 1;
              return {
                date: dateKey,
                status: 'booked',
                bookingId: booking.bookingId,
                guest: booking.guest,
                reference: booking.reference,
                stay: {
                  startDate: booking.startDate,
                  endDate: booking.endDate,
                },
              };
            }

            const availability = availabilityMap.get(availabilityKey);
            if (availability) {
              if (availability.status === 'maintenance') {
                summaryByDate[dayKeyIndex.get(dateKey)].maintenance += 1;
                perDate.get(dateKey).maintenance += 1;
              } else if (availability.status === 'blocked') {
                summaryByDate[dayKeyIndex.get(dateKey)].blocked += 1;
                perDate.get(dateKey).blocked += 1;
              } else if (availability.status === 'out_of_service') {
                summaryByDate[dayKeyIndex.get(dateKey)].out_of_service += 1;
                perDate.get(dateKey).out_of_service += 1;
              } else if (availability.status === 'booked') {
                summaryByDate[dayKeyIndex.get(dateKey)].booked += 1;
                perDate.get(dateKey).booked += 1;
              }

              return {
                date: dateKey,
                status: availability.status,
                availabilityId: availability.id,
                reason: availability.reason,
                blockedBy: availability.blockedBy,
              };
            }

            summaryByDate[dayKeyIndex.get(dateKey)].available += 1;
            perDate.get(dateKey).available += 1;
            return {
              date: dateKey,
              status: 'available',
            };
          });

          return {
            ...room,
            slots,
          };
        });
      }

      const totalRooms = roomsFlat.length;

      const summary = summaryByDate.map((entry) => {
        const available = entry.available;
        return {
          date: entry.date,
          weekday: entry.weekday,
          totalRooms,
          booked: entry.booked,
          blocked: entry.blocked,
          maintenance: entry.maintenance,
          out_of_service: entry.out_of_service,
          available,
        };
      });

      const roomTypes = roomTypePayloads.map((roomType) => {
        const perDate = roomTypeDailyCounts.get(roomType.id);
        return {
          id: roomType.id,
          name: roomType.name,
          availability: dayKeys.map((dateKey) => {
            const counts = perDate.get(dateKey);
            return {
              date: dateKey,
              totalRooms: counts.totalRooms,
              booked: counts.booked,
              blocked: counts.blocked,
              maintenance: counts.maintenance,
              out_of_service: counts.out_of_service,
              available: counts.available,
            };
          }),
          rooms: roomType.rooms,
        };
      });

      return sendSuccess(
        res,
        {
          property: {
            id: property.id,
            name: property.title,
            totalRooms,
          },
          range: {
            from: formatISODate(parsedFrom),
            to: formatISODate(rangeEnd),
            days: dayKeys.map((dateKey, index) => ({
              date: dateKey,
              weekday: days[index].toLocaleDateString('en-US', { weekday: 'short' }),
            })),
          },
          summary,
          roomTypes,
        },
        'Front desk snapshot fetched successfully',
        200
      );
    } catch (error) {
      console.error('Error generating front desk snapshot:', error);
      return sendError(
        res,
        'Failed to fetch front desk data',
        500,
        process.env.NODE_ENV === 'development' ? { code: error.code, detail: error.meta || error.message } : null
      );
    }
  },

  getHostFrontDeskProperty: async (req, res) => {
    const { hostId } = req.params;

    if (!hostId) {
      return sendError(res, 'Host identifier is required', 400);
    }

    try {
      const property = await prisma.property.findFirst({
        where: {
          ownerHostId: hostId,
          isDeleted: false,
        },
        select: {
          id: true,
          title: true,
          status: true,
        },
      });

      if (!property) {
        return sendError(res, 'No property found for this host', 404);
      }

      return sendSuccess(
        res,
        {
          id: property.id,
          title: property.title,
          status: property.status,
        },
        'Host property summary fetched successfully',
        200
      );
    } catch (error) {
      console.error('Error fetching host property summary:', error);
      return sendError(
        res,
        'Failed to fetch host property summary',
        500,
        process.env.NODE_ENV === 'development' ? { code: error.code, detail: error.meta || error.message } : null
      );
    }
  },
};

module.exports = FrontDeskController;

