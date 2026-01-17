// controllers/PropertyController.js
const { PrismaClient, Prisma } = require('@prisma/client');
const { log, Console } = require('console');
const prisma = new PrismaClient();
const path = require('path');
const {
  dayUTC,
  diffNights,
  eachDateUTC,
  fetchAvailableProperties,
  calculateRoomAssignments
} = require('../../utils/property.utils');
const { requireAdminOrHost, requireAdmin } = require('../../utils/auth.utils');

/* ---------------------------- helpers ---------------------------- */
const parseJSON = (v, fallback) => {
  if (!v) return fallback;
  if (typeof v === 'object') return v;
  try { return JSON.parse(v); } catch { return fallback; }
};
const parseBool = (v, def = false) =>
  v === true || v === 'true' ? true : v === false || v === 'false' ? false : def;

const toInt = (v, def = 0) => {
  const n = Number.parseInt(v, 10);
  return Number.isNaN(n) ? def : n;
};

const pickPagination = (req) => {
  const page = Math.max(1, toInt(req.query.page || 1, 1));
  const limit = Math.min(100, Math.max(1, toInt(req.query.limit || 10, 10)));
  return { page, limit, skip: (page - 1) * limit, take: limit };
};

const ensureNotDeleted = async (model, id, name = 'record') => {
  const entity = await model.findUnique({ where: { id } });
  if (!entity) return { error: `${name} not found` };
  if (entity.isDeleted) return { error: `${name} has been deleted` };
  return { entity };
};
function normalizeToArray(input) {
  if (input == null) return [];
  if (Array.isArray(input)) return input;
  return [input];
}

// Build a public URL from a Multer file
function resolveFileUrl(file, defaultSubdirectory = 'images') {
  if (!file) return null;
  if (file.url) return file.url;
  if (file.subdirectory) return `/uploads/${file.subdirectory}/${file.filename}`;
  if (file.relativePath) return `/uploads/${file.relativePath}`;
  return `/uploads/${defaultSubdirectory}/${file.filename}`;
}

function fileToUrl(req, f) {
  const rel = resolveFileUrl(f);
  if (!rel) return null;
  const base = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;
  return `${base}${rel}`;
}

const safeJSON = (str, fallback, label = '') => {
  if (!str) return fallback;
  if (typeof str === 'object') return str;
  try {
    return JSON.parse(str);
  } catch (err) {
    if (label) console.error(`safeJSON parse error for ${label}:`, err.message, 'Input:', str.substring(0, 200));
    return fallback;
  }
};

const DAYS_TO_SEED = Number(process.env.RATECALENDAR_SEED_DAYS || 180);

/** Build a UTC date with day offset to avoid DST/timezone surprises */
function addDaysUtc(base, days) {
  const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function toPlain(obj) {
  if (obj === null || obj === undefined) return obj;

  if (obj instanceof Prisma.Decimal) {
    return obj.toNumber();
  }

  if (Array.isArray(obj)) {
    return obj.map(toPlain);
  }

  if (typeof obj === 'object') {
    const result = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        result[key] = toPlain(obj[key]);
      }
    }
    return result;
  }

  return obj;
}

/* -------------------------- controller -------------------------- */
const PropertyController = {
  // ========== AMENITIES ==========
  createAmenity: async (req, res) => {
    // Authorization: Admin and Host can create amenities
    const authError = requireAdminOrHost(req.user, res);
    if (authError) return;

    try {
      const { name, category = 'OTHER', isActive = true } = req.body;
      if (!name || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Amenity name is required',
        });
      }

      const existing = await prisma.amenity.findFirst({
        where: {
          name: name.trim(),
          isDeleted: false,
        },
      });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Amenity with this name already exists',
        });
      }

      const icon = req.file ? resolveFileUrl(req.file) : null;

      const amenity = await prisma.amenity.create({
        data: {
          name: name.trim(),
          category,
          icon,
          isActive: parseBool(isActive, true),
        }
      });

      res.status(201).json({ success: true, message: 'Amenity created', data: amenity });
    } catch (err) {
      console.error('createAmenity:', err);
      res.status(500).json({ success: false, message: 'Error creating amenity', error: err.message });
    }
  },

  getAmenities: async (req, res) => {
    // Authorization: Admin and Host can view amenities
    const authError = requireAdminOrHost(req.user, res);
    if (authError) return;

    try {
      const { page, limit, skip, take } = pickPagination(req);
      const where = { isDeleted: false };
      const [items, total] = await Promise.all([
        prisma.amenity.findMany({ where, orderBy: { name: 'asc' }, skip, take }),
        prisma.amenity.count({ where })
      ]);
      res.json({ success: true, data: items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
    } catch (err) {
      console.error('getAmenities:', err);
      res.status(500).json({ success: false, message: 'Error fetching amenities' });
    }
  },

  updateAmenity: async (req, res) => {
    // Authorization: Only Admin can update amenities
    const authError = requireAdmin(req.user, res);
    if (authError) return;

    try {
      const { id } = req.params;
      const guard = await ensureNotDeleted(prisma.amenity, id, 'Amenity');
      if (guard.error) return res.status(404).json({ success: false, message: guard.error });

      const { name, category, isActive } = req.body;
      const icon = req.file ? resolveFileUrl(req.file) : undefined;

      const amenity = await prisma.amenity.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(category && { category }),
          ...(icon && { icon }),
          ...(isActive !== undefined && { isActive: parseBool(isActive) })
        }
      });

      res.json({ success: true, message: 'Amenity updated', data: amenity });
    } catch (err) {
      console.error('updateAmenity:', err);
      res.status(500).json({ success: false, message: 'Error updating amenity' });
    }
  },

  deleteAmenity: async (req, res) => {
    // Authorization: Only Admin can delete amenities
    const authError = requireAdmin(req.user, res);
    if (authError) return;

    try {
      const { id } = req.params;
      const guard = await ensureNotDeleted(prisma.amenity, id, 'Amenity');
      if (guard.error) return res.status(404).json({ success: false, message: guard.error });

      await prisma.amenity.update({ where: { id }, data: { isDeleted: true, isActive: false } });
      res.json({ success: true, message: 'Amenity deleted' });
    } catch (err) {
      console.error('deleteAmenity:', err);
      res.status(500).json({ success: false, message: 'Error deleting amenity' });
    }
  },

  // ========== FACILITIES ==========


  createFacility: async (req, res) => {
    // Authorization: Admin and Host can create facilities
    const authError = requireAdminOrHost(req.user, res);
    if (authError) return;

    try {
      const { name, isActive = true } = req.body;
      if (!name || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Facility name is required',
        });
      }

      const existing = await prisma.facility.findFirst({
        where: {
          name: name.trim(),
          isDeleted: false,
        },
      });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Facility with this name already exists',
        });
      }

      const icon = req.file ? resolveFileUrl(req.file) : null;

      const facility = await prisma.facility.create({
        data: {
          name: name.trim(),
          icon,
          isActive: parseBool(isActive, true),
        }
      });

      res.status(201).json({ success: true, message: 'Facility created', data: facility });
    } catch (err) {
      console.error('createFacility:', err);
      res.status(500).json({ success: false, message: 'Error creating facility' });
    }
  },

  getFacilities: async (req, res) => {
    // Authorization: Admin and Host can view facilities
    const authError = requireAdminOrHost(req.user, res);
    if (authError) return;

    try {
      const { page, limit, skip, take } = pickPagination(req);
      const where = { isDeleted: false };
      const [items, total] = await Promise.all([
        prisma.facility.findMany({ where, orderBy: { name: 'asc' }, skip, take }),
        prisma.facility.count({ where })
      ]);
      res.json({ success: true, data: items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
    } catch (err) {
      console.error('getFacilities:', err);
      res.status(500).json({ success: false, message: 'Error fetching facilities' });
    }
  },

  updateFacility: async (req, res) => {
    // Authorization: Only Admin can update facilities
    const authError = requireAdmin(req.user, res);
    if (authError) return;

    try {
      const { id } = req.params;
      const guard = await ensureNotDeleted(prisma.facility, id, 'Facility');
      if (guard.error) return res.status(404).json({ success: false, message: guard.error });

      const { name, isActive } = req.body;
      const icon = req.file ? resolveFileUrl(req.file) : undefined;

      const facility = await prisma.facility.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(icon && { icon }),
          ...(isActive !== undefined && { isActive: parseBool(isActive) })
        }
      });

      res.json({ success: true, message: 'Facility updated', data: facility });
    } catch (err) {
      console.error('updateFacility:', err);
      res.status(500).json({ success: false, message: 'Error updating facility' });
    }
  },

  deleteFacility: async (req, res) => {
    // Authorization: Only Admin can delete facilities
    const authError = requireAdmin(req.user, res);
    if (authError) return;

    try {
      const { id } = req.params;
      const guard = await ensureNotDeleted(prisma.facility, id, 'Facility');
      if (guard.error) return res.status(404).json({ success: false, message: guard.error });

      await prisma.facility.update({ where: { id }, data: { isDeleted: true, isActive: false } });
      res.json({ success: true, message: 'Facility deleted' });
    } catch (err) {
      console.error('deleteFacility:', err);
      res.status(500).json({ success: false, message: 'Error deleting facility' });
    }
  },

  // ========== SAFETY HYGIENE ==========



  createSafetyHygiene: async (req, res) => {
    // Authorization: Admin and Host can create safety & hygiene items
    const authError = requireAdminOrHost(req.user, res);
    if (authError) return;

    try {
      const { name, isActive = true } = req.body;
      if (!name || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Safety & hygiene name is required',
        });
      }

      const existing = await prisma.safetyHygiene.findFirst({
        where: {
          name: name.trim(),
          isDeleted: false,
        },
      });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Safety & hygiene with this name already exists',
        });
      }

      const icon = req.file ? resolveFileUrl(req.file) : null;

      const safetyHygiene = await prisma.safetyHygiene.create({
        data: {
          name: name.trim(),
          icon,
          isActive: parseBool(isActive, true),
        }
      });

      res.status(201).json({ success: true, message: 'Safety hygiene created', data: safetyHygiene });
    } catch (err) {
      console.error('createSafetyHygiene:', err);
      res.status(500).json({ success: false, message: 'Error creating safety hygiene' });
    }
  },

  getSafetyHygienes: async (req, res) => {
    // Authorization: Admin and Host can view safety & hygiene items
    const authError = requireAdminOrHost(req.user, res);
    if (authError) return;

    try {
      const { page, limit, skip, take } = pickPagination(req);
      const where = { isDeleted: false, isActive: true };
      const [items, total] = await Promise.all([
        prisma.safetyHygiene.findMany({ where, orderBy: { name: 'asc' }, skip, take }),
        prisma.safetyHygiene.count({ where })
      ]);
      res.json({ success: true, data: items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
    } catch (err) {
      console.error('getSafetyHygienes:', err);
      res.status(500).json({ success: false, message: 'Error fetching safety hygienes' });
    }
  },

  updateSafetyHygiene: async (req, res) => {
    // Authorization: Only Admin can update safety & hygiene items
    const authError = requireAdmin(req.user, res);
    if (authError) return;

    try {
      const { id } = req.params;
      const guard = await ensureNotDeleted(prisma.safetyHygiene, id, 'Safety hygiene');
      if (guard.error) return res.status(404).json({ success: false, message: guard.error });

      const { name, isActive } = req.body;
      const icon = req.file ? resolveFileUrl(req.file) : undefined;

      if (name !== undefined) {
        if (!name || !name.trim()) {
          return res.status(400).json({
            success: false,
            message: 'Safety & hygiene name cannot be empty',
          });
        }

        const existing = await prisma.safetyHygiene.findFirst({
          where: {
            id: { not: id },
            name: name.trim(),
            isDeleted: false,
          },
        });
        if (existing) {
          return res.status(400).json({
            success: false,
            message: 'Safety & hygiene with this name already exists',
          });
        }
      }

      const safetyHygiene = await prisma.safetyHygiene.update({
        where: { id },
        data: {
          ...(name && { name: name.trim() }),
          ...(icon && { icon }),
          ...(isActive !== undefined && { isActive: parseBool(isActive) })
        }
      });

      res.json({ success: true, message: 'Safety hygiene updated', data: safetyHygiene });
    } catch (err) {
      console.error('updateSafetyHygiene:', err);
      res.status(500).json({ success: false, message: 'Error updating safety hygiene' });
    }
  },

  deleteSafetyHygiene: async (req, res) => {
    // Authorization: Only Admin can delete safety & hygiene items
    const authError = requireAdmin(req.user, res);
    if (authError) return;

    try {
      const { id } = req.params;
      const guard = await ensureNotDeleted(prisma.safetyHygiene, id, 'Safety hygiene');
      if (guard.error) return res.status(404).json({ success: false, message: guard.error });

      await prisma.safetyHygiene.update({ where: { id }, data: { isDeleted: true, isActive: false } });
      res.json({ success: true, message: 'Safety hygiene deleted' });
    } catch (err) {
      console.error('deleteSafetyHygiene:', err);
      res.status(500).json({ success: false, message: 'Error deleting safety hygiene' });
    }
  },

  // ========== PROPERTY TYPE ==========


  createPropertyType: async (req, res) => {
    // Authorization: Admin and Host can create property types
    const authError = requireAdminOrHost(req.user, res);
    if (authError) return;

    try {
      const { name } = req.body;
      if (!name || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Property type name is required',
        });
      }

      const existing = await prisma.propertyType.findFirst({
        where: {
          name: name.trim(),
          isDeleted: false,
        },
      });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Property type with this name already exists',
        });
      }

      const propertyType = await prisma.propertyType.create({
        data: { name: name.trim() },
      });
      res.status(201).json({ success: true, message: 'Property type created', data: propertyType });
    } catch (err) {
      console.error('createPropertyType:', err);
      res.status(500).json({ success: false, message: 'Error creating property type' });
    }
  },

  getPropertyTypes: async (req, res) => {
    // Authorization: Admin and Host can view property types
    const authError = requireAdminOrHost(req.user, res);
    if (authError) return;

    try {
      const items = await prisma.propertyType.findMany({
        where: { isDeleted: false },
        orderBy: { name: 'asc' }
      });
      res.json({ success: true, data: items });
    } catch (err) {
      console.error('getPropertyTypes:', err);
      res.status(500).json({ success: false, message: 'Error fetching property types' });
    }
  },

  updatePropertyType: async (req, res) => {
    // Authorization: Only Admin can update property types
    const authError = requireAdmin(req.user, res);
    if (authError) return;

    try {
      const { id } = req.params;
      const guard = await ensureNotDeleted(prisma.propertyType, id, 'Property type');
      if (guard.error) return res.status(404).json({ success: false, message: guard.error });

      const { name } = req.body;
      if (name !== undefined) {
        if (!name || !name.trim()) {
          return res.status(400).json({
            success: false,
            message: 'Property type name cannot be empty',
          });
        }

        const existing = await prisma.propertyType.findFirst({
          where: {
            id: { not: id },
            name: name.trim(),
            isDeleted: false,
          },
        });
        if (existing) {
          return res.status(400).json({
            success: false,
            message: 'Property type with this name already exists',
          });
        }
      }

      const propertyType = await prisma.propertyType.update({
        where: { id },
        data: name !== undefined ? { name: name.trim() } : {}
      });
      res.json({ success: true, message: 'Property type updated', data: propertyType });
    } catch (err) {
      console.error('updatePropertyType:', err);
      res.status(500).json({ success: false, message: 'Error updating property type' });
    }
  },

  deletePropertyType: async (req, res) => {
    // Authorization: Only Admin can delete property types
    const authError = requireAdmin(req.user, res);
    if (authError) return;

    try {
      const { id } = req.params;
      const guard = await ensureNotDeleted(prisma.propertyType, id, 'Property type');
      if (guard.error) return res.status(404).json({ success: false, message: guard.error });

      await prisma.propertyType.update({ where: { id }, data: { isDeleted: true } });
      res.json({ success: true, message: 'Property type deleted' });
    } catch (err) {
      console.error('deletePropertyType:', err);
      res.status(500).json({ success: false, message: 'Error deleting property type' });
    }
  },
  getPropertiesList: async (req, res) => {
    try {
      console.log('getProperties - Role:', req.user?.role || 'no role');
      console.log('getProperties - User ID:', req.user?.id || 'no id');

      const whereClause = {
        isDeleted: false,
        ...(req.user?.role === 'host' && req.user?.id && {
          ownerHostId: req.user.id
        })
      };

      const properties = await prisma.property.findMany({
        where: whereClause,
        select: {
          id: true,
          title: true,
          status: true,
          location: true,
          createdAt: true,
          ownerHost: {
            select: {
              firstName: true,
              lastName: true
            }
          },
          _count: {
            select: {
              roomTypes: true,
              MealPlan: true,
              ratePlans: true
            }
          }
        },
        orderBy: { title: 'asc' }
      });

      // Transform the data to match frontend expectations
      const transformedProperties = properties.map(property => ({
        id: property.id,
        name: property.title,
        location: property.location?.address ?
          `${property.location.address.city}, ${property.location.address.state}` :
          'Location not specified',
        status: property.status,
        hostName: property.ownerHost ?
          `${property.ownerHost.firstName || ''} ${property.ownerHost.lastName || ''}`.trim() :
          'Unknown Host',
        totalRooms: property._count.roomTypes,
        ratePlans: property._count.ratePlans,
        mealPlans: property._count.MealPlan,
        lastUpdated: property.createdAt.toISOString().split('T')[0]
      }));

      res.json({
        success: true,
        data: transformedProperties,
        count: transformedProperties.length
      });
    } catch (err) {
      console.error('getPropertiesList:', err);
      res.status(500).json({
        success: false,
        message: 'Error fetching properties list'
      });
    }
  },

  // ========== ROOM TYPE ==========


  createRoomType: async (req, res) => {
    // Authorization: Admin and Host can create room types
    const authError = requireAdminOrHost(req.user, res);
    if (authError) return;

    try {
      const { name } = req.body;
      if (!name || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Room type name is required',
        });
      }

      const existing = await prisma.roomType.findFirst({
        where: {
          name: name.trim(),
          isDeleted: false,
        },
      });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Room type with this name already exists',
        });
      }

      const roomType = await prisma.roomType.create({
        data: { name: name.trim() },
      });
      res.status(201).json({ success: true, message: 'Room type created', data: roomType });
    } catch (err) {
      console.error('createRoomType:', err);
      res.status(500).json({ success: false, message: 'Error creating room type' });
    }
  },

  getRoomTypes: async (req, res) => {
    // Authorization: Admin and Host can view room types
    const authError = requireAdminOrHost(req.user, res);
    if (authError) return;

    try {
      const items = await prisma.roomType.findMany({
        where: { isDeleted: false },
        orderBy: { name: 'asc' }
      });
      res.json({ success: true, data: items });
    } catch (err) {
      console.error('getRoomTypes:', err);
      res.status(500).json({ success: false, message: 'Error fetching room types' });
    }
  },

  updateRoomType: async (req, res) => {
    // Authorization: Only Admin can update room types
    const authError = requireAdmin(req.user, res);
    if (authError) return;

    try {
      const { id } = req.params;
      const guard = await ensureNotDeleted(prisma.roomType, id, 'Room type');
      if (guard.error) return res.status(404).json({ success: false, message: guard.error });

      const { name } = req.body;
      if (name !== undefined) {
        if (!name || !name.trim()) {
          return res.status(400).json({
            success: false,
            message: 'Room type name cannot be empty',
          });
        }

        const existing = await prisma.roomType.findFirst({
          where: {
            id: { not: id },
            name: name.trim(),
            isDeleted: false,
          },
        });
        if (existing) {
          return res.status(400).json({
            success: false,
            message: 'Room type with this name already exists',
          });
        }
      }

      const roomType = await prisma.roomType.update({
        where: { id },
        data: name !== undefined ? { name: name.trim() } : {}
      });
      res.json({ success: true, message: 'Room type updated', data: roomType });
    } catch (err) {
      console.error('updateRoomType:', err);
      res.status(500).json({ success: false, message: 'Error updating room type' });
    }
  },

  deleteRoomType: async (req, res) => {
    // Authorization: Only Admin can delete room types
    const authError = requireAdmin(req.user, res);
    if (authError) return;

    try {
      const { id } = req.params;
      const guard = await ensureNotDeleted(prisma.roomType, id, 'Room type');
      if (guard.error) return res.status(404).json({ success: false, message: guard.error });

      await prisma.roomType.update({ where: { id }, data: { isDeleted: true } });
      res.json({ success: true, message: 'Room type deleted' });
    } catch (err) {
      console.error('deleteRoomType:', err);
      res.status(500).json({ success: false, message: 'Error deleting room type' });
    }
  },

  // ========== PROPERTY ==========


  getProperties: async (req, res) => {
    try {
      // Log role from extractRole middleware
      console.log('getProperties - Role:', req.user?.role || 'no role');
      console.log('getProperties - User ID:', req.user?.id || 'no id');

      const {
        page = 1,
        limit = 10,
        search,
        propertyType,
        city,
        minPrice,
        maxPrice,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        status,
        ownerHostId,
        includeInactive = false
      } = req.query;

      // Validate pagination
      const skip = Math.max(0, (parseInt(page) - 1) * parseInt(limit));
      const take = Math.min(100, Math.max(1, parseInt(limit)));

      // Security: Hosts can only see their own properties
      // Admins can see all properties (or filter by ownerHostId if provided)
      let finalOwnerHostId = ownerHostId;
      if (req.user?.role === 'host' && req.user?.id) {
        // Force host to only see their own properties
        finalOwnerHostId = req.user.id;
        console.log('getProperties - Host filtering: Only showing properties for host', finalOwnerHostId);
      }

      // Build base where clause (without city filter)
      const baseWhere = {
        isDeleted: false,
        ...(search && {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } }
          ]
        }),
        ...(propertyType && { propertyTypeId: propertyType }),
        ...(status && { status: status }),
        ...(finalOwnerHostId && { ownerHostId: finalOwnerHostId }),
        // Price filtering based on rate plans
        ...(minPrice && {
          ratePlans: {
            some: {
              isDeleted: false,
              isActive: true,
              roomTypeMealPlanPricing: {
                some: {
                  isDeleted: false,
                  isActive: true,
                  doubleOccupancyPrice: { gte: parseFloat(minPrice) }
                }
              }
            }
          }
        }),
        ...(maxPrice && {
          ratePlans: {
            some: {
              isDeleted: false,
              isActive: true,
              roomTypeMealPlanPricing: {
                some: {
                  isDeleted: false,
                  isActive: true,
                  doubleOccupancyPrice: { lte: parseFloat(maxPrice) }
                }
              }
            }
          }
        })
      };

      // Apply city filter if provided (case-insensitive)
      // Since location is a JSON field in MySQL, we filter properties by city in Node.js
      // This ensures all other filters (propertyType, status) are applied correctly
      let where = baseWhere;

      if (city) {
        console.log('getProperties - City filter requested:', city);
        console.log('getProperties - Property type filter:', propertyType);
        console.log('getProperties - Status filter:', status);
        console.log('getProperties - Base where (before city filter):', JSON.stringify(baseWhere, null, 2));

        // Step 1: Get all properties matching other filters (propertyType, status, etc.)
        // This ensures propertyType and status filters are applied FIRST
        const allMatchingProperties = await prisma.property.findMany({
          where: baseWhere,
          select: {
            id: true,
            location: true
          },
          // Remove take limit to get all matching properties for city filtering
          // This is necessary to ensure all filters work together correctly
        });

        console.log('getProperties - Properties found before city filter:', allMatchingProperties.length);

        // Step 2: Filter by city (case-insensitive) in Node.js
        const cityLower = city.toLowerCase().trim();
        const matchingPropertyIds = allMatchingProperties
          .filter(p => {
            if (!p.location || typeof p.location !== 'object') {
              return false;
            }
            const locationCity = p.location?.address?.city;
            if (!locationCity || typeof locationCity !== 'string') {
              return false;
            }
            const locationCityLower = locationCity.toLowerCase().trim();
            const matches = locationCityLower === cityLower;
            if (matches) {
              console.log('getProperties - City match:', locationCity, '===', city);
            }
            return matches;
          })
          .map(p => p.id);

        console.log('getProperties - Properties matching city filter:', matchingPropertyIds.length);
        console.log('getProperties - Matching property IDs:', matchingPropertyIds);

        // Step 3: Apply city filter to where clause
        // This preserves all other filters (propertyType, status, etc.)
        if (matchingPropertyIds.length === 0) {
          // No properties match the city filter
          where = { ...baseWhere, id: { in: [] } };
          console.log('getProperties - No properties match city filter - returning empty result');
        } else {
          // Filter by property IDs that match the city
          // This preserves propertyType, status, and all other filters
          where = {
            ...baseWhere,
            id: { in: matchingPropertyIds }
          };
          console.log('getProperties - Applied city filter with', matchingPropertyIds.length, 'properties');
        }
      }

      console.log('getProperties - Final where clause:', JSON.stringify(where, null, 2));
      console.log('getProperties - Final where keys:', Object.keys(where));
      console.log('getProperties - Has propertyType filter:', !!where.propertyTypeId);
      console.log('getProperties - Has status filter:', !!where.status);
      console.log('getProperties - Has city filter (id in array):', Array.isArray(where.id?.in));

      // Validate sort fields
      const allowedSortFields = ['createdAt', 'updatedAt', 'title', 'avgRating', 'reviewCount'];
      const orderBy = {
        [allowedSortFields.includes(sortBy) ? sortBy : 'createdAt']:
          sortOrder === 'asc' ? 'asc' : 'desc'
      };

      // Get total count with all filters (including city)
      const total = await prisma.property.count({ where });

      // Optimized query for property cards - only essential data
      const properties = await prisma.property.findMany({
        where,
        orderBy,
        skip,
        take,
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          location: true,
          avgRating: true,
          reviewCount: true,
          coverImage: true,
          createdAt: true,

          // Property type
          propertyType: {
            select: { id: true, name: true }
          },

          // Media - only featured images for cards
          media: {
            where: {
              isDeleted: false,
              isFeatured: true
            },
            orderBy: { order: 'asc' },
            take: 3, // Only first 3 featured images
            select: {
              id: true,
              url: true,
              type: true
            },
          },

          // Room types - for price range and room count
          roomTypes: {
            where: {
              isDeleted: false,
              isActive: true
            },
            select: {
              id: true,
              roomType: {
                select: {
                  id: true,
                  name: true
                }
              },
              rooms: {
                where: { isDeleted: false },
                select: {
                  id: true,
                  name: true
                }
              },
              mealPlanLinks: {
                where: { isDeleted: false, isActive: true },
                select: {
                  doubleOccupancyPrice: true,
                  singleOccupancyPrice: true,
                  groupOccupancyPrice: true
                }
              }
            },
          },

          // Amenities count for categories
          amenities: {
            where: { isDeleted: false },
            select: {
              amenity: {
                select: {
                  id: true,
                  name: true,
                  category: true
                }
              },
            },
          },

          // Reviews count
          reviews: {
            where: { isDeleted: false },
            select: {
              id: true,
              rating: true
            }
          }
        },
      });


      console.log('properties:', JSON.stringify(properties, null, 2));

      // Check if role is agent and fetch agent discounts
      let agentDiscountsMap = new Map();
      let isApprovedAgent = false;

      if (req.user?.role === 'agent' && req.user?.id) {
        try {
          // Check if agent is approved
          const agent = await prisma.travelAgent.findFirst({
            where: {
              id: req.user.id,
              isDeleted: false,
              status: 'approved'
            },
            select: {
              id: true,
              status: true
            }
          });

          if (agent) {
            isApprovedAgent = true;
            console.log('getProperties - Agent is approved:', agent.id);

            // Fetch agent's discounts for all properties in the result
            const propertyIds = properties.map(p => p.id);
            if (propertyIds.length > 0) {
              const discounts = await prisma.travelAgentPropertyDiscount.findMany({
                where: {
                  agentId: agent.id,
                  propertyId: { in: propertyIds },
                  isDeleted: false,
                  isActive: true
                },
                select: {
                  propertyId: true,
                  discountType: true,
                  discountValue: true
                }
              });

              // Create a map for quick lookup: propertyId -> discount
              discounts.forEach(discount => {
                agentDiscountsMap.set(discount.propertyId, {
                  type: discount.discountType,
                  value: Number(discount.discountValue)
                });
              });

              console.log('getProperties - Agent discounts found:', discounts.length);
            }
          } else {
            console.log('getProperties - Agent not found or not approved');
          }
        } catch (agentError) {
          console.error('getProperties - Error checking agent:', agentError);
          // Continue without agent discounts if there's an error
        }
      }

      // Transform data for property cards
      const data = properties.map((p) => {
        try {
          // Calculate price range from meal plan pricing
          const allPrices = p.roomTypes.flatMap(rt =>
            rt.mealPlanLinks.map(mp => [
              mp.doubleOccupancyPrice,
              mp.singleOccupancyPrice,
              mp.groupOccupancyPrice
            ]).flat()
          ).filter(price => price > 0);

          const priceRange = allPrices.length > 0 ? {
            min: Math.min(...allPrices),
            max: Math.max(...allPrices)
          } : null;

          // Calculate agent rate if agent is approved and has discount for this property
          let agentRate = null;
          if (isApprovedAgent && priceRange) {
            const discount = agentDiscountsMap.get(p.id);
            if (discount) {
              let discountedMin, discountedMax;

              if (discount.type === 'percentage') {
                // Percentage discount: discountedPrice = originalPrice * (1 - discountValue/100)
                discountedMin = priceRange.min * (1 - discount.value / 100);
                discountedMax = priceRange.max * (1 - discount.value / 100);
              } else {
                // Flat discount: discountedPrice = originalPrice - discountValue
                discountedMin = Math.max(0, priceRange.min - discount.value);
                discountedMax = Math.max(0, priceRange.max - discount.value);
              }

              agentRate = {
                min: Math.round(discountedMin * 100) / 100, // Round to 2 decimal places
                max: Math.round(discountedMax * 100) / 100,
                currency: '₹',
                discountType: discount.type,
                discountValue: discount.value
              };
            }
          }

          // Count amenities by category
          const amenityCategories = p.amenities.reduce((acc, amenity) => {
            const category = amenity.amenity.category;
            acc[category] = (acc[category] || 0) + 1;
            return acc;
          }, {});

          // Count total rooms
          const totalRooms = p.roomTypes.reduce((sum, rt) => sum + rt.rooms.length, 0);

          // Calculate average rating from reviews
          const avgRating = p.reviews.length > 0
            ? p.reviews.reduce((sum, review) => sum + review.rating, 0) / p.reviews.length
            : p.avgRating;

          return {
            id: p.id,
            title: p.title,
            description: p.description,
            status: p.status,
            location: p.location,
            coverImage: p.coverImage,
            createdAt: p.createdAt,

            // Basic info
            propertyType: p.propertyType?.name || 'Unknown',

            // Rating and reviews
            rating: avgRating,
            reviewCount: p.reviewCount || p.reviews.length,

            // Images for cards
            images: p.media.map(m => ({
              id: m.id,
              url: m.url,
              type: m.type
            })),

            // Price range
            priceRange: priceRange ? {
              min: priceRange.min,
              max: priceRange.max,
              currency: '₹' // You can make this dynamic
            } : null,

            // Agent rate (discounted price) - only if agent is approved and has discount
            agentRate: agentRate || null,

            // Room info
            roomInfo: {
              totalRooms: totalRooms,
              roomTypes: p.roomTypes.length,
              roomTypeNames: p.roomTypes.map(rt => rt.roomType.name)
            },

            // Amenities summary
            amenities: {
              total: p.amenities.length,
              categories: amenityCategories,
              categoryCount: Object.keys(amenityCategories).length
            }
          };
        } catch (error) {
          console.error('Error transforming property data:', error);
          return {
            id: p.id,
            title: p.title,
            description: p.description,
            status: p.status,
            location: p.location,
            coverImage: p.coverImage,
            rating: p.avgRating,
            reviewCount: p.reviewCount
          };
        }
      });

      // Return paginated response with metadata
      return res.json({
        success: true,
        data,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
          hasNext: skip + take < total,
          hasPrev: skip > 0
        },
        metadata: {
          totalProperties: total,
          activeProperties: data.filter(p => p.status === 'active').length,
          totalRooms: data.reduce((sum, p) => sum + p.roomInfo.totalRooms, 0),
          totalAmenities: data.reduce((sum, p) => sum + p.amenities.total, 0)
        }
      });

    } catch (err) {
      console.error('getProperties error:', err);

      // Handle specific Prisma errors
      if (err.code === 'P2002') {
        return res.status(400).json({
          success: false,
          message: 'Duplicate property found',
          error: 'A property with this information already exists'
        });
      }

      if (err.code === 'P2025') {
        return res.status(404).json({
          success: false,
          message: 'Property not found',
          error: 'The requested property does not exist'
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Error fetching properties',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
      });
    }
  },
  searchProperties: async (req, res) => {
    try {
      // Input validation remains the same
      const {
        checkIn,
        checkOut,
        adults = 2,
        children = 0,
        infants = 0,
        rooms = 1,
        infantsUseBed = 0,
        city, // Add city to destructured params
      } = req.query;


      if (!checkIn || !checkOut) {
        return res.status(400).json({
          success: false,
          message: 'Check-in and check-out dates are required (YYYY-MM-DD format)'
        });
      }

      // Parse and validate dates
      const startDate = dayUTC(checkIn);
      const endDate = dayUTC(checkOut);
      const today = dayUTC(new Date());

      if (isNaN(startDate) || isNaN(endDate)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date format'
        });
      }

      if (startDate < today) {
        return res.status(400).json({
          success: false,
          message: 'Check-in date cannot be in the past'
        });
      }

      if (endDate <= startDate) {
        return res.status(400).json({
          success: false,
          message: 'Check-out date must be after check-in date'
        });
      }

      // Parse guest numbers
      const need = {
        adults: Math.max(0, Number(adults) || 0),
        children: Math.max(0, Number(children) || 0),
        infants: Math.max(0, Number(infants) || 0),
        rooms: Math.max(1, Number(rooms) || 1),
        infantsUseBed: Boolean(infantsUseBed),
      };

      const needsBedInfants = need.infantsUseBed ? need.infants : 0;
      const needsBedTotal = need.adults + need.children + needsBedInfants;

      if (needsBedTotal === 0) {
        return res.status(400).json({
          success: false,
          message: 'At least one guest required'
        });
      }

      // Calculate search parameters
      const nights = diffNights(checkIn, checkOut);
      const dateList = eachDateUTC(checkIn, checkOut);
      const dateISO = dateList.map(d => d.toISOString());

      // Fetch available properties
      let availableProperties = await fetchAvailableProperties(
        startDate,
        endDate,
        need,
        needsBedTotal
      );

      // Filter by city if provided
      if (city) {
        const cityLower = city.toLowerCase().trim();
        availableProperties = availableProperties.filter(property => {
          const locationCity = property.location?.address?.city;
          if (!locationCity || typeof locationCity !== 'string') return false;
          return locationCity.toLowerCase().trim() === cityLower;
        });
      }



      // Calculate room assignments
      const results = calculateRoomAssignments(
        availableProperties,
        need,
        needsBedInfants,
        nights,
        dateISO
      );

      // Check if role is agent and fetch agent discounts (same as getProperties)
      let agentDiscountsMap = new Map();
      let isApprovedAgent = false;

      if (req.user?.role === 'agent' && req.user?.id) {
        try {
          const agent = await prisma.travelAgent.findFirst({
            where: {
              id: req.user.id,
              isDeleted: false,
              status: 'approved'
            },
            select: {
              id: true,
              status: true
            }
          });

          if (agent) {
            isApprovedAgent = true;
            const propertyIds = results.map(r => r.property.id);
            if (propertyIds.length > 0) {
              const discounts = await prisma.travelAgentPropertyDiscount.findMany({
                where: {
                  agentId: agent.id,
                  propertyId: { in: propertyIds },
                  isDeleted: false,
                  isActive: true
                },
                select: {
                  propertyId: true,
                  discountType: true,
                  discountValue: true
                }
              });

              discounts.forEach(discount => {
                agentDiscountsMap.set(discount.propertyId, {
                  type: discount.discountType,
                  value: Number(discount.discountValue)
                });
              });
            }
          }
        } catch (agentError) {
          console.error('searchProperties - Error checking agent:', agentError);
        }
      }

      // Transform data to match getProperties format exactly
      const data = results.map((result) => {
        const property = result.property;

        try {
          // Calculate price range from meal plan pricing (same as getProperties)
          const allPrices = property.roomTypes?.flatMap(rt => {
            // Get meal plan links - need to fetch if not included
            // For now, we'll calculate from what we have
            // If mealPlanLinks are not included, we'll need to add them to the query
            return rt.mealPlanLinks?.map(mp => [
              mp.doubleOccupancyPrice,
              mp.singleOccupancyPrice,
              mp.groupOccupancyPrice
            ]).flat() || [];
          }).filter(price => price > 0) || [];

          const priceRange = allPrices.length > 0 ? {
            min: Math.min(...allPrices),
            max: Math.max(...allPrices)
          } : null;

          // Calculate agent rate (same as getProperties)
          let agentRate = null;
          if (isApprovedAgent && priceRange) {
            const discount = agentDiscountsMap.get(property.id);
            if (discount) {
              let discountedMin, discountedMax;

              if (discount.type === 'percentage') {
                discountedMin = priceRange.min * (1 - discount.value / 100);
                discountedMax = priceRange.max * (1 - discount.value / 100);
              } else {
                discountedMin = Math.max(0, priceRange.min - discount.value);
                discountedMax = Math.max(0, priceRange.max - discount.value);
              }

              agentRate = {
                min: Math.round(discountedMin * 100) / 100,
                max: Math.round(discountedMax * 100) / 100,
                currency: '₹',
                discountType: discount.type,
                discountValue: discount.value
              };
            }
          }

          // Count amenities by category (same as getProperties)
          const amenityCategories = property.amenities?.reduce((acc, amenity) => {
            const amenityObj = amenity.amenity || amenity;
            const category = amenityObj?.category;
            if (category) {
              acc[category] = (acc[category] || 0) + 1;
            }
            return acc;
          }, {}) || {};

          // Count total rooms (only available rooms for search results)
          const totalRooms = result.availableRooms?.length || 0;

          // Calculate average rating from reviews
          const avgRating = property.reviews?.length > 0
            ? property.reviews.reduce((sum, review) => sum + review.rating, 0) / property.reviews.length
            : property.avgRating;

          // Return exact same structure as getProperties
          return {
            id: property.id,
            title: property.title,
            description: property.description,
            status: property.status,
            location: property.location,
            coverImage: property.coverImage || property.media?.[0]?.url || null,
            createdAt: property.createdAt,

            // Basic info
            propertyType: property.propertyType?.name || 'Unknown',

            // Rating and reviews
            rating: avgRating,
            reviewCount: property.reviewCount || property.reviews?.length || 0,

            // Images for cards
            images: property.media?.map(m => ({
              id: m.id,
              url: m.url,
              type: m.type
            })) || [],

            // Price range
            priceRange: priceRange ? {
              min: priceRange.min,
              max: priceRange.max,
              currency: '₹'
            } : null,

            // Agent rate (discounted price) - only if agent is approved and has discount
            agentRate: agentRate || null,

            // Room info - only available rooms count
            roomInfo: {
              totalRooms: totalRooms,
              roomTypes: property.roomTypes?.length || 0,
              roomTypeNames: property.roomTypes?.map(rt => rt.roomType?.name).filter(Boolean) || []
            },

            // Amenities summary
            amenities: {
              total: property.amenities?.length || 0,
              categories: amenityCategories,
              categoryCount: Object.keys(amenityCategories).length
            }
          };
        } catch (error) {
          console.error('Error transforming property data in searchProperties:', error);
          return {
            id: property.id,
            title: property.title,
            description: property.description,
            status: property.status,
            location: property.location,
            coverImage: property.coverImage,
            rating: property.avgRating,
            reviewCount: property.reviewCount
          };
        }
      });

      console.log(`\n=== Search Results ===`);
      console.log(`Found ${data.length} available properties`);

      // Return same structure as getProperties (but without pagination since it's search results)
      return res.json({
        success: true,
        data,
        message: data.length > 0
          ? `Found ${data.length} available ${data.length === 1 ? 'property' : 'properties'}`
          : 'No properties match the requested criteria. Please try different dates or reduce the number of guests.',
        // Include search params for reference
        searchParams: {
          checkIn: startDate.toISOString(),
          checkOut: endDate.toISOString(),
          nights,
          guests: {
            adults: need.adults,
            children: need.children,
            infants: need.infants,
            infantsUseBed: need.infantsUseBed
          },
          rooms: need.rooms,
          totalBedsNeeded: needsBedTotal
        }
      });

    } catch (err) {
      console.error('searchProperties:', err);
      return res.status(500).json({
        success: false,
        message: 'Error searching properties',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  }
  ,

  getProperty: async (req, res) => {
    try {
      const { id } = req.params;

      const property = await prisma.property.findFirst({
        where: { id, isDeleted: false },
        include: {
          propertyType: { where: { isDeleted: false } },
          amenities: { where: { isDeleted: false }, include: { amenity: true } },
          facilities: { where: { isDeleted: false }, include: { facility: true } },
          safeties: { where: { isDeleted: false }, include: { safety: true } },
          roomTypes: { where: { isDeleted: false } },
          // rooms: {
          //   where: { isDeleted: false },
          //   include: {
          //     roomType: true,
          //     amenities: { where: { isDeleted: false }, include: { amenity: true } }
          //   }
          // },
          media: { where: { isDeleted: false } },
          ownerHost: true
        }
      });

      if (!property) return res.status(404).json({ success: false, message: 'Property not found' });

      res.json({ success: true, data: property });
    } catch (err) {
      console.error('getProperty:', err);
      res.status(500).json({ success: false, message: 'Error fetching property' });
    }
  },
  getPropertyByOwener: async (req, res) => {
    try {
      const { ownerHostId } = req.params;

      if (!ownerHostId) {
        return res.status(400).json({
          success: false,
          message: 'Owner host ID is required',
        });
      }

      console.log('getPropertyByOwner ownerHostId:', ownerHostId);

      // Security: If user is a host, verify they can only access their own property
      if (req.user?.role === 'host' && req.user?.id && req.user.id !== ownerHostId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only view your own properties.',
        });
      }

      // Use findFirst instead of findUnique (there may be multiple properties per host)
      const property = await prisma.property.findFirst({
        where: {
          ownerHostId: ownerHostId,
          isDeleted: false,
        },
        include: {
          propertyType: { select: { id: true, name: true } },
          cancellationPolicy: {
            select: {
              id: true,
              name: true,
              description: true,
              rules: {
                orderBy: { sortOrder: 'asc' },
                select: {
                  id: true,
                  daysBefore: true,
                  refundPercentage: true,
                  sortOrder: true,
                },
              },
            },
          },
          amenities: {
            where: { isDeleted: false },
            include: {
              amenity: {
                select: {
                  id: true,
                  name: true,
                  category: true,
                  icon: true,
                },
              },
            },
          },
          facilities: {
            where: { isDeleted: false },
            include: {
              facility: {
                select: {
                  id: true,
                  name: true,
                  category: true,
                  icon: true,
                },
              },
            },
          },
          safeties: {
            where: { isDeleted: false },
            include: {
              safety: {
                select: {
                  id: true,
                  name: true,
                  category: true,
                  icon: true,
                },
              },
            },
          },
          roomTypes: {
            where: { isDeleted: false },
            include: {
              roomType: {
                select: {
                  id: true,
                  name: true,
                },
              },
              media: {
                where: { isDeleted: false },
                orderBy: { order: 'asc' },
                select: {
                  id: true,
                  url: true,
                  type: true,
                  isFeatured: true,
                  order: true,
                },
              },
              amenities: {
                where: { isDeleted: false },
                include: {
                  amenity: {
                    select: {
                      id: true,
                      name: true,
                      category: true,
                      icon: true,
                    },
                  },
                },
              },
            },
          },
          media: {
            where: { isDeleted: false },
            orderBy: { order: 'asc' },
            select: {
              id: true,
              url: true,
              type: true,
              isFeatured: true,
              isDeleted: true,
              order: true,
            },
          },
          ownerHost: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              phone: true,
              isVerified: true,
              createdAt: true,
            },
          },
        },
      });

      if (!property) {
        return res.status(404).json({
          success: false,
          message: 'No property found for this host',
        });
      }

      res.json({ success: true, data: property });
    } catch (err) {
      console.error('getPropertyByOwner:', err);
      res.status(500).json({ success: false, message: 'Error fetching properties by owner' });
    }
  },

  updateProperty: async (req, res) => {
    console.log('updateProperty req.body:', req.body);
    console.log('updateProperty req.params:', req.params);
    console.log('updateProperty req.files:', req.files);

    try {
      const { id } = req.params;
      const guard = await ensureNotDeleted(prisma.property, id, 'Property');
      if (guard.error) return res.status(404).json({ success: false, message: guard.error });

      // Parse FormData fields
      const {
        title,
        description,
        rulesAndPolicies,
        status,
        propertyTypeId,
        ownerHostId,
        location,
        amenityIds,
        facilityIds,
        safetyIds,
        roomTypeIds,
        existingMedia,
        coverImageIndex,
        rooms
      } = req.body;

      // Parse arrays and JSON
      const amenityList = normalizeToArray(amenityIds).filter(Boolean);
      const facilityList = normalizeToArray(facilityIds).filter(Boolean);
      const safetyList = normalizeToArray(safetyIds).filter(Boolean);
      const roomTypeList = normalizeToArray(roomTypeIds).filter(Boolean);
      const existingMediaList = normalizeToArray(existingMedia).filter(Boolean);
      const roomsData = normalizeToArray(rooms);

      // Validate required fields
      if (!title?.trim()) {
        return res.status(400).json({ success: false, message: 'Title is required' });
      }

      // Validate owner host exists
      if (ownerHostId) {
        const host = await prisma.host.findUnique({
          where: { id: ownerHostId },
          select: { id: true, isDeleted: true }
        });
        if (!host || host.isDeleted) {
          return res.status(400).json({ success: false, message: 'Invalid ownerHostId' });
        }
      }

      // Validate property type
      if (propertyTypeId) {
        const pt = await prisma.propertyType.findUnique({
          where: { id: propertyTypeId },
          select: { id: true, isDeleted: true }
        });
        if (!pt || pt.isDeleted) {
          return res.status(400).json({ success: false, message: 'Invalid propertyTypeId' });
        }
      }

      // Helper: assert IDs exist
      const mustExist = async (model, ids, label) => {
        if (!ids.length) return;
        const rows = await model.findMany({
          where: { id: { in: ids }, isDeleted: false },
          select: { id: true }
        });
        const ok = new Set(rows.map(r => r.id));
        const missing = [...new Set(ids)].filter(x => !ok.has(x));
        if (missing.length) throw new Error(`Invalid ${label} id(s): ${missing.join(', ')}`);
      };

      await mustExist(prisma.amenity, amenityList, 'amenity');
      await mustExist(prisma.facility, facilityList, 'facility');
      await mustExist(prisma.safetyHygiene, safetyList, 'safety');
      await mustExist(prisma.roomType, roomTypeList, 'roomType');

      // Files
      const filesByField = (req.files || []).reduce((acc, f) => {
        (acc[f.fieldname] ||= []).push(f);
        return acc;
      }, {});
      const newMediaFiles = filesByField['media'] || [];

      // Validate files
      const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
      const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/mov'];
      const maxFileSize = 50 * 1024 * 1024;
      for (const file of newMediaFiles) {
        const okType = allowedImageTypes.includes(file.mimetype) || allowedVideoTypes.includes(file.mimetype);
        if (!okType) return res.status(400).json({ success: false, message: `Invalid file type: ${file.mimetype}. Only images and videos are allowed.` });
        if (file.size > maxFileSize) return res.status(400).json({ success: false, message: `File too large: ${file.originalname}. Maximum size is 50MB.` });
      }

      // Property media: existing + new
      const newPropertyMedia = newMediaFiles.map((f, idx) => {
        const url = fileToUrl(req, f);
        return {
          url,
          type: f.mimetype?.startsWith('image/') ? 'image' : 'video',
          isFeatured: Number(coverImageIndex) === (existingMediaList.length + idx),
          order: existingMediaList.length + idx
        };
      });

      const existingPropertyMedia = existingMediaList.map((url, idx) => ({
        url,
        type: 'image',
        isFeatured: Number(coverImageIndex) === idx && newMediaFiles.length === 0,
        order: idx
      }));

      const allPropertyMedia = [...existingPropertyMedia, ...newPropertyMedia];
      const coverImage = allPropertyMedia.find(m => m.isFeatured)?.url || allPropertyMedia[0]?.url || null;

      // Transaction
      const result = await prisma.$transaction(async (tx) => {
        // Update basic property data
        await tx.property.update({
          where: { id },
          data: {
            title: title?.trim(),
            description: description || null,
            rulesAndPolicies: rulesAndPolicies || null,
            status: status || 'active',
            location: parseJSON(location, null),
            ...(ownerHostId && { ownerHostId }),
            ...(propertyTypeId && { propertyTypeId }),
            coverImage
          }
        });

        // Clear existing relations
        await tx.propertyAmenity.deleteMany({ where: { propertyId: id } });
        await tx.propertyFacility.deleteMany({ where: { propertyId: id } });
        await tx.propertySafety.deleteMany({ where: { propertyId: id } });
        await tx.propertyMedia.deleteMany({ where: { propertyId: id } });

        // Recreate amenities
        if (amenityList.length) {
          await tx.propertyAmenity.createMany({
            data: amenityList.map(amenityId => ({ propertyId: id, amenityId }))
          });
        }

        // Recreate facilities
        if (facilityList.length) {
          await tx.propertyFacility.createMany({
            data: facilityList.map(facilityId => ({ propertyId: id, facilityId }))
          });
        }

        // Recreate safeties
        if (safetyList.length) {
          await tx.propertySafety.createMany({
            data: safetyList.map(safetyId => ({ propertyId: id, safetyId }))
          });
        }

        // Recreate media
        if (allPropertyMedia.length) {
          await tx.propertyMedia.createMany({
            data: allPropertyMedia.map(media => ({ propertyId: id, ...media }))
          });
        }

        // Rooms
        if (roomsData.length) {
          await tx.roomAmenity.deleteMany({ where: { room: { propertyId: id } } });
          await tx.room.deleteMany({ where: { propertyId: id } });

          for (const [index, roomDataRaw] of roomsData.entries()) {
            const roomData = typeof roomDataRaw === 'string' ? parseJSON(roomDataRaw, {}) : (roomDataRaw || {});
            if (!roomData.roomTypeId) throw new Error(`rooms[${index}].roomTypeId is required`);

            // Images
            const newRoomImages = filesByField[`rooms[${index}][newImages]`] || [];
            const existingRoomImages = normalizeToArray(roomData.existingImages || []);

            for (const file of newRoomImages) {
              if (!allowedImageTypes.includes(file.mimetype)) throw new Error(`Invalid room image type: ${file.mimetype} for room ${index + 1}`);
              if (file.size > maxFileSize) throw new Error(`Room image too large for room ${index + 1}: ${file.originalname}`);
            }

            const uploadedRoomImages = newRoomImages.map((f, idx) => ({
              url: fileToUrl(req, f),
              isFeatured: idx === 0 && existingRoomImages.length === 0,
              caption: `Room Image ${idx + 1}`,
              order: idx
            }));

            const existingRoomImagesData = existingRoomImages.map((url, idx) => ({
              url,
              isFeatured: idx === 0 && uploadedRoomImages.length === 0,
              caption: `Room Image ${uploadedRoomImages.length + idx + 1}`,
              order: uploadedRoomImages.length + idx
            }));

            const allRoomImages = [...uploadedRoomImages, ...existingRoomImagesData];

            const room = await tx.room.create({
              data: {
                propertyId: id,
                roomTypeId: roomData.roomTypeId,
                name: roomData.name || `Room ${index + 1}`,
                code: roomData.code || null,
                spaceSqft: roomData.spaceSqft ? parseInt(roomData.spaceSqft, 10) : null,
                maxOccupancy: roomData.maxOccupancy ? parseInt(roomData.maxOccupancy, 10) : 2,
                price: roomData.price ? Number(roomData.price) : 0,
                images: allRoomImages,
                status: roomData.status || 'active',
              }
            });

            const roomAmenityIds = normalizeToArray(roomData.amenityIds || []);
            if (roomAmenityIds.length) {
              await tx.roomAmenity.createMany({
                data: Array.from(new Set(roomAmenityIds)).map(amenityId => ({ roomId: room.id, amenityId }))
              });
            }
          }
        }

        // ✅ Return updated property with relations (correct include usage)
        return await tx.property.findFirst({
          where: {
            id,
            isDeleted: false,
            // filter to-one relations here
            ...(propertyTypeId ? { propertyType: { is: { isDeleted: false } } } : {}),
            ...(ownerHostId ? { ownerHost: { is: { isDeleted: false } } } : {}),
          },
          include: {
            propertyType: true,
            ownerHost: true,

            amenities: {
              where: { isDeleted: false, amenity: { is: { isDeleted: false } } },
              include: { amenity: true }
            },
            facilities: {
              where: { isDeleted: false, facility: { is: { isDeleted: false } } },
              include: { facility: true }
            },
            safeties: {
              where: { isDeleted: false, safety: { is: { isDeleted: false } } },
              include: { safety: true }
            },

            roomTypes: { where: { isDeleted: false } },

            rooms: {
              where: { isDeleted: false, roomType: { is: { isDeleted: false } } },
              include: {
                roomType: true, // to-one => no where here
                amenities: {
                  where: { isDeleted: false, amenity: { is: { isDeleted: false } } },
                  include: { amenity: true }
                }
              }
            },

            media: { where: { isDeleted: false } }
          }
        });
      });

      res.json({ success: true, message: 'Property updated successfully', data: result });
    } catch (err) {
      console.error('updateProperty:', err);
      res.status(500).json({
        success: false,
        message: err.message || 'Error updating property',
        error: process.env.NODE_ENV === 'development' ? err.stack : undefined
      });
    }
  },


  deleteProperty: async (req, res) => {
    try {
      const { id } = req.params;
      const guard = await ensureNotDeleted(prisma.property, id, 'Property');
      if (guard.error) return res.status(404).json({ success: false, message: guard.error });
      await prisma.property.update({ where: { id }, data: { isDeleted: true } });
      res.json({ success: true, message: 'Property deleted' });
    } catch (err) {
      console.error('deleteProperty:', err);
      res.status(500).json({ success: false, message: 'Error deleting property' });
    }
  },

  // ========== ROOMS ==========
  addRooms: async (req, res) => {
    const { propertyId } = req.params;

    console.log('addRooms req.body:', req.body);

    if (!propertyId) {
      return res.status(400).json({ success: false, message: 'propertyId is required' });
    }

    // Expect array of room configurations
    const roomConfigs = req.body;

    console.log('roomConfigs:', roomConfigs);

    if (!Array.isArray(roomConfigs) || roomConfigs.length === 0) {
      return res.status(400).json({ success: false, message: 'Room configurations array is required' });
    }

    try {
      // ✅ Check property exists
      const property = await prisma.property.findFirst({
        where: { id: propertyId, isDeleted: false },
      });
      if (!property) {
        return res.status(404).json({ success: false, message: 'Property not found' });
      }

      // ✅ Validate all room configurations
      for (const config of roomConfigs) {
        const { propertyRoomTypeId, namePrefix, roomCount, fromDate, toDate } = config;

        if (!propertyRoomTypeId) {
          return res.status(400).json({ success: false, message: 'propertyRoomTypeId is required for all configurations' });
        }
        if (!namePrefix?.trim()) {
          return res.status(400).json({ success: false, message: 'namePrefix is required for all configurations' });
        }
        if (!roomCount || roomCount < 1 || roomCount > 50) {
          return res.status(400).json({ success: false, message: 'roomCount must be between 1 and 50' });
        }
        // ✅ Date validation not needed for room creation
        // Rooms are available by default, no need for date ranges

        // ✅ Check room type exists for this property
        const propertyRoomType = await prisma.propertyRoomType.findFirst({
          where: { id: propertyRoomTypeId, propertyId, isDeleted: false },
        });
        if (!propertyRoomType) {
          return res.status(404).json({ success: false, message: `Property room type not found: ${propertyRoomTypeId}` });
        }
      }

      // ✅ Create rooms for each configuration
      const createdRooms = [];

      for (const config of roomConfigs) {
        const { propertyRoomTypeId, namePrefix, roomCount } = config;

        // Create multiple rooms for this room type
        for (let i = 1; i <= roomCount; i++) {
          const roomName = `${namePrefix.trim()} ${i}`;

          // ✅ Create room
          const newRoom = await prisma.room.create({
            data: {
              propertyRoomTypeId,
              name: roomName,
              status: 'active',
            }
          });

          createdRooms.push(newRoom);

          // ✅ No need to create availability records
          // Rooms are available by default
          // Only create records when they become unavailable (booked/blocked)
        }
      }

      const totalRooms = createdRooms.length;

      return res.status(201).json({
        success: true,
        message: `Successfully created ${totalRooms} rooms (all available by default)`,
        data: {
          totalRooms,
          roomConfigs: roomConfigs.map(config => ({
            roomTypeId: config.propertyRoomTypeId,
            namePrefix: config.namePrefix,
            roomCount: config.roomCount,
          })),
          createdRooms: createdRooms.map(room => ({
            id: room.id,
            name: room.name,
            propertyRoomTypeId: room.propertyRoomTypeId,
          }))
        },
      });
    } catch (err) {
      console.error('addRooms:', err);
      return res.status(500).json({
        success: false,
        message: 'Error creating rooms',
        error: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      });
    }
  },

  updateRooms: async (req, res) => {
    const { propertyId } = req.params;

    console.log('updateRooms req.body:', req.body);

    if (!propertyId) {
      return res.status(400).json({ success: false, message: 'propertyId is required' });
    }

    // Expect array of room configurations
    const roomConfigs = req.body;

    if (!Array.isArray(roomConfigs) || roomConfigs.length === 0) {
      return res.status(400).json({ success: false, message: 'Room configurations array is required' });
    }

    try {
      // ✅ Check property exists
      const property = await prisma.property.findFirst({
        where: { id: propertyId, isDeleted: false },
      });
      if (!property) {
        return res.status(404).json({ success: false, message: 'Property not found' });
      }

      // ✅ Validate all room configurations
      for (const config of roomConfigs) {
        const { propertyRoomTypeId, namePrefix, roomCount } = config;

        if (!propertyRoomTypeId) {
          return res.status(400).json({ success: false, message: 'propertyRoomTypeId is required for all configurations' });
        }
        if (!namePrefix?.trim()) {
          return res.status(400).json({ success: false, message: 'namePrefix is required for all configurations' });
        }
        if (!roomCount || roomCount < 1 || roomCount > 50) {
          return res.status(400).json({ success: false, message: 'roomCount must be between 1 and 50' });
        }
        // ✅ Date validation removed - rooms are available by default

        // ✅ Check room type exists for this property
        const propertyRoomType = await prisma.propertyRoomType.findFirst({
          where: { id: propertyRoomTypeId, propertyId, isDeleted: false },
        });
        if (!propertyRoomType) {
          return res.status(404).json({ success: false, message: `Property room type not found: ${propertyRoomTypeId}` });
        }
      }

      // ✅ Process each room type configuration
      const updateResults = [];

      for (const config of roomConfigs) {
        const { propertyRoomTypeId, namePrefix, roomCount } = config;

        // ✅ Get existing rooms for this room type
        const existingRooms = await prisma.room.findMany({
          where: {
            propertyRoomTypeId,
            isDeleted: false
          },
          orderBy: { name: 'asc' }
        });

        const existingCount = existingRooms.length;
        const newCount = roomCount;
        // ✅ No date range needed - rooms are available by default

        // ✅ Handle room count changes
        if (newCount > existingCount) {
          // Create additional rooms
          for (let i = existingCount + 1; i <= newCount; i++) {
            const roomName = `${namePrefix.trim()} ${i}`;

            const newRoom = await prisma.room.create({
              data: {
                propertyRoomTypeId,
                name: roomName,
                status: 'active',
              }
            });

            // ✅ No need to create availability records - room is available by default
          }
        } else if (newCount < existingCount) {
          // Delete excess rooms
          const roomsToDelete = existingRooms.slice(newCount);
          const roomIdsToDelete = roomsToDelete.map(room => room.id);

          // Soft delete rooms
          await prisma.room.updateMany({
            where: { id: { in: roomIdsToDelete } },
            data: { isDeleted: true }
          });

          // ✅ No need to delete availability records - they don't exist by default
        }

        // ✅ Handle room name changes (rename existing rooms)
        const roomsToUpdate = existingRooms.slice(0, Math.min(existingCount, newCount));
        for (let i = 0; i < roomsToUpdate.length; i++) {
          const room = roomsToUpdate[i];
          const newRoomName = `${namePrefix.trim()} ${i + 1}`;

          if (room.name !== newRoomName) {
            await prisma.room.update({
              where: { id: room.id },
              data: { name: newRoomName }
            });
          }
        }

        // ✅ No need to handle availability date changes - rooms are available by default

        // ✅ Collect results
        const finalRooms = await prisma.room.findMany({
          where: {
            propertyRoomTypeId,
            isDeleted: false
          }
        });

        updateResults.push({
          roomTypeId: propertyRoomTypeId,
          namePrefix,
          roomCount: finalRooms.length,
          rooms: finalRooms.map(room => ({
            id: room.id,
            name: room.name
          }))
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Rooms updated successfully',
        data: {
          updateResults,
          summary: {
            totalRoomTypes: updateResults.length,
            totalRooms: updateResults.reduce((sum, result) => sum + result.roomCount, 0)
          }
        },
      });
    } catch (err) {
      console.error('updateRooms:', err);
      return res.status(500).json({
        success: false,
        message: 'Error updating rooms',
        error: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      });
    }
  },

  getRoomConfigurations: async (req, res) => {
    const { propertyId } = req.params;

    try {
      // Get all property room types with their rooms and availability
      const propertyRoomTypes = await prisma.propertyRoomType.findMany({
        where: {
          propertyId,
          isDeleted: false
        },
        include: {
          roomType: true,
          rooms: {
            where: { isDeleted: false },
            include: {
              availability: {
                where: { isDeleted: false },
                orderBy: { date: 'asc' }
              }
            },
            orderBy: { name: 'asc' }
          }
        }
      });

      // Transform data to match frontend format
      const roomConfigurations = propertyRoomTypes.map(prt => {
        const rooms = prt.rooms;
        if (rooms.length === 0) {
          return {
            propertyRoomTypeId: prt.id,
            namePrefix: prt.roomType.name,
            roomCount: 0,
            fromDate: null,
            toDate: null,
            hasRooms: false
          };
        }

        // Get date range from availability
        const allDates = rooms.flatMap(room =>
          room.availability.map(av => av.date.toISOString().split('T')[0])
        );

        const uniqueDates = [...new Set(allDates)].sort();
        const fromDate = uniqueDates[0] || null;
        const toDate = uniqueDates[uniqueDates.length - 1] || null;

        // Extract name prefix (remove numbers)
        const namePrefix = rooms[0]?.name.replace(/\s+\d+$/, '') || prt.roomType.name;

        return {
          propertyRoomTypeId: prt.id,
          namePrefix,
          roomCount: rooms.length,
          fromDate,
          toDate,
          hasRooms: true,
          rooms: rooms.map(room => ({
            id: room.id,
            name: room.name,
            availabilityCount: room.availability.length
          }))
        };
      });

      return res.status(200).json({
        success: true,
        data: roomConfigurations
      });

    } catch (err) {
      console.error('getRoomConfigurations error:', err);
      return res.status(500).json({
        success: false,
        message: 'Error fetching room configurations',
        error: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      });
    }
  },

  getRooms: async (req, res) => {
    try {
      const { propertyId } = req.params;
      const rooms = await prisma.room.findMany({
        where: { propertyId, isDeleted: false },
        include: {
          roomType: true,
          amenities: { where: { isDeleted: false }, include: { amenity: true } }
        },
        orderBy: { name: 'asc' }
      });
      res.json({ success: true, data: rooms });
    } catch (err) {
      console.error('getRooms:', err);
      res.status(500).json({ success: false, message: 'Error fetching rooms' });
    }
  },

  updateRoom: async (req, res) => {
    try {
      const { id } = req.params;
      const guard = await ensureNotDeleted(prisma.room, id, 'Room');
      if (guard.error) return res.status(404).json({ success: false, message: guard.error });

      const room = await prisma.room.update({
        where: { id },
        data: req.body,
        include: {
          roomType: true,
          amenities: { where: { isDeleted: false }, include: { amenity: true } }
        }
      });

      res.json({ success: true, message: 'Room updated', data: room });
    } catch (err) {
      console.error('updateRoom:', err);
      res.status(500).json({ success: false, message: 'Error updating room' });
    }
  },

  deleteRoom: async (req, res) => {
    try {
      const { id } = req.params;
      const guard = await ensureNotDeleted(prisma.room, id, 'Room');
      if (guard.error) return res.status(404).json({ success: false, message: guard.error });

      await prisma.room.update({ where: { id }, data: { isDeleted: true } });
      res.json({ success: true, message: 'Room deleted' });
    } catch (err) {
      console.error('deleteRoom:', err);
      res.status(500).json({ success: false, message: 'Error deleting room' });
    }
  },
  getPropertyRoomtype: async (req, res) => {
    try {
      const { propertyId } = req.params;
      if (!propertyId) {
        return res.status(400).json({ success: false, message: 'propertyId is required' });
      }

      const rows = await prisma.propertyRoomType.findMany({
        where: {
          propertyId,
          isDeleted: false,
        },
        include: {
          roomType: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'asc' },
      });

      // Map to the shape your UI expects
      const data = rows.map(rt => ({
        propertyRoomTypeId: rt.id,                  // <-- this is what you’ll send back to apply special rates
        roomTypeId: rt.roomTypeId,
        propertyId: rt.propertyId,
        name: rt.roomType?.name ?? 'Unnamed',       // used in your UI to match by name
        basePrice: Number(rt.basePrice),            // Prisma Decimal -> number
        isActive: rt.isActive,
      }));

      return res.json({ success: true, data });
    } catch (err) {
      console.error('getPropertyRoomTypes error:', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
};

// ========== HELPER FUNCTIONS ==========

// Generate array of dates between fromDate and toDate
const generateDateRange = (fromDate, toDate) => {
  const dates = [];
  const startDate = new Date(fromDate);
  const endDate = new Date(toDate);
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dates;
};

// Create availability records for a room
const createAvailabilityForRoom = async (roomId, dateRange) => {
  const availabilities = dateRange.map(date => ({
    roomId,
    date: new Date(date),
    minNights: 1,
    status: 'available',
    isDeleted: false,
  }));

  await prisma.availability.createMany({
    data: availabilities,
    skipDuplicates: true,
  });
};

// Update availability for a room (add/remove dates as needed)
const updateRoomAvailability = async (roomId, newDateRange) => {
  // Get existing availability dates
  const existingAvailability = await prisma.availability.findMany({
    where: {
      roomId,
      isDeleted: false
    },
    orderBy: { date: 'asc' }
  });

  const existingDates = existingAvailability.map(av =>
    av.date.toISOString().split('T')[0]
  );

  const newDates = newDateRange.map(date =>
    date.toISOString().split('T')[0]
  );

  // Find dates to delete (exist in DB but not in new range)
  const datesToDelete = existingDates.filter(date => !newDates.includes(date));

  // Find dates to add (exist in new range but not in DB)
  const datesToAdd = newDates.filter(date => !existingDates.includes(date));

  // Soft delete removed dates
  if (datesToDelete.length > 0) {
    const deleteDateObjects = datesToDelete.map(date => new Date(date));
    await prisma.availability.updateMany({
      where: {
        roomId,
        date: { in: deleteDateObjects },
        isDeleted: false
      },
      data: { isDeleted: true }
    });
  }

  // Add new dates
  if (datesToAdd.length > 0) {
    const newAvailabilityRecords = datesToAdd.map(date => ({
      roomId,
      date: new Date(date),
      minNights: 1,
      status: 'available',
      isDeleted: false,
    }));

    await prisma.availability.createMany({
      data: newAvailabilityRecords,
      skipDuplicates: true,
    });
  }
};

module.exports = PropertyController;
