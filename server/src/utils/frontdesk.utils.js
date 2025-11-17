/**
 * Front-desk utility functions for business logic
 */

const { PrismaClient } = require('@prisma/client');
const { toDateOnly } = require('./date.utils');

const prisma = new PrismaClient();

/**
 * Normalizes availability status to ensure consistent values
 * @param {string} status - Status to normalize
 * @returns {string} Normalized status
 */
const normalizeAvailabilityStatus = (status) => {
  if (!status) return 'available';

  switch (status) {
    case 'maintenance':
      return 'maintenance';
    case 'blocked':
      return 'blocked';
    case 'out_of_service':
      return 'out_of_service';
    case 'booked':
      return 'booked';
    default:
      return status || 'available';
  }
};

/**
 * Ensures a room belongs to a property room type
 * @param {string} propertyId - Property ID
 * @param {string} propertyRoomTypeId - Property room type ID
 * @param {string} roomId - Room ID
 * @returns {Promise<{ok: boolean, response?: {status: number, body: object}}>}
 */
const ensureRoomBelongsToPropertyRoomType = async (propertyId, propertyRoomTypeId, roomId) => {
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
    return {
      ok: false,
      response: {
        status: 404,
        body: {
          success: false,
          message: 'Property room type not found for this property',
        },
      },
    };
  }

  const roomExists = propertyRoomType.rooms.some((room) => room.id === roomId);
  if (!roomExists) {
    return {
      ok: false,
      response: {
        status: 400,
        body: {
          success: false,
          message: 'Room does not belong to the selected property room type',
        },
      },
    };
  }

  return { ok: true };
};

/**
 * Checks for active booking conflicts
 * @param {object} tx - Prisma transaction client
 * @param {object} params - Parameters
 * @param {string} params.propertyId - Property ID
 * @param {string} params.propertyRoomTypeId - Property room type ID
 * @param {string} params.roomId - Room ID
 * @param {Date} params.date - Date to check
 * @throws {Error} If conflict exists
 */
const checkActiveBookingConflict = async (tx, { propertyId, propertyRoomTypeId, roomId, date }) => {
  const { addDays } = require('./date.utils');
  const endExclusive = addDays(date, 1);

  const conflictingBooking = await tx.booking.findFirst({
    where: {
      propertyId,
      propertyRoomTypeId,
      roomId,
      isDeleted: false,
      status: { in: ['pending', 'confirmed'] },
      startDate: { lt: endExclusive },
      endDate: { gt: date },
    },
    select: {
      id: true,
      bookingNumber: true,
      startDate: true,
      endDate: true,
    },
  });

  if (conflictingBooking) {
    throw Object.assign(new Error('Room already has a booking that overlaps the selected date'), {
      code: 'ROOM_BOOKED',
      details: conflictingBooking,
    });
  }
};

/**
 * Upserts availability status
 * @param {object} params - Parameters
 * @param {object} params.tx - Prisma transaction client
 * @param {string} params.roomId - Room ID
 * @param {Date} params.date - Date
 * @param {string} params.status - Status
 * @param {string} params.reason - Reason
 * @param {string} params.blockedBy - Blocked by
 * @param {Date} params.holdExpiresAt - Hold expires at
 * @returns {Promise<object>} Availability record
 */
const upsertAvailabilityStatus = async ({ tx, roomId, date, status, reason, blockedBy, holdExpiresAt }) => {
  const existingRecord = await tx.availability.findFirst({
    where: {
      roomId,
      date,
      isDeleted: false,
    },
  });

  if (existingRecord) {
    if (existingRecord.status === 'booked') {
      throw Object.assign(new Error('Room is already booked for the selected date'), { code: 'ROOM_BOOKED' });
    }

    return tx.availability.update({
      where: { id: existingRecord.id },
      data: {
        status,
        reason,
        blockedBy,
        holdExpiresAt: holdExpiresAt || null,
      },
    });
  }

  return tx.availability.create({
    data: {
      roomId,
      date,
      status,
      reason,
      blockedBy,
      holdExpiresAt: holdExpiresAt || null,
    },
  });
};

/**
 * Default reasons by status
 */
const DEFAULT_REASON_BY_STATUS = {
  blocked: 'Front desk block',
  maintenance: 'Front desk maintenance',
  out_of_service: 'Front desk out of service',
};

/**
 * Normalizes phone number
 * @param {string} value - Phone number
 * @returns {string} Normalized phone number
 */
const normalizePhone = (value) => {
  if (!value) return '';
  return String(value).replace(/\D/g, '').slice(-10);
};

/**
 * Validates UUID
 * @param {string} value - Value to validate
 * @returns {boolean} True if valid UUID
 */
const isValidUuid = (value) => typeof value === 'string' && /^[0-9a-fA-F-]{10,}$/.test(value.trim());

module.exports = {
  normalizeAvailabilityStatus,
  ensureRoomBelongsToPropertyRoomType,
  checkActiveBookingConflict,
  upsertAvailabilityStatus,
  DEFAULT_REASON_BY_STATUS,
  normalizePhone,
  isValidUuid,
};

