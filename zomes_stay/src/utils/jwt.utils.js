/**
 * JWT Utility Functions for Frontend
 * - Decode JWT tokens without verification (client-side)
 * - Check token expiration
 * - Extract token payload
 */

/**
 * Decode JWT token (without verification - client-side only)
 * @param {string} token - JWT token string
 * @returns {object|null} - Decoded token payload or null if invalid
 */
export const decodeToken = (token) => {
  if (!token || typeof token !== 'string') {
    return null;
  }

  try {
    // JWT format: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    // Decode payload (second part)
    const payload = parts[1];
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return decoded;
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
};

/**
 * Check if JWT token is expired
 * @param {string} token - JWT token string
 * @returns {boolean} - true if expired, false if valid
 */
export const isTokenExpired = (token) => {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) {
    return true; // If no expiration, consider expired
  }

  // exp is in seconds, Date.now() is in milliseconds
  const expirationTime = decoded.exp * 1000;
  const currentTime = Date.now();

  return currentTime >= expirationTime;
};

/**
 * Get token expiration time
 * @param {string} token - JWT token string
 * @returns {Date|null} - Expiration date or null
 */
export const getTokenExpiration = (token) => {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) {
    return null;
  }

  return new Date(decoded.exp * 1000);
};

/**
 * Check if token will expire soon (within specified minutes)
 * @param {string} token - JWT token string
 * @param {number} minutesBeforeExpiry - Minutes before expiry to consider "soon"
 * @returns {boolean} - true if expiring soon
 */
export const isTokenExpiringSoon = (token, minutesBeforeExpiry = 5) => {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) {
    return true;
  }

  const expirationTime = decoded.exp * 1000;
  const currentTime = Date.now();
  const timeUntilExpiry = expirationTime - currentTime;
  const minutesUntilExpiry = timeUntilExpiry / (1000 * 60);

  return minutesUntilExpiry <= minutesBeforeExpiry;
};

