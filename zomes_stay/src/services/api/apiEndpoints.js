// Base API URL
export const API_BASE_URL = 'https://api.techiconnect.shop';
 //export const API_BASE_URL = 'http://localhost:5000';

// Base API paths
export const API_BASE = '/api';

export const AUTH = {
  LOGIN: '/login',
  REGISTER: '/auth/register',
  LOGOUT: '/auth/logout',
  REFRESH: '/auth/refresh',
  ME: '/auth/me',
};


export const HOST_AUTH = {
    LOGIN: '/host-login',
    REGISTER: '/host/register',
    LOGOUT: '/host/logout',
    REFRESH: '/host/refresh',
    ME: '/host/me',
}

// Travel Agent Auth Endpoints
export const TRAVEL_AGENT_AUTH = {
  LOGIN: '/api/travel-agent/login',
  REGISTER: '/api/travel-agent/register',
  LOGOUT: '/api/travel-agent/logout',
  REFRESH: '/api/travel-agent/refresh',
  PROFILE: '/api/travel-agent/profile',
  UPDATE_PROFILE: '/api/travel-agent/profile/update',
  CHANGE_PASSWORD: '/api/travel-agent/password/change',
}


export const PROPERTY = {
  PROPERTY: '/properties',
  PROPERTY_LIST: '/properties/list',
  PROPERTY_BY_QUERY: '/properties/search',
  AMENITIES: '/amenities',
  FACILITIES: '/facilities',
  SAFETIES: '/safety-hygiene',
  ROOM_TYPES: '/room-types',
  ROOMS: '/properties',
  PROPERTY_TYPE: '/property-types',
  PROPERTY_ROOM_TYPES:'/propertyroomtype',
  CANCELLATION_POLICIES: '/cancellation-policies',
  PROPERTY_DETAILS:'/propertiesDetials',
  PROPERTY_UTILS:'/properties_utils',
  PROPERTY_CREATE:'/properties',
  ROOM_CONFIGURATIONS: '/properties',
  UPDATE_ROOMS: '/properties',
  BOOKINGS: '/bookings',
  PROPERTY_UPDATE_BASICS: '/properties',
  PROPERTY_UPDATE_LOCATION: '/properties',
  PROPERTY_UPDATE_FEATURES: '/properties',
  PROPERTY_UPDATE_ROOM_TYPES: '/properties',
  PROPERTY_UPDATE_MEDIA: '/properties',

};

export const PROPERTY_SEARCH = {
  CITIES: '/api/search/cities',
  PROPERTY_TYPES: '/api/search/property-types',
};

export const CALLBACK_REQUEST = {
  CREATE: '/api/callback-requests',
  GET_ALL: '/api/callback-requests',
  GET_BY_ID: '/api/callback-requests',
  UPDATE_STATUS: '/api/callback-requests',
  DELETE: '/api/callback-requests',
};

export const HOST_PROPERTY = {
  PROPERTY: '/propertiesbyhost', // Fixed: Match backend route
  PROPERTY_BY_OWNERID: '/propertiesbyhost', // Fixed: Match backend route
  UPDATE_HOST_PROPERTY_BASICS: '/properties', // Use shared property routes
  UPDATE_HOST_PROPERTY_LOCATION: '/properties', // Use shared property routes
  UPDATE_HOST_PROPERTY_POLICY: '/properties', // Use shared property routes
  UPDATE_HOST_PROPERTY_FEATURES: '/properties', // Use shared property routes
  UPDATE_HOST_PROPERTY_GALLERY: '/properties', // Use shared property routes
  UPDATE_HOST_PROPERTY_ROOM_TYPES: '/properties', // Use shared property routes
};

export const FRONT_DESK = {
  SNAPSHOT: '/properties/:propertyId/front-desk',
  BOOKING_CONTEXT: '/properties/:propertyId/front-desk/room-types/:propertyRoomTypeId/booking-context',
  HOLDS: '/properties/:propertyId/front-desk/holds',
  PAYMENT_LINKS: '/properties/:propertyId/front-desk/payment-links',
  BLOCKS: '/properties/:propertyId/front-desk/blocks',
  BLOCK_DETAIL: '/properties/:propertyId/front-desk/blocks/:availabilityId',
  MAINTENANCE: '/properties/:propertyId/front-desk/maintenance',
  MAINTENANCE_DETAIL: '/properties/:propertyId/front-desk/maintenance/:availabilityId',
  OUT_OF_SERVICE: '/properties/:propertyId/front-desk/out-of-service',
  OUT_OF_SERVICE_DETAIL: '/properties/:propertyId/front-desk/out-of-service/:availabilityId',
  HOST_PROPERTY_SUMMARY: '/host-front-desk/property',
};

export const HOST_INVENTORY = {
  AVAILABILITY: '/properties',
  SPECIAL_RATES: '/special-rates'

}

  
export const MEDIA ={
  MEDIA:''
}
export const USER = {
  BASE: '/users',
  PROFILE: '/api/users/profile',
  GET_PROFILE: '/api/users/profile',
  UPDATE_PROFILE: '/api/users/profile',
  DELETE_PROFILE: '/api/users/profile',
  SEND_OTP: '/api/users/send-otp',
  RESEND_OTP: '/api/users/resend-otp',
  VERIFY_OTP: '/api/users/verify-otp',
  CREATE: '/api/users/create',
  LOGOUT: '/api/users/logout',
  // Add more user-related endpoints as needed
};
export const MEAL_PLAN = {
  MEAL_PLAN: '/meal-plan'
}

export const SPECIAL_RATE = {
  SPECIAL_RATE_APPLY: '/special-rate-applications'
}

export const PROPERTY_ROOM_TYPES={
  PROPERTY_ROOM_TYPES:'/propertyRoomType'
}

export const BOOKING_CANCELLATION = {
  BASE: '/bookings',
  CANCEL: '/bookings',
  REFUND_COMPLETE: '/bookings',
};

export const CANCELLATION_REQUEST = {
  // Get default cancellation reasons (public)
  GET_REASONS: '/api/cancellation-requests/reasons',
  // Create cancellation request (user/agent/host)
  CREATE: '/api/cancellation-requests',
  // Get own cancellation requests (user/agent/host)
  GET_MY_REQUESTS: '/api/cancellation-requests/my-requests',
  // Get all cancellation requests (admin)
  GET_ALL: '/api/cancellation-requests',
  // Get cancellation request by ID
  GET_BY_ID: '/api/cancellation-requests',
  // Approve cancellation request (admin)
  APPROVE: '/api/cancellation-requests',
  // Reject cancellation request (admin)
  REJECT: '/api/cancellation-requests',
};

export const RATE_PLAN = {
  SAVE_BULK: '/roomtype-mealplan/save-bulk',
  UPDATE_BULK: '/roomtype-mealplan/update-bulk',
  UPDATE: '/rate-plan'
}

export const AGENT_OPERATIONS = {
  AGENTS: '/api/travel-agents/agents',
  PROPERTIES: '/api/properties-for-agent/properties',
  AGENTS_WITH_DISCOUNTS: '/api/agent-discounts/agents-with-discounts',
  AGENT_DISCOUNTS: '/api/agent-discounts/agents',
  SET_DISCOUNT: '/api/agent-discounts/discounts',
  REMOVE_DISCOUNT: '/api/agent-discounts/discounts',
  TOGGLE_ACCESS: '/api/agent-discounts/agents',
  ADMIN_AGENTS_LIST: '/api/travel-agents/admin/agents',
  ADMIN_UPDATE_STATUS: '/api/travel-agents/admin/agents',
  ADMIN_DELETE_AGENT: '/api/travel-agents/admin/agents'
}

export const GUESTS = {
  // Admin: Get all guests (from all properties)
  GET_ALL_GUESTS: '/guests',
  // Host: Get guests for a specific property
  GET_PROPERTY_GUESTS: '/guests/property/:propertyId',
  // Block/Unblock guest
  BLOCK_GUEST: '/guests/:guestId/block',
  UNBLOCK_GUEST: '/guests/:guestId/unblock',
  // Toggle block status
  TOGGLE_BLOCK: '/guests/:guestId/toggle-block'
}

export const PAYMENTS = {
  // Admin: Get all payments (from all properties)
  GET_ALL_PAYMENTS: '/payments',
  // Host: Get payments for a specific property
  GET_PROPERTY_PAYMENTS: '/payments/property/:propertyId',
  // Update payment status
  UPDATE_PAYMENT_STATUS: '/payments/:paymentId/status',
  // Get payment statuses (for dropdown)
  GET_PAYMENT_STATUSES: '/payments/statuses'
}

export const SITE_CONFIG = {
  // Get site configuration (logo, banner images, phone, etc.)
  GET_SITE_CONFIG: '/api/site-config',
  // Create site configuration (Admin only)
  CREATE_SITE_CONFIG: '/api/site-config',
  // Update site configuration (Admin only)
  UPDATE_SITE_CONFIG: '/api/site-config'
}

// Add more endpoint categories as needed

