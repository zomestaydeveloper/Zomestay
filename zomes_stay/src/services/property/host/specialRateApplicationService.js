import apiService from "../../api/apiService";
import { SPECIAL_RATE } from "../../api/apiEndpoints";

const specialRateApplicationService = {

    createSpecialRateApplication: (applicationData) =>
        apiService.post(`${SPECIAL_RATE.SPECIAL_RATE_APPLY}`, applicationData),

    getSpecialRateApplications: (params = {}) => {
        const queryString = new URLSearchParams(params).toString();
        const url = `${SPECIAL_RATE.SPECIAL_RATE_APPLY}${queryString ? `?${queryString}` : ''}`;
        return apiService.get(url);
    },
    deleteSpecialRateApplication: (applicationId) =>
        apiService.delete(`${SPECIAL_RATE.SPECIAL_RATE_APPLY}/${applicationId}`),
}

export default specialRateApplicationService;