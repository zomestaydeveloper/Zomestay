/**
 * Email Service
 * Public API for sending Email
 * Used by controllers
 */

const emailGateway = require('./emailGateway');

/**
 * Email Service
 */
const emailService = {
  /**
   * Send Email
   * @param {Object} params - Email parameters
   * @param {string} params.to - Email address
   * @param {string} params.subject - Email subject
   * @param {string} params.content - Email content (text or HTML)
   * @param {string} [params.from] - Sender email (optional)
   * @returns {Promise<Object>} - { success: boolean, messageId?: string, error?: string }
   * 
   * @example
   * await emailService.send({
   *   to: 'user@example.com',
   *   subject: 'Welcome to ZomesStay',
   *   content: '<h1>Welcome!</h1><p>Thank you for joining us.</p>',
   *   from: 'noreply@zomesstay.com' // optional
   * });
   */
  send: async ({ to, subject, content, from = null }) => {
    try {
      // Validate input
      if (!to || !subject || !content) {
        return {
          success: false,
          error: 'Email address, subject, and content are required'
        };
      }

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(to)) {
        return {
          success: false,
          error: 'Invalid email address format'
        };
      }

      // Send via gateway
      const result = await emailGateway.send(to, subject, content, from);
      return result;
    } catch (error) {
      console.error('Email Service Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
};

module.exports = emailService;

