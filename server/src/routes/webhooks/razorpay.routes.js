/**
 * Unified Razorpay Webhook Routes
 * 
 * PRODUCTION READY:
 * - Uses express.raw() middleware for signature verification
 * - Handles ALL Razorpay webhook events from single endpoint
 * - Security: Signature verification required
 * - Error handling: Always returns 200 to Razorpay (prevents retries)
 * 
 * IMPORTANT:
 * This route MUST be registered BEFORE express.json() middleware
 * in server/index.js to ensure raw body is available for signature verification.
 * 
 * Supported Events:
 * - payment.captured (user/agent bookings)
 * - payment_link.paid (frontdesk bookings)
 * - payment.failed (payment failed)
 * - payment_link.expired (payment link expired)
 * - payment_link.cancelled (payment link cancelled)
 */

const express = require('express');
const router = express.Router();
const { unifiedWebhookHandler } = require('../../controllers/payment/webhook.controller');

/**
 * PRODUCTION: Use express.raw() middleware for webhook signature verification
 * 
 * Razorpay requires the raw body (as Buffer) for signature verification.
 * The signature is calculated using HMAC-SHA256 of the raw request body.
 * 
 * IMPORTANT:
 * - This middleware MUST be applied ONLY to this route
 * - Do NOT apply express.json() before this middleware
 * - The raw body is required for security (signature verification)
 */
router.use(
  express.raw({
    type: 'application/json', // Only parse JSON content-type as raw
    limit: '1mb', // Limit body size to 1MB (sufficient for webhook payloads)
  })
);

/**
 * Unified Razorpay Webhook Endpoint
 * 
 * Path: POST /webhooks/razorpay
 * 
 * This is the SINGLE webhook endpoint for ALL Razorpay events.
 * Razorpay only allows ONE webhook URL to be configured in the dashboard.
 * 
 * Webhook Configuration in Razorpay Dashboard:
 * - URL: https://your-domain.com/webhooks/razorpay
 * - Events: Select all events you want to receive
 *   - payment.captured
 *   - payment.failed
 *   - payment_link.paid
 *   - payment_link.expired
 *   - payment_link.cancelled
 * 
 * Security:
 * - Webhook signature is verified using RAZORPAY_WEBHOOK_SECRET
 * - Invalid signatures are rejected (but still return 200 to prevent retries)
 * - Requests without signature header are rejected
 * 
 * Response:
 * - Always returns 200 OK (even on errors)
 * - This prevents Razorpay from retrying failed webhooks
 * - Errors are logged for manual investigation
 * - In production, consider implementing dead letter queue for failed events
 * 
 * Example Request:
 * POST /webhooks/razorpay
 * Headers:
 *   Content-Type: application/json
 *   X-Razorpay-Signature: abc123...
 * Body:
 *   {
 *     "event": "payment.captured",
 *     "payload": {
 *       "payment": {
 *         "entity": {
 *           "id": "pay_ABC123",
 *           "order_id": "order_XYZ789",
 *           ...
 *         }
 *       }
 *     }
 *   }
 */
router.post('/razorpay', unifiedWebhookHandler);

/**
 * Health check endpoint for webhook route
 * Useful for monitoring and testing webhook route availability
 */
router.get('/razorpay/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Razorpay webhook route is active',
    timestamp: new Date().toISOString(),
    path: '/webhooks/razorpay',
  });
});

module.exports = router;

