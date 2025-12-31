import apiService from "../api/apiService";
import { HOST_AUTH } from "../api/apiEndpoints";

const hostAuthService = {
    login:(credentials) => apiService.post(HOST_AUTH.LOGIN, credentials),
    sendOTP:(credentials) => apiService.post(HOST_AUTH.SEND_OTP, credentials),
    resendOTP:(credentials) => apiService.post(HOST_AUTH.RESEND_OTP, credentials),
    verifyOTP:(credentials) => apiService.post(HOST_AUTH.VERIFY_OTP, credentials),
    registerHost:(credentials) => apiService.post(HOST_AUTH.REGISTER, credentials),
    registerOTP:(credentials) => apiService.post(HOST_AUTH.REGISTER_OTP, credentials),
    logout:() => apiService.post(HOST_AUTH.LOGOUT),
   
}

export default hostAuthService;
