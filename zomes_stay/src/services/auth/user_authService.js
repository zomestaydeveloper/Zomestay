import apiService from "../api/apiService";
import { USER } from "../api/apiEndpoints";

const userAuthService = {
    /**
     * Send OTP to user's phone number
     * @param {Object} data - { phone: string, countryCode?: string }
     * @returns {Promise} API response with OTP (for development)
     */
    sendOTP: (data) => apiService.post(USER.SEND_OTP, data),

    /**
     * Resend OTP to user's phone number
     * @param {Object} data - { phone: string, countryCode?: string }
     * @returns {Promise} API response with OTP (for development)
     */
    resendOTP: (data) => apiService.post(USER.RESEND_OTP, data),

    /**
     * Verify OTP and login/register user
     * @param {Object} data - { phone: string, otp: string }
     * @returns {Promise} API response with token and user data or userDidNotExist flag
     */
    verifyOTP: (data) => apiService.post(USER.VERIFY_OTP, data),

    /**
     * Create user after OTP verification (Hybrid approach)
     * @param {Object} data - { phone: string, email: string, firstname?: string, lastname?: string }
     * @returns {Promise} API response with token and user data
     */
    createUser: (data) => apiService.post(USER.CREATE, data),

    /**
     * Logout user
     * @returns {Promise} API response
     */
    logout: () => apiService.post(USER.LOGOUT),
};

export default userAuthService;
