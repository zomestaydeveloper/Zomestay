import apiService from "../api/apiService";
import { PROPERTY_SEARCH } from "../api/apiEndpoints";

const propertySearchService = {
  /**
   * Get unique cities with icons from all active properties
   * @returns {Promise} Response with unique cities data
   */
  getUniqueCities: () => {
    return apiService.get(PROPERTY_SEARCH.CITIES);
  },

  /**
   * Get all property types
   * @returns {Promise} Response with property types data
   */
  getPropertyTypes: () => {
    return apiService.get(PROPERTY_SEARCH.PROPERTY_TYPES);
  }
};

export default propertySearchService;

