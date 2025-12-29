/**
 * Admin Endpoints
 * 
 * These endpoints require Admin authentication
 * Used by administrators
 */

export const ADMIN = {
  // Authentication
  AUTH: {
    SIGNUP: '/signup',
    LOGIN: '/login',
    LOGOUT: '/logout',
    TEST: '/test',
  },

  // Properties Management
  PROPERTIES: {
    LIST: '/properties',
    GET_BY_ID: (id) => `/properties/${id}`,
    CREATE: '/properties',
    UPDATE: (id) => `/properties/${id}`,
    DELETE: (id) => `/properties/${id}`,
    LIST_ALL: '/properties/list',
    SEARCH: '/properties/search',
    GET_UTILS: '/properties_utils',
  },

  // Property Configurations
  PROPERTY_CONFIG: {
    AMENITIES: '/amenities',
    FACILITIES: '/facilities',
    SAFETY_FEATURES: '/safety-hygiene',
    PROPERTY_TYPES: '/property-types',
    ROOM_TYPES: '/room-types',
    CANCELLATION_POLICIES: '/cancellation-policies',
    PROPERTY_ROOM_TYPES: '/propertyroomtype',
  },

  // Agents Management
  AGENTS: {
    LIST: '/api/travel-agents/admin/agents',
    GET_BY_ID: (id) => `/api/travel-agents/admin/agents/${id}`,
    UPDATE_STATUS: (id) => `/api/travel-agents/admin/agents/${id}/status`,
    DELETE: (id) => `/api/travel-agents/admin/agents/${id}`,
  },

  // Hosts Management
  HOSTS: {
    CREATE: '/create-host',
    GET_PROPERTIES: (hostId) => `/host-properties/${hostId}`,
  },

  // Bookings Management
  BOOKINGS: {
    LIST: '/bookings',
    GET_BY_ID: (id) => `/bookings/${id}`,
  },

  // Guests Management
  GUESTS: {
    LIST: '/guests',
    GET_BY_ID: (id) => `/guests/${id}`,
    BLOCK: (id) => `/guests/${id}/block`,
    UNBLOCK: (id) => `/guests/${id}/unblock`,
    TOGGLE_BLOCK: (id) => `/guests/${id}/toggle-block`,
  },

  // Payments Management
  PAYMENTS: {
    LIST: '/payments',
    GET_BY_ID: (id) => `/payments/${id}`,
    UPDATE_STATUS: (id) => `/payments/${id}/status`,
    GET_STATUSES: '/payments/statuses',
  },

  // Front Desk
  FRONT_DESK: {
    SNAPSHOT: (propertyId) => `/properties/${propertyId}/front-desk`,
    BOOKING_CONTEXT: (propertyId, roomTypeId) => 
      `/properties/${propertyId}/front-desk/room-types/${roomTypeId}/booking-context`,
    HOLDS: (propertyId) => `/properties/${propertyId}/front-desk/holds`,
    PAYMENT_LINKS: (propertyId) => `/properties/${propertyId}/front-desk/payment-links`,
    BLOCKS: (propertyId) => `/properties/${propertyId}/front-desk/blocks`,
    BLOCK_DETAIL: (propertyId, availabilityId) => 
      `/properties/${propertyId}/front-desk/blocks/${availabilityId}`,
    MAINTENANCE: (propertyId) => `/properties/${propertyId}/front-desk/maintenance`,
    MAINTENANCE_DETAIL: (propertyId, availabilityId) => 
      `/properties/${propertyId}/front-desk/maintenance/${availabilityId}`,
    OUT_OF_SERVICE: (propertyId) => `/properties/${propertyId}/front-desk/out-of-service`,
    OUT_OF_SERVICE_DETAIL: (propertyId, availabilityId) => 
      `/properties/${propertyId}/front-desk/out-of-service/${availabilityId}`,
  },

  // Cancellation Requests
  CANCELLATION_REQUEST: {
    LIST: '/api/cancellation-requests',
    GET_BY_ID: (id) => `/api/cancellation-requests/${id}`,
    APPROVE: (id) => `/api/cancellation-requests/${id}/approve`,
    REJECT: (id) => `/api/cancellation-requests/${id}/reject`,
  },

  // Callback Requests
  CALLBACK_REQUEST: {
    LIST: '/api/callback-requests',
    GET_BY_ID: (id) => `/api/callback-requests/${id}`,
    UPDATE_STATUS: (id) => `/api/callback-requests/${id}/status`,
    DELETE: (id) => `/api/callback-requests/${id}`,
  },

  // Site Configuration
  SITE_CONFIG: {
    GET: '/api/site-config',
    CREATE: '/api/site-config',
    UPDATE: '/api/site-config',
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

  // Meal Plans
  MEAL_PLANS: {
    CREATE: '/meal-plan',
    LIST: '/meal-plan',
    GET_BY_ID: (id) => `/meal-plan/${id}`,
    UPDATE: (id) => `/meal-plan/${id}`,
    DELETE: (id) => `/meal-plan/${id}`,
  },

  // Rate Calendar
  RATE_CALENDAR: {
    GET: (propertyId) => `/properties/${propertyId}/availability`,
  },

  // Property Room Types
  PROPERTY_ROOM_TYPES: {
    LIST: '/propertyRoomType',
    CREATE: '/propertyRoomType',
    UPDATE: (id) => `/propertyRoomType/${id}`,
    DELETE: (id) => `/propertyRoomType/${id}`,
  },
};

export default ADMIN;

