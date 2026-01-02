/**
 * Authentication utility functions
 * Best practices for client-side auth checks
 */

/**
 * Detect the logged-in role based on current route/URL
 * Simple logic: checks URL pathname for role indicators
 * 
 * @param {string} [pathname] - Optional pathname. If not provided, uses window.location.pathname
 * @returns {string|null} - 'admin' | 'host' | 'agent' | 'user' | null
 * 
 * @example
 * // Get role from current URL
 * const role = detectRoleFromRoute();
 * 
 * @example
 * // Get role from specific pathname
 * const role = detectRoleFromRoute('/admin/base/dashboard');
 */
export const detectRoleFromRoute = (pathname = null) => {
  // Get pathname from parameter or window.location
  let currentPath = pathname;
  
  if (currentPath === null || currentPath === undefined) {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      return null;
    }
    currentPath = window.location.pathname;
  }

  if (!currentPath) {
    return null;
  }

  // Normalize pathname (ensure it starts with /)
  const normalizedPath = currentPath.startsWith('/') ? currentPath : `/${currentPath}`;

  // Check routes in order of specificity (most specific first)
  
  // 1. Agent routes - check /app/agent/* BEFORE /app/* (more specific first)
  if (normalizedPath.startsWith('/app/agent/') || normalizedPath.startsWith('/agent/')) {
    return 'agent';
  }

  // 2. Admin routes
  if (normalizedPath.startsWith('/admin/')) {
    return 'admin';
  }

  // 3. Host routes
  if (normalizedPath.startsWith('/host/')) {
    return 'host';
  }

  // 4. User routes - /app/* (must come AFTER /app/agent/* check)
  if (normalizedPath.startsWith('/app/')) {
    return 'user';
  }

  // No role detected
  return null;
};

/**
 * Check if user is authenticated (checks token existence)
 * Note: This is for UX only. Backend must always validate tokens.
 * 
 * @param {Object} userAuth - Redux userAuth state
 * @param {Object} agentAuth - Redux agentAuth state
 * @returns {boolean} - True if user or agent has a token
 */
export const isAuthenticated = (userAuth, agentAuth) => {
  return Boolean(userAuth?.userAccessToken) || Boolean(agentAuth?.agentAccessToken);
};

/**
 * Check if token is expired (client-side check)
 * Note: This is approximate. Backend validation is authoritative.
 * 
 * @param {string} token - JWT token
 * @returns {boolean} - True if token appears expired
 */
export const isTokenExpired = (token) => {
  if (!token) return true;
  
  try {
    // Decode JWT without verification (client-side only)
    const payload = JSON.parse(atob(token.split('.')[1]));
    const exp = payload.exp;
    
    if (!exp) return false; // No expiration claim
    
    // Check if expired (with 60 second buffer for clock skew)
    return Date.now() >= (exp * 1000) - 60000;
  } catch (error) {
    console.error('Error checking token expiration:', error);
    return true; // Assume expired if can't parse
  }
};

/**
 * Get authenticated user info
 * 
 * @param {Object} userAuth - Redux userAuth state
 * @param {Object} agentAuth - Redux agentAuth state
 * @returns {Object|null} - User info or null
 */
export const getAuthenticatedUser = (userAuth, agentAuth) => {
  if (userAuth?.userAccessToken && !isTokenExpired(userAuth.userAccessToken)) {
    return {
      type: 'user',
      id: userAuth.id,
      email: userAuth.email,
      phone: userAuth.phone,
      name: `${userAuth.first_name || ''} ${userAuth.last_name || ''}`.trim(),
      token: userAuth.userAccessToken
    };
  }
  
  if (agentAuth?.agentAccessToken && !isTokenExpired(agentAuth.agentAccessToken)) {
    return {
      type: 'agent',
      id: agentAuth.id,
      email: agentAuth.email,
      phone: agentAuth.phone,
      name: `${agentAuth.first_name || ''} ${agentAuth.last_name || ''}`.trim(),
      token: agentAuth.agentAccessToken
    };
  }
  
  return null;
};

/**
 * Validate authentication with token expiration check
 * Best practice: Check both token existence and expiration
 * 
 * @param {Object} userAuth - Redux userAuth state
 * @param {Object} agentAuth - Redux agentAuth state
 * @param {Object} options - Optional redirect configuration
 * @param {string} options.expiredRedirectUrl - URL to redirect when token is expired (placeholder: '/login')
 * @param {string} options.authenticatedRedirectUrl - URL to redirect when authenticated (placeholder: '/dashboard')
 * @param {boolean} options.shouldRedirect - Whether to perform redirects automatically (default: false)
 * @returns {Object} - { isAuthenticated: boolean, user: Object|null, needsRefresh: boolean }
 */
export const validateAuth = (userAuth, agentAuth, options = {}) => {
  const {
    expiredRedirectUrl = '/login', // Placeholder - will be updated
    authenticatedRedirectUrl = '/dashboard', // Placeholder - will be updated
    shouldRedirect = false
  } = options;

  const userToken = userAuth?.userAccessToken;
  const agentToken = agentAuth?.agentAccessToken;
  
  // Check user token
  if (userToken) {
    const expired = isTokenExpired(userToken);
    if (!expired) {
      // Token is valid - redirect if configured
      if (shouldRedirect && authenticatedRedirectUrl && typeof window !== 'undefined') {
        window.location.href = authenticatedRedirectUrl;
      }
      return {
        isAuthenticated: true,
        user: getAuthenticatedUser(userAuth, agentAuth),
        needsRefresh: false
      };
    }
    // Token expired - redirect to expired page
    if (shouldRedirect && expiredRedirectUrl && typeof window !== 'undefined') {
      window.location.href = expiredRedirectUrl;
    }
    return {
      isAuthenticated: false,
      user: null,
      needsRefresh: true
    };
  }
  
  // Check agent token
  if (agentToken) {
    const expired = isTokenExpired(agentToken);
    if (!expired) {
      // Token is valid - redirect if configured
      if (shouldRedirect && authenticatedRedirectUrl && typeof window !== 'undefined') {
        window.location.href = authenticatedRedirectUrl;
      }
      return {
        isAuthenticated: true,
        user: getAuthenticatedUser(userAuth, agentAuth),
        needsRefresh: false
      };
    }
    // Token expired - redirect to expired page
    if (shouldRedirect && expiredRedirectUrl && typeof window !== 'undefined') {
      window.location.href = expiredRedirectUrl;
    }
    return {
      isAuthenticated: false,
      user: null,
      needsRefresh: true
    };
  }
  
  // No tokens found - redirect to expired/login page if configured
  if (shouldRedirect && expiredRedirectUrl && typeof window !== 'undefined') {
    window.location.href = expiredRedirectUrl;
  }
  
  return {
    isAuthenticated: false,
    user: null,
    needsRefresh: false
  };
};

