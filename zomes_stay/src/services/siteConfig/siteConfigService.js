/**
 * Site Configuration Service
 * Fetches site-wide configuration (logo, banner images, phone, etc.)
 */

import apiService from "../api/apiService";
import { SITE_CONFIG } from "../api/apiEndpoints";

// Configuration for FormData (file uploads)
// Note: When using FormData, axios automatically sets Content-Type to multipart/form-data
// with the correct boundary. We should NOT set it manually.
// However, for compatibility with existing code patterns, we'll leave headers empty
// and let axios handle it automatically.
const multipartConfig = {
  // Don't set Content-Type manually - axios will set it with the correct boundary
};

const siteConfigService = {
  /**
   * Get site configuration
   * @returns {Promise} - Site configuration (logo, banner images, phone, etc.)
   */
  getSiteConfig: () => apiService.get(SITE_CONFIG.GET_SITE_CONFIG),
  
  /**
   * Create site configuration
   * @param {FormData|Object} configData - Site configuration data (FormData for file uploads)
   * @returns {Promise} - Created site configuration
   */
  createSiteConfig: (configData) => {
    // If it's FormData, use multipart config
    if (configData instanceof FormData) {
      return apiService.post(SITE_CONFIG.CREATE_SITE_CONFIG, configData, multipartConfig);
    }
    // Otherwise, use JSON
    return apiService.post(SITE_CONFIG.CREATE_SITE_CONFIG, configData);
  },
  
  /**
   * Update site configuration
   * @param {FormData|Object} configData - Site configuration data to update (FormData for file uploads)
   * @returns {Promise} - Updated site configuration
   */
  updateSiteConfig: (configData) => {
    // If it's FormData, use multipart config
    if (configData instanceof FormData) {
      return apiService.patch(SITE_CONFIG.UPDATE_SITE_CONFIG, configData, multipartConfig);
    }
    // Otherwise, use JSON
    return apiService.patch(SITE_CONFIG.UPDATE_SITE_CONFIG, configData);
  },
};

export default siteConfigService;

