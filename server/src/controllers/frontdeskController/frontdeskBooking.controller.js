const { PrismaClient } = require('@prisma/client');
const { ensurePropertyAccess } = require('./access.utils');
const {
  toDateOnly,
  addDays,
  formatISODate,
  buildDateRange,
  calculateNights,
} = require('../../utils/date.utils');
const { sendSuccess, sendError } = require('../../utils/response.utils');

const prisma = new PrismaClient();

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DEFAULT_HOLD_DURATION_MINUTES = 15;

const { normalizeAvailabilityStatus } = require('../../utils/frontdesk.utils');

const FrontDeskBookingController = {
  getBookingContext: async (req, res) => {
    const { propertyId, propertyRoomTypeId } = req.params;
    const { from: fromQuery, to: toQuery, roomsRequested: roomsRequestedQuery } = req.query;

    if (!propertyId) {
      return sendError(res, 'Property identifier is required', 400);
    }

    if (!propertyRoomTypeId) {
      return sendError(res, 'Property room type identifier is required', 400);
    }

    if (!fromQuery || !toQuery) {
      return sendError(res, 'Both from and to dates are required', 400);
    }

    const parsedFrom = toDateOnly(fromQuery);
    const parsedTo = toDateOnly(toQuery);

    if (!parsedFrom || !parsedTo) {
      return sendError(res, 'Invalid date format. Expected YYYY-MM-DD', 400);
    }

    if (parsedTo <= parsedFrom) {
      return sendError(res, 'Check-out date must be after check-in date', 400);
    }

    const nights = Math.max(1, calculateNights(parsedFrom, parsedTo));

    const rangeEndInclusive = addDays(parsedTo, -1);
    if (rangeEndInclusive < parsedFrom) {
      return sendError(res, 'Invalid date range. Check-out must be at least one day after check-in', 400);
    }

    const roomsRequested = Math.max(parseInt(roomsRequestedQuery, 10) || 1, 1);

    try {
      const accessResult = await ensurePropertyAccess({
        prisma,
        propertyId,
        user: req.user,
      });

      if (!accessResult.ok) {
        return res.status(accessResult.status).json(accessResult.body);
      }

      const propertyRoomType = await prisma.propertyRoomType.findFirst({
        where: {
          id: propertyRoomTypeId,
          propertyId,
          isDeleted: false,
          isActive: true,
        },
        select: {
          id: true,
          propertyId: true,
          property: {
            select: {
              id: true,
              title: true,
              checkInTime: true,
              checkOutTime: true,
            },
          },
          roomType: {
            select: {
              id: true,
              name: true,
            },
          },
          minOccupancy: true,
          Occupancy: true,
          numberOfBeds: true,
          bedType: true,
          extraBedCapacity: true,
          rooms: {
            where: {
              isDeleted: false,
              status: { not: 'inactive' },
            },
            select: {
              id: true,
              name: true,
              code: true,
              status: true,
            },
          },
        },
      });

      if (!propertyRoomType) {
        return sendError(res, 'Property room type not found for this property', 404);
      }

      const roomIds = propertyRoomType.rooms.map((room) => room.id);

      // First, find which rate plans are active/applied during the booking date range
      const activeRatePlanDates = await prisma.ratePlanDate.findMany({
        where: {
          propertyId,
          date: {
            gte: parsedFrom,
            lte: rangeEndInclusive,
          },
          isDeleted: false,
          isActive: true,
        },
        select: {
          ratePlanId: true,
        },
        distinct: ['ratePlanId'],
      });

      // Get unique rate plan IDs that are active during the date range
      const activeRatePlanIds = activeRatePlanDates.map((rpd) => rpd.ratePlanId);

      // Now fetch meal plans that have rate plans active during the date range
      const [mealPlans, bookings, availabilityOverrides] = await Promise.all([
        activeRatePlanIds.length > 0
          ? prisma.propertyRoomTypeMealPlan.findMany({
              where: {
                propertyRoomTypeId,
                propertyId,
                ratePlanId: { in: activeRatePlanIds },
                isDeleted: false,
                isActive: true,
              },
              select: {
                id: true,
                ratePlanId: true,
                mealPlanId: true,
                doubleOccupancyPrice: true,
                singleOccupancyPrice: true,
                groupOccupancyPrice: true,
                extraBedPriceAdult: true,
                extraBedPriceChild: true,
                extraBedPriceInfant: true,
                mealPlan: {
                  select: {
                    id: true,
                    name: true,
                    kind: true,
                  },
                },
                ratePlan: {
                  select: {
                    id: true,
                    name: true,
                    color: true,
                  },
                },
              },
            })
          : [],
        roomIds.length > 0
          ? prisma.booking.findMany({
              where: {
                propertyId,
                propertyRoomTypeId,
                isDeleted: false,
                status: { in: ['pending', 'confirmed'] },
                startDate: { lt: parsedTo },
                endDate: { gt: parsedFrom },
              },
              select: {
                id: true,
                bookingNumber: true,
                guestName: true,
                startDate: true,
                endDate: true,
                bookingRoomSelections: {
                  where: {
                    roomTypeId: propertyRoomTypeId,
                  },
                  select: {
                    id: true,
                    roomIds: true,
                    checkIn: true,
                    checkOut: true,
                  },
                },
              },
            })
          : [],
        roomIds.length > 0
          ? prisma.availability.findMany({
              where: {
                roomId: { in: roomIds },
                isDeleted: false,
                date: {
                  gte: parsedFrom,
                  lte: rangeEndInclusive,
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
            })
          : [],
      ]);

      // Build booking slot map from bookingRoomSelections (handles multiple rooms per booking)
      const bookingSlotMap = new Map();
      for (const booking of bookings) {
        const start = toDateOnly(booking.startDate);
        const endExclusive = toDateOnly(booking.endDate);
        if (!start || !endExclusive) continue;

        // Process each room selection in the booking
        for (const selection of booking.bookingRoomSelections || []) {
          // Parse roomIds from JSON array
          const roomIds = Array.isArray(selection.roomIds)
            ? selection.roomIds
            : typeof selection.roomIds === 'string'
            ? JSON.parse(selection.roomIds || '[]')
            : [];

          // Use selection checkIn/checkOut if available, otherwise fall back to booking dates
          const selectionStart = selection.checkIn ? toDateOnly(selection.checkIn) : start;
          const selectionEndExclusive = selection.checkOut ? toDateOnly(selection.checkOut) : endExclusive;

          if (!selectionStart || !selectionEndExclusive) continue;

          // Mark all room IDs for each day in the date range
          for (
            let cursor = selectionStart < parsedFrom ? new Date(parsedFrom) : selectionStart;
            cursor <= rangeEndInclusive && cursor < selectionEndExclusive;
            cursor = addDays(cursor, 1)
          ) {
            const dayKey = formatISODate(cursor);
            // Mark each room in the selection as booked
            for (const roomId of roomIds) {
              if (!roomId) continue;
              const key = `${roomId}:${dayKey}`;
              bookingSlotMap.set(key, {
                bookingId: booking.id,
                reference: booking.bookingNumber,
                guest: booking.guestName,
                date: dayKey,
              });
            }
          }
        }
      }

      const availabilityMap = new Map();
      for (const availability of availabilityOverrides) {
        const dayKey = formatISODate(toDateOnly(availability.date));
        const mapKey = `${availability.roomId}:${dayKey}`;
        availabilityMap.set(mapKey, {
          id: availability.id,
          status: normalizeAvailabilityStatus(availability.status),
          reason: availability.reason || null,
          blockedBy: availability.blockedBy || null,
          date: dayKey,
        });
      }

      // Build date range for room availability checking
      const days = buildDateRange(parsedFrom, rangeEndInclusive);
      const dayKeys = days.map(formatISODate);

      const rooms = propertyRoomType.rooms.map((room) => {
        const roomAvailability = [];
        let availableForEntireStay = room.status !== 'maintenance';

        for (const dayKey of dayKeys) {
          let status = 'available';
          let details = null;
          const booking = bookingSlotMap.get(`${room.id}:${dayKey}`);

          if (room.status === 'maintenance') {
            status = 'maintenance';
          } else if (booking) {
            status = 'booked';
            details = {
              bookingId: booking.bookingId,
              reference: booking.reference,
              guest: booking.guest,
            };
          } else {
            const availability = availabilityMap.get(`${room.id}:${dayKey}`);
            if (availability) {
              status = availability.status;
              details = {
                availabilityId: availability.id,
                reason: availability.reason,
                blockedBy: availability.blockedBy,
              };
            }
          }

          if (status !== 'available') {
            availableForEntireStay = false;
          }

          roomAvailability.push({
            date: dayKey,
            status,
            ...details,
          });
        }

        return {
          id: room.id,
          label: room.name || room.code || 'Room',
          status: room.status,
          availability: roomAvailability,
          isAvailableForStay: availableForEntireStay,
        };
      });

      const availableRooms = rooms.filter((room) => room.isAvailableForStay);

      return sendSuccess(
        res,
        {
          property: {
            id: propertyRoomType.property.id,
            name: propertyRoomType.property.title,
            checkInTime: propertyRoomType.property.checkInTime,
            checkOutTime: propertyRoomType.property.checkOutTime,
          },
          roomType: {
            id: propertyRoomType.roomType?.id || null,
            propertyRoomTypeId: propertyRoomType.id,
            name: propertyRoomType.roomType?.name || 'Room type',
            minOccupancy: propertyRoomType.minOccupancy,
            Occupancy: propertyRoomType.Occupancy,
            numberOfBeds: propertyRoomType.numberOfBeds,
            bedType: propertyRoomType.bedType,
            extraBedCapacity: propertyRoomType.extraBedCapacity,
            rooms,
          },
          stay: {
            from: formatISODate(parsedFrom),
            to: formatISODate(parsedTo),
            nights,
            requestedRooms: roomsRequested,
            checkInTime: propertyRoomType.property.checkInTime,
            checkOutTime: propertyRoomType.property.checkOutTime,
          },
          availabilitySummary: {
            totalRooms: rooms.length,
            availableForStay: availableRooms.length,
            canFulfilRequest: availableRooms.length >= roomsRequested,
          },
          mealPlans: mealPlans.map((item) => ({
            id: item.id,
            mealPlan: item.mealPlan
              ? {
                  id: item.mealPlan.id,
                  name: item.mealPlan.name,
                  kind: item.mealPlan.kind,
                }
              : null,
            ratePlan: item.ratePlan
              ? {
                  id: item.ratePlan.id,
                  name: item.ratePlan.name,
                  color: item.ratePlan.color,
                }
              : null,
            pricing: {
              singleOccupancy: item.singleOccupancyPrice,
              doubleOccupancy: item.doubleOccupancyPrice,
              groupOccupancy: item.groupOccupancyPrice,
              extraBedAdult: item.extraBedPriceAdult,
              extraBedChild: item.extraBedPriceChild,
              extraBedInfant: item.extraBedPriceInfant,
            },
          })),
        },
        'Front desk booking context fetched successfully',
        200
      );
    } catch (error) {
      console.error('Error fetching front desk booking context:', error);
      return sendError(
        res,
        'Failed to fetch booking context',
        500,
        process.env.NODE_ENV === 'development' ? { code: error.code, detail: error.meta || error.message } : null
      );
    }
  },

  createHold: async (req, res) => {
    const { propertyId } = req.params;
    const {
      propertyRoomTypeId,
      roomIds,
      from: fromQuery,
      to: toQuery,
      holdUntil: holdUntilQuery,
      blockedBy,
      reason,
    } = req.body || {};

    if (!propertyId) {
      return sendError(res, 'Property identifier is required', 400);
    }

    if (!propertyRoomTypeId) {
      return sendError(res, 'Property room type identifier is required', 400);
    }

    if (!Array.isArray(roomIds) || roomIds.length === 0) {
      return sendError(res, 'At least one room identifier is required', 400);
    }

    if (!fromQuery || !toQuery) {
      return sendError(res, 'Both from and to dates are required', 400);
    }

    const parsedFrom = toDateOnly(fromQuery);
    const parsedTo = toDateOnly(toQuery);

    if (!parsedFrom || !parsedTo) {
      return sendError(res, 'Invalid date format. Expected YYYY-MM-DD', 400);
    }

    if (parsedTo <= parsedFrom) {
      return sendError(res, 'Check-out date must be after check-in date', 400);
    }

    const rangeEndInclusive = addDays(parsedTo, -1);
    if (rangeEndInclusive < parsedFrom) {
      return sendError(res, 'Invalid date range. Check-out must be at least one day after check-in', 400);
    }

    const uniqueRoomIds = [...new Set(roomIds)];

    let holdUntil = null;
    if (holdUntilQuery) {
      const parsedHoldUntil = new Date(holdUntilQuery);
      if (!Number.isNaN(parsedHoldUntil.getTime())) {
        holdUntil = parsedHoldUntil;
      }
    }

    if (!holdUntil) {
      holdUntil = new Date(Date.now() + DEFAULT_HOLD_DURATION_MINUTES * 60 * 1000);
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

      const propertyRoomType = await prisma.propertyRoomType.findFirst({
        where: {
          id: propertyRoomTypeId,
          propertyId,
          isDeleted: false,
          isActive: true,
        },
        select: {
          id: true,
          propertyId: true,
          roomTypeId: true,
          rooms: {
            where: {
              isDeleted: false,
              status: { not: 'inactive' },
            },
            select: {
              id: true,
            },
          },
        },
      });

      if (!propertyRoomType) {
        return sendError(res, 'Property room type not found for this property', 404);
      }

      const allowedRoomIds = new Set(propertyRoomType.rooms.map((room) => room.id));
      const invalidRoomId = uniqueRoomIds.find((roomId) => !allowedRoomIds.has(roomId));
      if (invalidRoomId) {
        return sendError(res, `Room ${invalidRoomId} does not belong to the selected property room type`, 400);
      }

      const dateRange = buildDateRange(parsedFrom, rangeEndInclusive);
      const holdReason =
        reason ||
        (holdUntil
          ? `Front desk hold until ${holdUntil.toISOString()}`
          : 'Front desk hold');
      const blockedByValue = blockedBy || 'Front desk';

      const createdHolds = await prisma.$transaction(async (tx) => {
        // Check for conflicting bookings using bookingRoomSelections
        // Get all bookings that overlap with the date range
        const overlappingBookings = await tx.booking.findMany({
          where: {
            propertyId,
            propertyRoomTypeId,
            isDeleted: false,
            status: { in: ['pending', 'confirmed'] },
            startDate: { lt: parsedTo },
            endDate: { gt: parsedFrom },
          },
          select: {
            id: true,
            bookingNumber: true,
            startDate: true,
            endDate: true,
            bookingRoomSelections: {
              where: {
                roomTypeId: propertyRoomTypeId,
              },
              select: {
                id: true,
                roomIds: true,
                checkIn: true,
                checkOut: true,
              },
            },
          },
        });

        // Check if any of the requested rooms are in bookingRoomSelections
        const conflictingBookings = [];
        for (const booking of overlappingBookings) {
          for (const selection of booking.bookingRoomSelections || []) {
            const roomIds = Array.isArray(selection.roomIds)
              ? selection.roomIds
              : typeof selection.roomIds === 'string'
              ? JSON.parse(selection.roomIds || '[]')
              : [];

            // Check if any requested room ID is in this selection
            const hasConflict = uniqueRoomIds.some((requestedRoomId) => roomIds.includes(requestedRoomId));

            if (hasConflict) {
              // Verify date overlap
              const selectionStart = selection.checkIn ? toDateOnly(selection.checkIn) : toDateOnly(booking.startDate);
              const selectionEnd = selection.checkOut ? toDateOnly(selection.checkOut) : toDateOnly(booking.endDate);

              if (selectionStart && selectionEnd && selectionStart < parsedTo && selectionEnd > parsedFrom) {
                conflictingBookings.push({
                  id: booking.id,
                  bookingNumber: booking.bookingNumber,
                  startDate: booking.startDate,
                  endDate: booking.endDate,
                  conflictingRoomIds: roomIds.filter((id) => uniqueRoomIds.includes(id)),
                });
              }
            }
          }
        }

        if (conflictingBookings.length > 0) {
          throw Object.assign(new Error('Room is already booked for the selected dates'), {
            code: 'ROOM_BOOKED',
            details: conflictingBookings[0],
          });
        }

        const conflictingAvailability = await tx.availability.findFirst({
          where: {
            roomId: { in: uniqueRoomIds },
            isDeleted: false,
            date: {
              gte: parsedFrom,
              lte: rangeEndInclusive,
            },
          },
          select: {
            id: true,
            roomId: true,
            date: true,
            status: true,
            reason: true,
          },
        });

        if (conflictingAvailability) {
          throw Object.assign(new Error('Room is not available for the selected dates'), {
            code: 'ROOM_BLOCKED',
            details: conflictingAvailability,
          });
        }

        const created = [];

        for (const roomId of uniqueRoomIds) {
          for (const day of dateRange) {
            const record = await tx.availability.create({
              data: {
                roomId,
                date: day,
                status: 'blocked',
                reason: holdReason,
                blockedBy: blockedByValue,
                holdExpiresAt: holdUntil,
              },
            });
            created.push(record);
          }
        }

        return created;
      });

      return sendSuccess(
        res,
        {
          propertyId,
          propertyRoomTypeId,
          roomIds: uniqueRoomIds,
          from: formatISODate(parsedFrom),
          to: formatISODate(parsedTo),
          holdUntil: holdUntil ? holdUntil.toISOString() : null,
          blockedBy: blockedByValue,
          reason: holdReason,
          records: createdHolds.map((record) => ({
            id: record.id,
            roomId: record.roomId,
            date: formatISODate(record.date),
            status: record.status,
            holdExpiresAt: record.holdExpiresAt ? record.holdExpiresAt.toISOString() : null,
          })),
        },
        'Rooms held successfully for the selected dates',
        201
      );
    } catch (error) {
      if (error.code === 'ROOM_BOOKED' || error.code === 'ROOM_BLOCKED') {
        return sendError(res, error.message, 409, error.details);
      }

      if (error.code === 'P2002') {
        return sendError(res, 'Selected rooms already have a hold or block for one of the requested dates', 409);
      }

      console.error('Error creating front desk hold:', error);
      return sendError(
        res,
        'Failed to create hold for the selected rooms',
        500,
        process.env.NODE_ENV === 'development' ? { code: error.code, detail: error.meta || error.message } : null
      );
    }
  },

  




};

module.exports = FrontDeskBookingController;

