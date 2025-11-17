/**
 * Example Usage of Communication Service
 * This file shows how to use SMS and Email services in controllers
 * 
 * DO NOT USE THIS FILE DIRECTLY - It's just for reference
 */

const { smsService, emailService } = require('./index');

// ============================================
// Example 1: Send SMS from Controller
// ============================================
async function sendOTP(phoneNumber, otp) {
  const result = await smsService.send({
    to: phoneNumber, // e.g., '+919876543210'
    message: `Your OTP is ${otp}. Valid for 5 minutes.`,
    from: 'ZOMESSTAY' // optional
  });

  if (result.success) {
    console.log('SMS sent successfully:', result.messageId);
  } else {
    console.error('Failed to send SMS:', result.error);
  }

  return result;
}

// ============================================
// Example 2: Send Email from Controller
// ============================================
async function sendWelcomeEmail(userEmail, userName) {
  const result = await emailService.send({
    to: userEmail,
    subject: 'Welcome to ZomesStay!',
    content: `
      <h1>Welcome ${userName}!</h1>
      <p>Thank you for joining ZomesStay.</p>
      <p>We're excited to have you on board!</p>
    `,
    from: 'noreply@zomesstay.com' // optional
  });

  if (result.success) {
    console.log('Email sent successfully:', result.messageId);
  } else {
    console.error('Failed to send email:', result.error);
  }

  return result;
}

// ============================================
// Example 3: Use in Controller
// ============================================
/*
// In your controller file:
const { smsService, emailService } = require('../../services/communication');

const sendBookingConfirmation = async (req, res) => {
  try {
    const { phone, email, bookingNumber } = req.body;

    // Send SMS
    await smsService.send({
      to: phone,
      message: `Your booking ${bookingNumber} is confirmed!`
    });

    // Send Email
    await emailService.send({
      to: email,
      subject: 'Booking Confirmation',
      content: `<h1>Booking Confirmed!</h1><p>Your booking number is ${bookingNumber}</p>`
    });

    res.json({ success: true, message: 'Confirmation sent' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
*/

module.exports = {
  sendOTP,
  sendWelcomeEmail
};

