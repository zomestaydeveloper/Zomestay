// src/controllers/adminController/host.controller.js
const { PrismaClient, Prisma } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');
const { logout } = require('./auth.controller');
const jwt = require('jsonwebtoken');
const { signToken } = require('../../utils/jwt.utils');
const ALLOWED_FIELDS_HOST = ['email', 'password']; // don't accept role from client
const { smsService, emailService, smsTemplates, emailTemplates } = require('../../services/communication');

const isValidRequest = (req, allowed) =>
  Object.keys(req.body || {}).every((k) => allowed.includes(k));

const safeJSON = (value, fallback) => {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (err) {
    return fallback;
  }
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

const normalizeToArray = (input) => {
  if (input == null) return [];
  if (Array.isArray(input)) return input;
  return [input];
};

const normaliseRulesToArray = (input) => {
  if (!input) return [];

  if (Array.isArray(input)) {
    return input
      .map((rule) => (rule == null ? '' : String(rule).trim()))
      .filter((rule) => rule.length > 0);
  }

  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .map((rule) => (rule == null ? '' : String(rule).trim()))
          .filter((rule) => rule.length > 0);
      }
    } catch (err) {
      // Not JSON, fall through
    }

    return trimmed
      .split(/\r?\n|,/)
      .map((rule) => rule.trim())
      .filter((rule) => rule.length > 0);
  }

  return [];
};

const normaliseNumber = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const resolveFileUrl = (file, defaultSubdirectory = 'images') => {
  if (!file) return null;
  if (file.url) return file.url;
  if (file.subdirectory) return `/uploads/${file.subdirectory}/${file.filename}`;
  if (file.relativePath) return `/uploads/${file.relativePath}`;
  return `/uploads/${defaultSubdirectory}/${file.filename}`;
};

const fileToUrl = (req, file) => {
  const rel = resolveFileUrl(file);
  if (!rel) return null;
  const base = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;
  return `${base}${rel}`;
};

const buildMediaPayload = (existingMediaRaw, coverIndexDefault = 0) => {
  if (!existingMediaRaw) return { items: [], coverIndex: coverIndexDefault };

  const existingMediaArray = Array.isArray(existingMediaRaw)
    ? existingMediaRaw
    : [existingMediaRaw];

  const parsed = existingMediaArray
    .map((item) => {
      if (typeof item === 'string') {
        try {
          return JSON.parse(item);
        } catch (err) {
          return null;
        }
      }
      return item;
    })
    .filter((item) => item && item.url && !item.isDeleted);

  const sorted = parsed
    .map((item, index) => ({
      url: item.url,
      type: item.type || 'image',
      isFeatured: Boolean(item.isFeatured),
      order: typeof item.order === 'number' ? item.order : index,
    }))
    .sort((a, b) => a.order - b.order);

  const coverIndex = sorted.findIndex((item) => item.isFeatured);

  return {
    items: sorted,
    coverIndex: coverIndex >= 0 ? coverIndex : coverIndexDefault,
  };
};

const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/jpg',
];

const ALLOWED_VIDEO_MIME_TYPES = ['video/mp4', 'video/webm', 'video/mov'];

const MAX_MEDIA_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const ensureHostProperty = async (propertyId, ownerHostId) => {
  if (!propertyId || !ownerHostId) return null;
  return prisma.property.findFirst({
    where: {
      id: propertyId,
      ownerHostId,
      isDeleted: false,
    },
    select: { id: true },
  });
};

const normalizeIdList = (value) =>
  Array.isArray(value) ? [...new Set(value.map((id) => String(id)))] : [];

const fetchHostPropertyDetails = async (propertyId) =>
  prisma.property.findUnique({
    where: { id: propertyId },
    include: {
      ownerHost: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          profileImage: true,
          isVerified: true,
          createdAt: true,
        },
      },
      propertyType: true,
      cancellationPolicy: {
        include: {
          rules: {
            orderBy: { sortOrder: 'asc' },
          },
        },
      },
      media: {
        where: { isDeleted: false },
        orderBy: [{ isFeatured: 'desc' }, { order: 'asc' }, { createdAt: 'asc' }],
      },
      amenities: {
        where: { isDeleted: false },
        include: { amenity: true },
      },
      facilities: {
        where: { isDeleted: false },
        include: { facility: true },
      },
      safeties: {
        where: { isDeleted: false },
        include: { safety: true },
      },
      roomTypes: {
        where: { isDeleted: false },
        include: {
          roomType: true,
          media: {
            where: { isDeleted: false },
            orderBy: [{ isFeatured: 'desc' }, { order: 'asc' }, { createdAt: 'asc' }],
          },
          amenities: {
            where: { isDeleted: false },
            include: { amenity: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
      promotions: {
        where: { isDeleted: false, status: 'active' },
      },
      reviews: {
        where: { isDeleted: false },
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              firstname: true,
              lastname: true,
              profileImage: true,
            },
          },
        },
      },
      _count: {
        select: {
          reviews: true,
          promotions: true,
          roomTypes: true,
        },
      },
    },
  });

const HostController = {
  createHost: async (req, res) => {
    console.log("🔥 createHost called at", new Date().toISOString());
    try {
      const { email, password, firstName, lastName, phone } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'email and password are required'
        });
      }

      const hashed = await bcrypt.hash(String(password), 10);

      const profileImage = req.file ? req.file.filename : null;

      const host = await prisma.host.create({
        data: {
          email: String(email).toLowerCase().trim(),
          password: hashed,
          firstName: firstName || null,
          lastName: lastName || null,
          phone: phone || null,
          profileImage
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          profileImage: true,
          isVerified: true,
          createdAt: true,
        }
      });

      console.log(host,'jd');

      return res.status(201).json({
        success: true,
        message: 'Host created successfully',
        host: host
      });

    } catch (err) {
      console.error('Error creating host:', err);

      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        console.log('here');
        return res.status(409).json({
          success: false,
          message: 'Email already exists'
        });
      }

      return res.status(500).json({
        success: false,
        message: err?.message || 'Error creating host'
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
      let userName = 'Host';
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

  registerOTP: async (req, res) => {
    try {
      const { phone, otp } = req.body;

      if (!phone || !otp) {
        return res.status(400).json({
          success: false,
          message: "Phone and OTP are required"
        });
      }

      const cleanPhone = phone.replace(/\s|-/g, "");
      const storedOTPData = otpStore.get(cleanPhone);

      if (!storedOTPData) {
        return res.status(400).json({
          success: false,
          message: "OTP not found or expired"
        });
      }

      if (Date.now() > storedOTPData.expiresAt) {
        otpStore.delete(cleanPhone);
        return res.status(400).json({
          success: false,
          message: "OTP expired"
        });
      }

      if (storedOTPData.otp !== otp) {
        return res.status(400).json({
          success: false,
          message: "Invalid OTP"
        });
      }

      // OTP verified → delete it
      otpStore.delete(cleanPhone);

      // 🔐 Mark phone as verified for signup (short-lived)
      otpStore.set(`verified:${cleanPhone}`, {
        verified: true,
        expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutes
      });
      return res.json({
        success: true,
        message: "OTP verified successfully"
      });

    } catch (error) {
      console.error("Register OTP Error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to verify OTP"
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
      let host = await prisma.host.findFirst({
        where: {
          phone: cleanPhone,
          isDeleted: false
        }
      });


      // If user doesn't exist, return flag indicating user needs to signup
      if (!host) {
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
        { id: host.id, role: 'host' },
        { expiresIn: '1h' }
      );

      const refreshToken = jwt.sign(
        { id: host.id, tokenType: 'refresh', role: 'host' },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '30d' }
      );

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
      const { password: _, ...userWithoutPassword } = host;

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          host: userWithoutPassword,
          token: accessToken,
          isNewUser: false,
          userDidNotExist: false
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

  hostLogin: async (req, res) => {

    try {

      if (!isValidRequest(req, ALLOWED_FIELDS_HOST)) {
        return res.status(400).json({ success: false, message: 'unauthorised request' });
      }

      const email = String(req.body.email || '').toLowerCase().trim();
      const password = String(req.body.password || '');

      if (!email || !password) {
        return res.status(400).json({ success: false, message: 'email and password are required' });
      }

      // 2) Look up host
      const host = await prisma.host.findUnique({ where: { email } });
      if (!host) {
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      }
      console.log("host ", host)
      // 3) Verify password
      const ok = await bcrypt.compare(password, host.password);
      if (!ok) {
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      }

      const accessToken = signToken(
        { id: host.id, role: 'host' },
        { expiresIn: '1h' }
      );

      const refreshToken = jwt.sign(
        { id: host.id, tokenType: 'refresh', role: 'host' },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '30d' }
      );

      // 5) Set refresh cookie (same path as your refresh endpoint)
      res.cookie('refresh_token', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // true in prod; false for localhost dev
        sameSite: 'lax',
        path: '/auth/refresh', // keep same as admin’s refresh endpoint
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });

      // 6) Respond with access token + host profile
      return res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          token: accessToken,
          host: {
            id: host.id,
            email: host.email,
            firstName: host.firstName,
            lastName: host.lastName,
            phone: host.phone,
            profileImage: host.profileImage,
            isVerified: host.isVerified,
            role: 'host',
            createdAt: host.createdAt,
            updatedAt: host.updatedAt,
          },
        },
      });
    } catch (err) {
      console.error('Error logging in host:', err);
      return res.status(500).json({
        success: false,
        message: err?.message || 'Error logging in host',
      });
    }
  },
  hostLogout: async (req, res) => {
    try {
      res.clearCookie("refresh_token");

      return res.status(200).json({
        success: true,
        message: "Logout successful"
      });
    } catch (error) {
      console.error('Error logging out:', error);
      return res.status(500).json({
        success: false,
        message: 'Error logging out'
      });
    }
  },
  hostPropertys: async (req, res) => {
    try {
      const { hostId } = req.params;
      if (!hostId) {
        return res.status(400).json({ success: false, message: 'Invalid host ID' });
      }

      const property = await prisma.property.findFirst({
        where: { ownerHostId: hostId, isDeleted: false },
        include: {
          ownerHost: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              phone: true,
              profileImage: true,
              isVerified: true,
              createdAt: true,
            },
          },
          propertyType: true,
          cancellationPolicy: {
            include: {
              rules: {
                orderBy: { sortOrder: 'asc' },
              },
            },
          },
          media: {
            where: { isDeleted: false },
            orderBy: [{ isFeatured: 'desc' }, { order: 'asc' }, { createdAt: 'asc' }],
          },
          amenities: {
            where: { isDeleted: false },
            include: { amenity: true },
          },
          facilities: {
            where: { isDeleted: false },
            include: { facility: true },
          },
          safeties: {
            where: { isDeleted: false },
            include: { safety: true },
          },
          roomTypes: {
            where: { isDeleted: false },
            include: {
              roomType: true,
              media: {
                where: { isDeleted: false },
                orderBy: [{ isFeatured: 'desc' }, { order: 'asc' }, { createdAt: 'asc' }],
              },
              amenities: {
                where: { isDeleted: false },
                include: { amenity: true },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
          promotions: {
            where: { isDeleted: false, status: 'active' },
          },
          reviews: {
            where: { isDeleted: false },
            take: 10,
            orderBy: { createdAt: 'desc' },
            include: {
              user: { select: { id: true, firstname: true, lastname: true, profileImage: true } },
            },
          },
          _count: {
            select: {
              reviews: true,
              promotions: true,
              roomTypes: true,
            },
          },
        },
      });

      if (!property) {
        return res.status(404).json({ success: false, message: 'No property found for this host' });
      }

      return res.status(200).json({
        success: true,
        message: 'Host property retrieved successfully',
        data: property,
      });
    } catch (error) {
      console.error('Error fetching host properties:', error);
      return res.status(500).json({
        success: false,
        message: 'Error fetching host properties',
        code: error.code,
        detail: error.meta || error.message,
      });
    }
  },

  updateHostPropertyBasics: async (req, res) => {
    const { propertyId } = req.params;
    const {
      ownerHostId,
      title,
      description,
      rulesAndPolicies,
      status,
      propertyTypeId,
      cancellationPolicyId,
      checkInTime,
      checkOutTime,
    } = req.body || {};

    if (!propertyId || !ownerHostId) {
      return res.status(400).json({
        success: false,
        message: 'Property identifier and owner host identifier are required',
      });
    }

    const property = await ensureHostProperty(propertyId, ownerHostId);
    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found for the provided host',
      });
    }

    if (!title || !String(title).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Title is required',
      });
    }

    if (propertyTypeId) {
      const propertyType = await prisma.propertyType.findFirst({
        where: { id: propertyTypeId, isDeleted: false },
        select: { id: true },
      });
      if (!propertyType) {
        return res.status(400).json({
          success: false,
          message: 'Invalid propertyTypeId',
        });
      }
    }

    if (cancellationPolicyId) {
      const policy = await prisma.cancellationPolicy.findFirst({
        where: { id: cancellationPolicyId, isDeleted: false },
        select: { id: true },
      });
      if (!policy) {
        return res.status(400).json({
          success: false,
          message: 'Invalid cancellationPolicyId',
        });
      }
    }

    if (status && !['active', 'inactive', 'blocked'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value',
      });
    }

    const rulesList = normaliseRulesToArray(rulesAndPolicies);
    const rulesString = rulesList.length ? rulesList.join('\n') : null;

    await prisma.property.update({
      where: { id: propertyId },
      data: {
        title: String(title).trim(),
        description: description ?? null,
        rulesAndPolicies: rulesString,
        status: status || undefined,
        propertyTypeId: propertyTypeId || null,
        cancellationPolicyId: cancellationPolicyId || null,
        checkInTime: checkInTime || undefined,
        checkOutTime: checkOutTime || undefined,
      },
    });

    const refreshedProperty = await fetchHostPropertyDetails(propertyId);

    return res.json({
      success: true,
      message: 'Host property basics updated successfully',
      data: refreshedProperty,
    });
  },

  updateHostPropertyLocation: async (req, res) => {
    const { propertyId } = req.params;
    const { ownerHostId, location } = req.body || {};

    if (!propertyId || !ownerHostId) {
      return res.status(400).json({
        success: false,
        message: 'Property identifier and owner host identifier are required',
      });
    }

    const property = await ensureHostProperty(propertyId, ownerHostId);
    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found for the provided host',
      });
    }

    const locationData = safeJSON(location, location);
    if (!locationData || typeof locationData !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Invalid location payload',
      });
    }

    await prisma.property.update({
      where: { id: propertyId },
      data: { location: locationData },
    });

    const refreshedProperty = await fetchHostPropertyDetails(propertyId);

    return res.json({
      success: true,
      message: 'Host property location updated successfully',
      data: refreshedProperty,
    });
  },

  updateHostPropertyPolicy: async (req, res) => {
    const { propertyId } = req.params;
    const { ownerHostId, cancellationPolicyId } = req.body || {};

    if (!propertyId || !ownerHostId) {
      return res.status(400).json({
        success: false,
        message: 'Property identifier and owner host identifier are required',
      });
    }

    const property = await ensureHostProperty(propertyId, ownerHostId);
    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found for the provided host',
      });
    }

    if (cancellationPolicyId) {
      const policy = await prisma.cancellationPolicy.findFirst({
        where: { id: cancellationPolicyId, isDeleted: false },
        select: { id: true },
      });
      if (!policy) {
        return res.status(400).json({
          success: false,
          message: 'Invalid cancellationPolicyId',
        });
      }
    }

    await prisma.property.update({
      where: { id: propertyId },
      data: { cancellationPolicyId: cancellationPolicyId || null },
    });

    const refreshedProperty = await fetchHostPropertyDetails(propertyId);

    return res.json({
      success: true,
      message: 'Host property cancellation policy updated successfully',
      data: refreshedProperty,
    });
  },

  updateHostPropertyFeatures: async (req, res) => {
    const { propertyId } = req.params;
    const { ownerHostId, amenityIds = [], facilityIds = [], safetyIds = [] } = req.body || {};

    if (!propertyId || !ownerHostId) {
      return res.status(400).json({
        success: false,
        message: 'Property identifier and owner host identifier are required',
      });
    }

    const property = await ensureHostProperty(propertyId, ownerHostId);
    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found for the provided host',
      });
    }

    const amenityList = normalizeIdList(amenityIds);
    const facilityList = normalizeIdList(facilityIds);
    const safetyList = normalizeIdList(safetyIds);

    const updatedProperty = await prisma.$transaction(async (tx) => {
      const syncPropertyPivot = async (delegate, selectedIds, foreignKey) => {
        const records = await delegate.findMany({ where: { propertyId } });
        const selectedSet = new Set(selectedIds);

        for (const record of records) {
          if (selectedSet.has(record[foreignKey])) {
            if (record.isDeleted) {
              await delegate.update({
                where: { id: record.id },
                data: { isDeleted: false },
              });
            }
          } else if (!record.isDeleted) {
            await delegate.update({
              where: { id: record.id },
              data: { isDeleted: true },
            });
          }
        }

        for (const id of selectedIds) {
          const existingRecord = records.find((record) => record[foreignKey] === id);
          if (!existingRecord) {
            await delegate.create({
              data: {
                propertyId,
                [foreignKey]: id,
              },
            });
          } else if (existingRecord.isDeleted) {
            await delegate.update({
              where: { id: existingRecord.id },
              data: { isDeleted: false },
            });
          }
        }
      };

      await syncPropertyPivot(tx.propertyAmenity, amenityList, 'amenityId');
      await syncPropertyPivot(tx.propertyFacility, facilityList, 'facilityId');
      await syncPropertyPivot(tx.propertySafety, safetyList, 'safetyId');

      return fetchHostPropertyDetails(propertyId);
    });

    return res.json({
      success: true,
      message: 'Host property features updated successfully',
      data: updatedProperty,
    });
  },

  updateHostPropertyGallery: async (req, res) => {
    const { propertyId } = req.params;
    const { ownerHostId, existingMedia = [], coverImageIndex } = req.body || {};

    if (!propertyId || !ownerHostId) {
      return res.status(400).json({
        success: false,
        message: 'Property identifier and owner host identifier are required',
      });
    }

    const property = await ensureHostProperty(propertyId, ownerHostId);
    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found for the provided host',
      });
    }

    const filesByField = (req.files || []).reduce((acc, file) => {
      (acc[file.fieldname] ||= []).push(file);
      return acc;
    }, {});

    const newMediaFiles = filesByField.media || [];

    for (const file of newMediaFiles) {
      const validType =
        ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype) ||
        ALLOWED_VIDEO_MIME_TYPES.includes(file.mimetype);
      if (!validType) {
        return res.status(400).json({
          success: false,
          message: `Invalid file type: ${file.mimetype}`,
        });
      }
      if (file.size > MAX_MEDIA_FILE_SIZE) {
        return res.status(400).json({
          success: false,
          message: `File too large: ${file.originalname}`,
        });
      }
    }

    const existingMediaPayload = buildMediaPayload(existingMedia);
    const newMediaPayload = newMediaFiles.map((file, index) => ({
      url: fileToUrl(req, file),
      type: file.mimetype?.startsWith('image/') ? 'image' : 'video',
      isFeatured: false,
      order: existingMediaPayload.items.length + index,
    }));

    const combinedMedia = [...existingMediaPayload.items, ...newMediaPayload].map((item, index) => ({
      ...item,
      order: index,
    }));

    if (!combinedMedia.length) {
      return res.status(400).json({
        success: false,
        message: 'At least one property image is required',
      });
    }

    const coverIndexInput = typeof coverImageIndex !== 'undefined' ? Number(coverImageIndex) : null;
    const resolvedCoverIndex =
      coverIndexInput !== null && !Number.isNaN(coverIndexInput)
        ? coverIndexInput
        : existingMediaPayload.coverIndex;

    combinedMedia.forEach((item, index) => {
      item.isFeatured = index === resolvedCoverIndex;
    });

    const coverImageUrl = combinedMedia.find((item) => item.isFeatured)?.url || combinedMedia[0].url;

    const updatedProperty = await prisma.$transaction(async (tx) => {
      await tx.propertyMedia.deleteMany({ where: { propertyId } });

      await tx.propertyMedia.createMany({
        data: combinedMedia.map((media) => ({
          propertyId,
          url: media.url,
          type: media.type,
          isFeatured: media.isFeatured,
          order: media.order,
        })),
      });

      await tx.property.update({
        where: { id: propertyId },
        data: { coverImage: coverImageUrl },
      });

      return fetchHostPropertyDetails(propertyId);
    });

    return res.json({
      success: true,
      message: 'Host property gallery updated successfully',
      data: updatedProperty,
    });
  },

  updateHostPropertyRoomTypes: async (req, res) => {
    const { propertyId } = req.params;
    const { ownerHostId, roomTypes } = req.body || {};

    if (!propertyId || !ownerHostId) {
      return res.status(400).json({
        success: false,
        message: 'Property identifier and owner host identifier are required',
      });
    }

    const property = await ensureHostProperty(propertyId, ownerHostId);
    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found for the provided host',
      });
    }

    const roomTypesPayload = safeJSON(roomTypes, roomTypes);
    if (!Array.isArray(roomTypesPayload)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid roomTypes payload',
      });
    }

    const filesGroupedByIndex = {};
    for (const file of req.files || []) {
      const match = /^roomTypeImages_(\d+)$/.exec(file.fieldname);
      if (!match) continue;
      const index = Number(match[1]);
      if (Number.isNaN(index)) continue;

      (filesGroupedByIndex[index] ||= []).push(file);
    }

    for (const [index, files] of Object.entries(filesGroupedByIndex)) {
      for (const file of files) {
        const validType =
          ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype) ||
          ALLOWED_VIDEO_MIME_TYPES.includes(file.mimetype);
        if (!validType) {
          return res.status(400).json({
            success: false,
            message: `Invalid file type for room type index ${index}: ${file.mimetype}`,
          });
        }
        if (file.size > MAX_MEDIA_FILE_SIZE) {
          return res.status(400).json({
            success: false,
            message: `File too large for room type index ${index}: ${file.originalname}`,
          });
        }
      }
    }

    const updatedProperty = await prisma.$transaction(async (tx) => {
      const syncRoomTypeAmenities = async (roomTypeId, amenityIds = []) => {
        const normalised = normalizeIdList(amenityIds);
        const existing = await tx.propertyRoomTypeAmenity.findMany({
          where: { propertyRoomTypeId: roomTypeId },
        });
        const selectedSet = new Set(normalised);

        for (const record of existing) {
          if (selectedSet.has(record.amenityId)) {
            if (record.isDeleted) {
              await tx.propertyRoomTypeAmenity.update({
                where: { id: record.id },
                data: { isDeleted: false },
              });
            }
          } else if (!record.isDeleted) {
            await tx.propertyRoomTypeAmenity.update({
              where: { id: record.id },
              data: { isDeleted: true },
            });
          }
        }

        for (const amenityId of normalised) {
          const existingRecord = existing.find((record) => record.amenityId === amenityId);
          if (!existingRecord) {
            await tx.propertyRoomTypeAmenity.create({
              data: {
                propertyRoomTypeId: roomTypeId,
                amenityId,
              },
            });
          } else if (existingRecord.isDeleted) {
            await tx.propertyRoomTypeAmenity.update({
              where: { id: existingRecord.id },
              data: { isDeleted: false },
            });
          }
        }
      };

      for (let index = 0; index < roomTypesPayload.length; index += 1) {
        const roomTypePayload = roomTypesPayload[index];
        if (!roomTypePayload?.roomTypeId) {
          continue;
        }

        const minOccupancy = normaliseNumber(roomTypePayload.minOccupancy, 1);
        const maxOccupancy = normaliseNumber(
          roomTypePayload.maxOccupancy ?? roomTypePayload.Occupancy,
          minOccupancy
        );

        const roomTypeData = {
          roomTypeId: String(roomTypePayload.roomTypeId),
          minOccupancy,
          maxOccupancy,
          Occupancy: maxOccupancy,
          extraBedCapacity: normaliseNumber(roomTypePayload.extraBedCapacity, 0),
          numberOfBeds: normaliseNumber(roomTypePayload.numberOfBeds, 1),
          bedType: roomTypePayload.bedType || 'DOUBLE',
          isActive:
            roomTypePayload.isActive === undefined
              ? true
              : Boolean(roomTypePayload.isActive),
        };

        let propertyRoomTypeId = roomTypePayload?.id ? String(roomTypePayload.id) : null;

        if (propertyRoomTypeId) {
          const existingRoomType = await tx.propertyRoomType.findFirst({
            where: {
              id: propertyRoomTypeId,
              propertyId,
              isDeleted: false,
            },
          });

          if (!existingRoomType) {
            continue;
          }

          await tx.propertyRoomType.update({
            where: { id: propertyRoomTypeId },
            data: roomTypeData,
          });
        } else {
          const resurrected = await tx.propertyRoomType.findFirst({
            where: {
              propertyId,
              roomTypeId: roomTypeData.roomTypeId,
              isDeleted: true,
            },
          });

          if (resurrected) {
            const revived = await tx.propertyRoomType.update({
              where: { id: resurrected.id },
              data: {
                ...roomTypeData,
                isDeleted: false,
              },
            });
            propertyRoomTypeId = revived.id;
          } else {
            const created = await tx.propertyRoomType.create({
              data: {
                propertyId,
                ...roomTypeData,
              },
            });
            propertyRoomTypeId = created.id;
          }
        }

        if (!propertyRoomTypeId) {
          continue;
        }

        await syncRoomTypeAmenities(
          propertyRoomTypeId,
          roomTypePayload.amenities || roomTypePayload.amenityIds || []
        );

        if (Array.isArray(roomTypePayload.existingMedia)) {
          for (const mediaItem of roomTypePayload.existingMedia) {
            if (!mediaItem?.id) continue;
            await tx.propertyRoomTypeMedia.update({
              where: { id: mediaItem.id },
              data: {
                isDeleted: Boolean(mediaItem.isDeleted),
                isFeatured: Boolean(mediaItem.isFeatured),
                order: typeof mediaItem.order === 'number' ? mediaItem.order : 0,
              },
            });
          }
        }

        const newRoomTypeFiles = filesGroupedByIndex[index] || [];

        if (newRoomTypeFiles.length) {
          const existingCount = await tx.propertyRoomTypeMedia.count({
            where: {
              propertyRoomTypeId,
              isDeleted: false,
            },
          });

          const mediaPayload = newRoomTypeFiles.map((file, fileIndex) => ({
            propertyRoomTypeId,
            url: fileToUrl(req, file),
            type: file.mimetype?.startsWith('image/') ? 'image' : 'video',
            isFeatured: false,
            order: existingCount + fileIndex,
          }));

          await tx.propertyRoomTypeMedia.createMany({ data: mediaPayload });
        }
      }

      return fetchHostPropertyDetails(propertyId);
    });

    return res.json({
      success: true,
      message: 'Host property room types updated successfully',
      data: updatedProperty,
    });
  },
};

module.exports = HostController;
