const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**nnknk
 * Middleware to authenticate travel agents
 * Verifies JWT token and populates req.user with agent data
 */
const authenticateTravelAgent = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: No token provided'
      });
    }

    let token = authHeader.substring(8); // Remove 'Bearer ' prefix
    token = token.trim().replace(/^["']|["']$/g, '').trim();


    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Check if token is for travel agent
    if (decoded.type !== 'travel_agent') {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Invalid token type'
      });
    }

    // Verify agent still exists and is approved
    const agent = await prisma.travelAgent.findFirst({
      where: {
        id: decoded.agentId,
        isDeleted: false,
        status: 'approved'
      },
      select: {
        id: true,
        email: true,
        status: true
      }
    });

    if (!agent) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Agent not found or not approved'
      });
    }

    // Add agent info to request
    req.user = {
      agentId: agent.id,
      email: agent.email,
      status: agent.status,
      type: 'travel_agent'
    };

    next();
  } catch (error) {
    console.error('Travel Agent Authentication Error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Token expired'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error during authentication'
    });
  }
};

module.exports = {
  authenticateTravelAgent
};