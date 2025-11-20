/**
 * Review Routes
 * Handles review-related API endpoints
 */

const express = require('express');
const router = express.Router();
const ReviewController = require('../../controllers/ReviewController/review.controller');
const { extractRole } = require('../../middleware/extractRole.middleware');

/**
 * POST /api/reviews
 * Create a review for a completed booking
 * Requires: User authentication
 * Body: { bookingId, rating (1-5), description? }
 */
router.post('/reviews', extractRole, ReviewController.createReview);

/**
 * GET /api/reviews/property/:propertyId
 * Get all reviews for a property
 * Public endpoint (no authentication required)
 * Query params: page?, limit?
 */
router.get('/reviews/property/:propertyId', ReviewController.getPropertyReviews);

/**
 * GET /api/reviews/booking/:bookingId
 * Get review for a specific booking (check if review exists)
 * Requires: User authentication
 */
router.get('/reviews/booking/:bookingId', extractRole, ReviewController.getReviewForBooking);

/**
 * PUT /api/reviews/:reviewId
 * Update own review
 * Requires: User authentication
 * Body: { rating?, description? }
 * Note: Can only edit within 7 days of creation
 */
router.put('/reviews/:reviewId', extractRole, ReviewController.updateReview);

/**
 * DELETE /api/reviews/:reviewId
 * Delete own review
 * Requires: User authentication
 */
router.delete('/reviews/:reviewId', extractRole, ReviewController.deleteReview);

module.exports = router;

