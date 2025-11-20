/**
 * Cancellation Request Routes
 * Handles cancellation request-related API endpoints
 */

const express = require('express');
const router = express.Router();
const CancellationRequestController = require('../../controllers/cancellationRequest/cancellationRequest.controller');
const { extractRole } = require('../../middleware/extractRole.middleware');

/**
 * GET /api/cancellation-requests/reasons
 * Get default cancellation reasons
 * Public endpoint (no authentication required)
 */
router.get('/cancellation-requests/reasons', CancellationRequestController.getCancellationReasons);

/**
 * POST /api/cancellation-requests
 * Create a cancellation request
 * Requires: User, Agent, or Host authentication
 * Body: { bookingId, reason, customReason?, contactNumber }
 */
router.post('/cancellation-requests', extractRole, CancellationRequestController.createCancellationRequest);

/**
 * GET /api/cancellation-requests/my-requests
 * Get own cancellation requests
 * Requires: User, Agent, or Host authentication
 * Query params: status?, page?, limit?
 */
router.get('/cancellation-requests/my-requests', extractRole, CancellationRequestController.getMyCancellationRequests);

/**
 * GET /api/cancellation-requests
 * Get all cancellation requests (for admin review)
 * Requires: Admin authentication
 * Query params: status?, page?, limit?
 */
router.get('/cancellation-requests', extractRole, CancellationRequestController.getCancellationRequests);

/**
 * GET /api/cancellation-requests/:requestId
 * Get cancellation request by ID
 * Requires: Admin authentication, or requester (user/agent/host) authentication
 */
router.get('/cancellation-requests/:requestId', extractRole, CancellationRequestController.getCancellationRequestById);

/**
 * PUT /api/cancellation-requests/:requestId/approve
 * Approve cancellation request and cancel booking
 * Requires: Admin authentication
 * Body: { adminNotes? }
 */
router.put('/cancellation-requests/:requestId/approve', extractRole, CancellationRequestController.approveCancellationRequest);

/**
 * PUT /api/cancellation-requests/:requestId/reject
 * Reject cancellation request
 * Requires: Admin authentication
 * Body: { adminNotes }
 */
router.put('/cancellation-requests/:requestId/reject', extractRole, CancellationRequestController.rejectCancellationRequest);

module.exports = router;

