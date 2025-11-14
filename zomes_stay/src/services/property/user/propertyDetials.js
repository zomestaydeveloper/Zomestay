import apiService from "../../api/apiService";
import { PROPERTY } from "../../api/apiEndpoints";

const propertyDetailsService = {
    // Basic property details (no date parameters needed)
    getPropertyDetails: (id) => 
        apiService.get(`${PROPERTY.PROPERTY_DETAILS}/${id}`),
    
    // Pricing and availability data (supports both date range and month-based loading)
    getPropertyPricing: (id, params) => {
        const queryParams = {};
        
        if (params?.month && params?.year) {
            // Month-based loading
            queryParams.month = params.month;
            queryParams.year = params.year;
        } else if (params?.startDate && params?.endDate) {
            // Date range loading (legacy)
            queryParams.startDate = params.startDate;
            queryParams.endDate = params.endDate;
        }
        
        return apiService.get(`${PROPERTY.PROPERTY_DETAILS}/${id}/pricing`, { 
            params: queryParams
        });
    },
};

export default propertyDetailsService;


