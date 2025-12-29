/**
 * Agent Endpoints
 * 
 * These endpoints require Agent authentication
 * Used by travel agents
 */

export const AGENT = {
  // Authentication
  AUTH: {
    REGISTER: '/api/travel-agent/register',
    LOGIN: '/api/travel-agent/login',
    LOGOUT: '/api/travel-agent/logout',
    REFRESH: '/api/travel-agent/refresh',
  },

  // Profile Management
  PROFILE: {
    GET: '/api/travel-agent/profile',
    UPDATE: '/api/travel-agent/profile/update',
    CHANGE_PASSWORD: '/api/travel-agent/password/change',
  },

  // Properties Access
  PROPERTIES: {
    LIST: '/api/properties-for-agent/properties',
  },

  // Agent Discounts & Access
  DISCOUNTS: {
    GET_AGENTS_WITH_DISCOUNTS: '/api/agent-discounts/agents-with-discounts',
    GET_AGENT_DISCOUNTS: (agentId) => `/api/agent-discounts/agents/${agentId}/discounts`,
    SET_DISCOUNT: '/api/agent-discounts/discounts',
    REMOVE_DISCOUNT: (agentId, propertyId) => `/api/agent-discounts/discounts/${agentId}/${propertyId}`,
    TOGGLE_ACCESS: (agentId, propertyId) => `/api/agent-discounts/agents/${agentId}/properties/${propertyId}/access`,
  },

  // Cancellation Requests
  CANCELLATION_REQUEST: {
    CREATE: '/api/cancellation-requests',
    GET_MY_REQUESTS: '/api/cancellation-requests/my-requests',
    GET_BY_ID: (id) => `/api/cancellation-requests/${id}`,
  },
};

export default AGENT;
