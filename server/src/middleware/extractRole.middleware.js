const { verifyToken } = require('../utils/jwt.utils');

/**
 * Middleware to extract role from JWT token
 * Extracts role from token and adds it to req.user.role
 * 
 * Token structures:
 * - Admin: { id, role: "admin" }
 * - Host: { id, role: "host" }
 * - User: { userId, type: "user" }
 * - Agent: { agentId, type: "travel_agent" }
 * 
 * Usage:
 * router.get('/route', extractRole, (req, res) => {
 *   // req.user.role = 'admin', 'host', 'user', or 'agent'
 *   // req.user.id = user id based on role
 * });
 */ 
const extractRole = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided - continue without role
      req.user = { role: null, id: null };
      return next();
    }

    let token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Clean token - remove quotes, whitespace, and trim
    // Handles cases where token might be stored as '"token"' or have extra whitespace
    token = token.trim().replace(/^["']|["']$/g, '').trim();
    
    // Validate token format (must have 3 parts separated by dots)
    const tokenParts = token.split('.');
    if (!token || token.trim() === '' || tokenParts.length !== 3) {
      req.user = { role: null, id: null };
      return next();
    }

    // Verify and decode token using centralized utility (same as token creation)
    const decoded = verifyToken(token);
    // Extract role from token
    // Admin/Host use 'role' field, User/Agent use 'type' field
    let role = decoded.role || decoded.type || null;

    // Normalize role names
    if (role === 'travel_agent') {
      role = 'agent';
    }

    // Extract ID based on role
    // Admin/Host: use 'id'
    // User: use 'userId'
    // Agent: use 'agentId'
    let userId = null;
    if (role === 'admin' || role === 'host') {
      userId = decoded.id || null;
    } else if (role === 'user') {
      userId = decoded.userId || null;
    } else if (role === 'agent') {
      userId = decoded.agentId || null;
    }

    // Add role and user info to request object
    req.user = {
      role: role,
      id: userId,
      ...decoded // Include all token payload for additional info
    };

    next();
  } catch (error) {
    // Token is invalid/expired - continue without role
    // Log errors only in development mode
    if (process.env.NODE_ENV !== 'production') {
      if (error.name === 'TokenExpiredError') {
        console.error('[extractRole] Token expired');
      } else if (error.name === 'JsonWebTokenError') {
        console.error('[extractRole] Invalid token:', error.message);
      } else {
        console.error('[extractRole] Error:', error.message);
      }
    }
    
    req.user = { role: null, id: null };
    next();
  }
};

module.exports = {
  extractRole
};

