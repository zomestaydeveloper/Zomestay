const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = new PrismaClient();
const { smsService, emailService, smsTemplates, emailTemplates } = require('../../services/communication');

// In-memory OTP storage for development (replace with Redis/cache in production)
const otpStore = new Map(); // phone -> { otp, expiresAt }

/**
 * Generate a 4-digit OTP
 */
const generateOTP = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

/**
 * Clean expired OTPs from store
 */
const cleanExpiredOTPs = () => {
  const now = Date.now();
  for (const [phone, data] of otpStore.entries()) {
    if (data.expiresAt < now) {
      otpStore.delete(phone);
    }
  }
};

const UserAuthController = {
  /**
   * Send OTP to phone number
   * POST /api/users/send-otp
   * Body: { phone: string, countryCode?: string }
   */
  sendOTP: async (req, res) => {
    try {
      const { phone, countryCode = '+91' } = req.body;

      // Validation
      if (!phone) {
        return res.status(400).json({
          success: false,
          message: 'Phone number is required'
        });
      }

      // Clean phone number (remove spaces, dashes)
      const cleanPhone = phone.replace(/\s|-/g, '');

      // Construct full phone number with country code
      const fullPhoneNumber = `${countryCode}${cleanPhone}`;

      // Generate 4-digit OTP
      const otp = generateOTP();
      const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes expiry (increased from 60 seconds)

      // Store OTP (in-memory for development)
      otpStore.set(cleanPhone, { otp, expiresAt, countryCode });

      // Clean expired OTPs periodically
      cleanExpiredOTPs();

      // Check if user exists and has email (optional: send email OTP if available)
      let userEmail = null;
      let userName = 'User';
      try {
        const existingUser = await prisma.user.findFirst({
          where: { phone: cleanPhone, isDeleted: false },
          select: { email: true, firstname: true, lastname: true }
        });
        if (existingUser) {
          userEmail = existingUser.email;
          if (existingUser.firstname) {
            userName = `${existingUser.firstname}${existingUser.lastname ? ' ' + existingUser.lastname : ''}`;
          }
        }
      } catch (error) {
        // If user lookup fails, continue with SMS only
        if (process.env.NODE_ENV === 'development') {
          console.warn('Could not fetch user email for OTP:', error.message);
        }
      }

      console.log(process.env.TWILIO_ACCOUNT_SID, 'jj', process.env.TWILIO_AUTH_TOKEN, 'll', process.env.TWILIO_PHONE_NUMBER,'kk', process.env.SMS_PROVIDER,'dd');


      // Send OTP via SMS using template
      const smsMessage = smsTemplates.otp({ otp, expiresIn: 5 });
      
      // For Twilio trial accounts, use TWILIO_PHONE_NUMBER instead of alphanumeric sender ID
      const smsProvider = process.env.SMS_PROVIDER || 'mock';
      const smsFrom = (smsProvider === 'twilio' && process.env.TWILIO_PHONE_NUMBER) 
        ? process.env.TWILIO_PHONE_NUMBER 
        : 'ZOMESSTAY';
      
      const smsResult = await smsService.send({
        to: fullPhoneNumber,
        message: smsMessage,
        from: smsFrom
      });

      // Log SMS failure only
      if (!smsResult.success) {
        console.error('SMS sending failed:', smsResult.error);
      }

      // Send OTP via Email if user has email (optional enhancement)
      let emailResult = null;
      if (userEmail) {
        try {
          const emailContent = emailTemplates.otp({ otp, userName, expiresIn: 5 });
          emailResult = await emailService.send({
            to: userEmail,
            subject: 'OTP Verification - ZomesStay',
            content: emailContent
          });

          if (!emailResult.success) {
            console.error('Email sending failed:', emailResult.error);
          }
        } catch (error) {
          console.error('Error sending OTP email:', error.message);
        }
      }

      // Log OTP in development mode only
      if (process.env.NODE_ENV === 'development') {
        console.log(`OTP for ${fullPhoneNumber}: ${otp}`);
      }

      // Return success response (OTP is NOT included in response for security)
      res.json({
        success: true,
        message: 'OTP sent successfully to your phone number',
        data: {
          phone: cleanPhone, // Return clean phone without country code
          expiresIn: 300, // 5 minutes in seconds
          message: 'OTP sent to your phone number. Please check your SMS.'
        }
      });

    } catch (error) {
      console.error('Send OTP Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send OTP. Please try again.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  /**
   * Verify OTP and login/register user (Progressive Profile approach)
   * POST /api/users/verify-otp
   * Body: { phone: string, otp: string }
   */
  verifyOTP: async (req, res) => {
    try {
      const { phone, otp } = req.body;

      // Validation
      if (!phone || !otp) {
        return res.status(400).json({
          success: false,
          message: 'Phone number and OTP are required'
        });
      }

      // Clean phone number
      const cleanPhone = phone.replace(/\s|-/g, '');

      // Get stored OTP
      const storedOTPData = otpStore.get(cleanPhone);

      if (!storedOTPData) {
        return res.status(400).json({
          success: false,
          message: 'OTP not found. Please request a new OTP.'
        });
      }

      // Check if OTP expired
      if (Date.now() > storedOTPData.expiresAt) {
        otpStore.delete(cleanPhone);
        return res.status(400).json({
          success: false,
          message: 'OTP has expired. Please request a new OTP.'
        });
      }

      // Verify OTP
      if (storedOTPData.otp !== otp) {
        return res.status(400).json({
          success: false,
          message: 'Invalid OTP. Please try again.'
        });
      }

      // OTP verified successfully - remove from store
      otpStore.delete(cleanPhone);

      // Check if user exists
      let user = await prisma.user.findFirst({
        where: {
          phone: cleanPhone,
          isDeleted: false
        }
      });

      // If user doesn't exist, return flag indicating user needs to signup
      if (!user) {
        return res.json({
          success: true,
          message: 'OTP verified. Please complete your profile.',
          data: {
            userDidNotExist: true,
            isNewUser: true,
            phone: cleanPhone
          }
        });
      }

      // User exists - update phoneVerified if not already verified
      if (!user.phoneVerified) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { phoneVerified: true }
        });
      }

      // Generate JWT token
      const token = jwt.sign(
        {
          userId: user.id,
          phone: user.phone,
          type: 'user'
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '30d' } // 30 days expiry
      );

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: userWithoutPassword,
          token: token,
          isNewUser: false,
          userDidNotExist: false
        }
      });

    } catch (error) {
      console.error('Verify OTP Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to verify OTP',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  /**
   * Resend OTP to phone number
   * POST /api/users/resend-otp
   * Body: { phone: string, countryCode?: string }
   */
  resendOTP: async (req, res) => {
    try {
      const { phone, countryCode = '+91' } = req.body;

      // Validation
      if (!phone) {
        return res.status(400).json({
          success: false,
          message: 'Phone number is required'
        });
      }

      // Clean phone number (remove spaces, dashes)
      const cleanPhone = phone.replace(/\s|-/g, '');

      // Construct full phone number with country code
      const fullPhoneNumber = `${countryCode}${cleanPhone}`;

      // Generate new 4-digit OTP
      const otp = generateOTP();
      const expiresAt = Date.now() + 1 * 60 * 1000; // 5 minutes expiry (increased from 60 seconds)

      // Store new OTP (replaces existing if any)
      otpStore.set(cleanPhone, { otp, expiresAt, countryCode });

      // Clean expired OTPs periodically
      cleanExpiredOTPs();

      // Check if user exists and has email (optional: send email OTP if available)
      let userEmail = null;
      let userName = 'User';
      try {
        const existingUser = await prisma.user.findFirst({
          where: { phone: cleanPhone, isDeleted: false },
          select: { email: true, firstname: true, lastname: true }
        });
        if (existingUser) {
          userEmail = existingUser.email;
          if (existingUser.firstname) {
            userName = `${existingUser.firstname}${existingUser.lastname ? ' ' + existingUser.lastname : ''}`;
          }
        }
      } catch (error) {
        // If user lookup fails, continue with SMS only
        if (process.env.NODE_ENV === 'development') {
          console.warn('Could not fetch user email for OTP resend:', error.message);
        }
      }

      // Send OTP via SMS using template
      const smsMessage = smsTemplates.otp({ otp, expiresIn: 1 });
      
      // For Twilio trial accounts, use TWILIO_PHONE_NUMBER instead of alphanumeric sender ID
      const smsProvider = process.env.SMS_PROVIDER || 'mock';
      const smsFrom = (smsProvider === 'twilio' && process.env.TWILIO_PHONE_NUMBER) 
        ? process.env.TWILIO_PHONE_NUMBER 
        : 'ZOMESSTAY';
      
      const smsResult = await smsService.send({
        to: fullPhoneNumber,
        message: smsMessage,
        from: smsFrom
      });

      // Log SMS failure only
      if (!smsResult.success) {
        console.error('SMS sending failed:', smsResult.error);
      }

      // Send OTP via Email if user has email (optional enhancement)
      let emailResult = null;
      if (userEmail) {
        try {
          const emailContent = emailTemplates.otp({ otp, userName, expiresIn: 5 });
          emailResult = await emailService.send({
            to: userEmail,
            subject: 'OTP Verification - ZomesStay',
            content: emailContent
          });

          if (!emailResult.success) {
            console.error('Email sending failed:', emailResult.error);
          }
        } catch (error) {
          console.error('Error sending OTP email:', error.message);
        }
      }

      // Log OTP in development mode only
      if (process.env.NODE_ENV === 'development') {
        console.log(`Resend OTP for ${fullPhoneNumber}: ${otp}`);
      }

      // Return success response (OTP is NOT included in response for security)
      res.json({
        success: true,
        message: 'OTP resent successfully to your phone number',
        data: {
          phone: cleanPhone, // Return clean phone without country code
          expiresIn: 300, // 5 minutes in seconds
          message: 'OTP resent to your phone number. Please check your SMS.'
        }
      });

    } catch (error) {
      console.error('Resend OTP Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to resend OTP. Please try again.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  /**
   * Create user after OTP verification (Hybrid approach)
   * POST /api/users/create
   * Body: { phone: string, email: string, firstname?: string, lastname?: string }
   */
  createUser: async (req, res) => {
    try {
      const { phone, email, firstname, lastname } = req.body;

      // Validation
      if (!phone || !email) {
        return res.status(400).json({
          success: false,
          message: 'Phone number and email are required'
        });
      }

      // Clean phone number
      const cleanPhone = phone.replace(/\s|-/g, '');

      // Check if user already exists
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { phone: cleanPhone, isDeleted: false },
            { email: email.toLowerCase(), isDeleted: false }
          ]
        }
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'User with this phone or email already exists'
        });
      }

      // Generate a random password (user won't use it with OTP login)
      const randomPassword = Math.random().toString(36).slice(-12);
      const hashedPassword = await bcrypt.hash(randomPassword, 10);

      // Create user
      const user = await prisma.user.create({
        data: {
          phone: cleanPhone,
          email: email.toLowerCase(),
          password: hashedPassword,
          firstname: firstname || null,
          lastname: lastname || null,
          phoneVerified: true, // Phone is verified via OTP
          emailVerified: false, // Email not verified yet
          status: 'active'
        }
      });

      // Generate JWT token
      const token = jwt.sign(
        {
          userId: user.id,
          phone: user.phone,
          type: 'user'
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '30d' } // 30 days expiry
      );

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;

      res.json({
        success: true,
        message: 'Account created successfully. You are now logged in.',
        data: {
          user: userWithoutPassword,
          token: token,
          isNewUser: true
        }
      });

    } catch (error) {
      console.error('Create User Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create account',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  /**
   * Logout user
   * POST /api/users/logout
   */
  logout: async (req, res) => {
    try {
      // Clear any refresh token cookies if using cookies
      res.clearCookie("refresh_token");
      res.clearCookie("user_refresh_token");

      return res.status(200).json({
        success: true,
        message: "Logout successful"
      });
    } catch (error) {
      console.error('User Logout Error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error logging out',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
};

module.exports = UserAuthController;
