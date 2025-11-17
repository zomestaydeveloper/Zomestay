/**
 * Webhook Controller
 * Handles Razorpay webhook events for payment verification
 */

const crypto = require('crypto');
const { PrismaClient, PaymentStatus, BookingStatus } = require('@prisma/client');
const { sendSuccess, sendError } = require('../../utils/response.utils');
const { buildDateRange, formatISODate, toDateOnly } = require('../../utils/date.utils');

const prisma = new PrismaClient();

const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || '';

/**
 * Verify Razorpay webhook signature
 */
const verifyWebhookSignature = (payload, signature) => {
  if (!RAZORPAY_WEBHOOK_SECRET) {
    console.warn('⚠️ RAZORPAY_WEBHOOK_SECRET not set - webhook signature verification skipped');
    return true; // In development, allow without secret (not recommended for production)
  }

  if (!signature) {
    return false;
  }

  try {
    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
      .update(payload, 'utf8')
      .digest('hex');

    const receivedBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');

    // timingSafeEqual requires both buffers to be the same length
    if (receivedBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(receivedBuffer, expectedBuffer);
  } catch (error) {
    console.error('❌ Error verifying webhook signature:', error);
    return false;
  }
};

/**
 * Release holds for an order
 */
const releaseOrderHolds = async (orderId, tx = prisma) => {
  const result = await tx.availability.deleteMany({
    where: {
      blockedBy: orderId,
      status: 'blocked',
      isDeleted: false,
    },
  });
  return result.count;
};

/**
 * Handle payment link paid event - create booking
 */
const handlePaymentLinkPaid = async (eventData) => {
  const { payment_link, payment } = eventData.payload || {};
  const paymentLinkId = payment_link?.entity?.id || payment_link?.id;
  const razorpayPaymentId = payment?.entity?.id || payment?.id;
  const razorpayOrderId = payment_link?.entity?.order_id || payment_link?.order_id;

  if (!paymentLinkId || !razorpayOrderId) {
    console.error('❌ Payment link paid event missing paymentLinkId or razorpayOrderId:', eventData);
    throw new Error('Invalid webhook payload: missing payment link or order identifier');
  }

  try {
    // Find the order by razorpayOrderId with room selections
    const order = await prisma.order.findUnique({
      where: { razorpayOrderId },
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

    if (!order) {
      console.error(`❌ Order not found for razorpayOrderId: ${razorpayOrderId}`);
      throw new Error(`Order not found for payment link ${paymentLinkId}`);
    }

    // Idempotency check: if order is already processed, skip
    if (order.status === 'SUCCESS') {
      console.log(`ℹ️ Order ${order.id} already processed - skipping webhook handler (idempotency)`);
      return { orderId: order.id, bookingId: order.booking?.id || null, skipped: true };
    }

    // Verify order is in PENDING status
    if (order.status !== 'PENDING') {
      console.error(`❌ Order ${order.id} is not in PENDING status (current: ${order.status})`);
      throw new Error(`Order ${order.id} cannot be processed - status is ${order.status}`);
    }

    // Get all blocked availability records for this order
    const blockedAvailability = await prisma.availability.findMany({
      where: {
        blockedBy: order.id,
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

    if (blockedAvailability.length === 0) {
      console.error(`❌ No blocked availability found for order ${order.id}`);
      throw new Error(`No blocked rooms found for order ${order.id}`);
    }

    // Verify payment amount matches order amount (optional but recommended)
    const paymentAmount = payment?.entity?.amount || payment?.amount || 0;
    if (paymentAmount > 0 && paymentAmount !== order.amount) {
      console.warn(
        `⚠️ Payment amount mismatch: order=${order.amount}, payment=${paymentAmount}`
      );
      // Don't throw - allow manual reconciliation if needed
    }

    // Validate order has room selections
    if (!order.roomSelections || order.roomSelections.length === 0) {
      console.error(`❌ Order ${order.id} has no room selections`);
      throw new Error(`Order ${order.id} has no room selections`);
    }

    // Calculate nights
    const checkInDate = toDateOnly(order.checkIn);
    const checkOutDate = toDateOnly(order.checkOut);
    if (!checkInDate || !checkOutDate) {
      throw new Error('Invalid check-in or check-out date');
    }
    const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));

    // Create a map of blocked rooms for quick lookup
    const blockedRoomsMap = {};
    blockedAvailability.forEach((avail) => {
      blockedRoomsMap[avail.room.id] = avail.room;
    });

    // Aggregate totals and determine primary values from OrderRoomSelections
    let totalRooms = 0;
    let totalAdults = 0;
    let totalChildren = 0;
    let primaryRoomTypeId = null;
    let primaryRoomId = null;
    let primaryMealPlanId = null;
    const bookingRoomSelectionsData = [];

    // Prepare data for BookingRoomSelection records from OrderRoomSelection
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
        console.warn(`⚠️ No valid rooms found for roomTypeId ${orderSelection.roomTypeId} in order ${order.id}`);
        continue;
      }

      // Set primary values from first selection (for backward compatibility)
      if (!primaryRoomTypeId) {
        primaryRoomTypeId = orderSelection.roomTypeId;
        primaryRoomId = selectedRooms[0].id;
        primaryMealPlanId = orderSelection.mealPlanId || null;
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
      throw new Error('No valid room selections found for booking');
    }

    // Create cancellation policy snapshot
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

    // Generate unique booking number
    const bookingNumber = `BK${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

    // Process in transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update order status
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'SUCCESS',
          razorpayPaymentId: razorpayPaymentId || null,
          paymentMethod: 'payment_link',
          updatedAt: new Date(),
        },
      });

      // 2. Create ONE booking with BookingRoomSelection records
      const booking = await tx.booking.create({
        data: {
          bookingNumber,
          orderId: order.id, // One-to-one: One order = One booking
          propertyId: order.propertyId,
          propertyRoomTypeId: primaryRoomTypeId, // Primary room type (first one)
          roomId: primaryRoomId, // Primary room (first one)
          mealPlanId: primaryMealPlanId, // Primary meal plan (first one, may be null)

          // Guest Information
          userId: order.guestId || null,
          guestName: order.guestName || 'Guest',
          guestEmail: order.guestEmail || null,
          guestPhone: order.guestPhone || null,

          // Booking Dates
          startDate: checkInDate,
          endDate: checkOutDate,
          nights,

          // Guest Count
          adults: totalAdults,
          children: totalChildren,
          infants: 0, // Not stored separately in Order
          totalGuests: totalAdults + totalChildren,

          // Room Information
          rooms: totalRooms,

          // Pricing
          totalAmount: order.amount / 100, // Convert from paise to rupees

          // Payment Information
          paymentStatus: PaymentStatus.PAID,
          paymentMethod: 'payment_link',
          paymentReference: razorpayPaymentId || paymentLinkId,

          // Cancellation Policy
          cancellationPolicyId: order.property?.cancellationPolicy?.id || null,
          cancellationPolicySnapshot,

          // Booking Status
          status: BookingStatus.confirmed,
          confirmationDate: new Date(),

          // Rate Snapshot
          rateSnapshot: {
            orderAmount: order.amount,
            currency: order.currency,
            createdAt: order.createdAt,
            paymentLinkId,
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

      // 3. Convert blocked availability to booked status
      await tx.availability.updateMany({
        where: {
          blockedBy: order.id,
          status: 'blocked',
          isDeleted: false,
        },
        data: {
          status: 'booked',
          reason: `Confirmed booking ${bookingNumber}`,
          blockedBy: booking.id, // Link to the booking
          holdExpiresAt: null, // Clear expiry since booking is confirmed
        },
      });

      // 4. Create payment record
      if (razorpayPaymentId) {
        await tx.payment.create({
          data: {
            transactionID: razorpayPaymentId,
            customerId: order.guestId || null,
            propertyId: order.propertyId,
            amount: order.amount / 100, // Convert from paise to rupees
            paymentMethod: 'payment_link',
            status: PaymentStatus.PAID,
            bookingId: booking.id,
            // Guest information for frontdesk payments
            guestName: order.guestName || null,
            guestEmail: order.guestEmail || null,
            guestPhone: order.guestPhone || null,
          },
        });
      }

      return { booking, bookingNumber };
    });

    console.log(
      `✅ Payment link paid: Order ${order.id} → Booking ${result.bookingNumber} (${result.booking.bookingRoomSelections.length} room selection(s))`
    );

    return {
      orderId: order.id,
      bookingId: result.booking.id,
      bookingNumber: result.bookingNumber,
      roomSelectionsCount: result.booking.bookingRoomSelections.length,
    };
  } catch (error) {
    console.error('❌ Error handling payment link paid event:', error);
    throw error;
  }
};

/**
 * Handle payment link expired event - release holds
 */
const handlePaymentLinkExpired = async (eventData) => {
  const { payment_link } = eventData.payload || {};
  const paymentLinkId = payment_link?.entity?.id || payment_link?.id;
  const razorpayOrderId = payment_link?.entity?.order_id || payment_link?.order_id;

  if (!razorpayOrderId) {
    console.error('❌ Payment link expired event missing razorpayOrderId:', eventData);
    throw new Error('Invalid webhook payload: missing order identifier');
  }

  try {
    const order = await prisma.order.findUnique({
      where: { razorpayOrderId },
    });

    if (!order) {
      console.error(`❌ Order not found for razorpayOrderId: ${razorpayOrderId}`);
      return { orderId: null, released: 0, skipped: true };
    }

    // Idempotency check
    if (order.status === 'EXPIRED' || order.status === 'CANCELLED' || order.status === 'FAILED') {
      console.log(`ℹ️ Order ${order.id} already marked as ${order.status} - skipping`);
      return { orderId: order.id, released: 0, skipped: true };
    }

    // Only process PENDING orders
    if (order.status !== 'PENDING') {
      console.log(
        `ℹ️ Order ${order.id} is not in PENDING status (current: ${order.status}) - skipping expiration handler`
      );
      return { orderId: order.id, released: 0, skipped: true };
    }

    const result = await prisma.$transaction(async (tx) => {
      // Update order status
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'EXPIRED',
          updatedAt: new Date(),
        },
      });

      // Release holds
      const releasedCount = await releaseOrderHolds(order.id, tx);

      return releasedCount;
    });

    console.log(
      `✅ Payment link expired: Order ${order.id} → Released ${result} hold(s)`
    );

    return { orderId: order.id, released: result };
  } catch (error) {
    console.error('❌ Error handling payment link expired event:', error);
    throw error;
  }
};

/**
 * Handle payment link cancelled event - release holds
 */
const handlePaymentLinkCancelled = async (eventData) => {
  const { payment_link } = eventData.payload || {};
  const paymentLinkId = payment_link?.entity?.id || payment_link?.id;
  const razorpayOrderId = payment_link?.entity?.order_id || payment_link?.order_id;

  if (!razorpayOrderId) {
    console.error('❌ Payment link cancelled event missing razorpayOrderId:', eventData);
    throw new Error('Invalid webhook payload: missing order identifier');
  }

  try {
    const order = await prisma.order.findUnique({
      where: { razorpayOrderId },
    });

    if (!order) {
      console.error(`❌ Order not found for razorpayOrderId: ${razorpayOrderId}`);
      return { orderId: null, released: 0, skipped: true };
    }

    // Idempotency check
    if (order.status === 'CANCELLED' || order.status === 'EXPIRED' || order.status === 'FAILED') {
      console.log(`ℹ️ Order ${order.id} already marked as ${order.status} - skipping`);
      return { orderId: order.id, released: 0, skipped: true };
    }

    // Only process PENDING orders
    if (order.status !== 'PENDING') {
      console.log(
        `ℹ️ Order ${order.id} is not in PENDING status (current: ${order.status}) - skipping cancellation handler`
      );
      return { orderId: order.id, released: 0, skipped: true };
    }

    const result = await prisma.$transaction(async (tx) => {
      // Update order status
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'CANCELLED',
          updatedAt: new Date(),
        },
      });

      // Release holds
      const releasedCount = await releaseOrderHolds(order.id, tx);

      return releasedCount;
    });

    console.log(
      `✅ Payment link cancelled: Order ${order.id} → Released ${result} hold(s)`
    );

    return { orderId: order.id, released: result };
  } catch (error) {
    console.error('❌ Error handling payment link cancelled event:', error);
    throw error;
  }
};

/**
 * Razorpay Payment Verification Webhook
 * 
 * When payment status changes (paid/cancelled/expired), Razorpay calls this endpoint
 * Flow:
 * 1. Razorpay sends POST request to /webhooks/verify-payment
 * 2. We verify signature (security check)
 * 3. We check payment status from webhook event
 * 4. We process based on status:
 *    - payment_link.paid → Create booking, mark rooms as booked
 *    - payment_link.expired → Release rooms, mark order as expired
 *    - payment_link.cancelled → Release rooms, mark order as cancelled
 */
const verifyPaymentWebhook = async (req, res) => {
  // Get webhook signature from headers (Razorpay sends this for security)
  const signature = req.headers['x-razorpay-signature'];
  if (!signature) {
    console.error('❌ Webhook request missing X-Razorpay-Signature header');
    return sendError(res, 'Missing webhook signature', 400);
  }

  // Get raw body (express.raw() gives us Buffer)
  // Convert Buffer to string for signature verification
  let rawBody;
  let eventData;
  
  if (Buffer.isBuffer(req.body)) {
    // Body is a Buffer (from express.raw())
    rawBody = req.body.toString('utf8');
    try {
      eventData = JSON.parse(rawBody);
    } catch (e) {
      console.error('❌ Failed to parse webhook body:', e);
      return sendError(res, 'Invalid JSON payload', 400);
    }
  } else if (typeof req.body === 'string') {
    // Body is already a string
    rawBody = req.body;
    try {
      eventData = JSON.parse(req.body);
    } catch (e) {
      console.error('❌ Failed to parse webhook body:', e);
      return sendError(res, 'Invalid JSON payload', 400);
    }
  } else {
    // Body is already parsed (fallback)
    rawBody = JSON.stringify(req.body);
    eventData = req.body;
  }

  // Verify webhook signature (security check - ensures request is from Razorpay)
  if (!verifyWebhookSignature(rawBody, signature)) {
    console.error('❌ Webhook signature verification failed');
    return sendError(res, 'Invalid webhook signature', 401);
  }

  // Extract event type from webhook payload
  const event = eventData?.event || eventData?.entity?.event;

  console.log(`📥 Razorpay webhook received: ${event}`);

  try {
    let result = null;

    switch (event) {
      case 'payment_link.paid':
        result = await handlePaymentLinkPaid(eventData);
        break;

      case 'payment_link.expired':
        result = await handlePaymentLinkExpired(eventData);
        break;

      case 'payment_link.cancelled':
        result = await handlePaymentLinkCancelled(eventData);
        break;

      default:
        console.log(`ℹ️ Unhandled webhook event: ${event}`);
        return sendSuccess(res, null, `Event ${event} received but not processed`, 200);
    }

    return sendSuccess(res, result, `Webhook event ${event} processed successfully`, 200);
  } catch (error) {
    console.error(`❌ Error processing webhook event ${event}:`, error);
    // Return 200 to prevent Razorpay from retrying (we'll handle errors manually)
    // In production, you may want to return 500 for retryable errors
    return sendSuccess(
      res,
      { error: process.env.NODE_ENV === 'development' ? error.stack : undefined },
      `Error processing webhook event: ${error.message}`,
      200
    );
  }
};

const WebhookController = {
  verifyPaymentWebhook,
};

module.exports = WebhookController;

