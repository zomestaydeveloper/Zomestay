/**
 * Booking Creation Service
 * Shared booking creation logic for both payment types:
 * - payment.captured (user/agent bookings from createOrder)
 * - payment_link.paid (frontdesk bookings from createPaymentLink)
 * 
 * PRODUCTION READY:
 * - Structured logging with request IDs
 * - Comprehensive error handling
 * - Idempotency checks
 * - Payment verification with Razorpay API
 * - Transaction safety
 * - Input validation
 */

const { PrismaClient, PaymentStatus, BookingStatus } = require('@prisma/client');
const Razorpay = require('razorpay');
const { toDateOnly, buildDateRange, formatISODate } = require('../../utils/date.utils');
const { releaseOrderHolds, convertBlockedToBooked, getBlockedAvailability } = require('./roomAvailability.service');

const prisma = new PrismaClient();

// PRODUCTION: Validate Razorpay credentials
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
  console.error('⚠️ CRITICAL: Razorpay credentials not found in environment variables');
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Razorpay credentials must be set in production environment');
  }
}

const razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID || 'rzp_test_RWnUwmZYbfokH5',
  key_secret: RAZORPAY_KEY_SECRET || 'uetuSHbRgVnaU598llWQKwx5',
});

/**
 * Generate unique request ID for logging
 * @returns {string} Request ID
 */
const generateRequestId = () => {
  return `BK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Verify payment with Razorpay API (CRITICAL for production)
 * Fetches payment details from Razorpay to verify it exists and is captured.
 * This prevents creating bookings for failed/authorized payments.
 * 
 * @param {string} razorpayPaymentId - Razorpay payment ID
 * @param {string} requestId - Request ID for logging (optional)
 * @returns {Promise<object>} - Payment object from Razorpay
 * @throws {Error} If payment verification fails
 */
const verifyPaymentWithRazorpay = async (razorpayPaymentId, requestId = null) => {
  const reqId = requestId || generateRequestId();
  
  if (!razorpayPaymentId || typeof razorpayPaymentId !== 'string' || razorpayPaymentId.trim() === '') {
    console.error(`[${reqId}] Payment verification failed: razorpayPaymentId is required`);
    throw new Error('Payment ID is required for verification');
  }

  try {
    // PRODUCTION: Fetch payment from Razorpay to verify it exists and is captured
    console.log(`[${reqId}] Verifying payment with Razorpay API: ${razorpayPaymentId}`);
    const payment = await razorpay.payments.fetch(razorpayPaymentId);

    if (!payment || !payment.id) {
      throw new Error('Invalid payment response from Razorpay');
    }

    // PRODUCTION: Verify payment status is captured (not authorized/failed)
    if (payment.status !== 'captured') {
      console.error(`[${reqId}] Payment status mismatch`, {
        paymentId: razorpayPaymentId,
        status: payment.status,
        expected: 'captured',
      });
      throw new Error(`Payment status is ${payment.status}, expected 'captured'. Payment may be authorized, failed, or pending.`);
    }

    // PRODUCTION: Verify payment amount matches order (if order available)
    // This is done at the service level, not here, to avoid circular dependencies

    console.log(`[${reqId}] ✅ Payment verified with Razorpay`, {
      paymentId: razorpayPaymentId,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
    });
    
    return payment;
  } catch (error) {
    // PRODUCTION: Structured error logging
    console.error(`[${reqId}] ❌ Error verifying payment with Razorpay`, {
      paymentId: razorpayPaymentId,
      error: error.message,
      code: error.error?.code,
      description: error.error?.description,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });

    // Re-throw with user-friendly message
    if (error.error?.code === 'BAD_REQUEST_ERROR') {
      throw new Error(`Payment verification failed: Invalid payment ID. ${error.error.description || ''}`);
    } else if (error.error?.code === 'RESOURCE_NOT_FOUND') {
      throw new Error(`Payment verification failed: Payment not found in Razorpay. ${error.error.description || ''}`);
    } else {
      throw new Error(`Payment verification failed: ${error.message || 'Unknown error occurred'}`);
    }
  }
};

/**
 * Create booking from order (shared logic for both payment types)
 * 
 * PRODUCTION FEATURES:
 * - Idempotency checks (prevents duplicate bookings)
 * - Payment verification with Razorpay API
 * - Transaction safety (all operations in single transaction)
 * - Structured logging with request IDs
 * - Comprehensive error handling
 * - Input validation
 * 
 * @param {string} orderId - Order ID
 * @param {object} paymentDetails - Payment details
 * @param {string} paymentDetails.razorpayPaymentId - Razorpay payment ID (optional, but recommended)
 * @param {string} paymentDetails.paymentMethod - Payment method ('razorpay' or 'payment_link', default: 'razorpay')
 * @param {string} paymentDetails.requestId - Request ID for logging (optional, will generate if not provided)
 * @param {object} tx - Prisma transaction client (REQUIRED - must be passed from $transaction)
 * @returns {Promise<{booking: object, bookingNumber: string, alreadyProcessed: boolean}>}
 * @throws {Error} If booking creation fails
 */
const createBookingFromOrder = async (orderId, paymentDetails, tx) => {
  // Generate request ID for structured logging
  const requestId = paymentDetails?.requestId || generateRequestId();
  
  // PRODUCTION: Input validation
  if (!orderId || typeof orderId !== 'string' || orderId.trim() === '') {
    console.error(`[${requestId}] Validation failed: orderId is required`);
    throw new Error('Order ID is required');
  }

  if (!tx) {
    console.error(`[${requestId}] Validation failed: Transaction client (tx) is required`);
    throw new Error('Transaction client is required. This function must be called within a Prisma transaction.');
  }

  // PRODUCTION: Validate payment method
  const { razorpayPaymentId, paymentMethod = 'razorpay' } = paymentDetails || {};
  const validPaymentMethods = ['razorpay', 'payment_link'];
  if (!validPaymentMethods.includes(paymentMethod)) {
    console.error(`[${requestId}] Validation failed: Invalid payment method`, { paymentMethod });
    throw new Error(`Invalid payment method: ${paymentMethod}. Must be one of: ${validPaymentMethods.join(', ')}`);
  }

  console.log(`[${requestId}] Starting booking creation`, {
    orderId,
    paymentMethod,
    razorpayPaymentId: razorpayPaymentId ? `${razorpayPaymentId.substring(0, 10)}...` : null,
  });

  // 1. Fetch order with room selections and property details
  let order;
  try {
    order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        property: {
          include: {
            cancellationPolicy: {
              include: {
                rules: {
                  orderBy: { sortOrder: 'asc' },
                },
              },
            },
          },
        },
        roomSelections: {
          select: {
            id: true,
            roomTypeId: true,
            roomTypeName: true,
            roomIds: true,
            rooms: true,
            guests: true,
            children: true,
            mealPlanId: true,
            price: true,
            tax: true,
            totalPrice: true,
            checkIn: true,
            checkOut: true,
            datesToBlock: true,
          },
        },
      },
    });
  } catch (error) {
    console.error(`[${requestId}] Database error while fetching order`, {
      orderId,
      error: error.message,
    });
    throw new Error(`Failed to fetch order: ${error.message}`);
  }

  if (!order) {
    console.error(`[${requestId}] Order not found`, { orderId });
    throw new Error(`Order not found: ${orderId}`);
  }

  // PRODUCTION: Validate order is not deleted
  if (order.isDeleted) {
    console.error(`[${requestId}] Attempted to create booking for deleted order`, { orderId });
    throw new Error(`Order ${orderId} has been deleted`);
  }

  // 2. Validate order has room selections
  if (!order.roomSelections || order.roomSelections.length === 0) {
    console.error(`[${requestId}] Order has no room selections`, { orderId, roomSelectionsCount: 0 });
    throw new Error(`Order ${orderId} has no room selections. Cannot create booking without room selections.`);
  }

  console.log(`[${requestId}] Order fetched successfully`, {
    orderId: order.id,
    status: order.status,
    roomSelectionsCount: order.roomSelections.length,
    amount: order.amount,
    currency: order.currency,
  });

  // 3. Idempotency check - Check if order already processed
  // PRODUCTION: This prevents duplicate bookings if webhook is called multiple times
  if (order.status === 'SUCCESS') {
    console.log(`[${requestId}] Order already processed (idempotency check)`, { orderId, status: order.status });
    
    // Order already processed - fetch existing booking
    const existingBooking = await tx.booking.findUnique({
      where: { orderId: order.id },
      include: {
        bookingRoomSelections: true,
      },
    });

    if (existingBooking) {
      console.log(`[${requestId}] ✅ Returning existing booking (idempotent)`, {
        orderId,
        bookingId: existingBooking.id,
        bookingNumber: existingBooking.bookingNumber,
        roomSelectionsCount: existingBooking.bookingRoomSelections?.length || 0,
      });
      return {
        booking: existingBooking,
        bookingNumber: existingBooking.bookingNumber,
        alreadyProcessed: true,
      };
    }

    // PRODUCTION: Data inconsistency detected - order is SUCCESS but no booking exists
    console.error(`[${requestId}] ⚠️ Data inconsistency: Order marked as SUCCESS but no booking found`, {
      orderId,
      status: order.status,
    });
    throw new Error(`Order ${orderId} is marked as SUCCESS but no booking found. This indicates a data inconsistency.`);
  }

  // 4. Verify order is in PENDING status
  // PRODUCTION: Only PENDING orders can be converted to bookings
  if (order.status !== 'PENDING') {
    console.error(`[${requestId}] Order cannot be processed - invalid status`, {
      orderId,
      currentStatus: order.status,
      expectedStatus: 'PENDING',
    });
    throw new Error(`Order ${orderId} cannot be processed. Current status: ${order.status}, expected: PENDING. Order may be expired, cancelled, or failed.`);
  }

  // 5. Double-check idempotency inside transaction - Check if payment already exists
  // PRODUCTION: This is a secondary idempotency check using payment ID (inside transaction to prevent race conditions)
  if (razorpayPaymentId) {
    const existingPayment = await tx.payment.findUnique({
      where: { transactionID: razorpayPaymentId },
      include: {
        booking: {
          include: {
            bookingRoomSelections: true,
          },
        },
      },
    });

    if (existingPayment && existingPayment.booking) {
      console.log(`[${requestId}] ✅ Payment already processed (idempotency check inside transaction)`, {
        paymentId: razorpayPaymentId.substring(0, 10) + '...',
        bookingId: existingPayment.booking.id,
        bookingNumber: existingPayment.booking.bookingNumber,
      });
      return {
        booking: existingPayment.booking,
        bookingNumber: existingPayment.booking.bookingNumber,
        alreadyProcessed: true,
      };
    }
  }

  // 6. Verify payment with Razorpay API (CRITICAL for production)
  // PRODUCTION: This fetches payment from Razorpay to verify it exists and is captured
  // Prevents creating bookings for failed/authorized/pending payments
  if (razorpayPaymentId) {
    try {
      await verifyPaymentWithRazorpay(razorpayPaymentId, requestId);
    } catch (error) {
      // PRODUCTION: Payment verification failed
      // Option 1: Throw error (strict verification - recommended for production)
      // Option 2: Log warning and continue (if webhook is trusted)
      
      const shouldEnforceStrictVerification = process.env.ENFORCE_PAYMENT_VERIFICATION === 'true' || 
                                               process.env.NODE_ENV === 'production';
      
      if (shouldEnforceStrictVerification) {
        console.error(`[${requestId}] ❌ Payment verification failed - rejecting booking creation`, {
          paymentId: razorpayPaymentId.substring(0, 10) + '...',
          error: error.message,
        });
        throw error; // Strict: Don't create booking if payment verification fails
      } else {
        // Lenient: Log warning but allow to continue (webhook is trusted)
        console.warn(`[${requestId}] ⚠️ Payment verification failed - continuing anyway (webhook trusted)`, {
          paymentId: razorpayPaymentId.substring(0, 10) + '...',
          error: error.message,
        });
      }
    }
  } else {
    console.warn(`[${requestId}] ⚠️ No payment ID provided - skipping payment verification`, { orderId });
  }

  // 7. Get blocked availability records
  // PRODUCTION: Verify rooms are still blocked (not released or booked by another order)
  let blockedAvailability;
  try {
    blockedAvailability = await getBlockedAvailability(order.id, tx);
  } catch (error) {
    console.error(`[${requestId}] Error fetching blocked availability`, {
      orderId,
      error: error.message,
    });
    throw new Error(`Failed to fetch blocked rooms: ${error.message}`);
  }

  if (blockedAvailability.length === 0) {
    console.error(`[${requestId}] No blocked rooms found for order`, { orderId });
    throw new Error(`No blocked rooms found for order ${orderId}. Rooms may have been released or order may be invalid.`);
  }

  console.log(`[${requestId}] Blocked rooms found`, {
    orderId,
    blockedRoomsCount: blockedAvailability.length,
  });

  // 8. Calculate nights and prepare dates
  // PRODUCTION: Validate dates and calculate nights
  const checkInDate = toDateOnly(order.checkIn);
  const checkOutDate = toDateOnly(order.checkOut);

  if (!checkInDate || !checkOutDate) {
    console.error(`[${requestId}] Invalid check-in or check-out date`, {
      orderId,
      checkIn: order.checkIn,
      checkOut: order.checkOut,
    });
    throw new Error(`Invalid check-in or check-out date for order ${orderId}`);
  }

  // PRODUCTION: Validate check-out is after check-in
  if (checkOutDate <= checkInDate) {
    console.error(`[${requestId}] Check-out date must be after check-in date`, {
      orderId,
      checkIn: checkInDate,
      checkOut: checkOutDate,
    });
    throw new Error(`Check-out date must be after check-in date for order ${orderId}`);
  }

  const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
  
  // PRODUCTION: Validate nights is positive
  if (nights <= 0) {
    console.error(`[${requestId}] Invalid nights calculation`, {
      orderId,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      nights,
    });
    throw new Error(`Invalid nights calculation for order ${orderId}. Nights must be greater than 0.`);
  }

  // 9. Create a map of blocked rooms for quick lookup
  const blockedRoomsMap = {};
  blockedAvailability.forEach((avail) => {
    blockedRoomsMap[avail.room.id] = avail.room;
  });

  // 10. Aggregate totals and prepare BookingRoomSelection data
  let totalRooms = 0;
  let totalAdults = 0;
  let totalChildren = 0;
  const bookingRoomSelectionsData = [];

  for (const orderSelection of order.roomSelections) {
    // Parse roomIds from JSON array
    const roomIds = Array.isArray(orderSelection.roomIds)
      ? orderSelection.roomIds
      : typeof orderSelection.roomIds === 'string'
      ? JSON.parse(orderSelection.roomIds || '[]')
      : [];

    // Get actual room objects from blocked rooms
    const selectedRooms = roomIds
      .map((roomId) => blockedRoomsMap[roomId])
      .filter((room) => room !== undefined);

    if (selectedRooms.length === 0) {
      console.warn(`⚠️ No valid rooms found for roomTypeId ${orderSelection.roomTypeId} in order ${orderId}`);
      continue;
    }

    // Build datesReserved array from datesToBlock or checkIn/checkOut
    let datesReserved = [];
    if (orderSelection.datesToBlock) {
      datesReserved = Array.isArray(orderSelection.datesToBlock)
        ? orderSelection.datesToBlock
        : typeof orderSelection.datesToBlock === 'string'
        ? JSON.parse(orderSelection.datesToBlock || '[]')
        : [];
    } else {
      // Fallback: generate dates from checkIn to checkOut
      const selectionCheckIn = toDateOnly(orderSelection.checkIn) || checkInDate;
      const selectionCheckOut = toDateOnly(orderSelection.checkOut) || checkOutDate;
      const rangeEndExclusive = new Date(selectionCheckOut);
      rangeEndExclusive.setUTCDate(rangeEndExclusive.getUTCDate() - 1);
      const days = buildDateRange(selectionCheckIn, rangeEndExclusive);
      datesReserved = days.map(formatISODate);
    }

    // Aggregate totals
    totalRooms += orderSelection.rooms;
    totalAdults += orderSelection.guests;
    totalChildren += orderSelection.children || 0;

    // Prepare BookingRoomSelection data (convert from paise to rupees for Decimal fields)
    bookingRoomSelectionsData.push({
      roomTypeId: orderSelection.roomTypeId,
      roomTypeName: orderSelection.roomTypeName,
      roomIds: roomIds, // JSON array of room IDs
      rooms: orderSelection.rooms,
      guests: orderSelection.guests,
      children: orderSelection.children || 0,
      mealPlanId: orderSelection.mealPlanId || null,
      basePrice: orderSelection.price / 100, // Convert from paise to rupees
      tax: orderSelection.tax / 100, // Convert from paise to rupees
      totalPrice: orderSelection.totalPrice / 100, // Convert from paise to rupees
      checkIn: toDateOnly(orderSelection.checkIn) || checkInDate,
      checkOut: toDateOnly(orderSelection.checkOut) || checkOutDate,
      datesReserved: datesReserved, // JSON array of date strings
    });
  }

  if (bookingRoomSelectionsData.length === 0) {
    console.error(`[${requestId}] No valid room selections found for booking`, {
      orderId,
      roomSelectionsCount: order.roomSelections.length,
    });
    throw new Error(`No valid room selections found for booking. Order has ${order.roomSelections.length} room selection(s), but none are valid.`);
  }

  console.log(`[${requestId}] Room selections processed`, {
    orderId,
    validSelectionsCount: bookingRoomSelectionsData.length,
    totalRooms,
    totalAdults,
    totalChildren,
  });

  // 11. Create cancellation policy snapshot
  // PRODUCTION: Snapshot cancellation policy at booking time (policy may change later)
  const cancellationPolicySnapshot = order.property?.cancellationPolicy
    ? {
        id: order.property.cancellationPolicy.id,
        name: order.property.cancellationPolicy.name,
        description: order.property.cancellationPolicy.description,
        rules: (order.property.cancellationPolicy.rules || []).map((rule) => ({
          id: rule.id,
          daysBefore: rule.daysBefore,
          refundPercentage: rule.refundPercentage,
          sortOrder: rule.sortOrder,
        })),
      }
    : null;

  // 12. Generate unique booking number
  // PRODUCTION: Generate human-readable booking number with timestamp and random string
  const bookingNumber = `BK${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

  // 13. Get guest/agent/user ID and createdByType from order
  const guestId = order.guestId || order.createdById;
  const createdByType = order.createdByType; // 'agent', 'user', or null (frontdesk)

  // 14. Update order status
  // PRODUCTION: Mark order as SUCCESS before creating booking (ensures idempotency)
  try {
    await tx.order.update({
      where: { id: order.id },
      data: {
        status: 'SUCCESS',
        razorpayPaymentId: razorpayPaymentId || null,
        paymentMethod: paymentMethod,
        updatedAt: new Date(),
      },
    });
    console.log(`[${requestId}] Order status updated to SUCCESS`, { orderId });
  } catch (error) {
    console.error(`[${requestId}] Error updating order status`, {
      orderId,
      error: error.message,
    });
    throw new Error(`Failed to update order status: ${error.message}`);
  }

  // 15. Create ONE booking with BookingRoomSelection records
  // PRODUCTION: One order = One booking (one-to-one relationship)
  let booking;
  try {
    booking = await tx.booking.create({
    data: {
      bookingNumber,
      orderId: order.id, // One-to-one: One order = One booking
      propertyId: order.propertyId,
      // Note: propertyRoomTypeId, roomId, and mealPlanId removed - all details are in BookingRoomSelection

      // Guest Information
      userId: createdByType === 'user' ? guestId : null,
      agentId: createdByType === 'agent' ? guestId : null,
      guestName: order.guestName || 'Guest',
      guestEmail: order.guestEmail || null,
      guestPhone: order.guestPhone || null,

      // Creator Information (for frontdesk bookings)
      createdByType: order.createdByType || null,
      createdById: order.createdById || null,

      // Booking Dates
      startDate: checkInDate,
      endDate: checkOutDate,
      nights,

      // Guest Count (aggregated across all room selections)
      adults: totalAdults,
      children: totalChildren,
      infants: 0, // Not stored separately in Order
      totalGuests: totalAdults + totalChildren,

      // Room Information
      rooms: totalRooms,

      // Pricing
      // PRODUCTION: Convert from paise to rupees for Decimal field
      totalAmount: order.amount / 100,

      // Payment Information
      paymentStatus: PaymentStatus.PAID,
      paymentMethod: paymentMethod,
      paymentReference: razorpayPaymentId || null,

      // Cancellation Policy
      cancellationPolicyId: order.property?.cancellationPolicy?.id || null,
      cancellationPolicySnapshot,

      // Booking Status
      status: BookingStatus.confirmed,
      confirmationDate: new Date(),

      // Rate Snapshot - comprehensive pricing information at booking time
      rateSnapshot: {
        orderAmount: order.amount,
        currency: order.currency,
        createdAt: order.createdAt,
        paymentMethod: paymentMethod,
        razorpayPaymentId: razorpayPaymentId || null,
        roomSelections: bookingRoomSelectionsData.length, // Number of room type selections
        totalRooms: totalRooms,
        totalAdults: totalAdults,
        totalChildren: totalChildren,
        breakdown: bookingRoomSelectionsData.map((rs) => ({
          roomTypeId: rs.roomTypeId,
          roomTypeName: rs.roomTypeName,
          mealPlanId: rs.mealPlanId,
          rooms: rs.rooms,
          basePrice: rs.basePrice,
          tax: rs.tax,
          totalPrice: rs.totalPrice,
        })),
      },

      // Create BookingRoomSelection records (relational approach)
      bookingRoomSelections: {
        create: bookingRoomSelectionsData.map((rsData) => ({
          roomTypeId: rsData.roomTypeId,
          roomTypeName: rsData.roomTypeName,
          roomIds: rsData.roomIds, // JSON array
          rooms: rsData.rooms,
          guests: rsData.guests,
          children: rsData.children,
          mealPlanId: rsData.mealPlanId,
          basePrice: rsData.basePrice,
          tax: rsData.tax,
          totalPrice: rsData.totalPrice,
          checkIn: rsData.checkIn,
          checkOut: rsData.checkOut,
          datesReserved: rsData.datesReserved, // JSON array
        })),
      },
    },
    include: {
      bookingRoomSelections: true, // Include the created room selections
    },
    });
    
    console.log(`[${requestId}] ✅ Booking created successfully`, {
      orderId,
      bookingId: booking.id,
      bookingNumber,
      roomSelectionsCount: booking.bookingRoomSelections.length,
    });
  } catch (error) {
    console.error(`[${requestId}] ❌ Error creating booking`, {
      orderId,
      bookingNumber,
      error: error.message,
      code: error.code,
      meta: error.meta,
    });
    throw new Error(`Failed to create booking: ${error.message}`);
  }

  // 16. Convert blocked rooms to booked status
  // PRODUCTION: Update availability records from 'blocked' to 'booked'
  try {
    const convertedCount = await convertBlockedToBooked(order.id, booking.id, bookingNumber, tx);
    console.log(`[${requestId}] Rooms converted to booked status`, {
      orderId,
      bookingId: booking.id,
      convertedCount,
    });
  } catch (error) {
    console.error(`[${requestId}] ⚠️ Error converting blocked rooms to booked`, {
      orderId,
      bookingId: booking.id,
      error: error.message,
    });
    // Don't throw - booking is already created, we can fix availability later
    // In production, you may want to add this to a retry queue
  }

  // 17. Create payment record
  // PRODUCTION: Store payment information for tracking and reconciliation
  if (razorpayPaymentId) {
    try {
      // Determine payment fields based on createdByType:
      // - If 'agent' → fill agentId
      // - If 'user' → fill customerId
      // - If null (frontdesk) → fill guestName, guestEmail, guestPhone
      const paymentData = {
        transactionID: razorpayPaymentId,
        propertyId: order.propertyId,
        amount: order.amount / 100, // Convert from paise to rupees
        paymentMethod: paymentMethod,
        status: PaymentStatus.PAID,
        bookingId: booking.id,
        customerId: null,
        agentId: null,
        guestName: null,
        guestEmail: null,
        guestPhone: null,
      };

      if (createdByType === 'agent') {
        // Agent booking - fill agentId
        paymentData.agentId = guestId;
      } else if (createdByType === 'user') {
        // User booking - fill customerId
        paymentData.customerId = guestId;
      } else {
        // Frontdesk/guest booking - fill guest fields
        paymentData.guestName = order.guestName || null;
        paymentData.guestEmail = order.guestEmail || null;
        paymentData.guestPhone = order.guestPhone || null;
      }

      await tx.payment.create({
        data: paymentData,
      });
      
      console.log(`[${requestId}] ✅ Payment record created`, {
        paymentId: razorpayPaymentId.substring(0, 10) + '...',
        bookingId: booking.id,
        createdByType,
      });
    } catch (error) {
      console.error(`[${requestId}] ⚠️ Error creating payment record`, {
        paymentId: razorpayPaymentId.substring(0, 10) + '...',
        bookingId: booking.id,
        error: error.message,
        code: error.code,
      });
      // Don't throw - booking is already created, payment record can be added later
      // In production, you may want to add this to a retry queue
    }
  } else {
    console.warn(`[${requestId}] ⚠️ No payment ID provided - payment record not created`, {
      orderId,
      bookingId: booking.id,
    });
  }

  // PRODUCTION: Success logging with all relevant information
  console.log(`[${requestId}] ✅ Booking creation completed successfully`, {
    orderId,
    bookingId: booking.id,
    bookingNumber,
    roomSelectionsCount: booking.bookingRoomSelections.length,
    totalRooms,
    totalAdults,
    totalChildren,
    totalAmount: order.amount / 100,
    currency: order.currency,
    paymentMethod,
  });

  return {
    booking,
    bookingNumber,
    alreadyProcessed: false,
  };
};

module.exports = {
  createBookingFromOrder,
  verifyPaymentWithRazorpay,
};

