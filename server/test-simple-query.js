const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testSimpleQuery() {
  try {
    console.log('Testing simple room query...');
    
    // Test 1: Get all rooms
    const rooms = await prisma.room.findMany({
      take: 5,
      include: {
        propertyRoomType: {
          select: {
            id: true,
            propertyId: true,
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
    
    // Test 2: Get rooms for specific property
    const propertyId = 'ebf9aafc-03d3-438a-848e-140ecca1223e';
    const propertyRooms = await prisma.room.findMany({
      where: {
        isDeleted: false,
        propertyRoomType: {
          propertyId: propertyId
        }
      },
      take: 3,
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
    
    console.log('Property rooms:', propertyRooms.length);
    console.log('Sample property room:', propertyRooms[0]);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testSimpleQuery();
