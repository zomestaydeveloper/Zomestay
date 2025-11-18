const { PrismaClient, PaymentStatus, BookingStatus } = require('@prisma/client');

const prisma = new PrismaClient();

const IST_OFFSET_MINUTES = 330;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

const toIstMidnight = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return null;
  }
  const utcMillis = date.getTime();
  const istMillis = utcMillis + IST_OFFSET_MINUTES * 60 * 1000;
  const dayStartMillis = Math.floor(istMillis / DAY_IN_MS) * DAY_IN_MS;
  return new Date(dayStartMillis - IST_OFFSET_MINUTES * 60 * 1000);
};

const diffInCalendarDaysIst = (futureDate, baseDate) => {
  const future = toIstMidnight(futureDate);
  const base = toIstMidnight(baseDate);
  if (!future || !base) return null;
  const diff = future.getTime() - base.getTime();
  return Math.floor(diff / DAY_IN_MS);
};

const buildRefundEvaluation = ({ booking, rules }) => {
  if (!booking || !Array.isArray(rules) || rules.length === 0) {
    return {
      eligibleAmount: 0,
      percentage: 0,
      matchedRule: null,
    };
  }

  const now = new Date();
  const daysNotice = diffInCalendarDaysIst(booking.startDate, now);
  const orderedRules = [...rules]
    .filter((rule) => Number.isFinite(rule.daysBefore))
    .sort((a, b) => b.daysBefore - a.daysBefore);

  const matchedRule = orderedRules.find((rule) => daysNotice >= rule.daysBefore) || null;
  const percentage = matchedRule ? matchedRule.refundPercentage : 0;
  const totalAmountNumber = Number(booking.totalAmount ?? 0);
  const eligibleAmount = Number.isFinite(totalAmountNumber)
    ? (totalAmountNumber * percentage) / 100
    : 0;

  return {
    eligibleAmount,
    percentage,
    matchedRule,
    daysNotice,
  };
};

const extractRoomIdsFromBooking = (booking) => {
  const ids = new Set();

  // PRODUCTION: Use BookingRoomSelection model (relational approach)
  // Note: booking.roomId removed - all room details are in BookingRoomSelection
  if (booking.bookingRoomSelections && Array.isArray(booking.bookingRoomSelections)) {
    booking.bookingRoomSelections.forEach((selection) => {
      // Extract room IDs from JSON array
      const roomIds = Array.isArray(selection.roomIds) 
        ? selection.roomIds 
        : (typeof selection.roomIds === 'string' ? JSON.parse(selection.roomIds || '[]') : []);
      
      roomIds.forEach((roomId) => {
        if (roomId) ids.add(roomId);
      });
    });
  }

  return Array.from(ids);
};

const getCancellationRules = async (booking) => {
  const snapshotRules = booking?.cancellationPolicySnapshot?.rules;
  if (Array.isArray(snapshotRules) && snapshotRules.length > 0) {
    return snapshotRules.map((rule) => ({
      id: rule.id,
      daysBefore: Number(rule.daysBefore) || 0,
      refundPercentage: Number(rule.refundPercentage) || 0,
    }));
  }

  if (!booking?.cancellationPolicyId) {
    return [];
  }

  const policy = await prisma.cancellationPolicy.findUnique({
    where: { id: booking.cancellationPolicyId },
    include: {
      rules: true,
    },
  });

  if (!policy || !Array.isArray(policy.rules)) {
    return [];
  }

  return policy.rules.map((rule) => ({
    id: rule.id,
    daysBefore: Number(rule.daysBefore) || 0,
    refundPercentage: Number(rule.refundPercentage) || 0,
  }));
};

const getBookingDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await prisma.booking.findFirst({
      where: {
        id,
        isDeleted: false,
      },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            cancellationPolicyId: true,
          },
        },
        propertyRoomType: {
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
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    const rules = await getCancellationRules(booking);
    const refundEvaluation = rules.length
      ? buildRefundEvaluation({ booking, rules })
      : null;

    return res.json({
      success: true,
      data: {
        booking,
        cancellationPolicy: {
          id: booking.cancellationPolicyId,
          hasRules: Array.isArray(rules) && rules.length > 0,
          rules,
        },
        refundEvaluation,
      },
    });
  } catch (error) {
    console.error('getBookingDetails error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load booking details',
    });
  }
};

const cancelBooking = async (req, res) => {
  const { id } = req.params;
  const { reason, notes } = req.body || {};

  if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Cancellation reason is required',
    });
  }

  // Get user info from middleware (if authenticated)
  const userRole = req.user?.role;
  const userId = req.user?.id || req.user?.agentId || req.user?.userId;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findFirst({
        where: {
          id,
          isDeleted: false,
        },
        include: {
          order: {
            select: {
              id: true,
              createdByType: true,
              createdById: true,
            },
          },
          bookingRoomSelections: true, // Include room selections for cancellation
        },
      });

      if (!booking) {
        return { status: 404, body: { success: false, message: 'Booking not found' } };
      }

      // Verify ownership for agents
      if (userRole === 'agent' && userId) {
        if (!booking.order || booking.order.createdByType !== 'agent' || booking.order.createdById !== userId) {
          return {
            status: 403,
            body: { success: false, message: 'You do not have permission to cancel this booking' },
          };
        }
      }

      // Verify ownership for users
      if (userRole === 'user' && userId) {
        if (booking.userId !== userId) {
          return {
            status: 403,
            body: { success: false, message: 'You do not have permission to cancel this booking' },
          };
        }
      }

      // Verify ownership for hosts
      if (userRole === 'host' && userId) {
        const property = await tx.property.findFirst({
          where: {
            id: booking.propertyId,
            ownerHostId: userId,
            isDeleted: false,
          },
          select: { id: true },
        });
        if (!property) {
          return {
            status: 403,
            body: { success: false, message: 'You do not have permission to cancel this booking' },
          };
        }
      }

      if (booking.status === BookingStatus.cancelled) {
        return {
          status: 409,
          body: { success: false, message: 'Booking is already cancelled' },
        };
      }

      if (booking.status === BookingStatus.completed) {
        return {
          status: 409,
          body: { success: false, message: 'Completed bookings cannot be cancelled' },
        };
      }

      if (!booking.cancellationPolicyId) {
        // No cancellation policy - set payment status to REFUND_NOT_APPLICABLE
        const paymentStatusUpdate = PaymentStatus.REFUND_NOT_APPLICABLE;
        const now = new Date();

        const updated = await tx.booking.update({
          where: { id },
          data: {
            status: BookingStatus.cancelled,
            cancellationReason: reason.trim(),
            cancellationDate: now,
            hostNotes: notes || booking.hostNotes,
            paymentStatus: paymentStatusUpdate,
            refundStatusUpdatedAt: now,
            refundedAmount: null, // No refund for no policy
            refundEligibleAmount: null,
            refundPercentage: null,
            refundProcessedAt: null,
            updatedAt: now,
          },
        });

        // Update all Payment records linked to this booking
        await tx.payment.updateMany({
          where: {
            bookingId: id,
            isDeleted: false,
          },
          data: {
            status: paymentStatusUpdate,
            updatedAt: now,
          },
        });

        const roomIds = extractRoomIdsFromBooking(booking);
        if (roomIds.length > 0) {
          await tx.availability.deleteMany({
            where: {
              roomId: { in: roomIds },
              date: {
                gte: booking.startDate,
                lt: booking.endDate,
              },
              status: 'booked',
              isDeleted: false,
            },
          });
        }

        return {
          status: 200,
          body: {
            success: true,
            message: 'Booking cancelled (no cancellation policy configured)',
            data: {
              booking: updated,
              refund: null,
              paymentStatus: paymentStatusUpdate,
              refundedAmount: null,
              refundEligibleAmount: null,
              refundPercentage: null,
            },
          },
        };
      }

      const rules = await getCancellationRules(booking);
      if (!rules.length) {
        return {
          status: 400,
          body: {
            success: false,
            message: 'Cancellation policy rules are not configured. Cancellation aborted.',
          },
        };
      }

      const refundEvaluation = buildRefundEvaluation({ booking, rules });
      const now = new Date();

      let paymentStatusUpdate = undefined;
      let refundStatusUpdatedAt = undefined;
      let refundedAmount = null;
      let refundEligibleAmount = null;
      let refundPercentage = null;
      let refundProcessedAt = null;

      if (refundEvaluation.eligibleAmount > 0 && refundEvaluation.percentage > 0) {
        paymentStatusUpdate = PaymentStatus.REFUND_INITIATED;
        refundStatusUpdatedAt = now;
        refundEligibleAmount = refundEvaluation.eligibleAmount;
        refundPercentage = refundEvaluation.percentage;
        // Store eligible amount as refunded amount (actual refund processing happens later)
        // This will be updated to actual refunded amount when refund is completed
        refundedAmount = refundEvaluation.eligibleAmount;
        refundProcessedAt = now;
      } else {
        paymentStatusUpdate = PaymentStatus.REFUND_NOT_APPLICABLE;
        refundStatusUpdatedAt = now;
      }

      const updatedBooking = await tx.booking.update({
        where: { id },
        data: {
          status: BookingStatus.cancelled,
          cancellationReason: reason.trim(),
          cancellationDate: now,
          hostNotes: notes || booking.hostNotes,
          paymentStatus: paymentStatusUpdate,
          refundStatusUpdatedAt,
          refundedAmount,
          refundEligibleAmount,
          refundPercentage,
          refundProcessedAt,
          updatedAt: now,
        },
      });

      // Update all Payment records linked to this booking
      // This ensures Payment.status stays in sync with Booking.paymentStatus
      const updatedPayments = await tx.payment.updateMany({
        where: {
          bookingId: id,
          isDeleted: false,
        },
        data: {
          status: paymentStatusUpdate,
          updatedAt: now,
        },
      });

      const roomIds = extractRoomIdsFromBooking(booking);
      if (roomIds.length > 0) {
        await tx.availability.deleteMany({
          where: {
            roomId: { in: roomIds },
            date: {
              gte: booking.startDate,
              lt: booking.endDate,
            },
            status: 'booked',
            isDeleted: false,
          },
        });
      }

      return {
        status: 200,
        body: {
          success: true,
          message: 'Booking cancelled successfully',
          data: {
            booking: updatedBooking,
            refund: refundEvaluation,
            paymentStatus: paymentStatusUpdate,
            refundedAmount: refundedAmount,
            refundEligibleAmount: refundEligibleAmount,
            refundPercentage: refundPercentage,
            paymentsUpdated: updatedPayments.count, // Number of payments updated
          },
        },
      };
    });

    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('cancelBooking error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to cancel booking',
    });
  }
};

const markRefundCompleted = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findFirst({
        where: {
          id,
          isDeleted: false,
        },
      });

      if (!booking) {
        return {
          status: 404,
          body: {
            success: false,
            message: 'Booking not found',
          },
        };
      }

      if (booking.paymentStatus !== PaymentStatus.REFUND_INITIATED) {
        return {
          status: 409,
          body: {
            success: false,
            message: 'Refund can only be marked complete after it has been initiated',
          },
        };
      }

      const now = new Date();

      // Update booking payment status
      const updated = await tx.booking.update({
        where: { id },
        data: {
          paymentStatus: PaymentStatus.REFUND_COMPLETED,
          refundStatusUpdatedAt: now,
          updatedAt: now,
        },
      });

      // Update all Payment records linked to this booking
      // This ensures Payment.status stays in sync with Booking.paymentStatus
      const updatedPayments = await tx.payment.updateMany({
        where: {
          bookingId: id,
          isDeleted: false,
        },
        data: {
          status: PaymentStatus.REFUND_COMPLETED,
          updatedAt: now,
        },
      });

      return {
        status: 200,
        body: {
          success: true,
          message: 'Refund marked as completed',
          data: {
            booking: updated,
            paymentsUpdated: updatedPayments.count, // Number of payments updated
          },
        },
      };
    });

    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('markRefundCompleted error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to mark refund as completed',
    });
  }
};

module.exports = {
  getBookingDetails,
  cancelBooking,
  markRefundCompleted,
};

