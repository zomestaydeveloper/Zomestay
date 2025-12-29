const express = require('express');
const router = express.Router();
const UserAuthController = require('../../controllers/userController/auth.controller');

// Send OTP to phone number
router.post('/users/send-otp', UserAuthController.sendOTP);

// Resend OTP to phone number
router.post('/users/resend-otp', UserAuthController.resendOTP);

// Verify OTP and login/register user
router.post('/users/verify-otp', UserAuthController.verifyOTP);

// Create user after OTP verification (Hybrid approach)
router.post('/users/create', UserAuthController.createUser);

// User Logout (optional authentication - allows logout even with expired tokens)
router.post('/users/logout', UserAuthController.logout);

module.exports = router;
