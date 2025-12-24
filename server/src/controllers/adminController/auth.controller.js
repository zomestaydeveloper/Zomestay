const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const path = require('path');
const { signToken } = require('../../utils/jwt.utils');

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
