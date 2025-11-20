/**
 * Nodemailer Email Provider (Gmail)
 * Production-ready Email provider using Nodemailer with Gmail SMTP
 * 
 * Requirements:
 * - GMAIL_USER: Your Gmail address (e.g., your-email@gmail.com)
 * - GMAIL_APP_PASSWORD: Your Gmail App Password (16-character password)
 * - GMAIL_FROM_EMAIL: Default sender email (optional, uses GMAIL_USER if not set)
 * 
 * Note: 
 * - You must enable 2-Step Verification in your Google Account
 * - Generate App Password from: Google Account → Security → App passwords
 * - Do NOT use your regular Gmail password
 */

const nodemailer = require('nodemailer');

// Load Gmail credentials from environment variables
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
const GMAIL_FROM_EMAIL = process.env.GMAIL_FROM_EMAIL || GMAIL_USER;

// Validate Gmail credentials
if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
  console.error('⚠️ WARNING: Gmail credentials not found in environment variables');
  console.error('Please set GMAIL_USER and GMAIL_APP_PASSWORD');
}

// Initialize Nodemailer transporter
let transporter = null;
if (GMAIL_USER && GMAIL_APP_PASSWORD) {
  try {
    transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587, // TLS port
      secure: false, // true for 465, false for other ports
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_APP_PASSWORD
      },
      // Additional options for better reliability
      tls: {
        rejectUnauthorized: false // Allow self-signed certificates (if needed)
      }
    });

    // Verify connection
    transporter.verify((error, success) => {
      if (error) {
        console.error('⚠️ ERROR: Gmail SMTP connection failed:', error.message);
        console.error('Please check your GMAIL_USER and GMAIL_APP_PASSWORD');
      } else {
        console.log('✅ Gmail SMTP connection verified successfully');
      }
    });
  } catch (error) {
    console.error('⚠️ ERROR: Failed to initialize Nodemailer transporter:', error.message);
  }
}

/**
 * Validate email address format
 * @param {string} email - Email address to validate
 * @returns {boolean} - True if valid format
 */
const validateEmail = (email) => {
  if (!email || typeof email !== 'string') {
    return false;
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

/**
 * Detect if content is HTML
 * @param {string} content - Content to check
 * @returns {boolean} - True if HTML detected
 */
const isHTML = (content) => {
  if (!content || typeof content !== 'string') {
    return false;
  }
  
  // Simple check for HTML tags
  const htmlRegex = /<[a-z][\s\S]*>/i;
  return htmlRegex.test(content);
};

/**
 * Nodemailer Email Provider
 */
const nodemailerEmailProvider = {
  /**
   * Send Email via Gmail SMTP
   * @param {string} to - Recipient email address
   * @param {string} subject - Email subject
   * @param {string} content - Email content (text or HTML)
   * @param {string} [from] - Sender email (optional, uses GMAIL_FROM_EMAIL if not provided)
   * @returns {Promise<Object>} - { success: boolean, messageId?: string, error?: string, provider?: string }
   * 
   * @example
   * await nodemailerEmailProvider.send(
   *   'user@example.com',
   *   'Welcome',
   *   '<h1>Welcome!</h1><p>Thank you for joining.</p>'
   * );
   */
  send: async (to, subject, content, from = null) => {
    try {
      // Check if transporter is initialized
      if (!transporter) {
        console.error('❌ Nodemailer transporter not initialized. Check your credentials.');
        return {
          success: false,
          error: 'Email transporter not initialized. Please check GMAIL_USER and GMAIL_APP_PASSWORD',
          provider: 'nodemailer'
        };
      }

      // Validate inputs
      if (!to || !subject || !content) {
        return {
          success: false,
          error: 'Email address, subject, and content are required',
          provider: 'nodemailer'
        };
      }

      // Validate email format
      if (!validateEmail(to)) {
        return {
          success: false,
          error: `Invalid email address format: ${to}`,
          provider: 'nodemailer'
        };
      }

      // Use provided 'from' or default to GMAIL_FROM_EMAIL
      const fromEmail = from || GMAIL_FROM_EMAIL;
      
      if (!fromEmail) {
        return {
          success: false,
          error: 'Sender email not configured. Set GMAIL_FROM_EMAIL or provide "from" parameter',
          provider: 'nodemailer'
        };
      }

      // Validate sender email format
      if (!validateEmail(fromEmail)) {
        return {
          success: false,
          error: `Invalid sender email format: ${fromEmail}`,
          provider: 'nodemailer'
        };
      }

      // Detect content type
      const isHTMLContent = isHTML(content);

      // Prepare email options
      const mailOptions = {
        from: `"ZomesStay" <${fromEmail}>`, // Format: "Name" <email>
        to: to,
        subject: subject,
        text: isHTMLContent ? null : content, // Plain text version
        html: isHTMLContent ? content : null  // HTML version
      };

      // Log email attempt
      console.log('📧 [NODEMAILER EMAIL] Sending email', {
        to: to,
        from: fromEmail,
        subject: subject,
        contentType: isHTMLContent ? 'HTML' : 'Text',
        contentLength: content.length,
        timestamp: new Date().toISOString()
      });

      // Send email via Nodemailer
      const info = await transporter.sendMail(mailOptions);

      // Check if email was sent successfully
      if (!info || !info.messageId) {
        return {
          success: false,
          error: 'Failed to send email: Invalid response from SMTP server',
          provider: 'nodemailer'
        };
      }

      // Log success
      console.log('✅ [NODEMAILER EMAIL] Email sent successfully', {
        messageId: info.messageId,
        to: to,
        subject: subject,
        response: info.response
      });

      return {
        success: true,
        messageId: info.messageId,
        response: info.response,
        provider: 'nodemailer'
      };

    } catch (error) {
      // Handle Nodemailer-specific errors
      let errorMessage = 'Failed to send email';
      
      // Common error codes and messages
      if (error.code) {
        switch (error.code) {
          case 'EAUTH':
            errorMessage = 'Authentication failed. Please check your Gmail credentials (GMAIL_USER and GMAIL_APP_PASSWORD)';
            break;
          case 'ECONNECTION':
            errorMessage = 'Connection failed. Please check your internet connection and Gmail SMTP settings';
            break;
          case 'ETIMEDOUT':
            errorMessage = 'Connection timeout. Gmail SMTP server is not responding';
            break;
          case 'EENVELOPE':
            errorMessage = 'Invalid email address format';
            break;
          case 'EMESSAGE':
            errorMessage = 'Invalid message format';
            break;
          default:
            errorMessage = error.message || `Email error: ${error.code}`;
        }
      } else if (error.response) {
        // SMTP error response
        errorMessage = `SMTP error: ${error.response}`;
      } else if (error.responseCode) {
        // Response code error
        switch (error.responseCode) {
          case 535:
            errorMessage = 'Authentication failed. Invalid Gmail App Password. Please generate a new App Password from Google Account settings';
            break;
          case 550:
            errorMessage = 'Email address not found or invalid';
            break;
          case 552:
            errorMessage = 'Mailbox full or quota exceeded';
            break;
          default:
            errorMessage = `SMTP error (${error.responseCode}): ${error.message || 'Unknown error'}`;
        }
      } else {
        errorMessage = error.message || 'Unknown error occurred';
      }

      console.error('❌ [NODEMAILER EMAIL] Email sending failed', {
        to,
        error: errorMessage,
        code: error.code,
        responseCode: error.responseCode,
        timestamp: new Date().toISOString()
      });

      return {
        success: false,
        error: errorMessage,
        provider: 'nodemailer',
        code: error.code || null,
        responseCode: error.responseCode || null
      };
    }
  }
};

module.exports = nodemailerEmailProvider;


