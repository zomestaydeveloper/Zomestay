/**
 * User Endpoints
 * 
 * These endpoints require User authentication
 * Used by regular users (customers)
 */

export const USER = {
  // Authentication
  AUTH: {
    SEND_OTP: '/api/users/send-otp',
    RESEND_OTP: '/api/users/resend-otp',
    VERIFY_OTP: '/api/users/verify-otp',
    CREATE: '/api/users/create',
    LOGOUT: '/api/users/logout',
  },

  // Profile Management
  PROFILE: {
    GET: '/api/users/profile',
    UPDATE: '/api/users/profile',
    DELETE: '/api/users/profile',
  },

  // Payments
  PAYMENTS: {
    CREATE_ORDER: '/api/create-order',
    VERIFY_PAYMENT: '/api/verify-payment', // @deprecated - Use webhook
    GET_BY_ORDER_ID: (orderId) => `/api/bookings/order/${orderId}`,
  },

  // Cancellation Requests
  CANCELLATION_REQUEST: {
    CREATE: '/api/cancellation-requests',
    GET_MY_REQUESTS: '/api/cancellation-requests/my-requests',
    GET_BY_ID: (id) => `/api/cancellation-requests/${id}`,
  },

  // Reviews
  REVIEWS: {
    CREATE: '/api/reviews',
    GET_BY_BOOKING: (bookingId) => `/api/reviews/booking/${bookingId}`,
    UPDATE: (id) => `/api/reviews/${id}`,
    DELETE: (id) => `/api/reviews/${id}`,
  },
};

export default USER;
