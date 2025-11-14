import apiService from '../../api/apiService';
import { TRAVEL_AGENT_AUTH } from '../../api/apiEndpoints';

/**
 * Travel Agent Authentication Service
 * Handles all travel agent authentication related API calls
 */
const travelAgentAuthService = {
  /**
   * Register a new travel agent
   * @param {Object} agentData - Travel agent registration data
   * @returns {Promise} API response
   */
  register: async (agentData) => {
    try {
      const response = await apiService.post(TRAVEL_AGENT_AUTH.REGISTER, agentData);
      return response;
    } catch (error) {
      console.error('Travel Agent Registration Error:', error);
      throw error;
    }
  },

  /**
   * Login travel agent
   * @param {Object} credentials - Login credentials (email, password)
   * @returns {Promise} API response with token and agent data
   */
  login: async (credentials) => {
    try {
      const response = await apiService.post(TRAVEL_AGENT_AUTH.LOGIN, credentials);
      
      // Store token in localStorage if login successful
      if (response.data?.success && response.data?.data?.token) {
        localStorage.setItem('travelAgentToken', response.data.data.token);
        localStorage.setItem('userType', 'travel_agent');
      }
      
      return response;
    } catch (error) {
      console.error('Travel Agent Login Error:', error);
      throw error;
    }
  },

  /**
   * Logout travel agent
   * @returns {Promise} API response
   */
  logout: async () => {
    try {
      const response = await apiService.post(TRAVEL_AGENT_AUTH.LOGOUT);
      
      // Clear stored tokens
      localStorage.removeItem('travelAgentToken');
      localStorage.removeItem('userType');
      
      return response;
    } catch (error) {
      console.error('Travel Agent Logout Error:', error);
      // Clear tokens even if API call fails
      localStorage.removeItem('travelAgentToken');
      localStorage.removeItem('userType');
      throw error;
    }
  },

  /**
   * Get travel agent profile
   * @returns {Promise} API response with agent profile data
   */
  getProfile: async () => {
    try {
      const response = await apiService.get(TRAVEL_AGENT_AUTH.PROFILE);
      return response;
    } catch (error) {
      console.error('Get Travel Agent Profile Error:', error);
      throw error;
    }
  },

  /**
   * Update travel agent profile
   * @param {Object} profileData - Updated profile data
   * @returns {Promise} API response
   */
  updateProfile: async (profileData) => {
    try {
      const response = await apiService.put(TRAVEL_AGENT_AUTH.UPDATE_PROFILE, profileData);
      return response;
    } catch (error) {
      console.error('Update Travel Agent Profile Error:', error);
      throw error;
    }
  },

  /**
   * Check if travel agent is logged in
   * @returns {boolean} True if logged in, false otherwise
   */
  isLoggedIn: () => {
    const token = localStorage.getItem('travelAgentToken');
    const userType = localStorage.getItem('userType');
    return !!(token && userType === 'travel_agent');
  },

  /**
   * Get stored travel agent token
   * @returns {string|null} Stored token or null
   */
  getToken: () => {
    return localStorage.getItem('travelAgentToken');
  },

  /**
   * Clear all stored authentication data
   */
  clearAuthData: () => {
    localStorage.removeItem('travelAgentToken');
    localStorage.removeItem('userType');
  },

  /**
   * Refresh travel agent token
   * @returns {Promise} API response with new token
   */
  refreshToken: async () => {
    try {
      const response = await apiService.post(TRAVEL_AGENT_AUTH.REFRESH);
      
      // Update stored token if refresh successful
      if (response.data?.success && response.data?.data?.token) {
        localStorage.setItem('travelAgentToken', response.data.data.token);
      }
      
      return response;
    } catch (error) {
      console.error('Travel Agent Token Refresh Error:', error);
      // Clear auth data if refresh fails
      travelAgentAuthService.clearAuthData();
      throw error;
    }
  }
};

export default travelAgentAuthService;
