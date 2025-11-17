const express = require('express');
const dailyRateRouter = express.Router();

// Import controllers
const {
  getRatePlanDates,
  applyRatePlanToDate,
  applyRatePlanToDateRange,
  removeRatePlanFromDate,
  getRatePlanForDate
} = require('../../controllers/HostController/DailyRate.controller');

/**
 * ===================== Daily Rate Plan Routes =====================
 */

// Get all rate plan dates for a property
dailyRateRouter.get('/property/:propertyId/rate-plan-dates', getRatePlanDates);

// Get rate plan for specific date
dailyRateRouter.get('/property/:propertyId/rate-plan-dates/:date', getRatePlanForDate);

// Apply rate plan to single date
dailyRateRouter.post('/apply-rate-plan', applyRatePlanToDate);

// Apply rate plan to date range
dailyRateRouter.post('/apply-rate-plan-range', applyRatePlanToDateRange);

// Remove rate plan from date
dailyRateRouter.delete('/remove-rate-plan', removeRatePlanFromDate);

module.exports = dailyRateRouter;

