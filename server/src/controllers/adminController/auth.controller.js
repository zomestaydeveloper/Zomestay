const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const path = require('path');
const { signToken } = require('../../utils/jwt.utils');
const { smsService, emailService, smsTemplates, emailTemplates } = require('../../services/communication');

const prisma = new PrismaClient();

/* =======================
   Helper functions
======================= */

const toEnum = (val, allowed, def) => {
  if (!val) return def;
  const v = String(val).toUpperCase();
  return allowed.includes(v) ? v : def;
};

const toDateOrNull = (val) => {
  if (val === true || val === 'true') return new Date();
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
};

const otpStore = new Map();

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

/* =======================
   Controller
======================= */

const AuthController = {

  /* ---------- SIGNUP ---------- */
  signup: async (req, res) => {
    try {
      const b = req.body || {};
      const {
        email,
        password,
        firstName,
        lastName,
        status,
        phone,
        dob,
        gender,
        emailVerified,
        phoneVerified
      } = b;

      if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: email, password, firstName, lastName'
        });
      }

      const statusEnum = toEnum(status, ['ACTIVE', 'INACTIVE'], 'ACTIVE');

      const existing = await prisma.admin.findUnique({
        where: { email }
      });

      if (existing) {
        return res.status(409).json({
          success: false,
          message: 'Email already exists'
        });
      }

      const hashed = await bcrypt.hash(password, 10);

      const fileObj =
        req.file ||
        req.files?.profileImage?.[0] ||
        req.files?.file?.[0] ||
        null;

      const profileImage = fileObj
        ? `/uploads/images/${path.basename(
          fileObj.filename || fileObj.originalname
        )}`
        : null;

      const admin = await prisma.admin.create({
        data: {
          email,
          password: hashed,
          firstName,
          lastName,
          status: statusEnum,
          phone: phone || null,
          profileImage,
          emailVerified: toDateOrNull(emailVerified),
          phoneVerified: toDateOrNull(phoneVerified),
          dob: toDateOrNull(dob),
          gender: gender || null
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          status: true,
          phone: true,
          profileImage: true,
          emailVerified: true,
          phoneVerified: true,
          dob: true,
          gender: true,
          createdAt: true,
          updatedAt: true
        }
      });

      return res.status(201).json({
        success: true,
        message: 'Admin created successfully',
        data: admin
      });

    } catch (err) {
      console.error('SIGNUP ERROR:', err);
      return res.status(500).json({
        success: false,
        message: 'Error creating admin'
      });
    }
  },

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
      let userName = 'Admin';
      try {
        const existingUser = await prisma.admin.findFirst({
          where: { phone: cleanPhone, isDeleted: false },
          select: { email: true, firstName: true, lastName: true }
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

      console.log(otp, 'hh')

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
      let admin = await prisma.admin.findFirst({
        where: {
          phone: cleanPhone,
          isDeleted: false
        }
      });


      // If user doesn't exist, return flag indicating user needs to signup
      if (!admin) {
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

      console.log('jj')

      // Generate JWT token
      const accessToken = signToken(
        { id: admin.id, role: 'admin' },
        { expiresIn: '1h' }
      );

      const refreshToken = signToken(
        { id: admin.id, tokenType: 'refresh', role: 'admin' },
        { expiresIn: '30d' }
      );

      const existingUser = await prisma.admin.findFirst({
          where: { phone: cleanPhone, isDeleted: false },
          select: { email: true, firstName: true, lastName: true, profileImage:true }
        });
      // 5) Set refresh cookie (same path as your refresh endpoint)
      res.cookie('refresh_token', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // true in prod; false for localhost dev
        sameSite: 'lax',
        path: '/auth/refresh', // keep same as admin’s refresh endpoint
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });

      console.log('jj2');

      // Remove password from response
      const { password: _, ...userWithoutPassword } = admin;

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          admin: userWithoutPassword,
          token: accessToken,
          isNewUser: false,
          userDidNotExist: false,
          user:existingUser
        }
      });

      console.log('jj3');

    } catch (error) {
      console.error('Verify OTP Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to verify OTP',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

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
        const existingUser = await prisma.admin.findFirst({
          where: { phone: cleanPhone, isDeleted: false },
          select: { email: true, firstName: true, lastName: true }
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

  /* ---------- LOGIN ---------- */
  login: async (req, res) => {
    try {
      console.log('LOGIN BODY:', req.body);

      // 1️⃣ Hard guard — NEVER crash
      if (!req.body || typeof req.body !== 'object') {
        return res.status(400).json({
          success: false,
          message: 'Request body is missing or invalid'
        });
      }

      const { email, password } = req.body;

      // 2️⃣ Required fields
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required'
        });
      }

      // 3️⃣ Block unexpected fields
      const ALLOWED_FIELDS = ['email', 'password'];
      const extraFields = Object.keys(req.body).filter(
        (key) => !ALLOWED_FIELDS.includes(key)
      );

      if (extraFields.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Unauthorized fields detected',
          fields: extraFields
        });
      }

      // 4️⃣ Find admin
      const admin = await prisma.admin.findUnique({
        where: { email }
      });

      if (!admin) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // 5️⃣ Password check
      const isValidPassword = await bcrypt.compare(password, admin.password);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // 6️⃣ JWT config check
      if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
        return res.status(500).json({
          success: false,
          message: 'JWT secrets not configured'
        });
      }

      // 7️⃣ Tokens
      const accessToken = signToken(
        { id: admin.id, role: 'admin' },
        { expiresIn: '1h' }
      );

      const refreshToken = signToken(
        { id: admin.id, tokenType: 'refresh', role: 'admin' },
        { expiresIn: '30d' }
      );

      // 8️⃣ Cookie
      res.cookie('refresh_token', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/auth/refresh',
        maxAge: 30 * 24 * 60 * 60 * 1000
      });

      // 9️⃣ Response
      return res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          token: accessToken,
          admin: {
            email: admin.email,
            firstName: admin.firstName,
            lastName: admin.lastName,
            status: admin.status,
            role: 'admin',
            phone: admin.phone,
            profileImage: admin.profileImage,
            createdAt: admin.createdAt,
            updatedAt: admin.updatedAt
          }
        }
      });

    } catch (error) {
      console.error('LOGIN ERROR:', error);
      return res.status(500).json({
        success: false,
        message: 'Login failed'
      });
    }
  },

  /* ---------- LOGOUT ---------- */
  logout: async (req, res) => {
    try {
      res.clearCookie('refresh_token');
      return res.status(200).json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error) {
      console.error('LOGOUT ERROR:', error);
      return res.status(500).json({
        success: false,
        message: 'Error logging out'
      });
    }
  }
};

module.exports = AuthController;
