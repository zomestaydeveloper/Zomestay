import apiService from "../api/apiService";
import { TRAVEL_AGENT_AUTH } from "../api/apiEndpoints";

const agentAuthService = {
    login: (credentials) => apiService.post(TRAVEL_AGENT_AUTH.LOGIN, credentials),
    register: (credentials) => apiService.post(TRAVEL_AGENT_AUTH.REGISTER, credentials),
    logout: () => apiService.post(TRAVEL_AGENT_AUTH.LOGOUT),
    getProfile: () => apiService.get(TRAVEL_AGENT_AUTH.PROFILE),
};

export default agentAuthService;

