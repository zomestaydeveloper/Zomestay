const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const path = require('path');
const { signToken } = require('../../utils/jwt.utils');

const prisma = new PrismaClient();

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

const AuthController = {
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
        phoneVerified ,
    
      } = b;

      if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: email, password, firstName, lastName'
        });
      }

      const statusEnum = toEnum(status, ['ACTIVE', 'INACTIVE'], 'ACTIVE');

      const existing = await prisma.admin.findUnique({ where: { email } });
      if (existing) {
        return res.status(409).json({ success: false, message: 'Email already exists' });
      }

      const hashed = await bcrypt.hash(password, 10);

      const fileObj =
        req.file ||
        (req.files?.profileImage?.[0]) ||
        (req.files?.file?.[0]) ||
        null;

      const profileImage = fileObj
        ? `/uploads/images/${path.basename(fileObj.filename || fileObj.originalname)}`
        : null;

      const dobDate            = toDateOrNull(dob);
      const emailVerifiedAt    = toDateOrNull(emailVerified);
      const phoneVerifiedAt    = toDateOrNull(phoneVerified);

      const admin = await prisma.admin.create({
        data: {
          email,
          password: hashed,
          firstName,
          lastName,
          status: statusEnum,             
          phone: phone || null,
          profileImage,                   
          emailVerified: emailVerifiedAt, 
          phoneVerified: phoneVerifiedAt,
          dob: dobDate,                   
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
     

     console.log("debuging",err)

      return res.status(500).json({
        success: false,
        message: 'Error creating admin'
      });
    }
  },
login: async (req, res) => {

const ALLOWED_FIELDS = ["email", "password"];

const isValidRequest = (req) => {
  const { body } = req;
  return Object.keys(body).every((key) => ALLOWED_FIELDS.includes(key));
};

if(!isValidRequest(req)){
    return res.status(400).json({
        success: false,
        message: 'unAuthoriesed request'
    });
}

const { email, password } = req.body;

const admin = await prisma.admin.findUnique({ where: { email } });
if (!admin) {
    return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
    });
}

const isValidPassword = await bcrypt.compare(password, admin.password)
if (!isValidPassword) {
    return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
    });
}

if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
  return res.status(500).json({
    success: false,
    message: 'JWT secrets not configured'
  });
}
const accessToken = signToken(
  { id: admin.id, role: "admin" },
  { expiresIn: "1h" } 
);
 
  const refreshToken = signToken(
    { id: admin.id, tokenType: "refresh", role: "admin" },
    { expiresIn: "30d" }
  );


res.cookie("refresh_token", refreshToken, {
  httpOnly: true,            
  secure: true,            
  sameSite: "lax",           
  path: "/auth/refresh",    
  maxAge: 30 * 24 * 60 * 60 * 1000, 
});


return res.status(200).json({
  success: true,
  message: "Login successful",
  data: {
    token: accessToken,
    admin: {
      email: admin.email,
      firstName: admin.firstName,
      lastName: admin.lastName,
      status: admin.status,
      role: "admin",
      phone: admin.phone,
      profileImage: admin.profileImage,
      createdAt: admin.createdAt,
      updatedAt: admin.updatedAt,
    },
  },
});
},



logout: async (req, res) => {
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
}
}

module.exports = AuthController;