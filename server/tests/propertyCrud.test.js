const request = require('supertest');
const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');

const app = require('./app');

const prisma = new PrismaClient();

const ONE_PIXEL_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIW2P4//8/AwAI/AL+X2VINwAAAABJRU5ErkJggg==';

const createTempImage = (filename) => {
  const filePath = path.join(__dirname, filename);
  fs.writeFileSync(filePath, Buffer.from(ONE_PIXEL_PNG, 'base64'));
  return filePath;
};

const deleteIfExists = (filePath) => {
  if (!filePath) return;
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn(`⚠️  Failed to delete temp file ${filePath}:`, error.message);
  }
};

describe('Property CRUD Integration', () => {
  const ctx = {
    cleanupFiles: new Set(),
  };

  beforeAll(async () => {
    ctx.unique = `property-test-${Date.now()}`;
    ctx.location = {
      address: {
        street: '123 Test Street',
        city: 'Test City',
        state: 'Test State',
        zipCode: '123456',
        country: 'India',
      },
      coordinates: {
        latitude: '11.11',
        longitude: '77.77',
      },
    };

    ctx.host = await prisma.host.create({
      data: {
        email: `${ctx.unique}@host.test`,
        password: 'hashed-password',
        firstName: 'Test',
        lastName: 'Host',
        phone: '9999999999',
      },
    });

    ctx.propertyType = await prisma.propertyType.create({
      data: {
        name: `Type ${ctx.unique}`,
      },
    });

    ctx.cancellationPolicy = await prisma.cancellationPolicy.create({
      data: {
        name: `Policy ${ctx.unique}`,
        description: 'Test cancellation policy',
        rules: {
          create: [
            { daysBefore: 7, refundPercentage: 100, sortOrder: 1 },
            { daysBefore: 1, refundPercentage: 50, sortOrder: 2 },
          ],
        },
      },
    });

    ctx.amenity = await prisma.amenity.create({
      data: {
        name: `Amenity ${ctx.unique}`,
        category: 'OTHER',
      },
    });

    ctx.facility = await prisma.facility.create({
      data: {
        name: `Facility ${ctx.unique}`,
        category: 'OTHER',
      },
    });

    ctx.safety = await prisma.safetyHygiene.create({
      data: {
        name: `Safety ${ctx.unique}`,
        category: 'OTHER',
      },
    });

    ctx.roomTypeCatalog = await prisma.roomType.create({
      data: {
        name: `Room Type ${ctx.unique}`,
        status: 'active',
      },
    });
  });

  afterAll(async () => {
    if (ctx.propertyId) {
      const propertyRoomTypes = await prisma.propertyRoomType.findMany({
        where: { propertyId: ctx.propertyId },
        select: { id: true },
      });
      const roomTypeIds = propertyRoomTypes.map((item) => item.id);

      const collectMediaPaths = async () => {
        const propertyMedia = await prisma.propertyMedia.findMany({
          where: { propertyId: ctx.propertyId },
        });
        propertyMedia.forEach((media) => {
          if (media.url) {
            ctx.cleanupFiles.add(
              path.join(__dirname, '..', media.url.replace(/^\//, ''))
            );
          }
        });

        if (roomTypeIds.length) {
          const roomTypeMedia = await prisma.propertyRoomTypeMedia.findMany({
            where: { propertyRoomTypeId: { in: roomTypeIds } },
          });
          roomTypeMedia.forEach((media) => {
            if (media.url) {
              ctx.cleanupFiles.add(
                path.join(__dirname, '..', media.url.replace(/^\//, ''))
              );
            }
          });
        }
      };

      await collectMediaPaths();

      if (roomTypeIds.length) {
        await prisma.propertyRoomTypeMedia.deleteMany({
          where: { propertyRoomTypeId: { in: roomTypeIds } },
        });
        await prisma.propertyRoomTypeAmenity.deleteMany({
          where: { propertyRoomTypeId: { in: roomTypeIds } },
        });
        await prisma.propertyRoomType.deleteMany({
          where: { id: { in: roomTypeIds } },
        });
      }

      await prisma.propertyMedia.deleteMany({ where: { propertyId: ctx.propertyId } });
      await prisma.propertyAmenity.deleteMany({ where: { propertyId: ctx.propertyId } });
      await prisma.propertyFacility.deleteMany({ where: { propertyId: ctx.propertyId } });
      await prisma.propertySafety.deleteMany({ where: { propertyId: ctx.propertyId } });
      await prisma.property.deleteMany({ where: { id: ctx.propertyId } });
    }

    await prisma.propertyType.deleteMany({
      where: { id: ctx.propertyType.id },
    });
    await prisma.cancellationPolicy.deleteMany({
      where: { id: ctx.cancellationPolicy.id },
    });
    await prisma.amenity.deleteMany({ where: { id: ctx.amenity.id } });
    await prisma.facility.deleteMany({ where: { id: ctx.facility.id } });
    await prisma.safetyHygiene.deleteMany({ where: { id: ctx.safety.id } });
    await prisma.roomType.deleteMany({ where: { id: ctx.roomTypeCatalog.id } });
    await prisma.host.deleteMany({ where: { id: ctx.host.id } });

    ctx.cleanupFiles.forEach(deleteIfExists);
  });

  const appendCleanupFile = (filePath) => {
    if (filePath) {
      ctx.cleanupFiles.add(filePath);
    }
  };

  it('creates a property with media and room types', async () => {
    const propertyImage = createTempImage(`property-create-${ctx.unique}.png`);
    const roomTypeImage = createTempImage(`roomtype-create-${ctx.unique}.png`);
    appendCleanupFile(propertyImage);
    appendCleanupFile(roomTypeImage);

    const roomTypesPayload = [
      {
        roomTypeId: ctx.roomTypeCatalog.id,
        minOccupancy: 1,
        Occupancy: 2,
        extraBedCapacity: 0,
        numberOfBeds: 1,
        bedType: 'DOUBLE',
        amenityIds: [ctx.amenity.id],
      },
    ];

    const response = await request(app)
      .post('/properties')
      .field('title', `Test Property ${ctx.unique}`)
      .field('description', 'Beautiful property for integration tests')
      .field('rulesAndPolicies', 'Rule one, Rule two')
      .field('status', 'active')
      .field('propertyTypeId', ctx.propertyType.id)
      .field('ownerHostId', ctx.host.email)
      .field('location', JSON.stringify(ctx.location))
      .field('cancellationPolicyId', ctx.cancellationPolicy.id)
      .field('amenityIds', ctx.amenity.id)
      .field('facilityIds', ctx.facility.id)
      .field('safetyIds', ctx.safety.id)
      .field('roomtypes', JSON.stringify(roomTypesPayload))
      .attach('media', propertyImage)
      .attach('roomTypeImages_0', roomTypeImage)
      .expect(201);

    expect(response.body.success).toBe(true);

    const property = await prisma.property.findFirst({
      where: { title: `Test Property ${ctx.unique}` },
      include: {
        media: true,
        amenities: true,
        facilities: true,
        safeties: true,
        roomTypes: {
          include: {
            media: true,
            amenities: true,
          },
        },
      },
    });

    expect(property).toBeTruthy();
    ctx.propertyId = property.id;
    expect(property.media).toHaveLength(1);
    expect(property.coverImage).toEqual(property.media[0].url);
    expect(property.roomTypes).toHaveLength(1);
    expect(property.roomTypes[0].media).toHaveLength(1);
    expect(property.roomTypes[0].amenities).toHaveLength(1);
  });

  it('retrieves property edit payload with media references', async () => {
    const response = await request(app)
      .get(`/properties/${ctx.propertyId}/edit`)
      .expect(200);

    expect(response.body.success).toBe(true);
    const data = response.body.data;
    expect(data.id).toBe(ctx.propertyId);
    expect(data.media).toHaveLength(1);
    expect(data.roomTypes[0].media).toHaveLength(1);
    expect(data.roomTypes[0].amenityIds).toHaveLength(1);
  });

  it('updates property details, media and room type media', async () => {
    const propertyBefore = await prisma.property.findUnique({
      where: { id: ctx.propertyId },
      include: {
        media: true,
        roomTypes: {
          include: {
            media: true,
            amenities: {
              include: { amenity: true },
            },
          },
        },
      },
    });

    const propertyRoomType = propertyBefore.roomTypes[0];
    const roomTypeMedia = propertyRoomType.media[0];

    const newPropertyImage = createTempImage(`property-update-${ctx.unique}.png`);
    const newRoomTypeImage = createTempImage(`roomtype-update-${ctx.unique}.png`);
    appendCleanupFile(newPropertyImage);
    appendCleanupFile(newRoomTypeImage);

    const roomTypesPayload = [
      {
        id: propertyRoomType.id,
        roomTypeId: ctx.roomTypeCatalog.id,
        minOccupancy: 1,
        Occupancy: 3,
        extraBedCapacity: 1,
        numberOfBeds: 2,
        bedType: 'KING',
        amenityIds: [ctx.amenity.id],
        existingMedia: [
          {
            id: roomTypeMedia.id,
            isDeleted: true,
            isFeatured: false,
          },
        ],
      },
    ];

    await request(app)
      .put(`/properties/${ctx.propertyId}/edit`)
      .field('title', `Updated Property ${ctx.unique}`)
      .field('description', 'Updated description for property integration test')
      .field('rulesAndPolicies', 'Updated rule')
      .field('status', 'active')
      .field('propertyTypeId', ctx.propertyType.id)
      .field('ownerHostId', ctx.host.email)
      .field('cancellationPolicyId', ctx.cancellationPolicy.id)
      .field('location', JSON.stringify(ctx.location))
      .field('amenityIds', ctx.amenity.id)
      .field('facilityIds', ctx.facility.id)
      .field('safetyIds', ctx.safety.id)
      .field('roomtypes', JSON.stringify(roomTypesPayload))
      .field('coverImageIndex', '0')
      .attach('media', newPropertyImage)
      .attach('roomTypeImages_0', newRoomTypeImage)
      .expect(200);

    const updatedProperty = await prisma.property.findUnique({
      where: { id: ctx.propertyId },
      include: {
        media: true,
        roomTypes: {
          include: {
            media: true,
          },
        },
      },
    });

    expect(updatedProperty.title).toBe(`Updated Property ${ctx.unique}`);
    expect(updatedProperty.media).toHaveLength(1);
    expect(updatedProperty.media[0].url).not.toBe(propertyBefore.media[0].url);
    expect(updatedProperty.coverImage).toBe(updatedProperty.media[0].url);

    const updatedRoomType = await prisma.propertyRoomType.findUnique({
      where: { id: propertyRoomType.id },
      include: { media: true },
    });

    expect(updatedRoomType.Occupancy).toBe(3);
    expect(updatedRoomType.extraBedCapacity).toBe(1);
    expect(updatedRoomType.numberOfBeds).toBe(2);
    expect(updatedRoomType.bedType).toBe('KING');
    expect(updatedRoomType.media).toHaveLength(1);
    expect(updatedRoomType.media[0].url).not.toBe(roomTypeMedia.url);
  });

  it('updates property status', async () => {
    await request(app)
      .patch(`/properties/${ctx.propertyId}/status`)
      .send({ status: 'blocked' })
      .expect(200);

    const property = await prisma.property.findUnique({
      where: { id: ctx.propertyId },
    });

    expect(property.status).toBe('blocked');
  });

  it('soft deletes property', async () => {
    await request(app)
      .delete(`/properties/${ctx.propertyId}`)
      .expect(200);

    const property = await prisma.property.findUnique({
      where: { id: ctx.propertyId },
    });

    expect(property.isDeleted).toBe(true);
    expect(property.status).toBe('active');
  });
});

