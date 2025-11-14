// Mock data service for demo purposes
// This replaces API calls with mock data

export const mockRatePlans = [
  {
    id: 'rate-1',
    name: 'Standard Rate',
    color: '#3B82F6',
    isActive: true,
    roomTypeMealPlanPricing: [
      {
        id: 'pricing-1',
        propertyRoomTypeId: 'roomtype-1',
        mealPlanId: 'meal-1',
        singleOccupancyPrice: 2500,
        doubleOccupancyPrice: 3500,
        extraBedPriceAdult: 800,
        extraBedPriceChild: 400,
        extraBedPriceInfant: 0,
        groupOccupancyPrice: 4500,
        propertyRoomType: {
          roomType: { name: 'Deluxe Room' }
        },
        mealPlan: { name: 'EP001', code: 'EP001' }
      },
      {
        id: 'pricing-2',
        propertyRoomTypeId: 'roomtype-1',
        mealPlanId: 'meal-2',
        singleOccupancyPrice: 3000,
        doubleOccupancyPrice: 4000,
        extraBedPriceAdult: 800,
        extraBedPriceChild: 400,
        extraBedPriceInfant: 0,
        groupOccupancyPrice: 5000,
        propertyRoomType: {
          roomType: { name: 'Deluxe Room' }
        },
        mealPlan: { name: 'CP001', code: 'CP001' }
      }
    ]
  },
  {
    id: 'rate-2',
    name: 'Peak Season',
    color: '#EF4444',
    isActive: true,
    roomTypeMealPlanPricing: [
      {
        id: 'pricing-3',
        propertyRoomTypeId: 'roomtype-1',
        mealPlanId: 'meal-1',
        singleOccupancyPrice: 3500,
        doubleOccupancyPrice: 4500,
        extraBedPriceAdult: 1000,
        extraBedPriceChild: 500,
        extraBedPriceInfant: 0,
        groupOccupancyPrice: 6000,
        propertyRoomType: {
          roomType: { name: 'Deluxe Room' }
        },
        mealPlan: { name: 'EP001', code: 'EP001' }
      }
    ]
  }
];

export const mockMealPlans = [
  {
    id: 'meal-1',
    code: 'EP001',
    name: 'European Plan',
    kind: 'EP',
    description: 'Room only - no meals included',
    propertyId: 'prop-1'
  },
  {
    id: 'meal-2',
    code: 'CP001',
    name: 'Continental Plan',
    kind: 'CP',
    description: 'Room + Breakfast included',
    propertyId: 'prop-1'
  },
  {
    id: 'meal-3',
    code: 'MAP001',
    name: 'Modified American Plan',
    kind: 'MAP',
    description: 'Room + Breakfast + Dinner',
    propertyId: 'prop-1'
  },
  {
    id: 'meal-4',
    code: 'AP001',
    name: 'American Plan',
    kind: 'AP',
    description: 'Room + All Meals included',
    propertyId: 'prop-1'
  }
];

export const mockRoomTypes = [
  {
    id: 'roomtype-1',
    name: 'Deluxe Room',
    propertyId: 'prop-1',
    roomCount: 15,
    hasRooms: true
  },
  {
    id: 'roomtype-2',
    name: 'Suite',
    propertyId: 'prop-1',
    roomCount: 8,
    hasRooms: true
  },
  {
    id: 'roomtype-3',
    name: 'Standard Room',
    propertyId: 'prop-1',
    roomCount: 0,
    hasRooms: false
  }
];

// Mock service functions
export const mockRoomtypeMealPlanService = {
  getPropertyRatePlans: async (propertyId) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    return {
      data: {
        data: mockRatePlans
      }
    };
  },
  
  updateRatePlan: async (ratePlanId, updateData) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('Mock: Updating rate plan', ratePlanId, updateData);
    return { success: true };
  }
};

export const mockMealPlanService = {
  getMealPlans: async (propertyId) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockMealPlans;
  },
  
  createMealPlan: async (data) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('Mock: Creating meal plan', data);
    return { success: true };
  },
  
  updateMealPlan: async (id, data) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('Mock: Updating meal plan', id, data);
    return { success: true };
  },
  
  deleteMealPlan: async (id) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('Mock: Deleting meal plan', id);
    return { success: true };
  }
};

export const mockPropertyService = {
  getRoomConfigurations: async (propertyId) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return {
      data: {
        success: true,
        data: mockRoomTypes
      }
    };
  },
  
  createRoom: async (propertyId, data) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('Mock: Creating room', propertyId, data);
    return { data: { success: true } };
  },
  
  updateRooms: async (propertyId, data) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('Mock: Updating rooms', propertyId, data);
    return { data: { success: true } };
  }
};

export const mockPropertyRoomTypeService = {
  getPropertyRoomTypes: async (propertyId) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return { data: mockRoomTypes };
  }
};

export const mockDailyRateService = {
  getRatePlanDates: async (propertyId, startDate, endDate) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return {
      data: {
        success: true,
        data: []
      }
    };
  },
  
  applyRatePlanToDate: async (data) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('Mock: Applying rate plan to date', data);
    return { data: { success: true } };
  },
  
  applyRatePlanToDateRange: async (data) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('Mock: Applying rate plan to date range', data);
    return { data: { success: true, data: { totalDates: 5 } } };
  },
  
  removeRatePlanFromDate: async (data) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('Mock: Removing rate plan from date', data);
    return { data: { success: true } };
  }
};
