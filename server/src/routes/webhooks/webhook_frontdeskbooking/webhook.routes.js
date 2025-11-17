const express = require('express');
const WebhookController = require('../../../controllers/frontdeskController/webhook.controller');

const router = express.Router();

/**
 * Razorpay Payment Verification Webhook
 * 
 * When payment status changes (paid/cancelled/expired), Razorpay calls this URL
 * Flow:
 * 1. Razorpay sends webhook → POST /webhooks/verify-payment
 * 2. We verify signature (security check)
 * 3. We check payment status from webhook
 * 4. We process based on status:
 *    - paid → Create booking, mark rooms as booked
 *    - expired → Release rooms, mark order as expired
 *    - cancelled → Release rooms, mark order as cancelled
 */
router.post(
  '/verify-payment',
  express.raw({ type: 'application/json' }), // Get raw body for signature verification
  WebhookController.verifyPaymentWebhook // Handle payment verification
);

module.exports = router;

