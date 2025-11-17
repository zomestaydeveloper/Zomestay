const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { requireAdmin, requireAdminOrHost } = require('../../utils/auth.utils');
const { validatePropertyImages, validateRoomTypeImages } = require('../../utils/imageValidation.utils');

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
        roomtypes,
        cancellationPolicyId,
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

      // Parse and validate room types
      const roomTypesRaw = safeJSON(roomtypes, []);

      const roomTypeAmenityIdSet = new Set();

      const roomTypeList = (Array.isArray(roomTypesRaw) ? roomTypesRaw : [])
        .map((rt) => {
          if (!rt || typeof rt !== 'object') return null;

          const normalisedRoomTypeId =
            typeof rt.roomTypeId === 'string' ? rt.roomTypeId.trim() : '';

          const normalisedAmenityIds = Array.isArray(rt.amenityIds)
            ? rt.amenityIds
                .map((amenity) => {
                  if (!amenity) return null;
                  if (typeof amenity === 'string') {
                    return amenity.trim();
                  }
                  if (typeof amenity === 'object') {
                    const candidate = amenity.id || amenity.value || amenity.amenityId;
                    return typeof candidate === 'string' ? candidate.trim() : null;
                  }
                  return null;
                })
                .filter((id) => id && id.length > 0)
            : [];

          normalisedAmenityIds.forEach((id) => roomTypeAmenityIdSet.add(id));

          return {
            ...rt,
            roomTypeId: normalisedRoomTypeId,
            amenityIds: normalisedAmenityIds,
          };
        })
        .filter((rt) => {
          if (!rt) return false;
          if (!rt.roomTypeId) return false;
          const hasOccupancy =
            rt.Occupancy !== undefined &&
            rt.Occupancy !== null &&
            !Number.isNaN(Number(rt.Occupancy));
          const hasExtraBeds =
            rt.extraBedCapacity !== undefined &&
            rt.extraBedCapacity !== null &&
            !Number.isNaN(Number(rt.extraBedCapacity));
          return hasOccupancy && hasExtraBeds;
        });

      // Validate file uploads
      const filesByField = (req.files || []).reduce((acc, f) => {
        (acc[f.fieldname] ||= []).push(f);
        return acc;
      }, {});
      const mediaFiles = filesByField['media'] || [];
      
      // Handle city icon file if uploaded
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
        // Get the file URL from multer
        const cityIconUrl = cityIconFile.url || `/uploads/${cityIconFile.subdirectory || 'images'}/${cityIconFile.filename}`;
        // Add city icon to location data
        locationData.cityIcon = cityIconUrl;
      }

      // Validate property images (size, type, aspect ratio)
      const propertyImageValidation = await validatePropertyImages(mediaFiles);
      if (!propertyImageValidation.valid) {
        return res.status(400).json({
          success: false,
          message: 'Property image validation failed',
          errors: propertyImageValidation.errors
        });
      }

      // Validate room type images
      for (const [index, rt] of roomTypeList.entries()) {
        const roomTypeImageFiles = filesByField[`roomTypeImages_${index}`] || [];
        if (roomTypeImageFiles.length > 0) {
          const roomTypeImageValidation = await validateRoomTypeImages(roomTypeImageFiles);
          if (!roomTypeImageValidation.valid) {
            return res.status(400).json({
              success: false,
              message: `Room type ${index + 1} image validation failed`,
              errors: roomTypeImageValidation.errors
            });
          }
        }
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
      const roomTypeAmenityList = Array.from(roomTypeAmenityIdSet);
      if (roomTypeAmenityList.length) {
        await mustExist(prisma.amenity, roomTypeAmenityList, 'Room type amenity');
      }
      await mustExist(prisma.roomType, roomTypeList.map(rt => rt.roomTypeId), 'RoomType');

      // Validate meal plans
      const mealPlanIds = Array.from(new Set(
        roomTypeList.flatMap(rt => 
          Array.isArray(rt.mealPlans) ? rt.mealPlans.map(mp => mp.mealPlanId).filter(Boolean) : []
        )
      ));
      if (mealPlanIds.length) {
        await mustExist(prisma.mealPlan, mealPlanIds, 'MealPlan');
      }

      let coverImageUrl = null;

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

        // Media files
        if (mediaFiles.length) {
          relationPromises.push(
            tx.propertyMedia.createMany({
              data: mediaFiles.map((file, idx) => {
                const fileUrl =
                  file.url || `/uploads/images/${file.filename}`;
                if (idx === 0) {
                  coverImageUrl = fileUrl;
                }
                return {
                  propertyId: property.id,
                  url: fileUrl,
                  type: file.mimetype.startsWith('image') ? 'image' : 'video',
                  isFeatured: idx === 0,
                  order: idx,
                };
              }),
            })
          );
        }

        // Wait for all parallel operations
        await Promise.all(relationPromises);

        if (coverImageUrl) {
          await tx.property.update({
            where: { id: property.id },
            data: { coverImage: coverImageUrl },
          });
        }

        // 3. Create room types with amenities and images
        const createdRoomTypes = [];
        if (roomTypeList.length) {
          for (const [index, rt] of roomTypeList.entries()) {
            const occupancyValue = validateNumber(
              rt.occupancy ?? rt.Occupancy ?? 2,
              'occupancy',
              1
            );
            const extraBedCapacityValue = validateNumber(
              rt.extraBedCapacity ?? 0,
              'extraBedCapacity',
              0
            );
            const minOccupancyValue = validateNumber(
              rt.minOccupancy ?? 1,
              'minOccupancy',
              1
            );
            const numberOfBedsValue = validateNumber(
              rt.numberOfBeds ?? occupancyValue ?? 1,
              'numberOfBeds',
              1
            );
            const maxOccupancy = occupancyValue + extraBedCapacityValue;

            const roomTypeData = {
              propertyId: property.id,
              roomTypeId: rt.roomTypeId,           
              Occupancy: occupancyValue,
              extraBedCapacity: extraBedCapacityValue,
              minOccupancy: minOccupancyValue,
              maxOccupancy: maxOccupancy,
              numberOfBeds: numberOfBedsValue,
              bedType: rt.bedType || 'DOUBLE',
            };

            const createdRoomType = await tx.propertyRoomType.create({
              data: roomTypeData,
            });

            createdRoomTypes.push(createdRoomType);

            // Handle room type amenities
            if (rt.amenityIds && Array.isArray(rt.amenityIds) && rt.amenityIds.length > 0) {
              await tx.propertyRoomTypeAmenity.createMany({
                data: rt.amenityIds.map((amenityId) => ({
                  propertyRoomTypeId: createdRoomType.id,
                  amenityId,
                })),
                skipDuplicates: true
              });
            }

            // Handle room type images
            const roomTypeImageFiles = filesByField[`roomTypeImages_${index}`] || [];
            if (roomTypeImageFiles.length > 0) {
              await tx.propertyRoomTypeMedia.createMany({
                data: roomTypeImageFiles.map((file, fileIndex) => ({
                  propertyRoomTypeId: createdRoomType.id,
                  url: file.url || `/uploads/${file.subdirectory || 'images'}/${file.filename}`,
                  type: file.mimetype.startsWith('image') ? 'image' : 'video',
                  isFeatured: fileIndex === 0,
                  order: fileIndex,
                }))
              });
            }
          }
        }
      }, {
        maxWait: MAX_TRANSACTION_WAIT,
        timeout: MAX_TRANSACTION_TIMEOUT,
      });


      return res.status(201).json({
        success: true,
        message: 'Property created successfully with all configurations',
        data: result,
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