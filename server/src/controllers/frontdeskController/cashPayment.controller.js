/**
 * Cash Payment Controller
 * Handles creation of bookings with cash payments for front-desk
 */

const { PrismaClient, OrderStatus, PaymentStatus, PaymentMethod } = require('@prisma/client');
const { ensurePropertyAccess } = require('./access.utils');
const { toDateOnly, buildDateRange, formatISODate } = require('../../utils/date.utils');
const { sendSuccess, sendError } = require('../../utils/response.utils');
const { normalizePhone, isValidUuid } = require('../../utils/frontdesk.utils');
const { createCashBooking: createCashBookingService } = require('../../services/frontdesk/cashBooking.service');

const prisma = new PrismaClient();

/**
 * Create booking with cash payment
 * POST /api/admin/frontdesk/properties/:propertyId/bookings/cash
 */
const createCashBooking = async (req, res) => {
  const { propertyId } = req.params;

  const {
    propertyRoomTypeId,
    booking = {},
    pricing = {},
    hold = {},
    guest = {},
    payment = {},
    createdBy = {},
  } = req.body || {};

  if (!propertyId) {
    return sendError(res, 'Property identifier is required.', 400);
  }

  // Security: Verify user has access to this property
  try {
    const accessResult = await ensurePropertyAccess({
      prisma,
      propertyId,
      user: req.user,
    });

    if (!accessResult.ok) {
      return res.status(accessResult.status).json(accessResult.body);
    }
  } catch (error) {
    console.error('Error verifying property access:', error);
    return sendError(res, 'Failed to verify property access.', 500);
  }

  // Validate hold records
  const holdRecordIds = Array.isArray(hold.recordIds)
    ? hold.recordIds.filter((id) => typeof id === 'string' && id.trim().length > 0)
    : [];

  if (holdRecordIds.length === 0) {
    return sendError(res, 'Hold records are required. Please create a hold first.', 400);
  }

  // Validate booking data
  const {
    from,
    to,
    adults = 0,
    children = 0,
    infants = 0,
    totalGuests: totalGuestsFromPayload,
    selectedRoomIds = [],
    notes = '',
    mealPlanId = null,
  } = booking;

  if (!from || !to) {
    return sendError(res, 'Check-in and check-out dates are required.', 400);
  }

  const checkInDate = toDateOnly(from);
  const checkOutDate = toDateOnly(to);

  if (!checkInDate || !checkOutDate) {
    return sendError(res, 'Invalid stay dates provided.', 400);
  }

  if (checkInDate >= checkOutDate) {
    return sendError(res, 'Check-out date must be after check-in date.', 400);
  }

  const uniqueRoomIds = Array.from(
    new Set(
      Array.isArray(selectedRoomIds)
        ? selectedRoomIds.filter((id) => typeof id === 'string' && id.trim().length > 0)
        : []
    )
  );

  if (uniqueRoomIds.length === 0) {
    return sendError(res, 'At least one room must be selected.', 400);
  }

  // Validate guest information
  const guestName = (guest.fullName || '').trim();
  const guestEmail = (guest.email || '').trim().toLowerCase();
  const guestPhone = normalizePhone(guest.phone || '');
  const guestAddress = (guest.address || '').trim() || null;

  if (!guestName || guestName.length < 2) {
    return sendError(res, 'Guest full name is required (minimum 2 characters).', 400);
  }

  if (!guestEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) {
    return sendError(res, 'Valid guest email is required.', 400);
  }

  if (!guestPhone || !/^\d{10}$/.test(guestPhone)) {
    return sendError(res, 'Valid guest phone number is required (10 digits).', 400);
  }

  // Validate payment information
  const paymentAmount = Number(pricing.total) || 0;
  const receivedAmount = Number(payment.amount) || 0;
  const receivedBy = (payment.receivedBy || createdBy.label || 'Front desk').trim();
  const paymentDate = payment.paymentDate ? new Date(payment.paymentDate) : new Date();
  const receiptNumber = (payment.receiptNumber || '').trim() || null;

  if (paymentAmount <= 0) {
    return sendError(res, 'Invalid pricing total. Total amount must be greater than zero.', 400);
  }

  // Allow small tolerance for rounding (±1 rupee)
  if (Math.abs(receivedAmount - paymentAmount) > 1) {
    return sendError(res, `Payment amount (₹${receivedAmount}) does not match total (₹${paymentAmount}).`, 400);
  }

  if (paymentDate > new Date()) {
    return sendError(res, 'Payment date cannot be in the future.', 400);
  }

  if (!receivedBy || receivedBy.length < 2) {
    return sendError(res, 'Payment received by information is required.', 400);
  }

  // Validate propertyRoomTypeId
  if (!propertyRoomTypeId || !isValidUuid(propertyRoomTypeId)) {
    return sendError(res, 'Valid property room type identifier is required.', 400);
  }

  // Validate pricing structure
  if (!pricing.nights || pricing.nights < 1) {
    return sendError(res, 'Invalid number of nights.', 400);
  }

  try {
    // Call service to create booking with cash payment
    const result = await createCashBookingService({
      propertyId,
      propertyRoomTypeId,
      booking: {
        from: checkInDate,
        to: checkOutDate,
        adults: Math.max(0, parseInt(adults, 10)),
        children: Math.max(0, parseInt(children, 10)),
        infants: Math.max(0, parseInt(infants, 10)),
        totalGuests: totalGuestsFromPayload || Math.max(0, parseInt(adults, 10) + parseInt(children, 10) + parseInt(infants, 10)),
        selectedRoomIds: uniqueRoomIds,
        notes,
        mealPlanId: mealPlanId || null,
      },
      pricing: {
        total: paymentAmount,
        nights: pricing.nights,
        basePerNightTotal: pricing.basePerNightTotal || 0,
        extrasPerNight: pricing.extrasPerNight || 0,
        totalPerNight: pricing.totalPerNight || 0,
        perRoomBreakdown: pricing.perRoomBreakdown || [],
      },
      hold: {
        recordIds: holdRecordIds,
        holdUntil: hold.holdUntil || null,
      },
      guest: {
        fullName: guestName,
        email: guestEmail,
        phone: guestPhone,
        address: guestAddress,
      },
      payment: {
        amount: receivedAmount,
        receivedBy,
        paymentDate,
        receiptNumber,
      },
      createdBy: {
        type: createdBy.type || 'admin',
        id: createdBy.id || req.user?.id || null,
        label: createdBy.label || receivedBy,
      },
    });

    return sendSuccess(
      res,
      {
        booking: {
          id: result.booking.id,
          bookingNumber: result.booking.bookingNumber,
          status: result.booking.status,
          guestName: result.booking.guestName,
          guestEmail: result.booking.guestEmail,
          guestPhone: result.booking.guestPhone,
          startDate: formatISODate(result.booking.startDate),
          endDate: formatISODate(result.booking.endDate),
          nights: result.booking.nights,
          totalAmount: result.booking.totalAmount,
        },
        payment: {
          id: result.payment.id,
          transactionID: result.payment.transactionID,
          amount: result.payment.amount,
          status: result.payment.status,
          paymentMethod: result.payment.paymentMethod,
          paymentDate: result.payment.paymentDate,
        },
        order: result.order
          ? {
              id: result.order.id,
              status: result.order.status,
              amount: result.order.amount,
            }
          : null,
      },
      'Booking created successfully with cash payment',
      201
    );
  } catch (error) {
    console.error('Error creating cash booking:', error);

    // Handle specific error types
    if (error.code === 'HOLD_EXPIRED' || error.message?.includes('hold')) {
      return sendError(res, 'Hold has expired. Please create a new hold and try again.', 409);
    }

    if (error.code === 'ROOM_BOOKED' || error.message?.includes('already booked')) {
      return sendError(res, 'One or more rooms are no longer available. Please refresh and try again.', 409);
    }

    if (error.code === 'HOLD_NOT_FOUND' || error.message?.includes('hold record')) {
      return sendError(res, 'Hold records not found or invalid. Please create a new hold and try again.', 404);
    }

    return sendError(
      res,
      error.message || 'Failed to create booking with cash payment',
      500,
      process.env.NODE_ENV === 'development' ? { code: error.code, detail: error.message } : null
    );
  }
};

module.exports = {
  createCashBooking,
};

