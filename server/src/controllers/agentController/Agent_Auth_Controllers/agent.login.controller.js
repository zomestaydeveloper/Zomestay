/**
 * Travel Agent Login Controller
 * Handles authentication for approved travel agents
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const { signToken } = require('../../../utils/jwt.utils');

const prisma = new PrismaClient();

module.exports = async function travelAgentLogin(req, res) {
  try {
    const { email, password } = req.body;

    // 1. Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // 2. Find agent
    const travelAgent = await prisma.travelAgent.findFirst({
      where: {
        email: email.toLowerCase(),
        isDeleted: false
      }
    });

    // 3. Validate agent existence
    if (!travelAgent) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // 4. Check approval status
    if (travelAgent.status !== 'approved') {
      return res.status(403).json({
        success: false,
        message: `Account is ${travelAgent.status}. Please wait for admin approval.`,
        status: travelAgent.status
      });
    }

    // 5. Verify password
    const isPasswordValid = await bcrypt.compare(
      password,
      travelAgent.password
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // 6. Generate JWT
    const token = signToken(
      {
        agentId: travelAgent.id,
        email: travelAgent.email,
        type: 'travel_agent'
      },
      { expiresIn: '24h' }
    );

    // 7. Remove sensitive fields
    const { password: _, ...agentWithoutPassword } = travelAgent;

    // 8. Respond
    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        agent: agentWithoutPassword,
        token
      }
    });

  } catch (error) {
    console.error('Travel Agent Login Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Internal server error during login',
      error:
        process.env.NODE_ENV === 'development'
          ? error.message
          : undefined
    });
  }
};
