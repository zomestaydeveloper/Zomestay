/**
 * Communication Service
 * Main entry point for SMS and Email services
 * 
 * Usage:
 * const { smsService, emailService, emailTemplates, smsTemplates } = require('./services/communication');
 * 
 * // Send SMS with template
 * const smsMessage = smsTemplates.otp({ otp: '1234', expiresIn: 5 });
 * await smsService.send({
 *   to: '+919876543210',
 *   message: smsMessage
 * });
 * 
 * // Send Email with HTML template
 * const emailContent = emailTemplates.otp({ otp: '1234', userName: 'John Doe' });
 * await emailService.send({
 *   to: 'user@example.com',
 *   subject: 'OTP Verification',
 *   content: emailContent
 * });
 */

const smsService = require('./sms.service');
const emailService = require('./email.service');
const emailTemplates = require('./templates/emailTemplate.service');
const smsTemplates = require('./templates/smsTemplate.service');

module.exports = {
  smsService,
  emailService,
  emailTemplates,
  smsTemplates
};

