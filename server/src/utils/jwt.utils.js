/**
 * JWT Utility Functions
 * Centralized JWT token signing and verification
 * Ensures consistent JWT_SECRET usage across the application
 */

const jwt = require('jsonwebtoken');

// Ensure JWT_SECRET is loaded from environment
// This is critical for production - fail fast if not set
const getJWTSecret = () => {
  const secret = process.env.JWT_SECRET;
  
  if (!secret) {
    console.error('❌ CRITICAL: JWT_SECRET not set in environment variables!');
    console.error('❌ Set JWT_SECRET in .env file before starting the server.');
    console.error('❌ Using fallback secret - THIS IS NOT SECURE FOR PRODUCTION!');
    
    // In production, throw error instead of using fallback
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET must be set in production environment');
    }
    
    return 'your-secret-key'; // Fallback for development only
  }
  
  return secret;
};

/**
 * Sign a JWT token with consistent secret
 * @param {Object} payload - Token payload
 * @param {Object} options - JWT options (expiresIn, etc.)
 * @returns {string} - Signed JWT token
 */
const signToken = (payload, options = { expiresIn: '1h' }) => {
  const secret = getJWTSecret();
  return jwt.sign(payload, secret, options);
};

/**
 * Verify a JWT token with consistent secret
 * @param {string} token - JWT token to verify
 * @returns {Object} - Decoded token payload
 * @throws {Error} - If token is invalid or expired
 */
const verifyToken = (token) => {
  const secret = getJWTSecret();
  
  // Debug: Log secret being used (only in development - safe preview only)
  if (process.env.NODE_ENV !== 'production') {
    console.log('[verifyToken] Using JWT_SECRET:', secret ? `${secret.substring(0, 4)}...` : 'NOT SET');
  }
  
  try {
    return jwt.verify(token, secret); // ✅ Use secret variable, NOT hardcoded "ABCD"
  } catch (error) {
    // Only log detailed errors in development
    if (process.env.NODE_ENV !== 'production') {
      // Decode token to see payload (for debugging)
      try {
        const decoded = jwt.decode(token, { complete: true });
        if (decoded && decoded.payload) {
          const isExpired = decoded.payload.exp ? decoded.payload.exp < Math.floor(Date.now() / 1000) : null;
          
          if (error.name === 'JsonWebTokenError') {
            console.log('[verifyToken] ❌ Invalid token signature. This usually means:');
            console.log('  1. Token was signed with old JWT_SECRET (before secret change)');
            console.log('  2. User needs to log out and log back in to get a new token');
            console.log('[verifyToken] Token info:', {
              id: decoded.payload.id || decoded.payload.userId || decoded.payload.agentId,
              role: decoded.payload.role || decoded.payload.type,
              issuedAt: decoded.payload.iat ? new Date(decoded.payload.iat * 1000).toISOString() : null,
              expiresAt: decoded.payload.exp ? new Date(decoded.payload.exp * 1000).toISOString() : null,
              isExpired: isExpired
            });
          } else if (error.name === 'TokenExpiredError') {
            console.log('[verifyToken] ⏰ Token expired:', {
              expiresAt: decoded.payload.exp ? new Date(decoded.payload.exp * 1000).toISOString() : null
            });
          }
        }
      } catch (decodeErr) {
        // Ignore decode errors
      }
    }
    throw error;
  }
};

/**
 * Decode a JWT token without verification (for debugging)
 * @param {string} token - JWT token to decode
 * @returns {Object} - Decoded token payload
 */
const decodeToken = (token) => {
  return jwt.decode(token, { complete: true });
};

/**
 * Check if a token is expired without verification
 * @param {string} token - JWT token to check
 * @returns {boolean} - True if token is expired
 */
const isTokenExpired = (token) => {
  try {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) {
      return true; // Invalid token is considered expired
    }
    const now = Math.floor(Date.now() / 1000);
    return decoded.exp < now;
  } catch (error) {
    return true; // Error decoding means invalid/expired
  }
};

module.exports = {
  signToken,
  verifyToken,
  decodeToken,
  isTokenExpired,
  getJWTSecret
};

