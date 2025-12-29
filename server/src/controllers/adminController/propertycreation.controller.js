const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { requireAdmin, requireAdminOrHost } = require('../../utils/auth.utils');

// Your existing date utils
const dayUTC = (dateStr) => {
  const d = new Date(dateStr);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};

const diffNights = (start, end) => {
  const a = dayUTC(start);
  const b = dayUTC(end);
  return Math.ceil((b - a) / (1000 * 60 * 60 * 24));
};

const eachDateUTC = (start, end) => {
  const dates = [];
  const curr = dayUTC(start);
  const last = dayUTC(end);
  while (curr < last) {
    dates.push(new Date(curr));
    curr.setUTCDate(curr.getUTCDate() + 1);
  }
  return dates;
};

// Controller-specific utils
const addDaysUtc = (date, days) => {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
};

const safeJSON = (input, defaultValue) => {
  if (input === undefined || input === null) return defaultValue;
  if (Array.isArray(input)) return input;
  try {
    return typeof input === 'string' ? JSON.parse(input) : input;
  } catch {
    return defaultValue;
  }
};

const validateNumber = (value, fieldName, min = 0) => {
  const num = Number(value);
  if (isNaN(num) || num < min) {
    throw new Error(`Invalid ${fieldName}: Must be a number ≥ ${min}`);
  }
  return num;
};

// Constants
const DAYS_TO_SEED = 365;
const MAX_TRANSACTION_WAIT = 30000;
const MAX_TRANSACTION_TIMEOUT = 120000;

const propertyCreation = {
  /**
   * Create a new property with all related data
   */
  createProperty: async (req, res) => {
    // Authorization: Only Admin can create properties
    const authError = requireAdmin(req.user, res);
    if (authError) return;

    try {
      const {
        title,
        description,
        rulesAndPolicies,
        status = 'active',
        propertyTypeId,
        ownerHostId,
        location,
        amenityIds,
        facilityIds,
        safetyIds,
        cancellationPolicyId,
        commissionPercentage,
        taxSlabs,
        cessRate,
      } = req.body;

      // Validate required fields
      if (!title?.trim()) {
        return res.status(400).json({ 
          success: false, 
          message: 'Property title is required' 
        });
      }

      // Parse and validate location
      let locationData;
      try {
        locationData = typeof location === 'string' ? JSON.parse(location) : location;
      } catch (err) {
        return res.status(400).json({
          success: false,
          message: 'Invalid location data format'
        });
      }

      if (!locationData?.address || !locationData?.coordinates) {
        return res.status(400).json({
          success: false,
          message: 'Location must include address and coordinates'
        });
      }

      // Parse and filter IDs
      const amenityList = safeJSON(amenityIds, []).filter(id => 
        id && typeof id === 'string' && id.trim()
      );
      const facilityList = safeJSON(facilityIds, []).filter(id => 
        id && typeof id === 'string' && id.trim()
      );
      const safetyList = safeJSON(safetyIds, []).filter(id => 
        id && typeof id === 'string' && id.trim()
      );

      // Handle city icon file if uploaded (part of location data)
      const filesByField = (req.files || []).reduce((acc, f) => {
        (acc[f.fieldname] ||= []).push(f);
        return acc;
      }, {});
      
      const cityIconFile = filesByField['cityIcon']?.[0] || null;
      
      // Add city icon to location data if uploaded
      if (cityIconFile) {
        // Validate it's an SVG file
        if (!cityIconFile.mimetype || (cityIconFile.mimetype !== 'image/svg+xml' && !cityIconFile.originalname?.endsWith('.svg'))) {
          return res.status(400).json({
            success: false,
            message: 'City icon must be an SVG file'
          });
        }
        // Validate file size (2MB limit)
        const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB in bytes
        if (cityIconFile.size && cityIconFile.size > MAX_FILE_SIZE) {
          return res.status(400).json({
            success: false,
            message: 'City icon file size must be less than 2MB'
          });
        }
        // Get the file URL from multer
        const cityIconUrl = cityIconFile.url || `/uploads/${cityIconFile.subdirectory || 'images'}/${cityIconFile.filename}`;
        // Add city icon to location data
        locationData.cityIcon = cityIconUrl;
      }

      // Validate foreign keys exist
      const mustExist = async (model, ids, label) => {
        if (!ids.length) return;
        const rows = await model.findMany({ 
          where: { id: { in: ids }, isDeleted: false }, 
          select: { id: true } 
        });
        const foundIds = new Set(rows.map(r => r.id));
        const missing = ids.filter(id => !foundIds.has(id));
        if (missing.length) {
          throw new Error(`${label} not found: ${missing.join(', ')}`);
        }
      };

      const trimmedCancellationPolicyId = typeof cancellationPolicyId === 'string' ? cancellationPolicyId.trim() : null;

      // Validate property type
      if (propertyTypeId) {
        const propertyType = await prisma.propertyType.findFirst({ 
          where: { id: propertyTypeId, isDeleted: false }, 
          select: { id: true } 
        });
        if (!propertyType) {
          return res.status(404).json({ 
            success: false, 
            message: 'Property type not found' 
          });
        }
      }

      if (trimmedCancellationPolicyId) {
        const policy = await prisma.cancellationPolicy.findFirst({
          where: { id: trimmedCancellationPolicyId, isDeleted: false },
          select: { id: true },
        });

        if (!policy) {
          return res.status(404).json({
            success: false,
            message: 'Cancellation policy not found',
          });
        }
      }


      let host;
      // Validate owner host
      if (ownerHostId) {
        host = await prisma.host.findFirst({ 
          where: { email: ownerHostId, isDeleted: false }, 
          select: { id: true } 
        });
        if (!host) {
          return res.status(404).json({ 
            success: false, 
            message: 'Owner host not found' 
          });
        }
      }

      // Validate all related entities
      await mustExist(prisma.amenity, amenityList, 'Amenity');
      await mustExist(prisma.facility, facilityList, 'Facility');
      await mustExist(prisma.safetyHygiene, safetyList, 'Safety hygiene');

      // Validate commission percentage if provided
      let commissionPercentageValue = null;
      if (commissionPercentage !== undefined && commissionPercentage !== null && commissionPercentage !== '') {
        const commissionNum = parseFloat(commissionPercentage);
        if (isNaN(commissionNum) || commissionNum < 0 || commissionNum > 100) {
          return res.status(400).json({
            success: false,
            message: 'Commission percentage must be a number between 0 and 100'
          });
        }
        commissionPercentageValue = commissionNum;
      }

      // Validate and parse tax slabs if provided
      let taxSlabsValue = null;
      if (taxSlabs !== undefined && taxSlabs !== null && taxSlabs !== '') {
        let parsedTaxSlabs;
        try {
          parsedTaxSlabs = typeof taxSlabs === 'string' ? JSON.parse(taxSlabs) : taxSlabs;
        } catch (err) {
          return res.status(400).json({
            success: false,
            message: 'Invalid taxSlabs format. Expected a valid JSON array.'
          });
        }

        if (!Array.isArray(parsedTaxSlabs)) {
          return res.status(400).json({
            success: false,
            message: 'taxSlabs must be an array'
          });
        }

        if (parsedTaxSlabs.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'taxSlabs array cannot be empty. At least one tax slab is required.'
          });
        }

        // Validate each tax slab
        for (let i = 0; i < parsedTaxSlabs.length; i++) {
          const slab = parsedTaxSlabs[i];
          
          if (!slab || typeof slab !== 'object') {
            return res.status(400).json({
              success: false,
              message: `Tax slab at index ${i} must be an object`
            });
          }

          // Validate min
          if (typeof slab.min !== 'number' || slab.min < 0 || !Number.isInteger(slab.min)) {
            return res.status(400).json({
              success: false,
              message: `Tax slab at index ${i}: min must be a non-negative integer`
            });
          }

          // Validate max (can be null or number)
          if (slab.max !== null && (typeof slab.max !== 'number' || slab.max < slab.min || !Number.isInteger(slab.max))) {
            return res.status(400).json({
              success: false,
              message: `Tax slab at index ${i}: max must be null or an integer >= min`
            });
          }

          // Validate rate
          if (typeof slab.rate !== 'number' || slab.rate < 0 || slab.rate > 100) {
            return res.status(400).json({
              success: false,
              message: `Tax slab at index ${i}: rate must be a number between 0 and 100`
            });
          }

          // Check for gaps or overlaps with previous slab
          if (i > 0) {
            const prevSlab = parsedTaxSlabs[i - 1];
            const prevMax = prevSlab.max === null ? Infinity : prevSlab.max;
            
            if (slab.min > prevMax + 1) {
              return res.status(400).json({
                success: false,
                message: `Tax slab at index ${i}: gap detected. min (${slab.min}) should be <= ${prevMax + 1}`
              });
            }
            
            if (slab.min <= prevMax && prevSlab.max !== null) {
              return res.status(400).json({
                success: false,
                message: `Tax slab at index ${i}: overlap detected with previous slab. min (${slab.min}) should be > ${prevMax}`
              });
            }
          }
        }

        taxSlabsValue = parsedTaxSlabs;
      }

      // Validate CESS rate if provided
      let cessRateValue = null;
      if (cessRate !== undefined && cessRate !== null && cessRate !== '') {
        const cessNum = parseFloat(cessRate);
        if (isNaN(cessNum) || cessNum < 0 || cessNum > 100) {
          return res.status(400).json({
            success: false,
            message: 'CESS rate must be a number between 0 and 100'
          });
        }
        cessRateValue = cessNum;
      }

      // Main transaction
      const result = await prisma.$transaction(async (tx) => {
        // 1. Create basic property
        const property = await tx.property.create({
          data: {
            title: title.trim(),
            description: description?.trim() || null,
            rulesAndPolicies: rulesAndPolicies?.trim() || null,
            status,
            propertyTypeId: propertyTypeId || null,
            ownerHostId: host.id || null,
            location: locationData,
            cancellationPolicyId: trimmedCancellationPolicyId,
            commissionPercentage: commissionPercentageValue,
            taxSlabs: taxSlabsValue,
            cessRate: cessRateValue,
          },
          select: { id: true }
        });


        // 2. Create relations in parallel
        const relationPromises = [];

        // Amenities
        if (amenityList.length) {
          relationPromises.push(
            tx.propertyAmenity.createMany({
              data: amenityList.map(amenityId => ({
                propertyId: property.id,
                amenityId
              })),
              skipDuplicates: true
            })
          );
        }

        // Facilities
        if (facilityList.length) {
          relationPromises.push(
            tx.propertyFacility.createMany({
              data: facilityList.map(facilityId => ({
                propertyId: property.id,
                facilityId
              })),
              skipDuplicates: true
            })
          );
        }

        // Safety items
        if (safetyList.length) {
          relationPromises.push(
            tx.propertySafety.createMany({
              data: safetyList.map(safetyId => ({
                propertyId: property.id,
                safetyId
              })),
              skipDuplicates: true
            })
          );
        }


        // Wait for all parallel operations
        await Promise.all(relationPromises);

        // Return property for response
        return property;
      }, {
        maxWait: MAX_TRANSACTION_WAIT,
        timeout: MAX_TRANSACTION_TIMEOUT,
      });


      return res.status(201).json({
        success: true,
        message: 'Property created successfully. Add images and room types in the edit page.',
        data: {
          id: result.id,
          property: result
        },
      });

    } catch (error) {
      console.error('Property creation error:', error);

      // Handle specific error cases
      if (error.code === 'P2028') {
        return res.status(408).json({
          success: false,
          message: 'Operation timed out. Please try with fewer room types or contact support.',
        });
      }

      if (error.message?.includes('not found')) {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }

      if (error.message?.includes('Invalid')) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      if (error.code === 'P2002') {
        return res.status(409).json({
          success: false,
          message: 'Property with similar details already exists.',
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Internal server error while creating property',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  },

  /**
   * Get property creation form data (amenities, facilities, etc.)
   */
  getCreationFormData: async (req, res) => {
    // Authorization: Admin and Host can access form data (for dropdowns)
    const authError = requireAdminOrHost(req.user, res);
    if (authError) return;

    try {
      const [
        amenities,
        facilities,
        safetyHygiene,
        roomTypes,
        propertyTypes,
        cancellationPolicies
      ] = await Promise.all([
        prisma.amenity.findMany({ where: { isDeleted: false } }),
        prisma.facility.findMany({ where: { isDeleted: false } }),
        prisma.safetyHygiene.findMany({ where: { isDeleted: false } }),
        prisma.roomType.findMany({ where: { isDeleted: false } }),
        prisma.propertyType.findMany({ where: { isDeleted: false } }),
        prisma.cancellationPolicy.findMany({ where: { isDeleted: false } })
      ]);

      return res.json({
        success: true,
        data: {
          amenities,
          facilities,
          safetyHygiene,
          roomTypes,
          propertyTypes,
          cancellationPolicies
        }
      });
    } catch (error) {
      console.error('Error fetching form data:', error);
      return res.status(500).json({
        success: false,
        message: 'Error loading property creation form data'
      });
    }
  }
};

module.exports = propertyCreation;

// The error "Unique constraint failed on the constraint: Property_title_isDeleted_key" means you are trying to create a property with a title that already exists and is not marked as deleted.
// Your Prisma schema has: @@unique([title, isDeleted]) on Property.
// This means you cannot have two properties with the same title where isDeleted = false.
// To fix: Use a unique title for each property, or set isDeleted = true for the old property before creating a new one with the same title.