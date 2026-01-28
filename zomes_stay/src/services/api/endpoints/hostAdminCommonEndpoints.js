/**
 * Host & Admin Common Endpoints
 * 
 * These endpoints are used by both Host and Admin roles
 * Shared functionality for property management
 */

export const HOST_ADMIN_COMMON = {
  // Property Configurations (Both Host and Admin can view/create, Admin can update/delete)
  PROPERTY_CONFIG: {
    AMENITIES: '/amenities',
    FACILITIES: '/facilities',
    SAFETY_FEATURES: '/safety-hygiene',
    PROPERTY_TYPES: '/property-types',
    ROOM_TYPES: '/room-types',
    CANCELLATION_POLICIES: '/cancellation-policies',
  },

  // Properties (Both Host and Admin can manage)
  PROPERTIES: {
    LIST: '/properties',
    GET_BY_ID: (id) => `/properties/${id}`,
    CREATE: '/properties',
    UPDATE: (id) => `/properties/${id}`,
    SEARCH: '/properties/search',
    GET_UTILS: '/properties_utils',
  },

  // Inventory/Availability
  INVENTORY: {
    GET_AVAILABILITY: (propertyId) => `/properties/${propertyId}/availability`,
  },

  // Special Rates (Both Host and Admin can manage)
  SPECIAL_RATES: {
    CREATE: (propertyId) => `/special-rates/${propertyId}`,
    GET_BY_PROPERTY: (propertyId) => `/special-rates/${propertyId}/`,
    GET_BY_ID: (id) => `/special-rates/${id}`,
    UPDATE: (id) => `/special-rates/${id}`,
    DELETE: (id) => `/special-rates/${id}`,
    TOGGLE: (id) => `/special-rates/${id}/toggle`,
  },

  // Meal Plans (Both Host and Admin can manage)
  MEAL_PLANS: {
    CREATE: '/meal-plan',
    LIST: '/meal-plan',
    GET_BY_ID: (id) => `/meal-plan/${id}`,
    UPDATE: (id) => `/meal-plan/${id}`,
    DELETE: (id) => `/meal-plan/${id}`,
  },

  // Guests (Admin: all, Host: own properties)
  GUESTS: {
    GET_BY_PROPERTY: (propertyId) => `/guests/property/${propertyId}`,
    BLOCK: (id) => `/guests/${id}/block`,
    UNBLOCK: (id) => `/guests/${id}/unblock`,
    TOGGLE_BLOCK: (id) => `/guests/${id}/toggle-block`,
  },

  // Payments (Admin: all, Host: own properties)
  PAYMENTS: {
    GET_BY_PROPERTY: (propertyId) => `/payments/property/${propertyId}`,
    UPDATE_STATUS: (id) => `/payments/${id}/status`,
    GET_STATUSES: '/payments/statuses',
  },

  // Front Desk (Both Host and Admin can access)
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

  // Hosts (Admin)
  HOSTS: {
    ALL: '/admin/host/all-hosts',
  },
};

export default HOST_ADMIN_COMMON;

