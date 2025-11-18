/**
 * Unified Razorpay Webhook Controller
 * Handles ALL Razorpay webhook events from a single endpoint
 * 
 * PRODUCTION READY:
 * - Signature verification for security
 * - Structured logging with request IDs
 * - Comprehensive error handling
 * - Idempotency checks (via bookingCreation service)
 * - Transaction safety
 * - Always returns 200 to Razorpay (prevents retries)
 * 
 * Supported Events:
 * - payment.captured (user/agent bookings from createOrder)
 * - payment_link.paid (frontdesk bookings from createPaymentLink)
 * - payment.failed (payment failed)
 * - payment_link.expired (payment link expired)
 * - payment_link.cancelled (payment link cancelled)
 */

const { PrismaClient } = require('@prisma/client');
const { sendSuccess, sendError } = require('../../utils/response.utils');
const { verifyWebhookSignature } = require('../../services/payment/webHookVerification.service');
const { createBookingFromOrder } = require('../../services/payment/bookingCreation.service');
const { releaseOrderHolds } = require('../../services/payment/roomAvailability.service');

const prisma = new PrismaClient();

/**
 * Generate unique request ID for logging
 * @returns {string} Request ID
 */
const generateRequestId = () => {
  return `WH-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Extract order ID from webhook payload
 * Handles both payment.captured (order_id in payment.entity) and payment_link.paid (order_id in payment_link.entity)
 * @param {object} eventData - Webhook event data
 * @param {string} event - Event type
 * @returns {string|null} Razorpay order ID
 */
const extractOrderId = (eventData, event) => {
  if (!eventData || !eventData.payload) {
    return null;
  }

  const { payment, payment_link } = eventData.payload;

  // payment.captured: order_id is in payment.entity.order_id
  if (event === 'payment.captured' || event === 'payment.failed') {
    return payment?.entity?.order_id || payment?.order_id || null;
  }

  // payment_link.*: order_id is in payment_link.entity.order_id
  if (event.startsWith('payment_link.')) {
    return payment_link?.entity?.order_id || payment_link?.order_id || null;
  }

  return null;
};

/**
 * Extract payment ID from webhook payload
 * @param {object} eventData - Webhook event data
 * @returns {string|null} Razorpay payment ID
 */
const extractPaymentId = (eventData) => {
  if (!eventData || !eventData.payload) {
    return null;
  }

  const { payment } = eventData.payload;
  return payment?.entity?.id || payment?.id || null;
};

/**
 * Handle payment.captured event (user/agent bookings from createOrder)
 * Creates booking from order when payment is captured
 * 
 * @param {object} eventData - Webhook event data
 * @param {string} requestId - Request ID for logging
 * @returns {Promise<object>} Result object with booking details
 */
const handlePaymentCaptured = async (eventData, requestId) => {
  console.log(`[${requestId}] Handling payment.captured event`);

  const razorpayOrderId = extractOrderId(eventData, 'payment.captured');
  const razorpayPaymentId = extractPaymentId(eventData);

  if (!razorpayOrderId) {
    console.error(`[${requestId}] ❌ Payment captured event missing order_id`, { eventData });
    throw new Error('Invalid webhook payload: missing order identifier');
  }

  try {
    // Find order by razorpayOrderId
    const order = await prisma.order.findUnique({
      where: { razorpayOrderId },
      select: { id: true, status: true },
    });

    if (!order) {
      console.error(`[${requestId}] ❌ Order not found for razorpayOrderId`, { razorpayOrderId });
      throw new Error(`Order not found for razorpayOrderId: ${razorpayOrderId}`);
    }

    // Process booking creation in transaction
    const result = await prisma.$transaction(async (tx) => {
      const bookingResult = await createBookingFromOrder(
        order.id,
        {
          razorpayPaymentId,
          paymentMethod: 'razorpay',
          requestId,
        },
        tx
      );

      return bookingResult;
    });

    console.log(`[${requestId}] ✅ Payment captured: Order ${order.id} → Booking ${result.bookingNumber}`, {
      orderId: order.id,
      bookingId: result.booking.id,
      bookingNumber: result.bookingNumber,
      alreadyProcessed: result.alreadyProcessed,
    });

    return {
      event: 'payment.captured',
      orderId: order.id,
      bookingId: result.booking.id,
      bookingNumber: result.bookingNumber,
      alreadyProcessed: result.alreadyProcessed,
      roomSelectionsCount: result.booking.bookingRoomSelections?.length || 0,
    };
  } catch (error) {
    console.error(`[${requestId}] ❌ Error handling payment.captured event`, {
      razorpayOrderId,
      razorpayPaymentId: razorpayPaymentId ? `${razorpayPaymentId.substring(0, 10)}...` : null,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
    throw error;
  }
};

/**
 * Handle payment_link.paid event (frontdesk bookings from createPaymentLink)
 * Creates booking from order when payment link is paid
 * 
 * @param {object} eventData - Webhook event data
 * @param {string} requestId - Request ID for logging
 * @returns {Promise<object>} Result object with booking details
 */
const handlePaymentLinkPaid = async (eventData, requestId) => {
  console.log(`[${requestId}] Handling payment_link.paid event`);

  const razorpayOrderId = extractOrderId(eventData, 'payment_link.paid');
  const razorpayPaymentId = extractPaymentId(eventData);

  if (!razorpayOrderId) {
    console.error(`[${requestId}] ❌ Payment link paid event missing order_id`, { eventData });
    throw new Error('Invalid webhook payload: missing order identifier');
  }

  try {
    // Find order by razorpayOrderId (this is the Razorpay order ID from webhook)
    let order = await prisma.order.findUnique({
      where: { razorpayOrderId },
      select: { id: true, status: true },
    });

    // FALLBACK: Handle legacy orders that were saved with payment link ID instead of order ID
    // This fixes the issue where old payment links saved "plink_..." instead of "order_..."
    if (!order) {
      console.warn(`[${requestId}] ⚠️ Order not found with order_id, checking for legacy payment link ID...`);
      
      // Extract payment link ID from webhook payload
      const paymentLinkId = eventData?.payload?.payment_link?.entity?.id || 
                           eventData?.payload?.payment_link?.id || 
                           null;
      
      if (paymentLinkId && paymentLinkId.startsWith('plink_')) {
        console.log(`[${requestId}] 🔍 Trying to find order by payment link ID (legacy format):`, paymentLinkId);
        
        // Look for order saved with payment link ID
        order = await prisma.order.findFirst({
          where: { razorpayOrderId: paymentLinkId },
          select: { id: true, status: true, razorpayOrderId: true },
        });
        
        if (order) {
          console.warn(`[${requestId}] ⚠️ Found order by payment link ID (legacy format). Updating to correct order_id...`);
          
          // Update order to use correct order_id for future webhook matching
          try {
            order = await prisma.order.update({
              where: { id: order.id },
              data: { razorpayOrderId: razorpayOrderId }, // Update to correct order_id
              select: { id: true, status: true },
            });
            console.log(`[${requestId}] ✅ Updated order ${order.id} to use correct razorpayOrderId: ${razorpayOrderId}`);
          } catch (updateError) {
            // If update fails (e.g., unique constraint - order_id already exists), use existing order
            console.warn(`[${requestId}] ⚠️ Failed to update order razorpayOrderId:`, updateError.message);
            console.log(`[${requestId}] ℹ️ Continuing with existing order...`);
            // Continue with the order found by payment link ID
            order = await prisma.order.findFirst({
              where: { id: order.id },
              select: { id: true, status: true },
            });
          }
        }
      }
    }

    if (!order) {
      console.error(`[${requestId}] ❌ Order not found for razorpayOrderId`, { 
        razorpayOrderId,
        paymentLinkId: eventData?.payload?.payment_link?.entity?.id || null,
        searchedBy: 'order_id and payment_link_id (legacy)'
      });
      throw new Error(`Order not found for razorpayOrderId: ${razorpayOrderId}`);
    }

    // Process booking creation in transaction
    const result = await prisma.$transaction(async (tx) => {
      const bookingResult = await createBookingFromOrder(
        order.id,
        {
          razorpayPaymentId,
          paymentMethod: 'payment_link',
          requestId,
        },
        tx
      );

      return bookingResult;
    });

    console.log(`[${requestId}] ✅ Payment link paid: Order ${order.id} → Booking ${result.bookingNumber}`, {
      orderId: order.id,
      bookingId: result.booking.id,
      bookingNumber: result.bookingNumber,
      alreadyProcessed: result.alreadyProcessed,
    });

    return {
      event: 'payment_link.paid',
      orderId: order.id,
      bookingId: result.booking.id,
      bookingNumber: result.bookingNumber,
      alreadyProcessed: result.alreadyProcessed,
      roomSelectionsCount: result.booking.bookingRoomSelections?.length || 0,
    };
  } catch (error) {
    console.error(`[${requestId}] ❌ Error handling payment_link.paid event`, {
      razorpayOrderId,
      razorpayPaymentId: razorpayPaymentId ? `${razorpayPaymentId.substring(0, 10)}...` : null,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
    throw error;
  }
};

/**
 * Handle payment.failed event
 * Releases order holds when payment fails
 * 
 * @param {object} eventData - Webhook event data
 * @param {string} requestId - Request ID for logging
 * @returns {Promise<object>} Result object
 */
const handlePaymentFailed = async (eventData, requestId) => {
  console.log(`[${requestId}] Handling payment.failed event`);

  const razorpayOrderId = extractOrderId(eventData, 'payment.failed');

  if (!razorpayOrderId) {
    console.error(`[${requestId}] ❌ Payment failed event missing order_id`, { eventData });
    throw new Error('Invalid webhook payload: missing order identifier');
  }

  try {
    const order = await prisma.order.findUnique({
      where: { razorpayOrderId },
      select: { id: true, status: true },
    });

    if (!order) {
      console.warn(`[${requestId}] ⚠️ Order not found for razorpayOrderId`, { razorpayOrderId });
      return { orderId: null, released: 0, skipped: true };
    }

    // Idempotency check: if order is already FAILED/EXPIRED/CANCELLED, skip
    if (order.status === 'FAILED' || order.status === 'EXPIRED' || order.status === 'CANCELLED') {
      console.log(`[${requestId}] ℹ️ Order ${order.id} already marked as ${order.status} - skipping`);
      return { orderId: order.id, released: 0, skipped: true };
    }

    // Only process PENDING orders
    if (order.status !== 'PENDING') {
      console.log(`[${requestId}] ℹ️ Order ${order.id} is not in PENDING status (current: ${order.status}) - skipping`);
      return { orderId: order.id, released: 0, skipped: true };
    }

    // Process in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update order status
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'FAILED',
          updatedAt: new Date(),
        },
      });

      // Release holds
      const releasedCount = await releaseOrderHolds(order.id, tx);

      return releasedCount;
    });

    console.log(`[${requestId}] ✅ Payment failed: Order ${order.id} → Released ${result} hold(s)`, {
      orderId: order.id,
      released: result,
    });

    return {
      event: 'payment.failed',
      orderId: order.id,
      released: result,
    };
  } catch (error) {
    console.error(`[${requestId}] ❌ Error handling payment.failed event`, {
      razorpayOrderId,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
    throw error;
  }
};

/**
 * Handle payment_link.expired event
 * Releases order holds when payment link expires
 * 
 * @param {object} eventData - Webhook event data
 * @param {string} requestId - Request ID for logging
 * @returns {Promise<object>} Result object
 */
const handlePaymentLinkExpired = async (eventData, requestId) => {
  console.log(`[${requestId}] Handling payment_link.expired event`);

  const razorpayOrderId = extractOrderId(eventData, 'payment_link.expired');

  if (!razorpayOrderId) {
    console.error(`[${requestId}] ❌ Payment link expired event missing order_id`, { eventData });
    throw new Error('Invalid webhook payload: missing order identifier');
  }

  try {
    const order = await prisma.order.findUnique({
      where: { razorpayOrderId },
      select: { id: true, status: true },
    });

    if (!order) {
      console.warn(`[${requestId}] ⚠️ Order not found for razorpayOrderId`, { razorpayOrderId });
      return { orderId: null, released: 0, skipped: true };
    }

    // Idempotency check: if order is already EXPIRED/CANCELLED/FAILED, skip
    if (order.status === 'EXPIRED' || order.status === 'CANCELLED' || order.status === 'FAILED') {
      console.log(`[${requestId}] ℹ️ Order ${order.id} already marked as ${order.status} - skipping`);
      return { orderId: order.id, released: 0, skipped: true };
    }

    // Only process PENDING orders
    if (order.status !== 'PENDING') {
      console.log(`[${requestId}] ℹ️ Order ${order.id} is not in PENDING status (current: ${order.status}) - skipping`);
      return { orderId: order.id, released: 0, skipped: true };
    }

    // Process in transaction
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

    console.log(`[${requestId}] ✅ Payment link expired: Order ${order.id} → Released ${result} hold(s)`, {
      orderId: order.id,
      released: result,
    });

    return {
      event: 'payment_link.expired',
      orderId: order.id,
      released: result,
    };
  } catch (error) {
    console.error(`[${requestId}] ❌ Error handling payment_link.expired event`, {
      razorpayOrderId,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
    throw error;
  }
};

/**
 * Handle payment_link.cancelled event
 * Releases order holds when payment link is cancelled
 * 
 * @param {object} eventData - Webhook event data
 * @param {string} requestId - Request ID for logging
 * @returns {Promise<object>} Result object
 */
const handlePaymentLinkCancelled = async (eventData, requestId) => {
  console.log(`[${requestId}] Handling payment_link.cancelled event`);

  const razorpayOrderId = extractOrderId(eventData, 'payment_link.cancelled');

  if (!razorpayOrderId) {
    console.error(`[${requestId}] ❌ Payment link cancelled event missing order_id`, { eventData });
    throw new Error('Invalid webhook payload: missing order identifier');
  }

  try {
    const order = await prisma.order.findUnique({
      where: { razorpayOrderId },
      select: { id: true, status: true },
    });

    if (!order) {
      console.warn(`[${requestId}] ⚠️ Order not found for razorpayOrderId`, { razorpayOrderId });
      return { orderId: null, released: 0, skipped: true };
    }

    // Idempotency check: if order is already CANCELLED/EXPIRED/FAILED, skip
    if (order.status === 'CANCELLED' || order.status === 'EXPIRED' || order.status === 'FAILED') {
      console.log(`[${requestId}] ℹ️ Order ${order.id} already marked as ${order.status} - skipping`);
      return { orderId: order.id, released: 0, skipped: true };
    }

    // Only process PENDING orders
    if (order.status !== 'PENDING') {
      console.log(`[${requestId}] ℹ️ Order ${order.id} is not in PENDING status (current: ${order.status}) - skipping`);
      return { orderId: order.id, released: 0, skipped: true };
    }

    // Process in transaction
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

    console.log(`[${requestId}] ✅ Payment link cancelled: Order ${order.id} → Released ${result} hold(s)`, {
      orderId: order.id,
      released: result,
    });

    return {
      event: 'payment_link.cancelled',
      orderId: order.id,
      released: result,
    };
  } catch (error) {
    console.error(`[${requestId}] ❌ Error handling payment_link.cancelled event`, {
      razorpayOrderId,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
    throw error;
  }
};

/**
 * Unified Razorpay Webhook Handler
 * 
 * This is the single webhook endpoint for ALL Razorpay events.
 * Razorpay only allows ONE webhook endpoint to be configured.
 * 
 * Flow:
 * 1. Razorpay sends POST request to /webhooks/razorpay
 * 2. We verify signature (security check)
 * 3. We parse event type from payload
 * 4. We route to appropriate handler:
 *    - payment.captured → Create booking (user/agent bookings)
 *    - payment_link.paid → Create booking (frontdesk bookings)
 *    - payment.failed → Release holds
 *    - payment_link.expired → Release holds
 *    - payment_link.cancelled → Release holds
 * 5. We always return 200 OK (prevents Razorpay retries)
 * 
 * PRODUCTION NOTES:
 * - Always returns 200 OK to Razorpay (even on errors)
 * - This prevents Razorpay from retrying failed webhooks
 * - Errors are logged for manual investigation
 * - In production, you may want to implement a dead letter queue for failed events
 * 
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const unifiedWebhookHandler = async (req, res) => {
  // Generate request ID for structured logging
  const requestId = generateRequestId();

  console.log(`[${requestId}] 📥 Razorpay webhook received`, {
    method: req.method,
    path: req.path,
    headers: {
      'content-type': req.headers['content-type'],
      'user-agent': req.headers['user-agent'],
    },
  });

  // PRODUCTION: Get webhook signature from headers (Razorpay sends this for security)
  const signature = req.headers['x-razorpay-signature'];
  if (!signature) {
    console.error(`[${requestId}] ❌ Webhook request missing X-Razorpay-Signature header`);
    // Return 200 to prevent Razorpay retries (but log the error)
    return sendSuccess(
      res,
      { error: 'Missing webhook signature' },
      'Webhook received but signature missing (logged for investigation)',
      200
    );
  }

  // PRODUCTION: Get raw body for signature verification
  // express.raw() middleware gives us Buffer, but we need to handle all cases
  let rawBody;
  let eventData;

  try {
    if (Buffer.isBuffer(req.body)) {
      // Body is a Buffer (from express.raw() middleware)
      rawBody = req.body.toString('utf8');
      eventData = JSON.parse(rawBody);
    } else if (typeof req.body === 'string') {
      // Body is already a string
      rawBody = req.body;
      eventData = JSON.parse(req.body);
    } else {
      // Body is already parsed (fallback - should not happen with express.raw())
      rawBody = JSON.stringify(req.body);
      eventData = req.body;
    }
  } catch (error) {
    console.error(`[${requestId}] ❌ Failed to parse webhook body`, {
      error: error.message,
      bodyType: typeof req.body,
      bodyLength: Buffer.isBuffer(req.body) ? req.body.length : req.body?.length,
    });
    // Return 200 to prevent Razorpay retries
    return sendSuccess(
      res,
      { error: 'Invalid JSON payload' },
      'Webhook received but payload invalid (logged for investigation)',
      200
    );
  }

  // PRODUCTION: Verify webhook signature (security check - ensures request is from Razorpay)
  if (!verifyWebhookSignature(rawBody, signature)) {
    console.error(`[${requestId}] ❌ Webhook signature verification failed`, {
      signatureLength: signature?.length,
      payloadLength: rawBody?.length,
    });
    // Return 200 to prevent Razorpay retries (but log the error)
    return sendSuccess(
      res,
      { error: 'Invalid webhook signature' },
      'Webhook received but signature invalid (logged for investigation)',
      200
    );
  }

  // PRODUCTION: Extract event type from webhook payload
  const event = eventData?.event || eventData?.entity?.event;

  if (!event) {
    console.error(`[${requestId}] ❌ Webhook payload missing event type`, { eventData });
    // Return 200 to prevent Razorpay retries
    return sendSuccess(
      res,
      { error: 'Missing event type' },
      'Webhook received but event type missing (logged for investigation)',
      200
    );
  }

  console.log(`[${requestId}] 📥 Razorpay webhook event: ${event}`, {
    event,
    payloadKeys: Object.keys(eventData?.payload || {}),
  });

  // PRODUCTION: Route to appropriate handler based on event type
  try {
    let result = null;

    switch (event) {
      case 'payment.captured':
        result = await handlePaymentCaptured(eventData, requestId);
        break;

      case 'payment_link.paid':
        result = await handlePaymentLinkPaid(eventData, requestId);
        break;

      case 'payment.failed':
        result = await handlePaymentFailed(eventData, requestId);
        break;

      case 'payment_link.expired':
        result = await handlePaymentLinkExpired(eventData, requestId);
        break;

      case 'payment_link.cancelled':
        result = await handlePaymentLinkCancelled(eventData, requestId);
        break;

      default:
        console.log(`[${requestId}] ℹ️ Unhandled webhook event: ${event}`, {
          event,
          payload: eventData?.payload,
        });
        // Return 200 for unhandled events (we acknowledge receipt)
        return sendSuccess(
          res,
          { event, message: 'Event received but not processed' },
          `Event ${event} received but not handled (logged for review)`,
          200
        );
    }

    // PRODUCTION: Success response - always return 200 OK to Razorpay
    console.log(`[${requestId}] ✅ Webhook event processed successfully`, {
      event,
      result,
    });

    return sendSuccess(res, result, `Webhook event ${event} processed successfully`, 200);
  } catch (error) {
    // PRODUCTION: Error handling - always return 200 to prevent Razorpay retries
    // Errors are logged for manual investigation
    console.error(`[${requestId}] ❌ Error processing webhook event ${event}`, {
      event,
      error: error.message,
      code: error.code,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });

    // PRODUCTION: In production, you may want to:
    // 1. Send error to dead letter queue
    // 2. Send alert to monitoring system
    // 3. Notify admins via email/SMS

    // Always return 200 OK to Razorpay (prevents retries)
    // This is important because we handle errors manually
    return sendSuccess(
      res,
      {
        event,
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
        requestId, // Include request ID for tracking
      },
      `Error processing webhook event ${event} (logged for investigation)`,
      200
    );
  }
};

const WebhookController = {
  unifiedWebhookHandler,
  // Export handlers for testing
  handlePaymentCaptured,
  handlePaymentLinkPaid,
  handlePaymentFailed,
  handlePaymentLinkExpired,
  handlePaymentLinkCancelled,
};

module.exports = WebhookController;

