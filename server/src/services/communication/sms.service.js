/**
 * SMS Service
 * Public API for sending SMS
 * Used by controllers
 */

const smsGateway = require('./smsGateway');

/**
 * SMS Service
 */
const smsService = {
  /**
   * Send SMS
   * @param {Object} params - SMS parameters
   * @param {string} params.to - Phone number (with country code, e.g., +919876543210)
   * @param {string} params.message - Message content
   * @param {string} [params.from] - Sender ID (optional)
   * @returns {Promise<Object>} - { success: boolean, messageId?: string, error?: string }
   * 
   * @example
   * await smsService.send({
   *   to: '+919876543210',
   *   message: 'Your OTP is 1234',
   *   from: 'ZOMESSTAY' // optional
   * });
   */
  send: async ({ to, message, from = null }) => {
    try {
      // Validate input
      if (!to || !message) {
        return {
          success: false,
          error: 'Phone number and message are required'
        };
      }

      // Send via gateway
      const result = await smsGateway.send(to, message, from);
      return result;
    } catch (error) {
      console.error('SMS Service Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
};

module.exports = smsService;

