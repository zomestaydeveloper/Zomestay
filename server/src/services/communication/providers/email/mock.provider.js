/**
 * Mock Email Provider
 * For development and testing
 * Logs emails instead of sending
 */

const mockEmailProvider = {
  /**
   * Send Email (mock - just logs)
   * @param {string} to - Email address
   * @param {string} subject - Email subject
   * @param {string} content - Email content (text or HTML)
   * @param {string} [from] - Sender email (optional)
   * @returns {Promise<Object>} - { success: boolean, messageId: string }
   */
  send: async (to, subject, content, from = null) => {
    console.log('📧 [MOCK EMAIL]', {
      to,
      from,
      subject,
      content: content.substring(0, 100) + '...', // Log first 100 chars
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

module.exports = mockEmailProvider;

