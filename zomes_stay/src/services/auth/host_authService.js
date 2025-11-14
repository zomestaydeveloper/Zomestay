import apiService from "../api/apiService";
import { HOST_AUTH } from "../api/apiEndpoints";

const hostAuthService = {
    login:(credentials) => apiService.post(HOST_AUTH.LOGIN, credentials),
    register:(credentials) => apiService.post(HOST_AUTH.REGISTER, credentials),
    logout:() => apiService.post(HOST_AUTH.LOGOUT),
   
}

export default hostAuthService;
