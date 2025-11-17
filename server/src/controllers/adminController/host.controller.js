// src/controllers/adminController/host.controller.js
const { PrismaClient, Prisma } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');
const { logout } = require('./auth.controller');
const jwt = require('jsonwebtoken');
const { signToken } = require('../../utils/jwt.utils');
const ALLOWED_FIELDS_HOST = ['email', 'password']; // don't accept role from client

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
          createdAt: true
        }
      });

      return res.status(201).json({
        success: true,
        message: 'Host created successfully',
        data: host
      });
    } catch (err) {
      console.error('Error creating host:', err);

      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
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

  hostLogin :async (req, res) => {

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
  console.log("host ",host)
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
