/**
 * Common/Public Endpoints
 * 
 * These endpoints are accessible without authentication
 * Used by all roles and public pages
 */

export const COMMON = {
  // Property Search & Browsing (Public)
  PROPERTY: {
    SEARCH: '/api/search/properties',
    DETAILS: (id) => `/api/propertiesDetials/${id}`,
    PRICING: (id) => `/api/propertiesDetials/${id}/pricing`,
    BOOKING_DATA: (id) => `/api/propertiesDetials/${id}/booking-data`,
    CITIES: '/api/search/cities',
    PROPERTY_TYPES: '/api/search/property-types',
  },

  // Site Configuration (Public GET, Admin POST/PATCH)
  SITE_CONFIG: {
    GET: '/api/site-config',
  },

  // Callback Requests (Public POST, Admin GET/PATCH/DELETE)
  CALLBACK_REQUEST: {
    CREATE: '/api/callback-requests',
  },

  // Cancellation Reasons (Public)
  CANCELLATION: {
    GET_REASONS: '/api/cancellation-requests/reasons',
  },

  // Reviews (Public GET, User POST/PUT/DELETE)
  REVIEWS: {
    GET_BY_PROPERTY: (propertyId) => `/api/reviews/property/${propertyId}`,
  },

  // Rooms (Public)
  ROOMS: {
    GET_AVAILABLE: '/api/rooms',
  },
};

export default COMMON;
