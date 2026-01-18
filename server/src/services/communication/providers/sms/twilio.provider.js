/**
 * Twilio SMS Provider
 * Production-ready SMS provider using Twilio API
 * 
 * Requirements:
 * - TWILIO_ACCOUNT_SID: Your Twilio Account SID
 * - TWILIO_AUTH_TOKEN: Your Twilio Auth Token
 * - TWILIO_PHONE_NUMBER: Your Twilio phone number (e.g., +1234567890)
 * 
 * Note: Trial accounts can only send to verified phone numbers
 */

const twilio = require('twilio');

// Load Twilio credentials from environment variables
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

// Validate Twilio credentials
if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
  console.error('⚠️ WARNING: Twilio credentials not found in environment variables');
  console.error('Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN');
}

// Initialize Twilio client
let twilioClient = null;
if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
  try {
    twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  } catch (error) {
    console.error('⚠️ ERROR: Failed to initialize Twilio client:', error.message);
  }
}

/**
 * Validate phone number format
 * Expected format: +[country code][number] (e.g., +919876543210)
 * @param {string} phoneNumber - Phone number to validate
 * @returns {boolean} - True if valid format
 */
const validatePhoneNumber = (phoneNumber) => {
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    return false;
  }
  
  // Twilio expects E.164 format: +[country code][number]
  // Example: +919876543210, +1234567890
  const phoneRegex = /^\+[1-9]\d{1,14}$/;
  return phoneRegex.test(phoneNumber.trim());
};

/**
 * Format phone number to E.164 format if needed
 * @param {string} phoneNumber - Phone number to format
 * @returns {string} - Formatted phone number
 */
const formatPhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return null;
  
  // Remove all non-digit characters except +
  let cleaned = phoneNumber.replace(/[^\d+]/g, '');
  
  // If doesn't start with +, assume it's Indian number and add +91
  if (!cleaned.startsWith('+')) {
    // If starts with 0, remove it
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1);
    }
    // Add +91 for Indian numbers
    cleaned = '+91' + cleaned;
  }
  
  return cleaned;
};

/**
 * Twilio SMS Provider
 */
const twilioSMSProvider = {
  /**
   * Send SMS via Twilio
   * @param {string} to - Phone number (E.164 format: +919876543210)
   * @param {string} message - Message content
   * @param {string} [from] - Sender phone number (optional, uses TWILIO_PHONE_NUMBER if not provided)
   * @returns {Promise<Object>} - { success: boolean, messageId?: string, error?: string, provider?: string }
   * 
   * @example
   * await twilioSMSProvider.send('+919876543210', 'Your OTP is 1234');
   */
  send: async (to, message, from = null) => {
    try {
      // Check if Twilio client is initialized
      if (!twilioClient) {
        console.error('❌ Twilio client not initialized. Check your credentials.');
        return {
          success: false,
          error: 'Twilio client not initialized. Please check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN',
          provider: 'twilio'
        };
      }

      // Validate inputs
      if (!to || !message) {
        return {
          success: false,
          error: 'Phone number and message are required',
          provider: 'twilio'
        };
      }

      // Format phone number
      const formattedTo = formatPhoneNumber(to);
      
      // Validate phone number format
      if (!validatePhoneNumber(formattedTo)) {
        return {
          success: false,
          error: `Invalid phone number format: ${to}. Expected format: +[country code][number] (e.g., +919876543210)`,
          provider: 'twilio'
        };
      }

      // Use provided 'from' or default to TWILIO_PHONE_NUMBER
      const fromNumber = from || TWILIO_PHONE_NUMBER;
      
      if (!fromNumber) {
        return {
          success: false,
          error: 'Sender phone number not configured. Set TWILIO_PHONE_NUMBER or provide "from" parameter',
          provider: 'twilio'
        };
      }

      // Validate message length (Twilio limit: 1600 characters for single SMS)
      if (message.length > 1600) {
        console.warn(`⚠️ Message length (${message.length}) exceeds Twilio limit (1600). Message will be split into multiple SMS.`);
      }

      // Log SMS attempt
      console.log('📱 [TWILIO SMS] Sending SMS', {
        to: formattedTo,
        from: fromNumber,
        messageLength: message.length,
        timestamp: new Date().toISOString()
      });

      // Send SMS via Twilio
      const twilioMessage = await twilioClient.messages.create({
        body: message,
        from: fromNumber,
        to: formattedTo
      });

      // Check if message was created successfully
      if (!twilioMessage || !twilioMessage.sid) {
        return {
          success: false,
          error: 'Failed to send SMS: Invalid response from Twilio',
          provider: 'twilio'
        };
      }

      // Log success
      console.log('✅ [TWILIO SMS] SMS sent successfully', {
        messageSid: twilioMessage.sid,
        status: twilioMessage.status,
        to: formattedTo
      });

      return {
        success: true,
        messageId: twilioMessage.sid,
        status: twilioMessage.status,
        provider: 'twilio'
      };

    } catch (error) {
      // Handle Twilio-specific errors
      let errorMessage = 'Failed to send SMS';
      
      if (error.code) {
        // Twilio error codes
        switch (error.code) {
          case 21211:
            errorMessage = 'Invalid phone number format';
            break;
          case 21212:
            errorMessage = 'Invalid sender phone number';
            break;
          case 21608:
            errorMessage = 'Unverified phone number (trial account limitation). Please verify this number in Twilio Console';
            break;
          case 21610:
            errorMessage = 'Unsubscribed phone number';
            break;
          case 21614:
            errorMessage = 'Invalid phone number';
            break;
          case 30003:
            errorMessage = 'Unreachable destination handset';
            break;
          case 30004:
            errorMessage = 'Message blocked';
            break;
          case 30005:
            errorMessage = 'Unknown destination handset';
            break;
          case 30006:
            errorMessage = 'Landline or unreachable carrier';
            break;
          default:
            errorMessage = error.message || `Twilio error: ${error.code}`;
        }
      } else {
        errorMessage = error.message || 'Unknown error occurred';
      }

      console.error('❌ [TWILIO SMS] SMS sending failed', {
        to,
        error: errorMessage,
        code: error.code,
        timestamp: new Date().toISOString()
      });

      return {
        success: false,
        error: errorMessage,
        provider: 'twilio',
        code: error.code || null
      };
    }
  }
};

module.exports = twilioSMSProvider;


