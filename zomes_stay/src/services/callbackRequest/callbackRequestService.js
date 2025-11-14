import apiService from "../api/apiService";
import { CALLBACK_REQUEST } from "../api/apiEndpoints";

const encodeId = (value) => encodeURIComponent(value);

const callbackRequestService = {
  /**
   * Create a new callback request
   * @param {Object} data - Callback request data
   * @param {string} data.name - Name of the requester
   * @param {string} data.email - Email of the requester
   * @param {string} data.phone - Phone number of the requester
   * @param {string} [data.notes] - Optional notes
   * @param {string} [data.propertyId] - Optional property ID
   * @returns {Promise} API response
   */
  createCallbackRequest: (data) => {
    return apiService.post(CALLBACK_REQUEST.CREATE, data);
  },

  /**
   * Get all callback requests (for admin)
   * @param {Object} [params] - Query parameters
   * @param {number} [params.page] - Page number
   * @param {number} [params.limit] - Items per page
   * @param {string} [params.status] - Filter by status
   * @param {string} [params.propertyId] - Filter by property ID
   * @param {string} [params.search] - Search term
   * @returns {Promise} API response
   */
  getAllCallbackRequests: (params) => {
    return apiService.get(CALLBACK_REQUEST.GET_ALL, { params });
  },

  /**
   * Get a single callback request by ID (for admin)
   * @param {string} id - Callback request ID
   * @returns {Promise} API response
   */
  getCallbackRequestById: (id) => {
    return apiService.get(`${CALLBACK_REQUEST.GET_BY_ID}/${encodeId(id)}`);
  },

  /**
   * Update callback request status (for admin)
   * @param {string} id - Callback request ID
   * @param {Object} data - Update data
   * @param {string} data.status - New status (pending, contacted, completed, cancelled)
   * @returns {Promise} API response
   */
  updateCallbackRequestStatus: (id, data) => {
    return apiService.patch(`${CALLBACK_REQUEST.UPDATE_STATUS}/${encodeId(id)}/status`, data);
  },

  /**
   * Delete a callback request (for admin)
   * @param {string} id - Callback request ID
   * @returns {Promise} API response
   */
  deleteCallbackRequest: (id) => {
    return apiService.delete(`${CALLBACK_REQUEST.DELETE}/${encodeId(id)}`);
  }
};

export default callbackRequestService;

