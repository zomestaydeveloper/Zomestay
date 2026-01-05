const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { verifyPropertyAccess } = require('./propertyAccess.utils');
const { validatePropertyImages, validateRoomTypeImages } = require('../../utils/imageValidation.utils');
const { sendSuccess, sendError } = require('../../utils/response.utils');
const { isValidUuid } = require('../../utils/frontdesk.utils');

// Transaction timeout configuration (matches property creation)
const MAX_TRANSACTION_TIMEOUT = 120000; // 120 seconds

// PropertyStatus enum values from schema.prisma
// enum PropertyStatus { active, blocked }
// Note: Prisma enums are TypeScript types, not runtime objects, so we define the values directly from the schema
// These values must match the enum definition in prisma/schema.prisma
const VALID_PROPERTY_STATUSES = ['active', 'blocked'];
const PROPERTY_STATUS_ACTIVE = 'active';
const PROPERTY_STATUS_BLOCKED = 'blocked';

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

const validateNumber = (value, fieldName, min = 0) => {
  if (value === undefined || value === null || value === '') {
    throw new Error(`Invalid ${fieldName}: value is required`);
  }
  const num = Number(value);
  if (Number.isNaN(num) || num < min) {
    throw new Error(`Invalid ${fieldName}: Must be a number ≥ ${min}`);
  }
  return num;
};

const parseNumberOrNull = (value, fieldName, min = 0) => {
  if (value === undefined || value === null || value === '') return null;
  const num = Number(value);
  if (Number.isNaN(num) || num < min) {
    throw new Error(`Invalid ${fieldName}: Must be a number ≥ ${min}`);
  }
  return num;
};

const resolveFileUrl = (file, defaultSubdirectory = 'images') => {
  if (!file) return null;
  if (file.url) return file.url;
  if (file.subdirectory) return `/uploads/${file.subdirectory}/${file.filename}`;
  if (file.relativePath) return `/uploads/${file.relativePath}`;
  return `/uploads/${defaultSubdirectory}/${file.filename}`;
};

// Use relative paths for consistency with property creation (issue #23)
const fileToUrl = (req, file) => {
  // Use relative path like property creation does
  if (!file) return null;
  if (file.url) return file.url;
  // Return relative path (matches property creation behavior)
  return file.filename ? `/uploads/images/${file.filename}` : null;
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
      // Not a JSON array; fall back to manual split
    }

    return trimmed
      .split(/\r?\n|,/)
      .map((rule) => rule.trim())
      .filter((rule) => rule.length > 0);
  }

  return [];
};

const ensureNotDeleted = async (model, id, entityName = 'record') => {
  const entity = await model.findUnique({ where: { id } });
  if (!entity) {
    return { error: `${entityName} not found` };
  }
  if (entity.isDeleted) {
    return { error: `${entityName} has been deleted` };
  }
  return { entity };
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
          return { url: item };
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

const getPropertyForEdit = async (req, res) => {
  try {
    const { id } = req.params;

    // Security: Verify host ownership
    const whereClause = {
      id,
      isDeleted: false,
    };

    // If user is a host, restrict to their own properties
    if (req.user?.role === 'host' && req.user?.id) {
      whereClause.ownerHostId = req.user.id;
    }

    const property = await prisma.property.findFirst({
      where: whereClause,
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
          },
        },
      },
    });

    if (!property) {
      // If host tried to access a property, give specific error message
      if (req.user?.role === 'host') {
        return sendError(res, 'Access denied. You can only edit your own properties.', 403);
      }
      return sendError(res, 'Property not found', 404);
    }

    const rulesArray = normaliseRulesToArray(property.rulesAndPolicies);

    const responsePayload = {
      id: property.id,
      title: property.title,
      description: property.description,
      rulesAndPolicies: rulesArray,
      status: property.status,
      propertyTypeId: property.propertyTypeId,
      ownerHostId: property.ownerHost.email,
      cancellationPolicyId: property.cancellationPolicyId,
      commissionPercentage: property.commissionPercentage,
      taxSlabs: property.taxSlabs || null,
      cessRate: property.cessRate || null,
      location: property.location || null,
      checkInTime: property.checkInTime,
      checkOutTime: property.checkOutTime,
      amenities: (property.amenities || []).map((link) => ({
        id: link.amenity?.id,
        name: link.amenity?.name,
        category: link.amenity?.category,
        icon: link.amenity?.icon,
      })),
      facilities: (property.facilities || []).map((link) => ({
        id: link.facility?.id,
        name: link.facility?.name,
        category: link.facility?.category,
        icon: link.facility?.icon,
      })),
      safeties: (property.safeties || []).map((link) => ({
        id: link.safety?.id,
        name: link.safety?.name,
        category: link.safety?.category,
        icon: link.safety?.icon,
      })),
      media: (property.media || []).map((mediaItem, index) => ({
        id: mediaItem.id,
        url: mediaItem.url,
        type: mediaItem.type,
        isFeatured: mediaItem.isFeatured,
        order: typeof mediaItem.order === 'number' ? mediaItem.order : index,
      })),
      roomTypes: (property.roomTypes || []).map((prt, index) => ({
        id: prt.id,
        roomTypeId: prt.roomTypeId,
        roomTypeName: prt.roomType?.name || '',
        minOccupancy: prt.minOccupancy ?? 1,
        Occupancy: prt.Occupancy ?? prt.maxOccupancy ?? 1,
        maxOccupancy: prt.maxOccupancy ?? prt.Occupancy ?? null,
        extraBedCapacity: prt.extraBedCapacity ?? 0,
        numberOfBeds: prt.numberOfBeds ?? prt.maxOccupancy ?? 1,
        bedType: prt.bedType || 'DOUBLE',
        amenityIds: (prt.amenities || [])
          .map((link) => ({
            id: link.amenity?.id,
            name: link.amenity?.name,
            category: link.amenity?.category,
            icon: link.amenity?.icon,
          }))
          .filter((item) => item.id),
        media: (prt.media || []).map((mediaItem, mediaIndex) => ({
          id: mediaItem.id,
          url: mediaItem.url,
          type: mediaItem.type,
          isFeatured: mediaItem.isFeatured,
          order:
            typeof mediaItem.order === 'number'
              ? mediaItem.order
              : mediaIndex,
        })),
      })),
    };

    return sendSuccess(res, responsePayload, 'Property details loaded successfully');
  } catch (error) {
    console.error('getPropertyForEdit error:', error);
    return sendError(res, 'Failed to load property details', 500);
  }
};

const updatePropertyBasics = async (req, res) => {
  try {
    const { id } = req.params;

    // Security: Verify property access (host can only modify their own properties)
    const accessResult = await verifyPropertyAccess({
      prisma,
      propertyId: id,
      user: req.user,
    });

    if (!accessResult.ok) {
      return sendError(res, accessResult.error.message, accessResult.error.status);
    }

    const guard = await ensureNotDeleted(prisma.property, id, 'Property');
    if (guard.error) {
      return sendError(res, guard.error, 404);
    }

    const {
      title,
      description,
      rulesAndPolicies,
      status,
      propertyTypeId,
      cancellationPolicyId,
      ownerHostId,
      checkInTime,
      checkOutTime,
      commissionPercentage,
    } = req.body;

    if (!title || !title.trim()) {
      return sendError(res, 'Title is required', 400);
    }

    // Validate status using Prisma enum values
    // PropertyStatus enum only has: 'active', 'blocked' (no 'inactive')
    if (status && !VALID_PROPERTY_STATUSES.includes(status)) {
      return sendError(res, `Invalid status value. Valid values are: ${VALID_PROPERTY_STATUSES.join(', ')}`, 400);
    }

    // Role-based status restrictions:
    // Hosts can only set 'active' status (cannot block their own properties)
    // Admins can set 'active' or 'blocked'
    if (status && req.user?.role === 'host') {
      if (status !== PROPERTY_STATUS_ACTIVE) {
        return sendError(res, 'Hosts can only set property status to "active". Only admins can block properties.', 403);
      }
    }

    if (propertyTypeId) {
      const propertyType = await prisma.propertyType.findFirst({
        where: { id: propertyTypeId, isDeleted: false },
        select: { id: true },
      });
      if (!propertyType) {
        return sendError(res, 'Invalid propertyTypeId', 400);
      }
    }

    if (cancellationPolicyId) {
      const policy = await prisma.cancellationPolicy.findFirst({
        where: { id: cancellationPolicyId, isDeleted: false },
        select: { id: true },
      });
      if (!policy) {
        return sendError(res, 'Invalid cancellationPolicyId', 400);
      }
    }

    const rulesList = normaliseRulesToArray(rulesAndPolicies);
    const rulesString = rulesList.length ? rulesList.join('\n') : null;

    // Security: Hosts cannot change ownerHostId - it's always their own ID
    // Admins can change ownerHostId
    let resolvedOwnerHostId = undefined;
    if (req.user?.role === 'host' && req.user?.id) {
      // For hosts, force ownerHostId to their own ID (cannot be changed)
      resolvedOwnerHostId = req.user.id;
    } else if (req.user?.role === 'admin') {
      // Admins can change ownerHostId
      const trimmedOwnerHostInput =
        typeof ownerHostId === 'string' ? ownerHostId.trim() : '';
      
      if (trimmedOwnerHostInput) {
        // Validate ownerHostId format (UUID or email) for better error messages (issue #29)
        const isUuidFormat = isValidUuid(trimmedOwnerHostInput);
        const isEmailFormat = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedOwnerHostInput);
        
        if (!isUuidFormat && !isEmailFormat) {
          return sendError(res, 'Invalid ownerHostId format. Expected a valid UUID or email address.', 400);
        }

        let host = await prisma.host.findFirst({
          where: { id: trimmedOwnerHostInput, isDeleted: false },
          select: { id: true },
        });

        if (!host) {
          host = await prisma.host.findFirst({
            where: { email: trimmedOwnerHostInput, isDeleted: false },
            select: { id: true },
          });
        }

        if (!host) {
          return sendError(res, 'Owner host not found', 400);
        }

        resolvedOwnerHostId = host.id;
      } else if (ownerHostId === null) {
        resolvedOwnerHostId = null;
      }
    }

    // Validate checkInTime and checkOutTime format if provided
    // Format: HH:mm (e.g., "14:00", "11:00")
    // Note: Prisma schema has defaults ("14:00" and "11:00"), so these fields are optional in updates
    const timeFormatRegex = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;

    if (checkInTime !== undefined && checkInTime !== null) {
      const trimmedCheckInTime = typeof checkInTime === 'string' ? checkInTime.trim() : '';
      // If provided, must be valid format (cannot be empty string)
      if (trimmedCheckInTime) {
        if (!timeFormatRegex.test(trimmedCheckInTime)) {
          return sendError(res, 'Invalid checkInTime format. Expected format: HH:mm (e.g., "14:00")', 400);
        }
      }
    }

    if (checkOutTime !== undefined && checkOutTime !== null) {
      const trimmedCheckOutTime = typeof checkOutTime === 'string' ? checkOutTime.trim() : '';
      // If provided, must be valid format (cannot be empty string)
      if (trimmedCheckOutTime) {
        if (!timeFormatRegex.test(trimmedCheckOutTime)) {
          return sendError(res, 'Invalid checkOutTime format. Expected format: HH:mm (e.g., "11:00")', 400);
        }
      }
    }

    const updateData = {
      title: title.trim(),
      description: description || null,
      rulesAndPolicies: rulesString,
    };

    if (status) {
      updateData.status = status;
    }

    updateData.propertyTypeId = propertyTypeId || null;
    updateData.cancellationPolicyId = cancellationPolicyId || null;

    // Add checkInTime if provided and valid (skip if empty string - Prisma will use default)
    if (checkInTime !== undefined && checkInTime !== null) {
      const trimmedCheckInTime = typeof checkInTime === 'string' ? checkInTime.trim() : '';
      // Only update if non-empty (valid format already validated above)
      if (trimmedCheckInTime) {
        updateData.checkInTime = trimmedCheckInTime;
      }
      // If empty string, skip updating (Prisma will keep existing value or use default)
    }

    // Add checkOutTime if provided and valid (skip if empty string - Prisma will use default)
    if (checkOutTime !== undefined && checkOutTime !== null) {
      const trimmedCheckOutTime = typeof checkOutTime === 'string' ? checkOutTime.trim() : '';
      // Only update if non-empty (valid format already validated above)
      if (trimmedCheckOutTime) {
        updateData.checkOutTime = trimmedCheckOutTime;
      }
      // If empty string, skip updating (Prisma will keep existing value or use default)
    }

    if (resolvedOwnerHostId !== undefined) {
      updateData.ownerHostId = resolvedOwnerHostId;
    }

    // Handle commission percentage (only admins can set this)
    if (commissionPercentage !== undefined && commissionPercentage !== null && commissionPercentage !== '') {
      if (req.user?.role !== 'admin') {
        return sendError(res, 'Only admins can set commission percentage', 403);
      }
      const commissionNum = parseFloat(commissionPercentage);
      if (isNaN(commissionNum) || commissionNum < 0 || commissionNum > 100) {
        return sendError(res, 'Commission percentage must be a number between 0 and 100', 400);
      }
      updateData.commissionPercentage = commissionNum;
    } else if (commissionPercentage === null || commissionPercentage === '') {
      // Allow clearing commission percentage (set to null)
      updateData.commissionPercentage = null;
    }

    await prisma.property.update({
      where: { id },
      data: updateData,
    });

    return sendSuccess(res, null, 'Property basics updated successfully');
  } catch (error) {
    console.error('updatePropertyBasics error:', error);
    return sendError(res, 'Failed to update property basics', 500);
  }
};

const updatePropertyLocation = async (req, res) => {
  try {
    const { id } = req.params;

    // Security: Verify property access (host can only modify their own properties)
    const accessResult = await verifyPropertyAccess({
      prisma,
      propertyId: id,
      user: req.user,
    });

    if (!accessResult.ok) {
      return sendError(res, accessResult.error.message, accessResult.error.status);
    }

    const guard = await ensureNotDeleted(prisma.property, id, 'Property');
    if (guard.error) {
      return sendError(res, guard.error, 404);
    }

    // Handle FormData: location comes as a string when using FormData
    let location = req.body.location;
    
    // Parse and validate location (same validation as property creation)
    let locationData;
    try {
      locationData = typeof location === 'string' ? JSON.parse(location) : location;
    } catch (err) {
      return sendError(res, 'Invalid location data format', 400);
    }

    // Validate location structure
    if (!locationData || typeof locationData !== 'object') {
      return sendError(res, 'Invalid location payload', 400);
    }

    // Validate that address and coordinates exist (same validation as property creation)
    if (!locationData?.address || !locationData?.coordinates) {
      return sendError(res, 'Location must include address and coordinates', 400);
    }

    // Handle city icon file if uploaded
    const filesByField = (req.files || []).reduce((acc, f) => {
      (acc[f.fieldname] ||= []).push(f);
      return acc;
    }, {});
    const cityIconFile = filesByField['cityIcon']?.[0] || null;

    // Handle city icon
    if (cityIconFile) {
      // New city icon uploaded - validate and save
      if (!cityIconFile.mimetype || (cityIconFile.mimetype !== 'image/svg+xml' && !cityIconFile.originalname?.endsWith('.svg'))) {
        return sendError(res, 'City icon must be an SVG file', 400);
      }
      // Get the file URL from multer
      const cityIconUrl = cityIconFile.url || `/uploads/${cityIconFile.subdirectory || 'images'}/${cityIconFile.filename}`;
      // Add city icon to location data
      locationData.cityIcon = cityIconUrl;
    } else {
      // No new city icon uploaded - check if cityIcon is explicitly set to null (removed)
      if (locationData.cityIcon === null) {
        // User wants to remove the city icon
        locationData.cityIcon = null;
      } else {
        // Preserve existing city icon from current location if not explicitly removed
        const existingProperty = await prisma.property.findUnique({
          where: { id },
          select: { location: true },
        });
        if (existingProperty?.location?.cityIcon) {
          locationData.cityIcon = existingProperty.location.cityIcon;
        }
      }
    }

    await prisma.property.update({
      where: { id },
      data: { location: locationData },
    });

    // Fetch updated property with location for response
    const updatedProperty = await prisma.property.findUnique({
      where: { id },
      select: {
        id: true,
        location: true,
      },
    });

    return sendSuccess(res, updatedProperty, 'Location information updated successfully');
  } catch (error) {
    console.error('updatePropertyLocation error:', error);
    return sendError(res, 'Failed to update location information', 500);
  }
};

const updatePropertyPolicy = async (req, res) => {
  try {
    const { id } = req.params;

    // Security: Verify property access (host can only modify their own properties)
    const accessResult = await verifyPropertyAccess({
      prisma,
      propertyId: id,
      user: req.user,
    });

    if (!accessResult.ok) {
      return sendError(res, accessResult.error.message, accessResult.error.status);
    }

    const guard = await ensureNotDeleted(prisma.property, id, 'Property');
    if (guard.error) {
      return sendError(res, guard.error, 404);
    }

    const { cancellationPolicyId, ownerHostId } = req.body;

    // Validate cancellationPolicyId if provided
    if (cancellationPolicyId) {
      const policy = await prisma.cancellationPolicy.findFirst({
        where: { id: cancellationPolicyId, isDeleted: false },
        select: { id: true },
      });
      if (!policy) {
        return sendError(res, 'Invalid cancellationPolicyId', 400);
      }
    }

    // Security: Hosts cannot change ownerHostId - it's always their own ID
    // Admins can change ownerHostId
    let resolvedOwnerHostId = undefined;
    if (req.user?.role === 'host' && req.user?.id) {
      // For hosts, force ownerHostId to their own ID (cannot be changed)
      resolvedOwnerHostId = req.user.id;
    } else if (req.user?.role === 'admin') {
      // Admins can change ownerHostId
      const trimmedOwnerHostInput =
        typeof ownerHostId === 'string' ? ownerHostId.trim() : '';
      
      if (trimmedOwnerHostInput) {
        // Validate ownerHostId format (UUID or email) for better error messages (issue #29)
        const isUuidFormat = isValidUuid(trimmedOwnerHostInput);
        const isEmailFormat = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedOwnerHostInput);
        
        if (!isUuidFormat && !isEmailFormat) {
          return sendError(res, 'Invalid ownerHostId format. Expected a valid UUID or email address.', 400);
        }

        let host = await prisma.host.findFirst({
          where: { id: trimmedOwnerHostInput, isDeleted: false },
          select: { id: true },
        });

        if (!host) {
          host = await prisma.host.findFirst({
            where: { email: trimmedOwnerHostInput, isDeleted: false },
            select: { id: true },
          });
        }

        if (!host) {
          return sendError(res, 'Owner host not found', 400);
        }

        resolvedOwnerHostId = host.id;
      } else if (ownerHostId === null) {
        resolvedOwnerHostId = null;
      }
    }

    // Prepare update data
    const updateData = {
      cancellationPolicyId: cancellationPolicyId || null,
    };

    if (resolvedOwnerHostId !== undefined) {
      updateData.ownerHostId = resolvedOwnerHostId;
    }

    // Update property
    await prisma.property.update({
      where: { id },
      data: updateData,
    });

    // Fetch updated property with cancellation policy
    const updatedProperty = await prisma.property.findUnique({
      where: { id },
      include: {
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
      },
    });

    return sendSuccess(
      res,
      {
        id: updatedProperty.id,
        cancellationPolicyId: updatedProperty.cancellationPolicyId,
        cancellationPolicy: updatedProperty.cancellationPolicy,
      },
      'Cancellation policy updated successfully'
    );
  } catch (error) {
    console.error('updatePropertyPolicy error:', error);
    return sendError(res, 'Failed to update cancellation policy', 500);
  }
};

const updatePropertyFeatures = async (req, res) => {
  try {
    const { id } = req.params;

    // Security: Verify property access (host can only modify their own properties)
    const accessResult = await verifyPropertyAccess({
      prisma,
      propertyId: id,
      user: req.user,
    });

    if (!accessResult.ok) {
      return sendError(res, accessResult.error.message, accessResult.error.status);
    }

    const guard = await ensureNotDeleted(prisma.property, id, 'Property');
    if (guard.error) {
      return sendError(res, guard.error, 404);
    }

    const { amenityIds, facilityIds, safetyIds } = req.body;

    const amenityList = normalizeToArray(amenityIds).filter(Boolean);
    const facilityList = normalizeToArray(facilityIds).filter(Boolean);
    const safetyList = normalizeToArray(safetyIds).filter(Boolean);

    await prisma.$transaction(async (tx) => {
      await tx.propertyAmenity.deleteMany({ where: { propertyId: id } });
      await tx.propertyFacility.deleteMany({ where: { propertyId: id } });
      await tx.propertySafety.deleteMany({ where: { propertyId: id } });

      if (amenityList.length) {
        await tx.propertyAmenity.createMany({
          data: amenityList.map((amenityId) => ({
            propertyId: id,
            amenityId,
          })),
          skipDuplicates: true,
        });
      }

      if (facilityList.length) {
        await tx.propertyFacility.createMany({
          data: facilityList.map((facilityId) => ({
            propertyId: id,
            facilityId,
          })),
          skipDuplicates: true,
        });
      }

      if (safetyList.length) {
        await tx.propertySafety.createMany({
          data: safetyList.map((safetyId) => ({
            propertyId: id,
            safetyId,
          })),
          skipDuplicates: true,
        });
      }
    }, { timeout: MAX_TRANSACTION_TIMEOUT });

    return sendSuccess(res, null, 'Property features updated successfully');
  } catch (error) {
    console.error('updatePropertyFeatures error:', error);
    return sendError(res, 'Failed to update property features', 500);
  }
};

const updateProperty = async (req, res) => {
  try {
    const { id } = req.params;

    // Security: Verify property access (host can only modify their own properties)
    const accessResult = await verifyPropertyAccess({
      prisma,
      propertyId: id,
      user: req.user,
    });

    if (!accessResult.ok) {
      return sendError(res, accessResult.error.message, accessResult.error.status);
    }

    const guard = await ensureNotDeleted(prisma.property, id, 'Property');
    if (guard.error) {
      return sendError(res, guard.error, 404);
    }

    const {
      title,
      description,
      rulesAndPolicies,
      status,
      propertyTypeId,
      ownerHostId,
      cancellationPolicyId,
      location,
      amenityIds,
      facilityIds,
      safetyIds,
      existingMedia,
      coverImageIndex,
      roomtypes,
    } = req.body;

    if (!title || !title.trim()) {
      return sendError(res, 'Title is required', 400);
    }

    const amenityList = normalizeToArray(amenityIds).filter(Boolean);
    const facilityList = normalizeToArray(facilityIds).filter(Boolean);
    const safetyList = normalizeToArray(safetyIds).filter(Boolean);
    const roomTypesInput = safeJSON(roomtypes, []);
    const roomTypeAmenityMap = new Map();
    const roomTypeUpdateData = new Map();
    const roomTypeAmenityIdSet = new Set();
    const roomTypeExistingMediaMap = new Map();
    const roomTypePayloads = [];

    (Array.isArray(roomTypesInput) ? roomTypesInput : []).forEach((rt) => {
      if (!rt || typeof rt !== 'object') return;

      const propertyRoomTypeId =
        typeof rt.id === 'string' && rt.id.trim().length ? rt.id.trim() : null;

      const normalisedAmenityIds = Array.isArray(rt.amenityIds)
        ? rt.amenityIds
            .map((amenity) => {
              if (!amenity) return null;
              if (typeof amenity === 'string') return amenity.trim();
              if (typeof amenity === 'object') {
                const candidate = amenity.id || amenity.value || amenity.amenityId;
                return typeof candidate === 'string' ? candidate.trim() : null;
              }
              return null;
            })
            .filter((id) => id && id.length > 0)
        : [];

      normalisedAmenityIds.forEach((id) => roomTypeAmenityIdSet.add(id));

      let normalisedExistingMedia = Array.isArray(rt.existingMedia)
        ? rt.existingMedia
            .map((mediaItem) => {
              const mediaId =
                mediaItem && typeof mediaItem.id === 'string' ? mediaItem.id.trim() : '';
              if (!mediaId) return null;
              const normalised = {
                id: mediaId,
                isDeleted: Boolean(mediaItem.isDeleted),
                isFeatured: Boolean(mediaItem.isFeatured),
              };
              if (typeof mediaItem.order === 'number') {
                normalised.order = mediaItem.order;
              }
              return normalised;
            })
            .filter(Boolean)
        : [];

      const activeExistingMedia = normalisedExistingMedia.filter((media) => !media.isDeleted);
      if (activeExistingMedia.length && !activeExistingMedia.some((media) => media.isFeatured)) {
        const primaryId = activeExistingMedia[0].id;
        normalisedExistingMedia = normalisedExistingMedia.map((media) =>
          media.id === primaryId ? { ...media, isFeatured: true } : media
        );
      }

      roomTypePayloads.push({
        propertyRoomTypeId,
        amenityIds: normalisedAmenityIds,
        existingMedia: normalisedExistingMedia,
      });

      if (propertyRoomTypeId) {
        roomTypeAmenityMap.set(propertyRoomTypeId, normalisedAmenityIds);
        roomTypeExistingMediaMap.set(propertyRoomTypeId, normalisedExistingMedia);
        try {
          const updatePayload = {};
          const occupancyNumber = parseNumberOrNull(
            rt.Occupancy ?? rt.occupancy,
            `occupancy for room type ${propertyRoomTypeId}`,
            1
          );
          if (occupancyNumber !== null) {
            updatePayload.Occupancy = occupancyNumber;
          }

          const minOccupancyNumber = parseNumberOrNull(
            rt.minOccupancy,
            `min occupancy for room type ${propertyRoomTypeId}`,
            1
          );
          if (minOccupancyNumber !== null) {
            updatePayload.minOccupancy = minOccupancyNumber;
          }

          const extraBedNumber = parseNumberOrNull(
            rt.extraBedCapacity,
            `extra bed capacity for room type ${propertyRoomTypeId}`,
            0
          );
          if (extraBedNumber !== null) {
            updatePayload.extraBedCapacity = extraBedNumber;
          }

          // Calculate maxOccupancy = Occupancy + extraBedCapacity (matches property creation - issue #18)
          if (occupancyNumber !== null && extraBedNumber !== null) {
            updatePayload.maxOccupancy = occupancyNumber + extraBedNumber;
          } else if (occupancyNumber !== null) {
            // If Occupancy is set but extraBedCapacity is not, use Occupancy as maxOccupancy
            updatePayload.maxOccupancy = occupancyNumber;
          }

          // Validate minOccupancy <= Occupancy (issue #19)
          if (minOccupancyNumber !== null && occupancyNumber !== null) {
            if (minOccupancyNumber > occupancyNumber) {
              throw new Error(`Room type ${propertyRoomTypeId}: minOccupancy (${minOccupancyNumber}) cannot be greater than Occupancy (${occupancyNumber})`);
            }
          }

          const numberOfBedsNumber = parseNumberOrNull(
            rt.numberOfBeds,
            `number of beds for room type ${propertyRoomTypeId}`,
            1
          );
          if (numberOfBedsNumber !== null) {
            updatePayload.numberOfBeds = numberOfBedsNumber;
          }

          if (typeof rt.bedType === 'string' && rt.bedType.trim()) {
            updatePayload.bedType = rt.bedType;
          }

          roomTypeUpdateData.set(propertyRoomTypeId, updatePayload);
        } catch (err) {
          return sendError(res, err.message || 'Invalid room type data provided', 400);
        }
      }
    });

    const roomTypeAmenityList = Array.from(roomTypeAmenityIdSet);
    if (roomTypeAmenityList.length) {
      const amenityRows = await prisma.amenity.findMany({
        where: { id: { in: roomTypeAmenityList }, isDeleted: false },
        select: { id: true },
      });
      const foundIds = new Set(amenityRows.map((row) => row.id));
      const missingAmenities = roomTypeAmenityList.filter((id) => !foundIds.has(id));
      if (missingAmenities.length) {
        return sendError(res, `Room type amenity not found: ${missingAmenities.join(', ')}`, 400);
      }
    }

    const existingRoomTypes = await prisma.propertyRoomType.findMany({
      where: { propertyId: id, isDeleted: false },
      select: { id: true },
    });
    const validRoomTypeIds = new Set(existingRoomTypes.map((rt) => rt.id));
    for (const key of Array.from(roomTypeAmenityMap.keys())) {
      if (!validRoomTypeIds.has(key)) {
        roomTypeAmenityMap.delete(key);
      }
    }
    for (const key of Array.from(roomTypeExistingMediaMap.keys())) {
      if (!validRoomTypeIds.has(key)) {
        roomTypeExistingMediaMap.delete(key);
      }
    }
    for (const key of Array.from(roomTypeUpdateData.keys())) {
      if (!validRoomTypeIds.has(key)) {
        roomTypeUpdateData.delete(key);
      }
    }

    const rulesList = normaliseRulesToArray(rulesAndPolicies);
    const rulesString = rulesList.length ? rulesList.join('\n') : null;

    if (propertyTypeId) {
      const propertyType = await prisma.propertyType.findFirst({
        where: { id: propertyTypeId, isDeleted: false },
        select: { id: true },
      });
      if (!propertyType) {
        return sendError(res, 'Invalid propertyTypeId', 400);
      }
    }

    // Security: Hosts cannot change ownerHostId - it's always their own ID
    // Admins can change ownerHostId
    let resolvedOwnerHostId = undefined;
    if (req.user?.role === 'host' && req.user?.id) {
      // For hosts, force ownerHostId to their own ID (cannot be changed)
      resolvedOwnerHostId = req.user.id;
    } else if (req.user?.role === 'admin') {
      // Admins can change ownerHostId
      const trimmedOwnerHostInput =
        typeof ownerHostId === 'string' ? ownerHostId.trim() : '';
      
      if (trimmedOwnerHostInput) {
        // Validate ownerHostId format (UUID or email) for better error messages (issue #29)
        const isUuidFormat = isValidUuid(trimmedOwnerHostInput);
        const isEmailFormat = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedOwnerHostInput);
        
        if (!isUuidFormat && !isEmailFormat) {
          return sendError(res, 'Invalid ownerHostId format. Expected a valid UUID or email address.', 400);
        }

        let host = await prisma.host.findFirst({
          where: { id: trimmedOwnerHostInput, isDeleted: false },
          select: { id: true },
        });

        if (!host) {
          host = await prisma.host.findFirst({
            where: { email: trimmedOwnerHostInput, isDeleted: false },
            select: { id: true },
          });
        }

        if (!host) {
          return sendError(res, 'Owner host not found', 400);
        }

        resolvedOwnerHostId = host.id;
      } else if (ownerHostId === null) {
        resolvedOwnerHostId = null;
      }
    }

    const filesByField = (req.files || []).reduce((acc, file) => {
      (acc[file.fieldname] ||= []).push(file);
      return acc;
    }, {});

    const newMediaFiles = filesByField.media || [];

    // Parse existing media to get count
    const existingMediaPayload = buildMediaPayload(existingMedia);
    const existingMediaCount = existingMediaPayload.items.length;

    // Validate new media files using validation utilities
    // Only allow images (no videos) to match property creation
    if (newMediaFiles.length > 0) {
      // Filter to only image files (property creation only allows images)
      const imageFiles = newMediaFiles.filter(file => file.mimetype?.startsWith('image/'));
      
      if (imageFiles.length !== newMediaFiles.length) {
        return sendError(res, 'Only image files are allowed. Videos are not supported.', 400);
      }

      // Validate images using validation utilities (validates count, size, type, aspect ratio)
      const propertyImageValidation = await validatePropertyImages(imageFiles);
      if (!propertyImageValidation.valid) {
        return sendError(res, 'Property image validation failed', 400, propertyImageValidation.errors);
      }

      // Calculate total media count (existing + new images only)
      const totalMediaCount = existingMediaCount + imageFiles.length;

      // Validate total media count (existing + new) doesn't exceed 12
      if (totalMediaCount > 12) {
        return sendError(res, `Maximum 12 property images allowed. You have ${existingMediaCount} existing images and are trying to add ${imageFiles.length} new images (total: ${totalMediaCount}).`, 400);
      }

      // Use only validated image files (videos are already filtered out)
      // Update newMediaFiles to only contain validated images
      newMediaFiles.length = 0;
      newMediaFiles.push(...imageFiles);
    } else {
      // No new files, but validate existing count
      if (existingMediaCount === 0) {
        return sendError(res, 'At least one property image is required', 400);
      }
    }

    // Map new media files to payload (only images, as validated above)
    const newMediaPayload = newMediaFiles.map((file, index) => ({
      url: fileToUrl(req, file),
      type: 'image', // Only images are allowed (videos removed for consistency)
      isFeatured: false,
      order: existingMediaPayload.items.length + index,
    }));

    const combinedMedia = [...existingMediaPayload.items, ...newMediaPayload].map((item, index) => ({
      ...item,
      order: index,
    }));

    const coverIndexInput = typeof coverImageIndex !== 'undefined' ? Number(coverImageIndex) : null;
    const resolvedCoverIndex =
      coverIndexInput !== null && !Number.isNaN(coverIndexInput)
        ? coverIndexInput
        : existingMediaPayload.coverIndex;

    combinedMedia.forEach((item, index) => {
      item.isFeatured = index === resolvedCoverIndex;
    });

    // Note: combinedMedia.length check is already done above (existingMediaCount === 0 when no new files)
    const coverImageUrl = combinedMedia.find((item) => item.isFeatured)?.url || combinedMedia[0].url;

    // Validate room type images before transaction
    // Check each room type's new images and total count (existing + new)
    // Note: This validates both existing room types (with propertyRoomTypeId) and new room types (without propertyRoomTypeId)
    for (const [index, payload] of roomTypePayloads.entries()) {
      const roomTypeImageFiles = filesByField[`roomTypeImages_${index}`] || [];
      
      if (roomTypeImageFiles.length > 0) {
        // Filter to only image files (property creation only allows images)
        const imageFiles = roomTypeImageFiles.filter(file => file.mimetype?.startsWith('image/'));
        
        if (imageFiles.length !== roomTypeImageFiles.length) {
          return sendError(res, `Room type at index ${index + 1}: Only image files are allowed. Videos are not supported.`, 400);
        }

        // Validate images using validation utilities (validates count, size, type, aspect ratio)
        const roomTypeImageValidation = await validateRoomTypeImages(imageFiles);
        if (!roomTypeImageValidation.valid) {
          return sendError(res, `Room type at index ${index + 1} image validation failed`, 400, roomTypeImageValidation.errors);
        }

        // Get existing media count for this room type
        // For new room types, existingMedia will be empty
        const existingMediaPayload = payload.existingMedia || [];
        const activeExistingMedia = existingMediaPayload.filter((media) => !media.isDeleted);
        const existingMediaCount = activeExistingMedia.length;
        const totalMediaCount = existingMediaCount + imageFiles.length;

        // Validate total media count (existing + new) doesn't exceed 12 per room type
        if (totalMediaCount > 12) {
          return sendError(res, `Room type at index ${index + 1}: Maximum 12 images allowed per room type. You have ${existingMediaCount} existing images and are trying to add ${imageFiles.length} new images (total: ${totalMediaCount}).`, 400);
        }
      }
    }

    const locationData = safeJSON(location, null);

    await prisma.$transaction(async (tx) => {
      const propertyUpdatePayload = {
        where: { id },
        data: {
          title: title.trim(),
          description: description || null,
          rulesAndPolicies: rulesString,
          status: status || 'active',
          propertyTypeId: propertyTypeId || null,
          cancellationPolicyId: cancellationPolicyId || null,
          location: locationData,
          coverImage: coverImageUrl,
        },
      };

      if (resolvedOwnerHostId !== undefined) {
        propertyUpdatePayload.data.ownerHostId = resolvedOwnerHostId;
      }

      await tx.property.update(propertyUpdatePayload);

      await tx.propertyAmenity.deleteMany({ where: { propertyId: id } });
      await tx.propertyFacility.deleteMany({ where: { propertyId: id } });
      await tx.propertySafety.deleteMany({ where: { propertyId: id } });
      await tx.propertyMedia.deleteMany({ where: { propertyId: id } });

      if (amenityList.length) {
        const createAmenityPayload = amenityList.map((amenityId) => ({
          propertyId: id,
          amenityId,
        }));
        await tx.propertyAmenity.createMany({ data: createAmenityPayload });
      }

      if (facilityList.length) {
        const createFacilityPayload = facilityList.map((facilityId) => ({
          propertyId: id,
          facilityId,
        }));
        await tx.propertyFacility.createMany({ data: createFacilityPayload });
      }

      if (safetyList.length) {
        const createSafetyPayload = safetyList.map((safetyId) => ({
          propertyId: id,
          safetyId,
        }));
        await tx.propertySafety.createMany({ data: createSafetyPayload });
      }

      await tx.propertyMedia.createMany({
        data: combinedMedia.map((media) => ({
          propertyId: id,
          url: media.url,
          type: media.type,
          isFeatured: media.isFeatured,
          order: media.order,
        })),
      });

      for (const [propertyRoomTypeId, updatePayload] of roomTypeUpdateData.entries()) {
        if (updatePayload && Object.keys(updatePayload).length > 0) {
          await tx.propertyRoomType.update({
            where: { id: propertyRoomTypeId },
            data: updatePayload,
          });
        }
      }

      for (const [propertyRoomTypeId, existingMediaPayload] of roomTypeExistingMediaMap.entries()) {
        if (!existingMediaPayload.length) {
          continue;
        }

        const deleteIds = existingMediaPayload
          .filter((media) => media.isDeleted && media.id)
          .map((media) => media.id);

        if (deleteIds.length) {
          await tx.propertyRoomTypeMedia.deleteMany({
            where: { id: { in: deleteIds } },
          });
        }

        const updateMediaEntries = existingMediaPayload.filter(
          (media) => !media.isDeleted && media.id
        );

        for (const media of updateMediaEntries) {
          await tx.propertyRoomTypeMedia.update({
            where: { id: media.id },
            data: {
              isFeatured: Boolean(media.isFeatured),
              order: typeof media.order === 'number' ? media.order : 0,
            },
          });
        }
      }

      for (let roomTypeIndex = 0; roomTypeIndex < roomTypePayloads.length; roomTypeIndex += 1) {
        const payload = roomTypePayloads[roomTypeIndex];
        const { propertyRoomTypeId } = payload;
        if (!propertyRoomTypeId) continue;

        const roomTypeImageFiles = filesByField[`roomTypeImages_${roomTypeIndex}`] || [];
        if (!roomTypeImageFiles.length) {
          continue;
        }

        // Filter to only image files (already validated above, but ensure consistency)
        const imageFiles = roomTypeImageFiles.filter(file => file.mimetype?.startsWith('image/'));
        if (!imageFiles.length) continue;

        const existingMediaPayload = roomTypeExistingMediaMap.get(propertyRoomTypeId) || [];
        const activeExistingMedia = existingMediaPayload.filter((media) => !media.isDeleted);
        const maxOrder = activeExistingMedia.length
          ? Math.max(
              ...activeExistingMedia.map((media) =>
                typeof media.order === 'number' ? media.order : 0
              )
            )
          : -1;
        const startOrder = maxOrder + 1;

        // Map new media files to payload (only images, as validated above)
        const mediaCreatePayload = imageFiles.map((file, fileIdx) => ({
          propertyRoomTypeId,
          url: fileToUrl(req, file),
          type: 'image', // Only images are allowed (videos removed for consistency)
          isFeatured: activeExistingMedia.length === 0 && fileIdx === 0,
          order: startOrder + fileIdx,
        }));

        if (mediaCreatePayload.length) {
          // If no existing media remain, ensure only the first new item is marked featured
          if (activeExistingMedia.length === 0) {
            mediaCreatePayload.forEach((entry, idx) => {
              entry.isFeatured = idx === 0;
            });
          }

          await tx.propertyRoomTypeMedia.createMany({
            data: mediaCreatePayload,
          });
        }
      }

      for (const [propertyRoomTypeId, amenityIds] of roomTypeAmenityMap.entries()) {
        await tx.propertyRoomTypeAmenity.deleteMany({
          where: { propertyRoomTypeId },
        });

        if (amenityIds.length) {
          await tx.propertyRoomTypeAmenity.createMany({
            data: amenityIds.map((amenityId) => ({
              propertyRoomTypeId,
              amenityId,
            })),
            skipDuplicates: true,
          });
        }
      }
    }, { timeout: MAX_TRANSACTION_TIMEOUT });

    return sendSuccess(res, null, 'Property updated successfully');
  } catch (error) {
    console.error('updateProperty error:', error);
    return sendError(res, 'Failed to update property', 500);
  }
};

const updatePropertyRoomTypes = async (req, res) => {
  try {
    const { id } = req.params;

    // Security: Verify property access (host can only modify their own properties)
    const accessResult = await verifyPropertyAccess({
      prisma,
      propertyId: id,
      user: req.user,
    });

    if (!accessResult.ok) {
      return sendError(res, accessResult.error.message, accessResult.error.status);
    }

    const guard = await ensureNotDeleted(prisma.property, id, 'Property');
    if (guard.error) {
      return sendError(res, guard.error, 404);
    }

    const { roomtypes } = req.body;
    const roomTypesInput = safeJSON(roomtypes, []);

    const filesByField = (req.files || []).reduce((acc, file) => {
      (acc[file.fieldname] ||= []).push(file);
      return acc;
    }, {});

    const roomTypeAmenityMap = new Map();
    const roomTypeExistingMediaMap = new Map();
    const roomTypeUpdateData = new Map();
    const roomTypeAmenityIdSet = new Set();
    const roomTypePayloads = [];
    const newRoomTypePayloads = [];

    (Array.isArray(roomTypesInput) ? roomTypesInput : []).forEach((rt, index) => {
      if (!rt || typeof rt !== 'object') return;

      const propertyRoomTypeId =
        typeof rt.id === 'string' && rt.id.trim().length ? rt.id.trim() : null;

      const normalisedAmenityIds = Array.isArray(rt.amenityIds)
        ? rt.amenityIds
            .map((amenity) => {
              if (!amenity) return null;
              if (typeof amenity === 'string') return amenity.trim();
              if (typeof amenity === 'object') {
                const candidate = amenity.id || amenity.value || amenity.amenityId;
                return typeof candidate === 'string' ? candidate.trim() : null;
              }
              return null;
            })
            .filter((id) => id && id.length > 0)
        : [];

      normalisedAmenityIds.forEach((id) => roomTypeAmenityIdSet.add(id));

      let normalisedExistingMedia = Array.isArray(rt.existingMedia)
        ? rt.existingMedia
            .map((mediaItem) => {
              const mediaId =
                mediaItem && typeof mediaItem.id === 'string' ? mediaItem.id.trim() : '';
              if (!mediaId) return null;
              const normalised = {
                id: mediaId,
                isDeleted: Boolean(mediaItem.isDeleted),
                isFeatured: Boolean(mediaItem.isFeatured),
              };
              if (typeof mediaItem.order === 'number') {
                normalised.order = mediaItem.order;
              }
              return normalised;
            })
            .filter(Boolean)
        : [];

      const activeExistingMedia = normalisedExistingMedia.filter((media) => !media.isDeleted);
      if (activeExistingMedia.length && !activeExistingMedia.some((media) => media.isFeatured)) {
        const primaryId = activeExistingMedia[0].id;
        normalisedExistingMedia = normalisedExistingMedia.map((media) =>
          media.id === primaryId ? { ...media, isFeatured: true } : media
        );
      }

      const occupancyNumber = parseNumberOrNull(
        rt.Occupancy ?? rt.occupancy,
        `occupancy for room type at index ${index}`,
        1
      ) ?? 1;

      const minOccupancyNumber = parseNumberOrNull(
        rt.minOccupancy,
        `min occupancy for room type at index ${index}`,
        1
      ) ?? 1;

      const extraBedNumber = parseNumberOrNull(
        rt.extraBedCapacity,
        `extra bed capacity for room type at index ${index}`,
        0
      ) ?? 0;

      const numberOfBedsNumber = parseNumberOrNull(
        rt.numberOfBeds,
        `number of beds for room type at index ${index}`,
        1
      ) ?? 1;

      // Validate minOccupancy <= Occupancy (issue #19)
      if (minOccupancyNumber > occupancyNumber) {
        throw new Error(`Room type at index ${index + 1}: minOccupancy (${minOccupancyNumber}) cannot be greater than Occupancy (${occupancyNumber})`);
      }

      // Calculate maxOccupancy = Occupancy + extraBedCapacity (matches property creation - issue #18)
      const maxOccupancyNumber = occupancyNumber + extraBedNumber;

      const roomTypeId =
        typeof rt.roomTypeId === 'string' && rt.roomTypeId.trim().length
          ? rt.roomTypeId.trim()
          : null;

      if (!roomTypeId) {
        throw new Error(`roomTypeId is required for room type entry at position ${index + 1}`);
      }

      // Validate roomTypeId format (UUID) for better error messages (issue #30)
      if (!isValidUuid(roomTypeId)) {
        throw new Error(`Room type at index ${index + 1}: Invalid roomTypeId format. Expected a valid UUID.`);
      }

      const payload = {
        index,
        propertyRoomTypeId,
        amenityIds: normalisedAmenityIds,
        existingMedia: normalisedExistingMedia,
        roomTypeData: {
          propertyId: id,
          roomTypeId,
          minOccupancy: minOccupancyNumber,
          Occupancy: occupancyNumber,
          maxOccupancy: maxOccupancyNumber, // Calculated: Occupancy + extraBedCapacity (issue #18)
          extraBedCapacity: extraBedNumber,
          numberOfBeds: numberOfBedsNumber,
          bedType: typeof rt.bedType === 'string' && rt.bedType.trim() ? rt.bedType : 'DOUBLE',
        },
      };

      roomTypePayloads.push(payload);

      if (propertyRoomTypeId) {
        roomTypeAmenityMap.set(propertyRoomTypeId, normalisedAmenityIds);
        roomTypeExistingMediaMap.set(propertyRoomTypeId, normalisedExistingMedia);
        roomTypeUpdateData.set(propertyRoomTypeId, {
          minOccupancy: minOccupancyNumber,
          Occupancy: occupancyNumber,
          maxOccupancy: maxOccupancyNumber, // Calculated: Occupancy + extraBedCapacity (issue #18)
          extraBedCapacity: extraBedNumber,
          numberOfBeds: numberOfBedsNumber,
          bedType: payload.roomTypeData.bedType,
        });
      } else {
        newRoomTypePayloads.push(payload);
      }
    });

    const roomTypeAmenityList = Array.from(roomTypeAmenityIdSet);
    if (roomTypeAmenityList.length) {
      const amenityRows = await prisma.amenity.findMany({
        where: { id: { in: roomTypeAmenityList }, isDeleted: false },
        select: { id: true },
      });
      const foundIds = new Set(amenityRows.map((row) => row.id));
      const missingAmenities = roomTypeAmenityList.filter((id) => !foundIds.has(id));
      if (missingAmenities.length) {
        return sendError(res, `Room type amenity not found: ${missingAmenities.join(', ')}`, 400);
      }
    }

    const existingRoomTypes = await prisma.propertyRoomType.findMany({
      where: { propertyId: id, isDeleted: false },
      select: { id: true, roomTypeId: true },
    });
    const validRoomTypeIds = new Set(existingRoomTypes.map((rt) => rt.id));
    const existingRoomTypeMap = new Map(existingRoomTypes.map((rt) => [rt.roomTypeId, rt.id]));

    const roomTypeIdSet = new Set(roomTypePayloads.map((payload) => payload.roomTypeData.roomTypeId));
    if (roomTypeIdSet.size) {
      // Validate roomTypeId format (UUID) for better error messages (issue #30)
      const invalidRoomTypeIds = Array.from(roomTypeIdSet).filter((roomTypeId) => !isValidUuid(roomTypeId));
      if (invalidRoomTypeIds.length) {
        return sendError(res, `Invalid roomTypeId format(s): ${invalidRoomTypeIds.join(', ')}. Expected valid UUIDs.`, 400);
      }

      const roomTypeRows = await prisma.roomType.findMany({
        where: { id: { in: Array.from(roomTypeIdSet) }, isDeleted: false },
        select: { id: true },
      });
      const foundRoomTypeIds = new Set(roomTypeRows.map((row) => row.id));
      const missingRoomTypes = Array.from(roomTypeIdSet).filter(
        (roomTypeId) => !foundRoomTypeIds.has(roomTypeId)
      );
      if (missingRoomTypes.length) {
        return sendError(res, `Invalid roomTypeId(s): ${missingRoomTypes.join(', ')}`, 400);
      }
    }

    for (const payload of roomTypePayloads) {
      if (payload.propertyRoomTypeId && !validRoomTypeIds.has(payload.propertyRoomTypeId)) {
        return sendError(res, `Room type ${payload.propertyRoomTypeId} does not belong to this property`, 400);
      }
    }

    // Validate room type images before transaction
    // Check each room type's new images and total count (existing + new)
    // Note: This validates both existing room types (with propertyRoomTypeId) and new room types (without propertyRoomTypeId)
    for (const payload of roomTypePayloads) {
      const roomTypeImageFiles = filesByField[`roomTypeImages_${payload.index}`] || [];
      
      if (roomTypeImageFiles.length > 0) {
        // Filter to only image files (property creation only allows images)
        const imageFiles = roomTypeImageFiles.filter(file => file.mimetype?.startsWith('image/'));
        
        if (imageFiles.length !== roomTypeImageFiles.length) {
          return sendError(res, `Room type at index ${payload.index + 1}: Only image files are allowed. Videos are not supported.`, 400);
        }

        // Validate images using validation utilities (validates count, size, type, aspect ratio)
        const roomTypeImageValidation = await validateRoomTypeImages(imageFiles);
        if (!roomTypeImageValidation.valid) {
          return sendError(res, `Room type at index ${payload.index + 1} image validation failed`, 400, roomTypeImageValidation.errors);
        }

        // Get existing media count for this room type
        // For new room types, existingMedia will be empty
        const existingMediaPayload = payload.existingMedia || [];
        const activeExistingMedia = existingMediaPayload.filter((media) => !media.isDeleted);
        const existingMediaCount = activeExistingMedia.length;
        const totalMediaCount = existingMediaCount + imageFiles.length;

        // Validate total media count (existing + new) doesn't exceed 12 per room type
        if (totalMediaCount > 12) {
          return sendError(res, `Room type at index ${payload.index + 1}: Maximum 12 images allowed per room type. You have ${existingMediaCount} existing images and are trying to add ${imageFiles.length} new images (total: ${totalMediaCount}).`, 400);
        }
      }
    }

    await prisma.$transaction(async (tx) => {
      // Create new room types
      for (const payload of newRoomTypePayloads) {
        if (existingRoomTypeMap.has(payload.roomTypeData.roomTypeId)) {
          throw new Error('A room type with the same definition already exists for this property');
        }

        const createdRoomType = await tx.propertyRoomType.create({
          data: payload.roomTypeData,
        });

        payload.propertyRoomTypeId = createdRoomType.id;
        roomTypeAmenityMap.set(createdRoomType.id, payload.amenityIds);
        roomTypeExistingMediaMap.set(createdRoomType.id, []);
        existingRoomTypeMap.set(payload.roomTypeData.roomTypeId, createdRoomType.id);
      }

      // Update existing room type metadata
      for (const [propertyRoomTypeId, updatePayload] of roomTypeUpdateData.entries()) {
        if (updatePayload && Object.keys(updatePayload).length > 0) {
          await tx.propertyRoomType.update({
            where: { id: propertyRoomTypeId },
            data: updatePayload,
          });
        }
      }

      // Handle existing media updates (mark deleted, update order/featured)
      for (const payload of roomTypePayloads) {
        const propertyRoomTypeId = payload.propertyRoomTypeId;
        if (!propertyRoomTypeId) continue;

        const existingMediaPayload = payload.existingMedia || [];

        if (existingMediaPayload.length) {
          const deleteIds = existingMediaPayload
            .filter((media) => media.isDeleted && media.id)
            .map((media) => media.id);

          if (deleteIds.length) {
            await tx.propertyRoomTypeMedia.deleteMany({
              where: { id: { in: deleteIds } },
            });
          }

          const updateMediaEntries = existingMediaPayload.filter(
            (media) => !media.isDeleted && media.id
          );

          for (const media of updateMediaEntries) {
            await tx.propertyRoomTypeMedia.update({
              where: { id: media.id },
              data: {
                isFeatured: Boolean(media.isFeatured),
                order: typeof media.order === 'number' ? media.order : 0,
              },
            });
          }
        }
      }

      // Handle new media uploads
      for (const payload of roomTypePayloads) {
        const propertyRoomTypeId = payload.propertyRoomTypeId;
        if (!propertyRoomTypeId) continue;

        const roomTypeImageFiles = filesByField[`roomTypeImages_${payload.index}`] || [];
        if (!roomTypeImageFiles.length) continue;

        // Filter to only image files (already validated above, but ensure consistency)
        const imageFiles = roomTypeImageFiles.filter(file => file.mimetype?.startsWith('image/'));
        if (!imageFiles.length) continue;

        const existingMediaPayload = payload.existingMedia || [];
        const activeExistingMedia = existingMediaPayload.filter((media) => !media.isDeleted);
        const maxOrder = activeExistingMedia.length
          ? Math.max(
              ...activeExistingMedia.map((media) =>
                typeof media.order === 'number' ? media.order : 0
              )
            )
          : -1;
        const startOrder = maxOrder + 1;

        // Map new media files to payload (only images, as validated above)
        const mediaCreatePayload = imageFiles.map((file, fileIdx) => ({
          propertyRoomTypeId,
          url: fileToUrl(req, file),
          type: 'image', // Only images are allowed (videos removed for consistency)
          isFeatured: activeExistingMedia.length === 0 && fileIdx === 0,
          order: startOrder + fileIdx,
        }));

        if (mediaCreatePayload.length) {
          if (activeExistingMedia.length === 0) {
            mediaCreatePayload.forEach((entry, idx) => {
              entry.isFeatured = idx === 0;
            });
          }

          await tx.propertyRoomTypeMedia.createMany({
            data: mediaCreatePayload,
          });
        }
      }

      // Update amenities for each room type
      for (const [propertyRoomTypeId, amenityIds] of roomTypeAmenityMap.entries()) {
        await tx.propertyRoomTypeAmenity.deleteMany({
          where: { propertyRoomTypeId },
        });

        if (amenityIds.length) {
          await tx.propertyRoomTypeAmenity.createMany({
            data: amenityIds.map((amenityId) => ({
              propertyRoomTypeId,
              amenityId,
            })),
            skipDuplicates: true,
          });
        }
      }
    }, { timeout: MAX_TRANSACTION_TIMEOUT });

    return sendSuccess(res, null, 'Room types updated successfully');
  } catch (error) {
    console.error('updatePropertyRoomTypes error:', error);
    return sendError(res, 'Failed to update room types', 500);
  }
};

const updatePropertyMedia = async (req, res) => {
  try {
    const { id } = req.params;

    // Security: Verify property access (host can only modify their own properties)
    const accessResult = await verifyPropertyAccess({
      prisma,
      propertyId: id,
      user: req.user,
    });

    if (!accessResult.ok) {
      return sendError(res, accessResult.error.message, accessResult.error.status);
    }

    const guard = await ensureNotDeleted(prisma.property, id, 'Property');
    if (guard.error) {
      return sendError(res, guard.error, 404);
    }

    const { existingMedia, coverImageIndex } = req.body;

    const filesByField = (req.files || []).reduce((acc, file) => {
      (acc[file.fieldname] ||= []).push(file);
      return acc;
    }, {});

    const newMediaFiles = filesByField.media || [];

    // Parse existing media to get count
    const existingMediaPayload = buildMediaPayload(existingMedia);
    const existingMediaCount = existingMediaPayload.items.length;

    // Validate new media files using validation utilities
    // Only allow images (no videos) to match property creation
    if (newMediaFiles.length > 0) {
      // Filter to only image files (property creation only allows images)
      const imageFiles = newMediaFiles.filter(file => file.mimetype?.startsWith('image/'));
      
      if (imageFiles.length !== newMediaFiles.length) {
        return sendError(res, 'Only image files are allowed. Videos are not supported.', 400);
      }

      // Validate images using validation utilities (validates count, size, type, aspect ratio)
      const propertyImageValidation = await validatePropertyImages(imageFiles);
      if (!propertyImageValidation.valid) {
        return sendError(res, 'Property image validation failed', 400, propertyImageValidation.errors);
      }

      // Calculate total media count (existing + new images only)
      const totalMediaCount = existingMediaCount + imageFiles.length;

      // Validate total media count (existing + new) doesn't exceed 12
      if (totalMediaCount > 12) {
        return sendError(res, `Maximum 12 property images allowed. You have ${existingMediaCount} existing images and are trying to add ${imageFiles.length} new images (total: ${totalMediaCount}).`, 400);
      }

      // Use only validated image files (videos are already filtered out)
      // Update newMediaFiles to only contain validated images
      newMediaFiles.length = 0;
      newMediaFiles.push(...imageFiles);
    } else {
      // No new files, but validate existing count
      if (existingMediaCount === 0) {
        return sendError(res, 'At least one property image is required', 400);
      }
    }

    // Map new media files to payload (only images, as validated above)
    const newMediaPayload = newMediaFiles.map((file, index) => ({
      url: fileToUrl(req, file),
      type: 'image', // Only images are allowed (videos removed for consistency)
      isFeatured: false,
      order: existingMediaPayload.items.length + index,
    }));

    const combinedMedia = [...existingMediaPayload.items, ...newMediaPayload].map((item, index) => ({
      ...item,
      order: index,
    }));

    if (!combinedMedia.length) {
      return sendError(res, 'At least one property image is required', 400);
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

    await prisma.$transaction(async (tx) => {
      await tx.propertyMedia.deleteMany({ where: { propertyId: id } });

      await tx.propertyMedia.createMany({
        data: combinedMedia.map((media) => ({
          propertyId: id,
          url: media.url,
          type: media.type,
          isFeatured: media.isFeatured,
          order: media.order,
        })),
      });

      await tx.property.update({
        where: { id },
        data: { coverImage: coverImageUrl },
      });
    }, { timeout: MAX_TRANSACTION_TIMEOUT });

    return sendSuccess(res, null, 'Property media updated successfully');
  } catch (error) {
    console.error('updatePropertyMedia error:', error);
    return sendError(res, 'Failed to update property media', 500);
  }
};

const updatePropertyStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Security: Verify property access (host can only modify their own properties)
    const accessResult = await verifyPropertyAccess({
      prisma,
      propertyId: id,
      user: req.user,
    });

    if (!accessResult.ok) {
      return sendError(res, accessResult.error.message, accessResult.error.status);
    }

    // Validate status using Prisma enum values
    // PropertyStatus enum only has: 'active', 'blocked' (no 'inactive')
    if (!VALID_PROPERTY_STATUSES.includes(status)) {
      return sendError(res, `Invalid status value. Valid values are: ${VALID_PROPERTY_STATUSES.join(', ')}`, 400);
    }

    // Role-based status restrictions:
    // Hosts can only set 'active' status (cannot block their own properties)
    // Admins can set 'active' or 'blocked'
    if (req.user?.role === 'host') {
      if (status !== PROPERTY_STATUS_ACTIVE) {
        return sendError(res, 'Hosts can only set property status to "active". Only admins can block properties.', 403);
      }
    }

    const guard = await ensureNotDeleted(prisma.property, id, 'Property');
    if (guard.error) {
      return sendError(res, guard.error, 404);
    }

    await prisma.property.update({
      where: { id },
      data: { status },
    });

    return sendSuccess(res, null, 'Property status updated successfully');
  } catch (error) {
    console.error('updatePropertyStatus error:', error);
    return sendError(res, 'Failed to update property status', 500);
  }
};

const softDeleteProperty = async (req, res) => {
  try {
    const { id } = req.params;

     if (!id) {
      return sendError(res, 'Property ID is required', 400);
    }

    // Security: Verify property access (host can only delete their own properties)
    const accessResult = await verifyPropertyAccess({
      prisma,
      propertyId: id,
      user: req.user,
    });

     if (!accessResult.ok) {
      return sendError(
        res,
        accessResult.error.message,
        accessResult.error.status
      );
    }

    const guard = await ensureNotDeleted(prisma.property, id, 'Property');
    if (guard.error) {
      return sendError(res, guard.error, 404);
    }

    await prisma.property.update({
      where: { id },
      data: {
        isDeleted: true,
        status: 'active',
      },
    });

    return sendSuccess(res, null, 'Property deleted successfully');
  } catch (error) {
    console.error('softDeleteProperty error:', error);
    return sendError(res, 'Failed to delete property', 500);
  }
};

const deletePropertyRoomType = async (req, res) => {
  try {
    const { propertyId, roomTypeId } = req.params;

    if (!propertyId || !roomTypeId) {
      return sendError(res, 'Property identifier and room type identifier are required', 400);
    }

    // Security: Verify property access (host can only modify their own properties)
    const accessResult = await verifyPropertyAccess({
      prisma,
      propertyId: propertyId,
      user: req.user,
    });

    if (!accessResult.ok) {
      return sendError(res, accessResult.error.message, accessResult.error.status);
    }

    const property = await prisma.property.findFirst({
      where: { id: propertyId, isDeleted: false },
      select: { id: true },
    });

    if (!property) {
      return sendError(res, 'Property not found', 404);
    }

    const propertyRoomType = await prisma.propertyRoomType.findFirst({
      where: { id: roomTypeId, propertyId, isDeleted: false },
      select: { id: true },
    });

    if (!propertyRoomType) {
      return sendError(res, 'Room type not found for this property', 404);
    }

    // Check if this room type is used in any active bookings via BookingRoomSelection
    const activeBookingSelection = await prisma.bookingRoomSelection.findFirst({
      where: {
        roomTypeId: roomTypeId,
        booking: {
          isDeleted: false,
          status: { in: ['pending', 'confirmed'] },
        },
      },
      select: {
        id: true,
        booking: {
          select: {
            id: true,
            bookingNumber: true,
          },
        },
      },
    });

    if (activeBookingSelection) {
      return sendError(
        res,
        `Cannot delete this room type while there are active or upcoming bookings linked to it (e.g., booking ${activeBookingSelection.booking.bookingNumber}).`,
        409
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.propertyRoomTypeAmenity.updateMany({
        where: { propertyRoomTypeId: roomTypeId, isDeleted: false },
        data: { isDeleted: true },
      });

      await tx.propertyRoomTypeMedia.updateMany({
        where: { propertyRoomTypeId: roomTypeId, isDeleted: false },
        data: { isDeleted: true },
      });

      await tx.room.updateMany({
        where: { propertyRoomTypeId: roomTypeId, isDeleted: false },
        data: { isDeleted: true, status: 'inactive' },
      });

      await tx.propertyRoomType.update({
        where: { id: roomTypeId },
        data: { isDeleted: true, isActive: false },
      });
    }, { timeout: MAX_TRANSACTION_TIMEOUT });

    return sendSuccess(res, null, 'Room type removed from property successfully');
  } catch (error) {
    console.error('deletePropertyRoomType error:', error);
    return sendError(res, 'Failed to delete property room type', 500);
  }
};

const updatePropertyTax = async (req, res) => {
  try {
    const { id } = req.params;

    // Security: Verify property access (host can only modify their own properties)
    const accessResult = await verifyPropertyAccess({
      prisma,
      propertyId: id,
      user: req.user,
    });

    if (!accessResult.ok) {
      return sendError(res, accessResult.error.message, accessResult.error.status);
    }

    const guard = await ensureNotDeleted(prisma.property, id, 'Property');
    if (guard.error) {
      return sendError(res, guard.error, 404);
    }

    const { taxSlabs, cessRate } = req.body;

    // Validate and parse tax slabs if provided
    let taxSlabsValue = null;
    if (taxSlabs !== undefined && taxSlabs !== null && taxSlabs !== '') {
      let parsedTaxSlabs;
      try {
        parsedTaxSlabs = typeof taxSlabs === 'string' ? JSON.parse(taxSlabs) : taxSlabs;
      } catch (err) {
        return sendError(res, 'Invalid taxSlabs format. Expected a valid JSON array.', 400);
      }

      if (!Array.isArray(parsedTaxSlabs)) {
        return sendError(res, 'taxSlabs must be an array', 400);
      }

      if (parsedTaxSlabs.length === 0) {
        return sendError(res, 'taxSlabs array cannot be empty. At least one tax slab is required if taxSlabs is provided.', 400);
      }

      // Validate each tax slab
      for (let i = 0; i < parsedTaxSlabs.length; i++) {
        const slab = parsedTaxSlabs[i];
        
        if (!slab || typeof slab !== 'object') {
          return sendError(res, `Tax slab at index ${i} must be an object`, 400);
        }

        // Validate min
        if (typeof slab.min !== 'number' || slab.min < 0 || !Number.isInteger(slab.min)) {
          return sendError(res, `Tax slab at index ${i}: min must be a non-negative integer`, 400);
        }

        // Validate max (can be null or number)
        if (slab.max !== null && (typeof slab.max !== 'number' || slab.max < slab.min || !Number.isInteger(slab.max))) {
          return sendError(res, `Tax slab at index ${i}: max must be null or an integer >= min`, 400);
        }

        // Validate rate
        if (typeof slab.rate !== 'number' || slab.rate < 0 || slab.rate > 100) {
          return sendError(res, `Tax slab at index ${i}: rate must be a number between 0 and 100`, 400);
        }

        // Check for gaps or overlaps with previous slab
        if (i > 0) {
          const prevSlab = parsedTaxSlabs[i - 1];
          const prevMax = prevSlab.max === null ? Infinity : prevSlab.max;
          
          if (slab.min > prevMax + 1) {
            return sendError(res, `Tax slab at index ${i}: gap detected. min (${slab.min}) should be <= ${prevMax + 1}`, 400);
          }
          
          if (slab.min <= prevMax && prevSlab.max !== null) {
            return sendError(res, `Tax slab at index ${i}: overlap detected with previous slab. min (${slab.min}) should be > ${prevMax}`, 400);
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
        return sendError(res, 'CESS rate must be a number between 0 and 100', 400);
      }
      cessRateValue = cessNum;
    }
    // If cessRate is null or empty string, allow clearing (cessRateValue stays null)

    const updateData = {};
    
    // Only include taxSlabs if provided and not null
    if (taxSlabsValue !== null) {
      updateData.taxSlabs = taxSlabsValue;
    }
    
    // Include cessRate in update if explicitly provided (even if null to clear it)
    // If cessRate is undefined, don't include it (no change)
    if (cessRate !== undefined) {
      updateData.cessRate = cessRateValue;
    }

    // Only update if there's data to update
    // Note: If taxSlabs is explicitly provided as empty array, we allow clearing it by not including it
    // But if taxSlabs is provided and not empty, we require at least one valid slab
    if (Object.keys(updateData).length === 0) {
      return sendError(res, 'No tax configuration data provided for update', 400);
    }

    // Use transaction for consistency (even though single update is atomic)
    await prisma.$transaction(async (tx) => {
      await tx.property.update({
        where: { id },
        data: updateData,
      });
    });

    return sendSuccess(res, null, 'Tax configuration updated successfully');
  } catch (error) {
    console.error('updatePropertyTax error:', error);
    return sendError(res, 'Failed to update tax configuration', 500);
  }
};

module.exports = {
  getPropertyForEdit,
  updateProperty,
  updatePropertyStatus,
  softDeleteProperty,
  updatePropertyBasics,
  updatePropertyLocation,
  updatePropertyPolicy,
  updatePropertyFeatures,
  updatePropertyRoomTypes,
  updatePropertyMedia,
  updatePropertyTax,
  deletePropertyRoomType,
};

