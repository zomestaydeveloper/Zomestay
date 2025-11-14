import apiService from "../api/apiService";
import { USER } from "../api/apiEndpoints";

const userService = {
  /**
   * Get user profile
   * @returns {Promise} API response
   */
  getProfile: () => apiService.get(USER.GET_PROFILE),

  /**
   * Update user profile
   * @param {Object} profileData - Profile data to update
   * @param {string} profileData.firstname - First name
   * @param {string} profileData.lastname - Last name
   * @param {string} profileData.profileImage - Profile image URL
   * @param {string} profileData.gender - Gender
   * @param {string} profileData.dob - Date of birth (ISO string)
   * @returns {Promise} API response
   */
  updateProfile: (profileData) => apiService.put(USER.UPDATE_PROFILE, profileData),

  /**
   * Update user profile with image upload (FormData)
   * @param {FormData} formData - FormData containing profileImage file and other fields
   * @returns {Promise} API response
   */
  updateProfileWithImage: (formData) => {
    // Note: Don't set Content-Type manually for FormData
    // Axios will automatically set it with the correct boundary
    return apiService.put(USER.UPDATE_PROFILE, formData);
  },

  /**
   * Delete user account (soft delete)
   * @returns {Promise} API response
   */
  deleteProfile: () => apiService.delete(USER.DELETE_PROFILE),
};

export default userService;

