/**
 * Mock SMS Provider
 * For development and testing
 * Logs messages instead of sending
 */

const mockSMSProvider = {
  /**
   * Send SMS (mock - just logs)
   * @param {string} to - Phone number
   * @param {string} message - Message content
   * @param {string} [from] - Sender ID (optional)
   * @returns {Promise<Object>} - { success: boolean, messageId: string }
   */
  send: async (to, message, from = null) => {
    console.log('📱 [MOCK SMS]', {
      to,
      from,
      message,
      timestamp: new Date().toISOString()
    });
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 50));
    
    return {
      success: true,
      messageId: `mock_${Date.now()}`,
      provider: 'mock'
    };
  }
};

module.exports = mockSMSProvider;

