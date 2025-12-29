import axios from 'axios';
const axiosInstance = axios.create({
  baseURL: "http://localhost:5000",
  //baseURL: "https://api.techiconnect.shop",
  withCredentials: true, 
});


/**
 * Get token from Redux Persist localStorage
 * @param {string} sliceName - 'adminAuth', 'hostAuth', 'userAuth', 'agentAuth'
 * @param {string} tokenKey - 'adminAccessToken', 'hostAccessToken', etc.
 * @returns {string | null} - Token or null if not found
 */
const getTokenFromLocalStorage = (sliceName, tokenKey) => {
    try {
      // Step 1: Build localStorage key
      const storageKey = `persist:${sliceName}`;
      
      // Step 2: Read from localStorage
      const storedData = localStorage.getItem(storageKey);
      if (!storedData) return null;
      
      // Step 3: Parse JSON
      const parsedData = JSON.parse(storedData);
      
      // Step 4: Extract state (remove _persist metadata)
      let state = parsedData;
      if (parsedData._persist) {
        const { _persist, ...cleanState } = parsedData;
        state = cleanState;
      }
      
      // Step 5: Get token from state
      const token = state[tokenKey] || null;
      
      return token;
    } catch (error) {
      console.error(`[getTokenFromLocalStorage] Error:`, error);
      return null;
    }
  };


  /**
 * Detect role from current browser route
 * @returns {string | null} - 'admin', 'host', 'user', 'agent', or null
 */
const getRoleFromRoute = () => {
    if (typeof window === 'undefined') return null;
    
    const pathname = window.location.pathname;
    
    // Check in order of specificity (most specific first!)
    
    // 1. Agent routes (most specific - must check before /app/*)
    if (pathname.startsWith('/app/agent/') || pathname.startsWith('/agent/')) {
      return 'agent';
    }
    
    // 2. Admin routes
    if (pathname.startsWith('/admin/base/') || pathname.startsWith('/admin/')) {
      return 'admin';
    }
    
    // 3. Host routes
    if (pathname.startsWith('/host/base/') || pathname.startsWith('/host/')) {
      return 'host';
    }
    
    // 4. User routes (check last - least specific)
    if (pathname.startsWith('/app/')) {
      return 'user';
    }
    
    return null; // No role detected
  };


  /**
 * Get token for a specific role
 * @param {string} role - 'admin', 'host', 'user', 'agent'
 * @returns {string | null} - Token or null
 */
const getTokenForRole = (role) => {
    const roleConfig = {
      admin: { slice: 'adminAuth', tokenKey: 'adminAccessToken' },
      host: { slice: 'hostAuth', tokenKey: 'hostAccessToken' },
      user: { slice: 'userAuth', tokenKey: 'userAccessToken' },
      agent: { slice: 'agentAuth', tokenKey: 'agentAccessToken' },
    };
    
    const config = roleConfig[role];
    if (!config) {
      console.warn(`[getTokenForRole] Unknown role: ${role}`);
      return null;
    }
    
    return getTokenFromLocalStorage(config.slice, config.tokenKey);
  };

  /**
 * Get token based on browser context (current route)
 * This is the PRIMARY method for token selection
 * @returns {string | null} - Token or null
 */
const getTokenFromContext = () => {
    // Step 1: Detect role from current route
    const role = getRoleFromRoute();
    
    // Step 2: If role detected, get token for that role
    if (role) {
      console.log('role', role);
      const token = getTokenForRole(role);
      if (token) {
        return token; // ✅ Found token for detected role
      }
      // ⚠️ Role detected but no token - return null (don't use fallback)
      return null;
    }
    
    // Step 3: No role detected - return null (let API fail without token)
    // OR: Use priority fallback if you want (admin > host > agent > user)
    return null;
  };

  /**
 * Request Interceptor
 * Runs BEFORE every HTTP request
 * Adds Authorization header with token
 */
axiosInstance.interceptors.request.use(
    (config) => {
      // Step 1: Skip if Authorization header already set (manual override)
      if (config.headers?.Authorization || config.headers?.authorization) {
        return config; // Already has token, skip
      }
      
      // Step 2: Get token from browser context (current route)
      const token = getTokenFromContext();
      
      // Step 3: Add token to headers if found
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      // Step 4: Return config (modified or original)
      return config;
    },
    (error) => {
      // Request error (rare - usually network issues)
      return Promise.reject(error);
    }
  );
  /**
 * Response Interceptor
 * Runs AFTER every HTTP response
 * Handles errors (especially 401 - token expired)
 */
axiosInstance.interceptors.response.use(
    (response) => {
      // Success response - just return it
      return response;
    },
    (error) => {
      // Error response - check if 401 (unauthorized)
      if (error.response?.status === 401) {
        // Token expired or invalid
        
        // Step 1: Clear tokens from localStorage
        const rolesToClear = ['adminAuth', 'hostAuth', 'userAuth', 'agentAuth'];
        rolesToClear.forEach(sliceName => {
          const storageKey = `persist:${sliceName}`;
          localStorage.removeItem(storageKey);
        });
        
        // Step 2: Redirect to appropriate login page
        const pathname = window.location.pathname;
        if (pathname.startsWith('/admin')) {
          window.location.href = '/admin';
        } else if (pathname.startsWith('/host')) {
          window.location.href = '/host';
        } else if (pathname.startsWith('/app')) {
          window.location.href = '/';
        }
      }
      
      // Step 3: Return error (let components handle it)
      return Promise.reject(error);
    }
  );


  // Export for use in services/components
export default axiosInstance;