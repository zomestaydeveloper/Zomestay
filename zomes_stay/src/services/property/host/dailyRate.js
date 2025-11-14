import apiService from '../../api/apiService';

/**
 * ===================== Daily Rate Plan API Service =====================
 */

const dailyRateService = {
  // Get all rate plan dates for a property
  getRatePlanDates: (propertyId, startDate = null, endDate = null) => {
    let url = `/host/daily-rates/property/${propertyId}/rate-plan-dates`;
    const params = new URLSearchParams();
    
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    return apiService.get(url);
  },

  // Get rate plan for specific date
  getRatePlanForDate: (propertyId, date) => 
    apiService.get(`/host/daily-rates/property/${propertyId}/rate-plan-dates/${date}`),

  // Apply rate plan to single date
  applyRatePlanToDate: (data) => 
    apiService.post('/host/daily-rates/apply-rate-plan', data),

  // Apply rate plan to date range
  applyRatePlanToDateRange: (data) => 
    apiService.post('/host/daily-rates/apply-rate-plan-range', data),

  // Remove rate plan from date
  removeRatePlanFromDate: (data) => 
    apiService.delete('/host/daily-rates/remove-rate-plan', { data })
};

export default dailyRateService;
