const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { signToken } = require('../../utils/jwt.utils');
const prisma = new PrismaClient();

const TravelAgentAuthController = {
  // Travel Agent Registration
  register: async (req, res) => {
    try {
      const {
        email,
        phone,
        password,
        firstName,
        lastName,
        agencyName,
        licenseNumber,
        officeAddress
      } = req.body;
      
      // Get uploaded file path from multer
      const iataCertificate = req.file ? req.file.url : null;

      // Validation
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required'
        });
      }

      // Check if email already exists
      const existingAgent = await prisma.travelAgent.findFirst({
        where: {
          email: email.toLowerCase(),
          isDeleted: false
        }
      });

      if (existingAgent) {
        return res.status(400).json({
          success: false,
          message: 'You already have an account with this email. Please login instead.'
        });
      }

      // Check if phone already exists (if provided)
      if (phone) {
        const existingPhone = await prisma.travelAgent.findFirst({
          where: {
            phone: phone,
            isDeleted: false
          }
        });

        if (existingPhone) {
          return res.status(400).json({
            success: false,
            message: 'This phone number is already registered. Please use a different number or login with your existing account.'
          });
        }
      }

      // Hash password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Create travel agent
      const travelAgent = await prisma.travelAgent.create({
        data: {
          email: email.toLowerCase(),
          phone: phone || null,
          password: hashedPassword,
          firstName: firstName || null,
          lastName: lastName || null,
          agencyName: agencyName || null,
          licenseNumber: licenseNumber || null,
          officeAddress: officeAddress || null,
          iataCertificate: iataCertificate || null,
          status: 'pending' // Default status is pending
        },
        select: {
          id: true,
          email: true,
          phone: true,
          firstName: true,
          lastName: true,
          agencyName: true,
          licenseNumber: true,
          officeAddress: true,
          status: true,
          createdAt: true
        }
      });

      res.status(201).json({
        success: true,
        message: 'Travel agent registered successfully. Your account is pending admin approval.',
        data: {
          agent: travelAgent,
          nextSteps: [
            'Your account is pending admin approval',
            'You will receive an email notification once approved',
            'You can login after approval'
          ]
        }
      });

    } catch (error) {
      console.error('Travel Agent Registration Error:', error);
      
      // Handle Prisma unique constraint errors
      if (error.code === 'P2002') {
        const field = error.meta?.target?.[0];
        return res.status(400).json({
          success: false,
          message: `Travel agent with this ${field} already exists`
        });
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error during registration',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Travel Agent Login
  login: async (req, res) => {
    try {
      const { email, password } = req.body;

      // Validation
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required'
        });
      }

      // Find travel agent
      const travelAgent = await prisma.travelAgent.findFirst({
        where: {
          email: email.toLowerCase(),
          isDeleted: false
        }
      });

      if (!travelAgent) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // Check if agent is approved
      if (travelAgent.status !== 'approved') {
        return res.status(401).json({
          success: false,
          message: `Account is ${travelAgent.status}. Please wait for admin approval.`,
          status: travelAgent.status
        });
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, travelAgent.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // Generate JWT token
      const token = signToken(
        {
          agentId: travelAgent.id,
          email: travelAgent.email,
          status: travelAgent.status,
          type: 'travel_agent'
        },
        { expiresIn: '24h' }  // 1 minute expiration
      );

      // Remove password from response
      const { password: _, ...agentWithoutPassword } = travelAgent;

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          agent: agentWithoutPassword,
          token: token
        }
      });

    } catch (error) {
      console.error('Travel Agent Login Error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during login',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Get Travel Agent Profile
  getProfile: async (req, res) => {
    try {
      const agentId = req.user.agentId;

      const travelAgent = await prisma.travelAgent.findFirst({
        where: {
          id: agentId,
          isDeleted: false
        },
        select: {
          id: true,
          email: true,
          phone: true,
          firstName: true,
          lastName: true,
          agencyName: true,
          licenseNumber: true,
          officeAddress: true,
          iataCertificate: true,
          profileImage: true,
          status: true,
          emailVerified: true,
          phoneVerified: true,
          createdAt: true,
          approvalDate: true
        }
      });

      if (!travelAgent) {
        return res.status(404).json({
          success: false,
          message: 'Travel agent not found'
        });
      }

      res.json({
        success: true,
        data: travelAgent
      });

    } catch (error) {
      console.error('Get Travel Agent Profile Error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Update Travel Agent Profile
  updateProfile: async (req, res) => {
    try {
      const agentId = req.user.agentId || req.user.id;
      
      if (!agentId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized: Agent ID not found'
        });
      }

      const {
        firstName,
        lastName,
        phone,
        agencyName,
        licenseNumber,
        officeAddress
      } = req.body;

      // Get uploaded profile image from multer if provided
      const profileImage = req.file ? req.file.url : undefined;

      // Build update data object (only include fields that are provided)
      const updateData = {};
      
      if (firstName !== undefined) updateData.firstName = firstName || null;
      if (lastName !== undefined) updateData.lastName = lastName || null;
      if (phone !== undefined) updateData.phone = phone || null;
      if (agencyName !== undefined) updateData.agencyName = agencyName || null;
      if (licenseNumber !== undefined) updateData.licenseNumber = licenseNumber || null;
      if (officeAddress !== undefined) updateData.officeAddress = officeAddress || null;
      if (profileImage !== undefined) updateData.profileImage = profileImage;

      // Check if phone already exists (if being updated)
      if (phone && phone !== '') {
        const existingPhone = await prisma.travelAgent.findFirst({
          where: {
            phone: phone,
            isDeleted: false,
            id: { not: agentId }
          }
        });

        if (existingPhone) {
          return res.status(400).json({
            success: false,
            message: 'This phone number is already registered by another agent'
          });
        }
      }

      // Update travel agent profile
      const updatedAgent = await prisma.travelAgent.update({
        where: {
          id: agentId
        },
        data: updateData,
        select: {
          id: true,
          email: true,
          phone: true,
          firstName: true,
          lastName: true,
          agencyName: true,
          licenseNumber: true,
          officeAddress: true,
          profileImage: true,
          iataCertificate: true,
          status: true,
          emailVerified: true,
          phoneVerified: true,
          createdAt: true,
          updatedAt: true
        }
      });

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: updatedAgent
      });

    } catch (error) {
      console.error('Update Travel Agent Profile Error:', error);
      
      // Handle Prisma unique constraint errors
      if (error.code === 'P2002') {
        const field = error.meta?.target?.[0];
        return res.status(400).json({
          success: false,
          message: `Travel agent with this ${field} already exists`
        });
      }

      // Handle Prisma record not found
      if (error.code === 'P2025') {
        return res.status(404).json({
          success: false,
          message: 'Travel agent not found'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Change Travel Agent Password
  changePassword: async (req, res) => {
    try {
      const agentId = req.user.agentId || req.user.id;
      
      if (!agentId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized: Agent ID not found'
        });
      }

      const { currentPassword, newPassword } = req.body;

      // Validation
      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password and new password are required'
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'New password must be at least 6 characters long'
        });
      }

      // Find travel agent
      const travelAgent = await prisma.travelAgent.findFirst({
        where: {
          id: agentId,
          isDeleted: false
        },
        select: {
          id: true,
          password: true,
          email: true
        }
      });

      if (!travelAgent) {
        return res.status(404).json({
          success: false,
          message: 'Travel agent not found'
        });
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, travelAgent.password);
      
      if (!isCurrentPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      // Check if new password is the same as current password
      const isSamePassword = await bcrypt.compare(newPassword, travelAgent.password);
      
      if (isSamePassword) {
        return res.status(400).json({
          success: false,
          message: 'New password must be different from current password'
        });
      }

      // Hash new password
      const saltRounds = 12;
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      await prisma.travelAgent.update({
        where: {
          id: agentId
        },
        data: {
          password: hashedNewPassword
        }
      });

      res.json({
        success: true,
        message: 'Password changed successfully'
      });

    } catch (error) {
      console.error('Change Travel Agent Password Error:', error);
      
      // Handle Prisma record not found
      if (error.code === 'P2025') {
        return res.status(404).json({
          success: false,
          message: 'Travel agent not found'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Travel Agent Logout
  logout: async (req, res) => {
    try {
      // Clear any refresh token cookies if using cookies
      res.clearCookie("refresh_token");
      res.clearCookie("agent_refresh_token");

      return res.status(200).json({
        success: true,
        message: "Logout successful"
      });
    } catch (error) {
      console.error('Travel Agent Logout Error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error logging out',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
};

module.exports = TravelAgentAuthController;
