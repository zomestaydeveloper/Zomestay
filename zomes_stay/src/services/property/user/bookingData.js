import { apiService } from '../../index';

const bookingDataService = {
  /**
   * Get booking data with room availability and pricing combinations
   * @param {string} propertyId - Property ID
   * @param {Object} params - Query parameters
   * @param {string} params.checkIn - Check-in date (YYYY-MM-DD)
   * @param {string} params.checkOut - Check-out date (YYYY-MM-DD)
   * @param {number} params.guests - Number of guests
   * @param {number} params.children - Number of children
   * @param {number} params.adults - Number of adults
   * @param {number} params.rooms - Number of rooms requested
   * @returns {Promise<Object>} Booking data response
   */
  getBookingData: async (propertyId, params) => {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.checkIn) queryParams.append('checkIn', params.checkIn);
      if (params.checkOut) queryParams.append('checkOut', params.checkOut);
      if (params.guests !== undefined) queryParams.append('guests', params.guests);
      if (params.rooms !== undefined) queryParams.append('rooms', params.rooms);
      if (params.children !== undefined) queryParams.append('children', params.children);
      if (params.adults !== undefined) queryParams.append('adults', params.adults);
      
      const queryString = queryParams.toString();
      const url = `/propertiesDetials/${propertyId}/booking-data${queryString ? `?${queryString}` : ''}`;
      
      console.log('🔄 Fetching booking data:', { propertyId, params, url });
      
      const response = await apiService.get(url);
      
      console.log('📥 Booking data response:', response?.data || response);
      
      return response;
    } catch (error) {
      console.error('❌ Error fetching booking data:', error);
      throw error;
    }
  }
};

export default bookingDataService;
