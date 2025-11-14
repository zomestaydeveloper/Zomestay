/**
 * Get role based on pathname (frontend route)
 * This utility function determines the active user role from the current browser route
 * 
 * Route structure (matches App.jsx):
 * - /admin/base/* → admin
 * - /host/base/* → host
 * - /app/agent/* → agent
 * - /app/* → user
 * - /agent/* → agent
 * 
 * @param {string} [pathname] - Optional pathname. If not provided, uses window.location.pathname
 * @returns {string | null} - 'admin' | 'host' | 'agent' | 'user' | null
 * 
 * @example
 * // Get role from current browser pathname
 * const role = findRoleFromPathname();
 * 
 * @example
 * // Get role from specific pathname
 * const role = findRoleFromPathname('/admin/base/dashboard');
 * 
 * @example
 * // Use with React Router
 * import { useLocation } from 'react-router-dom';
 * const location = useLocation();
 * const role = findRoleFromPathname(location.pathname);
 */
export const findRoleFromPathname = (pathname = null) => {
  // Get pathname from parameter or window.location
  let currentPath = pathname;
  
  if (currentPath === null || currentPath === undefined) {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      return null;
    }
    currentPath = window.location.pathname;
  }

  // Normalize pathname (ensure it starts with /)
  if (!currentPath) {
    return null;
  }

  const normalizedPath = currentPath.startsWith('/') ? currentPath : `/${currentPath}`;

  // IMPORTANT: Check more specific routes FIRST (order matters!)
  
  // Agent routes - check /app/agent/* BEFORE /app/* (more specific first)
  if (normalizedPath.startsWith('/app/agent/')) {
    return 'agent';
  }

  // Agent dashboard route
  if (normalizedPath.startsWith('/agent/')) {
    return 'agent';
  }

  // Host routes - /host base and root level dashboards
  if (
    normalizedPath.startsWith('/host/base/') ||
    normalizedPath === '/host' ||
    normalizedPath.startsWith('/host/')
  ) {
    return 'host';
  }

  // Admin routes - /admin base and root login
  if (
    normalizedPath.startsWith('/admin/base/') ||
    normalizedPath === '/admin' ||
    normalizedPath.startsWith('/admin/')
  ) {
    return 'admin';
  }

  // User routes - /app/* (must come AFTER /app/agent/* check)
  if (normalizedPath.startsWith('/app/')) {
    return 'user';
  }

  // No role detected
  return null;
};

/**
 * Get role from current browser pathname (convenience function)
 * This is a shorthand for findRoleFromPathname() without parameters
 * 
 * @returns {string | null} - 'admin' | 'host' | 'agent' | 'user' | null
 */
export const getCurrentRole = () => {
  return findRoleFromPathname();
};

/**
 * Check if current pathname belongs to a specific role
 * 
 * @param {string} role - Role to check ('admin' | 'host' | 'agent' | 'user')
 * @param {string} [pathname] - Optional pathname. If not provided, uses window.location.pathname
 * @returns {boolean} - true if pathname belongs to the role, false otherwise
 * 
 * @example
 * // Check if current route is admin
 * const isAdmin = isRole('admin');
 * 
 * @example
 * // Check if specific pathname is host
 * const isHost = isRole('host', '/host/base/dashboard');
 */
export const isRole = (role, pathname = null) => {
  const detectedRole = findRoleFromPathname(pathname);
  return detectedRole === role;
};

/**
 * Check if current pathname is an admin route
 * 
 * @param {string} [pathname] - Optional pathname. If not provided, uses window.location.pathname
 * @returns {boolean} - true if pathname is an admin route
 */
export const isAdminRoute = (pathname = null) => {
  return isRole('admin', pathname);
};

/**
 * Check if current pathname is a host route
 * 
 * @param {string} [pathname] - Optional pathname. If not provided, uses window.location.pathname
 * @returns {boolean} - true if pathname is a host route
 */
export const isHostRoute = (pathname = null) => {
  return isRole('host', pathname);
};

/**
 * Check if current pathname is an agent route
 * 
 * @param {string} [pathname] - Optional pathname. If not provided, uses window.location.pathname
 * @returns {boolean} - true if pathname is an agent route
 */
export const isAgentRoute = (pathname = null) => {
  return isRole('agent', pathname);
};

/**
 * Check if current pathname is a user route
 * 
 * @param {string} [pathname] - Optional pathname. If not provided, uses window.location.pathname
 * @returns {boolean} - true if pathname is a user route
 */
export const isUserRoute = (pathname = null) => {
  return isRole('user', pathname);
};

// Default export (for convenience)
export default findRoleFromPathname;

