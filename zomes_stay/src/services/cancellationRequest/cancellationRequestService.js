/**
 * Cancellation Request Service
 * Handles API calls for cancellation requests
 */

import apiService from '../api/apiService';
import { CANCELLATION_REQUEST } from '../api/apiEndpoints';

const cancellationRequestService = {
  /**
   * Get default cancellation reasons
   * GET /api/cancellation-requests/reasons
   * Public endpoint (no auth required)
   */
  getReasons: (config = {}) =>
    apiService.get(CANCELLATION_REQUEST.GET_REASONS, config),

  /**
   * Create cancellation request
   * POST /api/cancellation-requests
   * Requires: User, Agent, or Host authentication
   * Body: { bookingId, reason, customReason?, contactNumber }
   */
  create: (data, config = {}) =>
    apiService.post(CANCELLATION_REQUEST.CREATE, data, config),

  /**
   * Get own cancellation requests
   * GET /api/cancellation-requests/my-requests
   * Requires: User, Agent, or Host authentication
   * Query params: status?, page?, limit?
   */
  getMyRequests: (params, config = {}) =>
    apiService.get(CANCELLATION_REQUEST.GET_MY_REQUESTS, {
      ...config,
      params: {
        ...(config.params || {}),
        ...params,
      },
    }),

  /**
   * Get all cancellation requests (admin)
   * GET /api/cancellation-requests
   * Requires: Admin authentication
   * Query params: status?, page?, limit?
   */
  getAll: (params, config = {}) =>
    apiService.get(CANCELLATION_REQUEST.GET_ALL, {
      ...config,
      params: {
        ...(config.params || {}),
        ...params,
      },
    }),

  /**
   * Get cancellation request by ID
   * GET /api/cancellation-requests/:requestId
   * Requires: Admin authentication, or requester (user/agent/host) authentication
   */
  getById: (requestId, config = {}) =>
    apiService.get(`${CANCELLATION_REQUEST.GET_BY_ID}/${requestId}`, config),

  /**
   * Approve cancellation request
   * PUT /api/cancellation-requests/:requestId/approve
   * Requires: Admin authentication
   * Body: { adminNotes? }
   */
  approve: (requestId, data, config = {}) =>
    apiService.put(`${CANCELLATION_REQUEST.APPROVE}/${requestId}/approve`, data, config),

  /**
   * Reject cancellation request
   * PUT /api/cancellation-requests/:requestId/reject
   * Requires: Admin authentication
   * Body: { adminNotes }
   */
  reject: (requestId, data, config = {}) =>
    apiService.put(`${CANCELLATION_REQUEST.REJECT}/${requestId}/reject`, data, config),
};

export default cancellationRequestService;

