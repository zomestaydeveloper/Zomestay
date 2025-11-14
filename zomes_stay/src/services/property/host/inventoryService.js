import apiService from "../../api/apiService";
import { HOST_INVENTORY, HOST_PROPERTY } from "../../api/apiEndpoints";

const inventoryService = {
  
  getAvailability: (propertyId, startDate, endDate) => {
    const queryString = `startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;
    const url = `${HOST_INVENTORY.AVAILABILITY}/${encodeURIComponent(propertyId)}/availability?${queryString}`;
    return apiService.get(url);
  },

  updateAvailability: (propertyId, availabilityData) => 
    apiService.put(`${HOST_INVENTORY.AVAILABILITY}/${encodeURIComponent(propertyId)}`, availabilityData),

  bulkUpdateAvailability: (propertyId, bulkData) => 
    apiService.post(`${HOST_INVENTORY.AVAILABILITY}/${encodeURIComponent(propertyId)}/bulk`, bulkData),

  getPricing: (propertyId, params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiService.get(`${HOST_INVENTORY.AVAILABILITY}/${encodeURIComponent(propertyId)}/pricing?${queryString}`);
  },

  getInventorySummary: (propertyId, params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiService.get(`${HOST_INVENTORY.AVAILABILITY}/${encodeURIComponent(propertyId)}/summary?${queryString}`);
  },
  getPropertyByID: (ownerId, config = {}) =>
    apiService.get(
      `${HOST_PROPERTY.PROPERTY_BY_OWNERID}/${encodeURIComponent(ownerId)}`,
      config
    )
};

export default inventoryService;
