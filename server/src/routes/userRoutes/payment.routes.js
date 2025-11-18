const express = require('express');
const router = express.Router();
const { createOrder, verifyPayment, getBookingByOrderId } = require('../../controllers/userController/payment.controller');

// Create Razorpay order (for user/agent bookings)
router.post('/create-order', createOrder);

// Get booking status by Razorpay order ID (for frontend polling)
// PRODUCTION: Used by frontend to poll booking status after payment
router.get('/bookings/order/:razorpayOrderId', getBookingByOrderId);

// DEPRECATED: Direct payment verification (kept temporarily for migration)
// TODO: Remove after frontend migration to polling
// @deprecated Use webhook instead. Frontend should poll booking status.
router.post('/verify-payment', verifyPayment);

module.exports = router;

