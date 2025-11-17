const express = require('express');
const router = express.Router();
const { createOrder, verifyPayment } = require('../../controllers/userController/payment.controller');

// Create Razorpay order (for user/agent bookings)
router.post('/create-order', createOrder);

// Verify payment (for user/agent bookings)
router.post('/verify-payment', verifyPayment);

module.exports = router;

