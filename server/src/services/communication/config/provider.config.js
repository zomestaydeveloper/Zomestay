/**
 * Provider Configuration
 * Manages which provider to use for SMS and Email
 * Can be changed via environment variables
 */

const providerConfig = {
  /**
   * Get active SMS provider name
   * @returns {string} - Provider name (default: 'mock')
   */
  getSMSProvider: () => {
    return process.env.SMS_PROVIDER || 'mock';
  },

  /**
   * Get active Email provider name
   * @returns {string} - Provider name (default: 'mock')
   */
  getEmailProvider: () => {
    return process.env.EMAIL_PROVIDER || 'mock';
  }
};

module.exports = providerConfig;

