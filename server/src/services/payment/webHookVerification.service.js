/**
 * Webhook Verification Service
 * Handles Razorpay webhook signature verification
 */

const crypto = require('crypto');

const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || '';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'uetuSHbRgVnaU598llWQKwx5';

/**
 * Verify Razorpay webhook signature
 * @param {string|Buffer} payload - Raw webhook payload (string or Buffer)
 * @param {string} signature - Webhook signature from X-Razorpay-Signature header
 * @returns {boolean} - true if signature is valid
 */
const verifyWebhookSignature = (payload, signature) => {
  if (!RAZORPAY_WEBHOOK_SECRET) {
    console.warn('⚠️ RAZORPAY_WEBHOOK_SECRET not set - webhook signature verification skipped');
    // In development, allow without secret (not recommended for production)
    return process.env.NODE_ENV !== 'production';
  }

  if (!signature) {
    console.error('❌ Webhook signature missing');
    return false;
  }

  try {
    // Convert payload to string if it's a Buffer
    const payloadString = Buffer.isBuffer(payload) ? payload.toString('utf8') : payload;

    // Generate expected signature
    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
      .update(payloadString, 'utf8')
      .digest('hex');

    // Convert signatures to buffers for timing-safe comparison
    const receivedBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');

    // timingSafeEqual requires both buffers to be the same length
    if (receivedBuffer.length !== expectedBuffer.length) {
      console.error('❌ Webhook signature length mismatch');
      return false;
    }

    // Use timing-safe comparison to prevent timing attacks
    return crypto.timingSafeEqual(receivedBuffer, expectedBuffer);
  } catch (error) {
    console.error('❌ Error verifying webhook signature:', error);
    return false;
  }
};

/**
 * Verify Razorpay payment signature (for direct payment verification)
 * 
 * @deprecated This function is kept temporarily for migration period.
 * After unified webhook system is fully implemented, this can be removed.
 * Use verifyWebhookSignature() instead (automatic webhooks are the production standard).
 * 
 * @param {string} razorpayOrderId - Razorpay order ID
 * @param {string} razorpayPaymentId - Razorpay payment ID
 * @param {string} razorpaySignature - Payment signature
 * @returns {boolean} - true if signature is valid
 */
const verifyPaymentSignature = (razorpayOrderId, razorpayPaymentId, razorpaySignature) => {
  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    console.error('❌ Missing payment signature parameters');
    return false;
  }

  if (!RAZORPAY_KEY_SECRET) {
    console.warn('⚠️ RAZORPAY_KEY_SECRET not set - payment signature verification skipped');
    // In development, allow without secret (not recommended for production)
    return process.env.NODE_ENV !== 'production';
  }

  try {
    // Generate expected signature: order_id|payment_id
    const hmac = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET);
    hmac.update(razorpayOrderId + '|' + razorpayPaymentId);
    const generatedSignature = hmac.digest('hex');

    // Compare signatures (use timing-safe comparison in production)
    return generatedSignature === razorpaySignature;
  } catch (error) {
    console.error('❌ Error verifying payment signature:', error);
    return false;
  }
};

module.exports = {
  verifyWebhookSignature,
  verifyPaymentSignature,
};

