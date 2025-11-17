/**
 * Email Gateway
 * Routes Email requests to the appropriate provider
 * Add new providers here when ready
 */

const providerConfig = require('./config/provider.config');

// Import providers
const mockProvider = require('./providers/email/mock.provider');

// Provider registry
// Add new providers here: 'providerName': require('./providers/email/providerName.provider')
const providers = {
  mock: mockProvider,
  // Future providers:
  // nodemailer: require('./providers/email/nodemailer.provider'),
  // sendgrid: require('./providers/email/sendgrid.provider'),
  // aws-ses: require('./providers/email/aws-ses.provider'),
};

/**
 * Email Gateway
 */
const emailGateway = {
  /**
   * Get the active Email provider
   * @returns {Object} - Provider instance
   */
  getProvider: () => {
    const providerName = providerConfig.getEmailProvider();
    
    if (!providers[providerName]) {
      console.warn(`Email provider "${providerName}" not found. Using "mock" provider.`);
      return providers.mock;
    }
    
    return providers[providerName];
  },

  /**
   * Send Email via active provider
   * @param {string} to - Email address
   * @param {string} subject - Email subject
   * @param {string} content - Email content (text or HTML)
   * @param {string} [from] - Sender email (optional)
   * @returns {Promise<Object>} - { success: boolean, messageId?: string, error?: string }
   */
  send: async (to, subject, content, from = null) => {
    try {
      const provider = emailGateway.getProvider();
      return await provider.send(to, subject, content, from);
    } catch (error) {
      console.error('Email Gateway Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
};

module.exports = emailGateway;

