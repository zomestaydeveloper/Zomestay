const { PrismaClient } = require('@prisma/client');
const { ensurePropertyAccess } = require('./access.utils');
const { toDateOnly, formatISODate } = require('../../utils/date.utils');
const { sendSuccess, sendError } = require('../../utils/response.utils');
const {
  ensureRoomBelongsToPropertyRoomType,
  checkActiveBookingConflict,
  upsertAvailabilityStatus,
  DEFAULT_REASON_BY_STATUS,
} = require('../../utils/frontdesk.utils');

const prisma = new PrismaClient();

const HOURS_TO_MILLISECONDS = 60 * 60 * 1000;

const createBlock = async (req, res) => {
  const { propertyId } = req.params;
  const {
    propertyRoomTypeId,
    roomId,
    date: dateRaw,
    releaseAfterHours,
    reason,
    blockedBy,
  } = req.body || {};

  if (!propertyId) {
    return sendError(res, 'Property identifier is required', 400);
  }

  if (!propertyRoomTypeId || !roomId || !dateRaw) {
    return sendError(res, 'propertyRoomTypeId, roomId, and date are required', 400);
  }

  const releaseHoursNumber = Number(releaseAfterHours);
  if (!Number.isFinite(releaseHoursNumber) || releaseHoursNumber <= 0) {
    return sendError(res, 'releaseAfterHours must be a positive number', 400);
  }

  const date = toDateOnly(dateRaw);
  if (!date) {
    return sendError(res, 'Invalid date format. Expected YYYY-MM-DD', 400);
  }

  const accessResult = await ensurePropertyAccess({
    prisma,
    propertyId,
    user: req.user,
  });

  if (!accessResult.ok) {
    return res.status(accessResult.status).json(accessResult.body);
  }

  const ownershipCheck = await ensureRoomBelongsToPropertyRoomType(
    propertyId,
    propertyRoomTypeId,
    roomId
  );

  if (!ownershipCheck.ok) {
    return res.status(ownershipCheck.response.status).json(ownershipCheck.response.body);
  }

  const holdExpiresAt = new Date(Date.now() + releaseHoursNumber * HOURS_TO_MILLISECONDS);
  const finalReason = reason || DEFAULT_REASON_BY_STATUS.blocked;
  const finalBlockedBy = blockedBy || 'Front desk';

  try {
    const availabilityRecord = await prisma.$transaction(async (tx) => {
      await checkActiveBookingConflict(tx, {
        propertyId,
        propertyRoomTypeId,
        roomId,
        date,
      });

      return upsertAvailabilityStatus({
        tx,
        roomId,
        date,
        status: 'blocked',
        reason: finalReason,
        blockedBy: finalBlockedBy,
        holdExpiresAt,
      });
    });

    return sendSuccess(
      res,
      {
        id: availabilityRecord.id,
        roomId,
        date: formatISODate(availabilityRecord.date),
        status: availabilityRecord.status,
        holdExpiresAt: availabilityRecord.holdExpiresAt
          ? availabilityRecord.holdExpiresAt.toISOString()
          : null,
        reason: availabilityRecord.reason,
        blockedBy: availabilityRecord.blockedBy,
      },
      'Room blocked successfully',
      201
    );
  } catch (error) {
    if (error.code === 'ROOM_BOOKED') {
      return sendError(res, error.message, 409, error.details || null);
    }

    console.error('Error creating block:', error);
    return sendError(
      res,
      'Failed to block room for the selected date',
      500,
      process.env.NODE_ENV === 'development' ? { detail: error.message } : null
    );
  }
};

const releaseBlock = async (req, res) => {
  const { propertyId, availabilityId } = req.params;

  if (!propertyId || !availabilityId) {
    return res.status(400).json({
      success: false,
      message: 'propertyId and availabilityId are required',
    });
  }

  const accessResult = await ensurePropertyAccess({
    prisma,
    propertyId,
    user: req.user,
  });

  if (!accessResult.ok) {
    return res.status(accessResult.status).json(accessResult.body);
  }

  const availabilityRecord = await prisma.availability.findFirst({
    where: {
      id: availabilityId,
      isDeleted: false,
      status: 'blocked',
      room: {
        isDeleted: false,
        propertyRoomType: {
          propertyId,
          isDeleted: false,
        },
      },
    },
    select: {
      id: true,
    },
  });

  if (!availabilityRecord) {
    return sendError(res, 'Blocked availability not found for this property', 404);
  }

  await prisma.availability.delete({
    where: { id: availabilityId },
  });

  return sendSuccess(res, null, 'Room block released successfully', 200);
};

const createMaintenance = async (req, res) => {
  const { propertyId } = req.params;
  const {
    propertyRoomTypeId,
    roomId,
    date: dateRaw,
    reason,
    blockedBy,
  } = req.body || {};

  if (!propertyId) {
    return res.status(400).json({
      success: false,
      message: 'Property identifier is required',
    });
  }

  if (!propertyRoomTypeId || !roomId || !dateRaw) {
    return res.status(400).json({
      success: false,
      message: 'propertyRoomTypeId, roomId, and date are required',
    });
  }

  const date = toDateOnly(dateRaw);
  if (!date) {
    return res.status(400).json({
      success: false,
      message: 'Invalid date format. Expected YYYY-MM-DD',
    });
  }

  const accessResult = await ensurePropertyAccess({
    prisma,
    propertyId,
    user: req.user,
  });

  if (!accessResult.ok) {
    return res.status(accessResult.status).json(accessResult.body);
  }

  const ownershipCheck = await ensureRoomBelongsToPropertyRoomType(
    propertyId,
    propertyRoomTypeId,
    roomId
  );

  if (!ownershipCheck.ok) {
    return res.status(ownershipCheck.response.status).json(ownershipCheck.response.body);
  }

  const finalReason = reason || DEFAULT_REASON_BY_STATUS.maintenance;
  const finalBlockedBy = blockedBy || 'Maintenance';

  try {
    const availabilityRecord = await prisma.$transaction(async (tx) => {
      await checkActiveBookingConflict(tx, {
        propertyId,
        propertyRoomTypeId,
        roomId,
        date,
      });

      return upsertAvailabilityStatus({
        tx,
        roomId,
        date,
        status: 'maintenance',
        reason: finalReason,
        blockedBy: finalBlockedBy,
      });
    });

    return sendSuccess(
      res,
      {
        id: availabilityRecord.id,
        roomId,
        date: formatISODate(availabilityRecord.date),
        status: availabilityRecord.status,
        reason: availabilityRecord.reason,
        blockedBy: availabilityRecord.blockedBy,
      },
      'Room marked under maintenance successfully',
      201
    );
  } catch (error) {
    if (error.code === 'ROOM_BOOKED') {
      return sendError(res, error.message, 409, error.details || null);
    }

    console.error('Error creating maintenance record:', error);
    return sendError(
      res,
      'Failed to mark room under maintenance',
      500,
      process.env.NODE_ENV === 'development' ? { detail: error.message } : null
    );
  }
};

const releaseMaintenance = async (req, res) => {
  const { propertyId, availabilityId } = req.params;

  if (!propertyId || !availabilityId) {
    return sendError(res, 'propertyId and availabilityId are required', 400);
  }

  const accessResult = await ensurePropertyAccess({
    prisma,
    propertyId,
    user: req.user,
  });

  if (!accessResult.ok) {
    return res.status(accessResult.status).json(accessResult.body);
  }

  const availabilityRecord = await prisma.availability.findFirst({
    where: {
      id: availabilityId,
      isDeleted: false,
      status: 'maintenance',
      room: {
        isDeleted: false,
        propertyRoomType: {
          propertyId,
          isDeleted: false,
        },
      },
    },
    select: {
      id: true,
    },
  });

  if (!availabilityRecord) {
    return sendError(res, 'Maintenance availability not found for this property', 404);
  }

  await prisma.availability.delete({
    where: { id: availabilityId },
  });

  return sendSuccess(res, null, 'Room maintenance released successfully', 200);
};

const createOutOfService = async (req, res) => {
  const { propertyId } = req.params;
  const {
    propertyRoomTypeId,
    roomId,
    date: dateRaw,
    reason,
    blockedBy,
  } = req.body || {};

  if (!propertyId) {
    return res.status(400).json({
      success: false,
      message: 'Property identifier is required',
    });
  }

  if (!propertyRoomTypeId || !roomId || !dateRaw) {
    return res.status(400).json({
      success: false,
      message: 'propertyRoomTypeId, roomId, and date are required',
    });
  }

  const date = toDateOnly(dateRaw);
  if (!date) {
    return res.status(400).json({
      success: false,
      message: 'Invalid date format. Expected YYYY-MM-DD',
    });
  }

  const accessResult = await ensurePropertyAccess({
    prisma,
    propertyId,
    user: req.user,
  });

  if (!accessResult.ok) {
    return res.status(accessResult.status).json(accessResult.body);
  }

  const ownershipCheck = await ensureRoomBelongsToPropertyRoomType(
    propertyId,
    propertyRoomTypeId,
    roomId
  );

  if (!ownershipCheck.ok) {
    return res.status(ownershipCheck.response.status).json(ownershipCheck.response.body);
  }

  const finalReason = reason || DEFAULT_REASON_BY_STATUS.out_of_service;
  const finalBlockedBy = blockedBy || 'Front desk';

  try {
    const availabilityRecord = await prisma.$transaction(async (tx) => {
      await checkActiveBookingConflict(tx, {
        propertyId,
        propertyRoomTypeId,
        roomId,
        date,
      });

      return upsertAvailabilityStatus({
        tx,
        roomId,
        date,
        status: 'out_of_service',
        reason: finalReason,
        blockedBy: finalBlockedBy,
      });
    });

    return sendSuccess(
      res,
      {
        id: availabilityRecord.id,
        roomId,
        date: formatISODate(availabilityRecord.date),
        status: availabilityRecord.status,
        reason: availabilityRecord.reason,
        blockedBy: availabilityRecord.blockedBy,
      },
      'Room marked out of service successfully',
      201
    );
  } catch (error) {
    if (error.code === 'ROOM_BOOKED') {
      return sendError(res, error.message, 409, error.details || null);
    }

    console.error('Error marking room out of service:', error);
    return sendError(
      res,
      'Failed to mark room out of service',
      500,
      process.env.NODE_ENV === 'development' ? { detail: error.message } : null
    );
  }
};

const releaseOutOfService = async (req, res) => {
  const { propertyId, availabilityId } = req.params;

  if (!propertyId || !availabilityId) {
    return sendError(res, 'propertyId and availabilityId are required', 400);
  }

  const accessResult = await ensurePropertyAccess({
    prisma,
    propertyId,
    user: req.user,
  });

  if (!accessResult.ok) {
    return res.status(accessResult.status).json(accessResult.body);
  }

  const availabilityRecord = await prisma.availability.findFirst({
    where: {
      id: availabilityId,
      isDeleted: false,
      status: 'out_of_service',
      room: {
        isDeleted: false,
        propertyRoomType: {
          propertyId,
          isDeleted: false,
        },
      },
    },
    select: {
      id: true,
    },
  });

  if (!availabilityRecord) {
    return sendError(res, 'Out-of-service availability not found for this property', 404);
  }

  await prisma.availability.delete({
    where: { id: availabilityId },
  });

  return sendSuccess(res, null, 'Room returned from out of service successfully', 200);
};

module.exports = {
  createBlock,
  releaseBlock,
  createMaintenance,
  releaseMaintenance,
  createOutOfService,
  releaseOutOfService,
};

