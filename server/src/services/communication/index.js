/**
 * Communication Service
 * Main entry point for SMS and Email services
 * 
 * Usage:
 * const { smsService, emailService } = require('./services/communication');
 * 
 * // Send SMS
 * await smsService.send({
 *   to: '+919876543210',
 *   message: 'Your OTP is 1234'
 * });
 * 
 * // Send Email
 * await emailService.send({
 *   to: 'user@example.com',
 *   subject: 'Welcome',
 *   content: 'Welcome to ZomesStay!'
 * });
 */

const smsService = require('./sms.service');
const emailService = require('./email.service');

module.exports = {
  smsService,
  emailService
};

