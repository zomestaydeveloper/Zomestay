const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getAvailableRooms = async (req, res) => {
  try {
    const { propertyId, roomTypeIds, checkIn, checkOut, roomsNeeded } = req.query;
    
    console.log('Received request:', { propertyId, roomTypeIds, checkIn, checkOut, roomsNeeded });
    
    if (!propertyId) {
      return res.status(400).json({
        success: false,
        message: 'Property ID is required'
      });
    }

    // Parse roomTypeIds if provided
    let roomTypeIdArray = [];
    try {
      roomTypeIdArray = roomTypeIds ? JSON.parse(roomTypeIds) : [];
    } catch (error) {
      console.error('Error parsing roomTypeIds:', error);
      return res.status(400).json({
        success: false,
        message: 'Invalid roomTypeIds format'
      });
    }
    const roomsNeededCount = parseInt(roomsNeeded) || 1;

    // Validate dates if provided
    let dateFilter = {};
    if (checkIn && checkOut) {
      const startDate = new Date(checkIn);
      const endDate = new Date(checkOut);
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid check-in or check-out dates'
        });
      }

      if (startDate >= endDate) {
        return res.status(400).json({
          success: false,
          message: 'Check-out date must be after check-in date'
        });
      }

      // Create date range for availability check
      dateFilter = {
        date: {
          gte: startDate,
          lt: endDate
        }
      };
    }

    // Get rooms for the property
    console.log('Fetching rooms for property:', propertyId);
    let rooms = [];
    try {
      rooms = await prisma.room.findMany({
        where: {
          isDeleted: false,
          propertyRoomType: {
            propertyId: propertyId,
            ...(roomTypeIdArray.length > 0 && {
              id: {
                in: roomTypeIdArray
              }
            })
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
    } catch (error) {
      console.error('Error fetching rooms:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch rooms',
        error: error.message
      });
    }

    // If dates are provided, check availability
    let availableRooms = rooms;
    if (checkIn && checkOut) {
      // Generate all required dates for the stay
      const startDate = new Date(checkIn);
      const endDate = new Date(checkOut);
      const requiredDates = [];
      
      for (let d = new Date(startDate); d < endDate; d.setDate(d.getDate() + 1)) {
        requiredDates.push(d.toISOString().split('T')[0]);
      }

      console.log('Required dates for stay:', requiredDates);

      // Get ALL room unavailability records for the date range
      let allUnavailableRooms = [];
      try {
        allUnavailableRooms = await prisma.availability.findMany({
          where: {
            roomId: {
              in: rooms.map(room => room.id)
            },
            date: {
              gte: startDate,
              lt: endDate
            },
            status: {
              in: ['booked', 'maintenance', 'blocked', 'out_of_service']
            }
          },
          select: {
            roomId: true,
            date: true,
            status: true
          }
        });

        console.log('Found unavailable rooms:', allUnavailableRooms.length);
      } catch (error) {
        console.error('Error fetching availability:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch room availability',
          error: error.message
        });
      }

      // Group unavailable rooms by room ID and date
      const unavailableRoomsByRoom = {};
      allUnavailableRooms.forEach(unavailable => {
        if (!unavailableRoomsByRoom[unavailable.roomId]) {
          unavailableRoomsByRoom[unavailable.roomId] = new Set();
        }
        unavailableRoomsByRoom[unavailable.roomId].add(unavailable.date.toISOString().split('T')[0]);
      });

      // Check each room for complete availability (same room for all dates)
      availableRooms = rooms.filter(room => {
        const roomUnavailableDates = unavailableRoomsByRoom[room.id] || new Set();
        
        // Check if room is available for ALL required dates
        const isAvailableForAllDates = requiredDates.every(date => 
          !roomUnavailableDates.has(date)
        );

        console.log(`Room ${room.name}:`, {
          unavailableDates: Array.from(roomUnavailableDates),
          requiredDates: requiredDates,
          isAvailable: isAvailableForAllDates
        });

        return isAvailableForAllDates;
      });

      console.log(`Available rooms for complete stay: ${availableRooms.length}/${rooms.length}`);
    }

    // Group rooms by room type
    const roomsByType = {};
    availableRooms.forEach(room => {
      const roomTypeId = room.propertyRoomTypeId;
      if (!roomsByType[roomTypeId]) {
        roomsByType[roomTypeId] = {
          roomTypeId: roomTypeId,
          roomTypeName: room.propertyRoomType.roomType.name,
          rooms: [],
          totalAvailable: 0
        };
      }
      roomsByType[roomTypeId].rooms.push({
        id: room.id,
        name: room.name,
        code: room.code
      });
      roomsByType[roomTypeId].totalAvailable++;
    });

    // Check if we have enough rooms for each type
    const result = Object.values(roomsByType).map(roomType => ({
      ...roomType,
      hasEnoughRooms: roomType.totalAvailable >= 1, // Always show if at least 1 room is available
      shortage: Math.max(0, roomsNeededCount - roomType.totalAvailable)
    }));

    res.json({
      success: true,
      data: result,
      summary: {
        totalRoomTypes: result.length,
        availableRoomTypes: result.filter(rt => rt.hasEnoughRooms).length,
        insufficientRoomTypes: result.filter(rt => !rt.hasEnoughRooms).length
      }
    });

  } catch (error) {
    console.error('Error fetching available rooms:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available rooms',
      error: error.message
    });
  }
};

module.exports = {
  getAvailableRooms
};
