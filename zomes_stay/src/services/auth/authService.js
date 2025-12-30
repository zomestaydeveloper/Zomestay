import apiService from "../api/apiService";
import { AUTH } from "../api/apiEndpoints";


const authService = {

    login: (credentials) => apiService.post(AUTH.LOGIN, credentials),
    sendOTP: (credentials) => apiService.post(AUTH.SEND_OTP, credentials),
    resendOTP: (credentials) => apiService.post(AUTH.RESEND_OTP, credentials),
    verifyOTP: (credentials) => apiService.post(AUTH.VERIFY_OTP, credentials),
    register: (credentials) => apiService.post(AUTH.REGISTER, credentials),
    logout: () => apiService.post(AUTH.LOGOUT),

}
export default authService;