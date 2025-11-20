/**
 * Review Service
 * Handles API calls for reviews
 */

import apiService from '../api/apiService';
import { API_BASE } from '../api/apiEndpoints';

const REVIEW_ENDPOINTS = {
  CREATE: `${API_BASE}/reviews`,
  GET_BY_BOOKING: `${API_BASE}/reviews/booking`,
  GET_BY_PROPERTY: `${API_BASE}/reviews/property`,
  UPDATE: `${API_BASE}/reviews`,
  DELETE: `${API_BASE}/reviews`,
};

const reviewService = {
  /**
   * Create a review for a completed booking
   * POST /api/reviews
   * Body: { bookingId, rating (1-5), description? }
   */
  create: (data, config = {}) =>
    apiService.post(REVIEW_ENDPOINTS.CREATE, data, config),

  /**
   * Get review for a specific booking
   * GET /api/reviews/booking/:bookingId
   */
  getByBooking: (bookingId, config = {}) =>
    apiService.get(`${REVIEW_ENDPOINTS.GET_BY_BOOKING}/${bookingId}`, config),

  /**
   * Get all reviews for a property
   * GET /api/reviews/property/:propertyId
   * Query params: page?, limit?
   */
  getByProperty: (propertyId, params, config = {}) =>
    apiService.get(`${REVIEW_ENDPOINTS.GET_BY_PROPERTY}/${propertyId}`, {
      ...config,
      params: {
        ...(config.params || {}),
        ...params,
      },
    }),

  /**
   * Update own review
   * PUT /api/reviews/:reviewId
   * Body: { rating?, description? }
   */
  update: (reviewId, data, config = {}) =>
    apiService.put(`${REVIEW_ENDPOINTS.UPDATE}/${reviewId}`, data, config),

  /**
   * Delete own review
   * DELETE /api/reviews/:reviewId
   */
  delete: (reviewId, config = {}) =>
    apiService.delete(`${REVIEW_ENDPOINTS.DELETE}/${reviewId}`, config),
};

export default reviewService;

