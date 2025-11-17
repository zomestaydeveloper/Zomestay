const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testRoomsQuery() {
  try {
    const propertyId = 'ebf9aafc-03d3-438a-848e-140ecca1223e';
    
    console.log('Testing rooms query for property:', propertyId);
    
    // Test 1: Get all rooms for property
    const rooms = await prisma.room.findMany({
      where: {
        isDeleted: false,
        propertyRoomType: {
          propertyId: propertyId
        }
      },
      include: {
        propertyRoomType: {
          select: {
            id: true,
            roomType: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });
    
    console.log('Found rooms:', rooms.length);
    console.log('Sample room:', rooms[0]);
    
    // Test 2: Check if property exists
    const property = await prisma.property.findUnique({
      where: { id: propertyId }
    });
    
    console.log('Property exists:', !!property);
    
    // Test 3: Check property room types
    const propertyRoomTypes = await prisma.propertyRoomType.findMany({
      where: { propertyId: propertyId }
    });
    
    console.log('Property room types:', propertyRoomTypes.length);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testRoomsQuery();
