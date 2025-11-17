/**
 * Authorization utility functions for role-based access control
 */

/**
 * Checks if the user is authenticated (has a valid token and role)
 * @param {Object} user - req.user object from extractRole middleware
 * @returns {boolean} True if user is authenticated
 */
const isAuthenticated = (user) => {
  return user && user.role && user.id;
};

/**
 * Checks if the user is an admin
 * @param {Object} user - req.user object from extractRole middleware
 * @returns {boolean} True if user is admin
 */
const isAdmin = (user) => {
  return user && user.role === 'admin';
};

/**
 * Checks if the user is a host
 * @param {Object} user - req.user object from extractRole middleware
 * @returns {boolean} True if user is host
 */
const isHost = (user) => {
  return user && user.role === 'host';
};

/**
 * Checks if the user is admin or host
 * @param {Object} user - req.user object from extractRole middleware
 * @returns {boolean} True if user is admin or host
 */
const isAdminOrHost = (user) => {
  return isAdmin(user) || isHost(user);
};

/**
 * Returns an error response if user is not authenticated
 * @param {Object} res - Express response object
 * @returns {Object|null} Error response object or null if authenticated
 */
const requireAuth = (user, res) => {
  if (!isAuthenticated(user)) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please login to continue.',
    });
  }
  return null;
};

/**
 * Returns an error response if user is not admin
 * @param {Object} res - Express response object
 * @returns {Object|null} Error response object or null if admin
 */
const requireAdmin = (user, res) => {
  const authError = requireAuth(user, res);
  if (authError) return authError;

  if (!isAdmin(user)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.',
    });
  }
  return null;
};

/**
 * Returns an error response if user is not admin or host
 * @param {Object} res - Express response object
 * @returns {Object|null} Error response object or null if admin or host
 */
const requireAdminOrHost = (user, res) => {
  const authError = requireAuth(user, res);
  if (authError) return authError;

  if (!isAdminOrHost(user)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin or Host privileges required.',
    });
  }
  return null;
};

module.exports = {
  isAuthenticated,
  isAdmin,
  isHost,
  isAdminOrHost,
  requireAuth,
  requireAdmin,
  requireAdminOrHost,
};

