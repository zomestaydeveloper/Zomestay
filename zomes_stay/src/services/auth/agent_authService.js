import apiService from "../api/apiService";
import { TRAVEL_AGENT_AUTH } from "../api/apiEndpoints";

const agentAuthService = {
    login: (credentials) => apiService.post(TRAVEL_AGENT_AUTH.LOGIN, credentials),
    register: (credentials) => apiService.post(TRAVEL_AGENT_AUTH.REGISTER, credentials),
    logout: () => apiService.post(TRAVEL_AGENT_AUTH.LOGOUT),
    getProfile: () => apiService.get(TRAVEL_AGENT_AUTH.PROFILE),
    updateProfile: (profileData) => apiService.put(TRAVEL_AGENT_AUTH.UPDATE_PROFILE, profileData),
    updateProfileWithImage: (formData) => apiService.put(TRAVEL_AGENT_AUTH.UPDATE_PROFILE, formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    }),
    changePassword: (passwordData) => apiService.put(TRAVEL_AGENT_AUTH.CHANGE_PASSWORD, passwordData),
};

export default agentAuthService;

