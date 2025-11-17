const express = require('express');

const AllBookingsRoutes = express.Router();

const { getAllBookings } = require('../../controllers/getAllbookings/getAllBookings.controller');

AllBookingsRoutes.get('/bookings', getAllBookings);

module.exports = AllBookingsRoutes;