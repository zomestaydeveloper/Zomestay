
import axios from 'axios';
const axiosInstance = axios.create({
  //baseURL: "http://54.172.53.96:5000",
  baseURL:import.meta.env.BASE_URL,
  withCredentials: true, 
});

/**
 * Get the current browser route/context to determine active role
 * This matches the route structure in App.jsx
 * Route structure:
 * - /app/* → user routes
 * - /app/agent/* → agent routes
 * - /admin/base/* → admin routes
 * - /host/base/* → host routes
 * - /agent/dashboard → agent dashboard
 * @returns {string | null} - 'user', 'agent', 'admin', 'host', or null
 */
const getRoleFromBrowserContext = () => {
  if (typeof window === 'undefined') return null;
  
  const currentPath = window.location.pathname;
  console.log('[getRoleFromBrowserContext] Current browser path:', currentPath);
  
  // IMPORTANT: Check more specific routes FIRST (order matters!)
  
  // Agent routes - check /app/agent/* BEFORE /app/* (more specific first)
  if (currentPath.startsWith('/app/agent/')) {
    console.log('[getRoleFromBrowserContext] Detected role from browser: agent (/app/agent/*)');
    return 'agent';
  }
  
  // Agent dashboard route
  if (currentPath.startsWith('/agent/')) {
    console.log('[getRoleFromBrowserContext] Detected role from browser: agent (/agent/*)');
    return 'agent';
  }
  
  // Host routes - /host base and root level dashboards
  if (currentPath.startsWith('/host/base/') || currentPath === '/host' || currentPath.startsWith('/host/')) {
    console.log('[getRoleFromBrowserContext] Detected role from browser: host (/host/*)');
    return 'host';
  }
  
  // Admin routes - /admin base and root login
  if (currentPath.startsWith('/admin/base/') || currentPath === '/admin' || currentPath.startsWith('/admin/')) {
    console.log('[getRoleFromBrowserContext] Detected role from browser: admin (/admin/*)');
    return 'admin';
  }
  
  // User routes - /app/* (matches App.jsx line 72)
  // This must come AFTER /app/agent/* check
  if (currentPath.startsWith('/app/')) {
    console.log('[getRoleFromBrowserContext] Detected role from browser: user (/app/*)');
    return 'user';
  }
  
  console.log('[getRoleFromBrowserContext] No role detected from browser context');
  return null;
};

/**
 * Get Redux persisted state from localStorage
 * Supports both new (nested persist) and old (root persist) storage structures
 * @returns {Object | null} - Parsed Redux state or null
 */
const getReduxState = () => {
  try {
    // Try new structure first (nested persist - separate keys for each slice)
    const rootState = localStorage.getItem('persist:root');
    if (rootState) {
      const parsed = JSON.parse(rootState);
      // Check if it has the old structure (with nested slices as strings)
      if (parsed && typeof parsed[Object.keys(parsed)[0]] === 'string') {
        return parsed; // Old structure
      }
      // New structure might have combined state
      return parsed;
    }
    return null;
  } catch (error) {
    console.error('[getReduxState] Error parsing persisted state:', error);
    return null;
  }
};

/**
 * Get token from Redux persisted state for a specific slice
 * Supports both new (nested persist - separate keys) and old (root persist) storage structures
 * @param {string} sliceName - 'adminAuth', 'hostAuth', 'userAuth', 'agentAuth'
 * @param {string} tokenKey - 'adminAccessToken', 'hostAccessToken', 'userAccessToken', 'agentAccessToken'
 * @returns {string | null} - Token or null
 */
const getTokenFromRedux = (sliceName, tokenKey) => {
  try {
    // METHOD 1: Try new structure first - read directly from individual slice key
    // This is the PRIMARY method for nested persist configs
    // With nested persist, each slice is stored separately: persist:hostAuth, persist:userAuth, etc.
    const sliceKey = `persist:${sliceName}`;
    const sliceStateStr = localStorage.getItem(sliceKey);
    
    if (sliceStateStr) {
      try {
        const sliceState = JSON.parse(sliceStateStr);
        
        // Redux Persist with nested configs stores the slice state directly at the root
        // Structure: { email: "...", hostAccessToken: "...", _persist: {...} }
        // OR sometimes nested: { hostAuth: { email: "...", hostAccessToken: "..." }, _persist: {...} }
        
        // Try direct access first (most common with nested persist)
        let actualState = sliceState;
        
        // If the slice name exists as a key, use that (some persist configurations nest it)
        if (sliceState[sliceName] && typeof sliceState[sliceName] === 'object' && !sliceState[sliceName]._persist) {
          actualState = sliceState[sliceName];
        }
        
        // Remove _persist metadata if present
        if (actualState._persist) {
          const { _persist, ...stateWithoutPersist } = actualState;
          actualState = stateWithoutPersist;
        }
        
        const token = actualState[tokenKey] || null;
        
        if (token) {
          console.log(`[getTokenFromRedux] ✅ Token found in ${sliceKey} (new structure)`);
          return token;
        } else {
          console.log(`[getTokenFromRedux] Token key '${tokenKey}' not found in ${sliceKey}. Available keys:`, Object.keys(actualState));
        }
      } catch (parseError) {
        console.warn(`[getTokenFromRedux] Error parsing ${sliceKey}:`, parseError);
      }
    } else {
      console.log(`[getTokenFromRedux] Key ${sliceKey} not found in localStorage`);
    }
    
    // METHOD 2: Fallback to old structure (root persist)
    // This handles backward compatibility if old storage structure exists
    const reduxState = getReduxState();
    if (reduxState && reduxState[sliceName]) {
      try {
        // Old structure has nested slices as JSON strings
        const sliceState = typeof reduxState[sliceName] === 'string' 
          ? JSON.parse(reduxState[sliceName])
          : reduxState[sliceName];
        
        const token = sliceState[tokenKey] || null;
        if (token) {
          console.log(`[getTokenFromRedux] ✅ Token found in persist:root.${sliceName} (old structure)`);
          return token;
        }
      } catch (parseError) {
        console.warn(`[getTokenFromRedux] Error parsing root state for ${sliceName}:`, parseError);
      }
    }
    
    // No token found
    return null;
  } catch (error) {
    console.error(`[getTokenFromRedux] Error getting token from ${sliceName}:`, error);
    return null;
  }
};

/**
 * Get token for a specific role
 * @param {string} role - 'user', 'agent', 'admin', 'host'
 * @returns {string | null} - Token or null
 */
const getTokenForRole = (role) => {
  let token = null;
  switch (role) {
    case 'user':
      token = getTokenFromRedux('userAuth', 'userAccessToken');
      console.log(`[getTokenForRole] Role: ${role}, Token found:`, token ? 'YES' : 'NO');
      return token;
    case 'agent':
      // Check Redux first, then fallback to localStorage (for backward compatibility)
      token = getTokenFromRedux('agentAuth', 'agentAccessToken') || localStorage.getItem('travelAgentToken');
      console.log(`[getTokenForRole] Role: ${role}, Token found:`, token ? 'YES' : 'NO');
      return token;
    case 'admin':
      token = getTokenFromRedux('adminAuth', 'adminAccessToken');
      console.log(`[getTokenForRole] Role: ${role}, Token found:`, token ? 'YES' : 'NO');
      return token;
    case 'host':
      token = getTokenFromRedux('hostAuth', 'hostAccessToken');
      console.log(`[getTokenForRole] Role: ${role}, Token found:`, token ? 'YES' : 'NO');
      return token;
    default:
      console.log(`[getTokenForRole] Unknown role: ${role}`);
      return null;
  }
};

/**
 * Get token based on priority (fallback for ambiguous routes)
 * Priority: admin > host > agent > user
 * This is used when URL doesn't clearly indicate the role
 * @returns {string | null} - Token or null
 */
const getTokenByPriority = () => {
  // Check tokens from Redux persisted state in priority order
  const adminToken = getTokenFromRedux('adminAuth', 'adminAccessToken');
  const hostToken = getTokenFromRedux('hostAuth', 'hostAccessToken');
  const agentToken = getTokenFromRedux('agentAuth', 'agentAccessToken') || localStorage.getItem('travelAgentToken');
  const userToken = getTokenFromRedux('userAuth', 'userAccessToken');
  
  console.log('[getTokenByPriority] Available tokens:', {
    admin: adminToken ? 'YES' : 'NO',
    host: hostToken ? 'YES' : 'NO',
    agent: agentToken ? 'YES' : 'NO',
    user: userToken ? 'YES' : 'NO'
  });
  
  if (adminToken) {
    console.log('[getTokenByPriority] Using admin token');
    return { token: adminToken, role: 'admin' };
  }
  
  if (hostToken) {
    console.log('[getTokenByPriority] Using host token');
    return { token: hostToken, role: 'host' };
  }
  
  if (agentToken) {
    console.log('[getTokenByPriority] Using agent token');
    return { token: agentToken, role: 'agent' };
  }
  
  if (userToken) {
    console.log('[getTokenByPriority] Using user token');
    return { token: userToken, role: 'user' };
  }
  
  console.log('[getTokenByPriority] No tokens found');
  return null;
};

/**
 * Get token based on browser context (frontend route) - PRIMARY METHOD
 * This fixes the issue when all roles are logged in simultaneously
 * 
 * SOLUTION: Check browser context (frontend route), then priority fallback
 * 
 * Why browser context?
 * - Frontend routes clearly indicate the active role (/admin/base/* → admin, /host/base/* → host)
 * - Simple and reliable - no need to parse backend API URLs
 * - Prevents token conflicts when multiple roles are logged in
 * 
 * @returns {string | null} - Token or null
 */
const getTokenForUrl = () => {
  // STEP 1: Check browser context (frontend route)
  // This is the PRIMARY source of truth - the page the user is currently on
  const role = getRoleFromBrowserContext();
  
  if (role) {
    console.log(`[getTokenForUrl] ✅ Role detected from browser context (frontend route): ${role}`);
    const token = getTokenForRole(role);
    if (token) {
      console.log(`[getTokenForUrl] ✅ Token found for role ${role} (from browser context)`);
      return token;
    } else {
      console.warn(`[getTokenForUrl] ⚠️ Role ${role} detected from browser context but token not found. Returning null.`);
      return null; // Never use priority fallback when browser context clearly indicates a role
    }
  }
  
  // STEP 2: Priority fallback ONLY when browser context is unclear
  // This handles cases where:
  // - User is on a public route (/, /admin, /host)
  // - API call is made from a page that doesn't clearly indicate a role
  // - Background/async API calls without clear context
  console.log('[getTokenForUrl] No role detected from browser context, using priority fallback');
  const priorityToken = getTokenByPriority();
  const token = priorityToken ? priorityToken.token : null;
  if (token && priorityToken) {
    console.log(`[getTokenForUrl] Using priority token for role: ${priorityToken.role} (fallback)`);
  } else {
    console.log('[getTokenForUrl] No priority token found');
  }
  return token;
};

axiosInstance.interceptors.request.use((config) => {
  console.log('=== Axios Request Interceptor ===');
  const method = config.method?.toUpperCase() || 'UNKNOWN';
  const requestUrl = config.url || '';
  
  console.log('[Interceptor] Method:', method);
  console.log('[Interceptor] URL:', requestUrl);
  console.log('[Interceptor] Full URL:', config.baseURL + requestUrl);
  console.log('[Interceptor] Current headers:', {
    Authorization: config.headers?.Authorization ? 'Bearer [token]' : 'NOT SET',
    ...Object.keys(config.headers || {}).reduce((acc, key) => {
      if (key !== 'Authorization') acc[key] = config.headers[key];
      return acc;
    }, {})
  });

  // Respect pre-set Authorization headers (e.g., manual overrides)
  const existingAuth =
    config.headers?.Authorization || config.headers?.authorization;
  if (existingAuth) {
    console.log('[Interceptor] Authorization header already provided, skipping automatic token resolution');
    return config;
  }

  // Allow explicit role override via config.role
  let roleOverride = null;
  if (Object.prototype.hasOwnProperty.call(config, 'role')) {
    roleOverride = config.role;
    delete config.role;
    console.log('[Interceptor] Role override provided via request config:', roleOverride);
  }

  // Determine which token to use based on browser context (frontend route)
  // This ensures correct token is used even when all roles are logged in
  let token = null;
  if (roleOverride) {
    token = getTokenForRole(roleOverride);
    if (!token) {
      console.warn(`[Interceptor] ⚠️ Role override '${roleOverride}' provided but no token found. Falling back to automatic detection.`);
    }
  }

  if (!token) {
    token = getTokenForUrl();
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    console.log('[Interceptor] Authorization header SET with token');
    console.log('[Interceptor] Token length:', token.length);
    console.log('[Interceptor] Token preview:', token.substring(0, 20) + '...');
  } else {
    console.log('[Interceptor] ⚠️ NO TOKEN FOUND - Authorization header NOT SET');
    console.log('[Interceptor] Available storage keys:');
    console.log('  localStorage:', Object.keys(localStorage).filter(k => k.includes('token') || k.includes('Token') || k.includes('persist')));
    console.log('  sessionStorage:', Object.keys(sessionStorage).filter(k => k.includes('token') || k.includes('Token')));
    
    // Debug: Check all available storage keys and Redux state
    const storageKeys = Object.keys(localStorage).filter(k => k.includes('persist'));
    console.log('[Interceptor] Available persist keys:', storageKeys);
    
    // Check individual slice keys (new structure) - detailed debugging
    const sliceKeys = ['adminAuth', 'hostAuth', 'userAuth', 'agentAuth'];
    const tokenStatus = {};
    sliceKeys.forEach(sliceName => {
      const sliceKey = `persist:${sliceName}`;
      const sliceData = localStorage.getItem(sliceKey);
      if (sliceData) {
        try {
          const parsed = JSON.parse(sliceData);
          // Build token key: 'adminAuth' -> 'adminAccessToken', 'hostAuth' -> 'hostAccessToken'
          const tokenKey = `${sliceName.replace('Auth', '')}AccessToken`;
          
          // Handle nested structure: check both direct access and nested access
          let actualState = parsed[sliceName] || parsed;
          if (actualState._persist) {
            const { _persist, ...stateWithoutPersist } = actualState;
            actualState = stateWithoutPersist;
          }
          
          const hasToken = actualState[tokenKey] ? 'YES' : 'NO';
          tokenStatus[sliceName] = {
            key: sliceKey,
            exists: 'YES',
            token: hasToken,
            tokenKey: tokenKey,
            availableKeys: Object.keys(actualState).filter(k => k !== '_persist')
          };
        } catch (e) {
          tokenStatus[sliceName] = { key: sliceKey, exists: 'YES', error: e.message };
        }
      } else {
        tokenStatus[sliceName] = { key: sliceKey, exists: 'NO' };
      }
    });
    console.log('[Interceptor] Detailed token status from individual slice keys:', tokenStatus);
    
    // Also check root state if exists (backward compatibility)
    const reduxState = getReduxState();
    if (reduxState) {
      console.log('[Interceptor] Root persist state exists with slices:', Object.keys(reduxState).filter(k => k !== '_persist'));
    }
  }

  console.log('[Interceptor] Final headers.Authorization:', config.headers?.Authorization ? 'Bearer [token]' : 'NOT SET');
  console.log('================================');
  
  return config;
})
  
  // Response interceptor - handle token expiration
  axiosInstance.interceptors.response.use(
    (response) => {
      return response;
    },
    (error) => {
      // Handle 401 Unauthorized - token expired or invalid
      if (error.response && error.response.status === 401) {
        console.warn('[Axios Interceptor] ⚠️ 401 Unauthorized - Token expired or invalid');
        
        // Clear all auth tokens from localStorage
        const persistKeys = ['persist:adminAuth', 'persist:hostAuth', 'persist:userAuth', 'persist:agentAuth'];
        persistKeys.forEach(key => {
          try {
            const data = localStorage.getItem(key);
            if (data) {
              const parsed = JSON.parse(data);
              // Remove token from state
              Object.keys(parsed).forEach(sliceKey => {
                if (parsed[sliceKey] && typeof parsed[sliceKey] === 'object') {
                  const sliceState = typeof parsed[sliceKey] === 'string' ? JSON.parse(parsed[sliceKey]) : parsed[sliceKey];
                  if (sliceState) {
                    // Clear all access tokens
                    Object.keys(sliceState).forEach(tokenKey => {
                      if (tokenKey.includes('AccessToken')) {
                        delete sliceState[tokenKey];
                      }
                    });
                    parsed[sliceKey] = typeof parsed[sliceKey] === 'string' ? JSON.stringify(sliceState) : sliceState;
                  }
                }
              });
              localStorage.setItem(key, JSON.stringify(parsed));
            }
          } catch (e) {
            // If parsing fails, just remove the key
            localStorage.removeItem(key);
          }
        });
        
        // Redirect to login based on current route
        const currentPath = window.location.pathname;
        if (currentPath.startsWith('/admin')) {
          window.location.href = '/admin';
        } else if (currentPath.startsWith('/host')) {
          window.location.href = '/host';
        } else if (currentPath.startsWith('/app/agent')) {
          window.location.href = '/';
        } else if (currentPath.startsWith('/app')) {
          window.location.href = '/';
        }
      }
      
      return Promise.reject(error);
    }
  );


export default axiosInstance;
