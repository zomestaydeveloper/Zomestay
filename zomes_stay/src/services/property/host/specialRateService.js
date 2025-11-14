import apiService from "../../api/apiService";
import { HOST_INVENTORY } from "../../api/apiEndpoints";

const specialRateService = {
  
  createSpecialRate: (propertyId, specialRateData) => 
    apiService.post(`${HOST_INVENTORY.SPECIAL_RATES}/${encodeURIComponent(propertyId)}`, specialRateData),

  getSpecialRates: (propertyId, params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const url = `${HOST_INVENTORY.SPECIAL_RATES}/${encodeURIComponent(propertyId)}${queryString ? `?${queryString}` : ''}`;
    return apiService.get(url);
  },

  getSpecialRateById: (rateId) => 
    apiService.get(`${HOST_INVENTORY.SPECIAL_RATES}/${encodeURIComponent(rateId)}`),

  updateSpecialRate: (rateId, updateData) => 
    apiService.put(`${HOST_INVENTORY.SPECIAL_RATES}/${encodeURIComponent(rateId)}`, updateData),

  deleteSpecialRate: (rateId) => 
    apiService.delete(`${HOST_INVENTORY.SPECIAL_RATES}/${encodeURIComponent(rateId)}`),

  toggleSpecialRate: (rateId) => 
    apiService.patch(`${HOST_INVENTORY.SPECIAL_RATES}/${encodeURIComponent(rateId)}/toggle`),

  getActiveRatesForDate: (propertyId, date, roomType = null) => {
    const params = { propertyId, date };
    if (roomType) params.roomType = roomType;
    const queryString = new URLSearchParams(params).toString();
    return apiService.get(`${HOST_INVENTORY.SPECIAL_RATES}/active?${queryString}`);
  },

  getSpecialRateAnalytics: (propertyId, params = {}) => {
    const queryString = new URLSearchParams({ ...params, propertyId }).toString();
    return apiService.get(`${HOST_INVENTORY.SPECIAL_RATES}/analytics?${queryString}`);
  }
};

export default specialRateService;
