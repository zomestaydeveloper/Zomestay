const express = require('express');
const {
  getBookingDetails,
  cancelBooking,
  markRefundCompleted,
} = require('../../controllers/booking_cancellation/bookingCancellation.controller');
const { extractRole } = require('../../middleware/extractRole.middleware');

const router = express.Router();

router.get('/bookings/:id', extractRole, getBookingDetails);
router.post('/bookings/:id/cancel', extractRole, cancelBooking);
router.post('/bookings/:id/refund-complete', extractRole, markRefundCompleted);

module.exports = router;

