/**
 * Host Endpoints
 * 
 * These endpoints require Host authentication
 * Used by property hosts
 */

export const HOST = {
  // Authentication
  AUTH: {
    LOGIN: '/host-login',
    LOGOUT: '/host/logout',
    REFRESH: '/host/refresh',
  },

  // Properties Management
  PROPERTIES: {
    LIST: '/propertiesbyhost',
    GET_BY_ID: (id) => `/properties/${id}`,
    UPDATE_BASICS: (id) => `/host-property/${id}/basics`,
    UPDATE_LOCATION: (id) => `/host-property/${id}/location`,
    UPDATE_POLICY: (id) => `/host-property/${id}/policy`,
    UPDATE_FEATURES: (id) => `/host-property/${id}/features`,
    UPDATE_GALLERY: (id) => `/host-property/${id}/gallery`,
    UPDATE_ROOM_TYPES: (id) => `/host-property/${id}/room-types`,
  },

  // Inventory Management
  INVENTORY: {
    GET_AVAILABILITY: (propertyId) => `/properties/${propertyId}/availability`,
  },

  // Special Rates
  SPECIAL_RATES: {
    CREATE: (propertyId) => `/special-rates/${propertyId}`,
    GET_BY_PROPERTY: (propertyId) => `/special-rates/${propertyId}/`,
    GET_BY_ID: (id) => `/special-rates/${id}`,
    UPDATE: (id) => `/special-rates/${id}`,
    DELETE: (id) => `/special-rates/${id}`,
    TOGGLE: (id) => `/special-rates/${id}/toggle`,
  },

  // Special Rate Applications
  SPECIAL_RATE_APPLICATIONS: {
    CREATE: '/special-rate-applications',
    LIST: '/special-rate-applications',
    GET_BY_ID: (id) => `/special-rate-applications/${id}`,
  },

  // Rate Plans
  RATE_PLANS: {
    SAVE_BULK: '/roomtype-mealplan/save-bulk',
    UPDATE_BULK: '/roomtype-mealplan/update-bulk',
    UPDATE: (id) => `/rate-plan/${id}`,
    GET_BY_PROPERTY: (propertyId) => `/rate-plans/${propertyId}`,
    SAVE: '/roomtype-mealplan/save',
    GET_PROPERTY_PLANS: (propertyId) => `/roomtype-mealplan/property/${propertyId}`,
    DELETE: (id) => `/roomtype-mealplan/${id}`,
  },

  // Daily Rates
  DAILY_RATES: {
    GET_RATE_PLAN_DATES: (propertyId) => `/host/daily-rates/property/${propertyId}/rate-plan-dates`,
    GET_RATE_PLAN_FOR_DATE: (propertyId, date) => `/host/daily-rates/property/${propertyId}/rate-plan-dates/${date}`,
    APPLY_RATE_PLAN: '/host/daily-rates/apply-rate-plan',
    APPLY_RATE_PLAN_RANGE: '/host/daily-rates/apply-rate-plan-range',
    REMOVE_RATE_PLAN: '/host/daily-rates/remove-rate-plan',
  },

  // Meal Plans
  MEAL_PLANS: {
    CREATE: '/meal-plan',
    LIST: '/meal-plan',
    GET_BY_ID: (id) => `/meal-plan/${id}`,
    UPDATE: (id) => `/meal-plan/${id}`,
    DELETE: (id) => `/meal-plan/${id}`,
  },

  // Front Desk
  FRONT_DESK: {
    PROPERTY_SUMMARY: '/host-front-desk/property',
  },

  // Bookings
  BOOKINGS: {
    LIST: '/bookings',
    GET_BY_ID: (id) => `/bookings/${id}`,
  },

  // Guests
  GUESTS: {
    GET_BY_PROPERTY: (propertyId) => `/guests/property/${propertyId}`,
    BLOCK: (id) => `/guests/${id}/block`,
    UNBLOCK: (id) => `/guests/${id}/unblock`,
    TOGGLE_BLOCK: (id) => `/guests/${id}/toggle-block`,
  },

  // Payments
  PAYMENTS: {
    GET_BY_PROPERTY: (propertyId) => `/payments/property/${propertyId}`,
    UPDATE_STATUS: (id) => `/payments/${id}/status`,
    GET_STATUSES: '/payments/statuses',
  },

  // Cancellation Requests
  CANCELLATION_REQUEST: {
    CREATE: '/api/cancellation-requests',
    GET_MY_REQUESTS: '/api/cancellation-requests/my-requests',
    GET_BY_ID: (id) => `/api/cancellation-requests/${id}`,
  },
};

export default HOST;
