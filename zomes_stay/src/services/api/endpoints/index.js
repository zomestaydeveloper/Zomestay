/**
 * API Endpoints Index
 * 
 * Central export for all role-based endpoint files
 * Provides organized, role-specific endpoint access
 */

// Common/Public endpoints
export { COMMON, default as CommonEndpoints } from './commonEndpoints';

// User endpoints
export { USER, default as UserEndpoints } from './userEndpoints';

// Agent endpoints
export { AGENT, default as AgentEndpoints } from './agentEndpoints';

// User & Agent common endpoints
export { USER_AGENT_COMMON, default as UserAgentCommonEndpoints } from './userAgentCommonEndpoints';

// Host endpoints
export { HOST, default as HostEndpoints } from './hostEndpoints';

// Admin endpoints
export { ADMIN, default as AdminEndpoints } from './adminEndpoints';

// Host & Admin common endpoints
export { HOST_ADMIN_COMMON, default as HostAdminCommonEndpoints } from './hostAdminCommonEndpoints';

// Base configuration
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
export const API_BASE = '/api';

/**
 * Helper function to build full API endpoint
 * @param {string} path - API path
 * @returns {string} Full API endpoint URL
 */
export const buildEndpoint = (path) => {
  if (path.startsWith('/')) {
    return `${API_BASE_URL}${path}`;
  }
  return `${API_BASE_URL}/${path}`;
};

// Default export - all endpoints grouped by role
export default {
  COMMON,
  USER,
  AGENT,
  USER_AGENT_COMMON,
  HOST,
  ADMIN,
  HOST_ADMIN_COMMON,
  API_BASE_URL,
  API_BASE,
  buildEndpoint,
};

