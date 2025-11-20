/**
 * SMS Gateway
 * Routes SMS requests to the appropriate provider
 * Add new providers here when ready
 */

const providerConfig = require('./config/provider.config');

// Import providers
const mockProvider = require('./providers/sms/mock.provider');
const twilioProvider = require('./providers/sms/twilio.provider');

// Provider registry
// Add new providers here: 'providerName': require('./providers/sms/providerName.provider')
const providers = {
  mock: mockProvider,
  twilio: twilioProvider,
  // Future providers:
  // aws-sns: require('./providers/sms/aws-sns.provider'),
  // msg91: require('./providers/sms/msg91.provider'),
};

/**
 * SMS Gateway
 */
const smsGateway = {
  /**
   * Get the active SMS provider
   * @returns {Object} - Provider instance
   */
  getProvider: () => {
    const providerName = providerConfig.getSMSProvider();
    
    if (!providers[providerName]) {
      console.warn(`SMS provider "${providerName}" not found. Using "mock" provider.`);
      return providers.mock;
    }
    
    return providers[providerName];
  },

  /**
   * Send SMS via active provider
   * @param {string} to - Phone number
   * @param {string} message - Message content
   * @param {string} [from] - Sender ID (optional)
   * @returns {Promise<Object>} - { success: boolean, messageId?: string, error?: string }
   */
  send: async (to, message, from = null) => {
    try {
      const provider = smsGateway.getProvider();
      return await provider.send(to, message, from);
    } catch (error) {
      console.error('SMS Gateway Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
};

module.exports = smsGateway;

