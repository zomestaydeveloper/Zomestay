/**
 * User & Agent Common Endpoints
 * 
 * These endpoints are used by both User and Agent roles
 * Shared functionality between customers and travel agents
 */

export const USER_AGENT_COMMON = {
  // Property Details (Both User and Agent can view)
  PROPERTY: {
    DETAILS: (id) => `/api/propertiesDetials/${id}`,
    PRICING: (id) => `/api/propertiesDetials/${id}/pricing`,
    BOOKING_DATA: (id) => `/api/propertiesDetials/${id}/booking-data`,
  },

  // Payments (Both User and Agent can create orders)
  PAYMENTS: {
    CREATE_ORDER: '/api/create-order',
    VERIFY_PAYMENT: '/api/verify-payment', // @deprecated
    GET_BY_ORDER_ID: (orderId) => `/api/bookings/order/${orderId}`,
  },

  // Bookings (Both User and Agent can access bookings)
  BOOKINGS: {
    LIST: '/bookings',
    GET_BY_ID: (id) => `/bookings/${id}`,
    GET_DETAILS: (id) => `/bookings/${id}`,
    CANCEL: (id) => `/bookings/${id}/cancel`,
    REFUND_COMPLETE: (id) => `/bookings/${id}/refund-complete`,
  },

  // Cancellation Requests (Both User and Agent can create)
  CANCELLATION_REQUEST: {
    CREATE: '/api/cancellation-requests',
    GET_MY_REQUESTS: '/api/cancellation-requests/my-requests',
    GET_BY_ID: (id) => `/api/cancellation-requests/${id}`,
  },
};

export default USER_AGENT_COMMON;
