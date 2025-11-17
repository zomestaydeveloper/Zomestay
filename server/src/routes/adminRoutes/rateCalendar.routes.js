const express = require('express');
const RateCalendarRoute = express.Router();

const rateCalendarController = require('../../controllers/adminController/rateCalendar.controller');

// Seed rates for a single PropertyRoomType
RateCalendarRoute.post('/seed', rateCalendarController.seedRates);

// Bulk seed rates for multiple PropertyRoomTypes or entire property
RateCalendarRoute.post('/bulk-seed', rateCalendarController.bulkSeedRates);

// Get rates for a PropertyRoomType
RateCalendarRoute.get(' /map-rate/:propertyRoomTypeId', rateCalendarController.getRates);

// Update a specific rate
RateCalendarRoute.put('/maprate/:id', rateCalendarController.updateRate);

// Delete rates (soft delete)
RateCalendarRoute.delete('/:propertyRoomTypeId', rateCalendarController.deleteRates);

module.exports = RateCalendarRoute;
