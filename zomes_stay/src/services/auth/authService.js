import apiService from "../api/apiService";
import { AUTH } from "../api/apiEndpoints";


const authService = {
    
    login:(credentials) => apiService.post(AUTH.LOGIN, credentials),
    register:(credentials) => apiService.post(AUTH.REGISTER, credentials),
    logout:() => apiService.post(AUTH.LOGOUT),
   
}
export default authService;