const API_BASE_URL = 'http://localhost:5000/api';

const roomsService = {
  getAvailableRooms: async (propertyId, roomTypeIds = [], checkIn = null, checkOut = null, roomsNeeded = 1) => {
    try {
      const params = new URLSearchParams({
        propertyId: propertyId,
        roomsNeeded: roomsNeeded
      });
      
      if (roomTypeIds.length > 0) {
        params.append('roomTypeIds', JSON.stringify(roomTypeIds));
      }

      if (checkIn) {
        params.append('checkIn', checkIn);
      }

      if (checkOut) {
        params.append('checkOut', checkOut);
      }

      const response = await fetch(`${API_BASE_URL}/rooms?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching available rooms:', error);
      throw error;
    }
  }
};

export default roomsService;
