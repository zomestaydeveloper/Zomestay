import apiService from '../api/apiService';
import { TRAVEL_AGENT_AUTH } from '../api/apiEndpoints';

/**
 * Agent Update Service
 * Handles agent profile update operations
 */
const agentUpdateService = {
  /**
   * Update agent profile
   * @param {Object} profileData - Profile data to update
   * @returns {Promise} API response
   */
  updateProfile: async (profileData) => {
    try {
      const response = await apiService.put(TRAVEL_AGENT_AUTH.UPDATE_PROFILE, profileData);
      return response;
    } catch (error) {
      console.error('Update Agent Profile Error:', error);
      throw error;
    }
  },

  /**
   * Update agent profile with profile image
   * @param {FormData} formData - FormData containing profile data and image file
   * @returns {Promise} API response
   */
  updateProfileWithImage: async (formData) => {
    try {
      const response = await apiService.put(TRAVEL_AGENT_AUTH.UPDATE_PROFILE, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response;
    } catch (error) {
      console.error('Update Agent Profile with Image Error:', error);
      throw error;
    }
  },

  /**
   * Change agent password
   * @param {Object} passwordData - Object containing currentPassword and newPassword
   * @returns {Promise} API response
   */
  changePassword: async (passwordData) => {
    try {
      const response = await apiService.put(TRAVEL_AGENT_AUTH.CHANGE_PASSWORD, passwordData);
      return response;
    } catch (error) {
      console.error('Change Agent Password Error:', error);
      throw error;
    }
  },
};

export default agentUpdateService;

