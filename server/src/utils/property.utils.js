const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Date helpers
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

// Fetch available properties with room availability
async function fetchAvailableProperties(startDate, endDate, guestNeeds, totalBedsNeeded) {
  console.log('\n=== Fetching Available Properties ===');
  console.log('Date Range:', { startDate: startDate.toISOString(), endDate: endDate.toISOString() });
  console.log('Guest Needs:', guestNeeds);
  console.log('Total Beds Needed:', totalBedsNeeded);

  const availableRoomIds = await fetchAvailableRoomIds(startDate, endDate);
  
  if (availableRoomIds.size === 0) {
    console.log('No available rooms found for the date range');
    return [];
  }
  
  // 2. Find properties with enough total capacity
  const properties = await prisma.property.findMany({
    where: {
      isDeleted: false,
      status: 'active',
      roomTypes: {
        some: {
          isDeleted: false,
          isActive: true,
          rooms: {
            some: {
              id: { in: Array.from(availableRoomIds) },
              isDeleted: false,
              status: 'active'
            }
          }
        }
      }
    },
    include: {
      roomTypes: {
        where: {
          isDeleted: false,
          isActive: true
        },
        select: {
          id: true,
          Occupancy: true,
          extraBedCapacity: true,
          minOccupancy: true,
          maxOccupancy: true,
          numberOfBeds: true,
          bedType: true,
          roomType: {
            select:{
              name:true,
              status:true,
              isDeleted:true
            }
          },
          rooms: {
            where: {
              id: { in: Array.from(availableRoomIds) },
              isDeleted: false,
              status: 'active'
            },
            select: {
              id: true,
              name: true,
              code: true,
              status: true
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
        }
      },
      // Include other property relations as needed
      propertyType: {
        where: { isDeleted: false },
        select: {
          id: true,
          name: true
        }
      },
      amenities: {
        where: { isDeleted: false },
        include: { amenity: true }
      },
      facilities: {
        where: { isDeleted: false },
        include: { facility: true }
      },
      safeties: {
        where: { isDeleted: false },
        include: { safety: true }
      },
      media: {
        where: { isDeleted: false }
      },
      ownerHost: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true
        }
      },
      reviews: {
        where: { isDeleted: false },
        select: {
          id: true,
          rating: true
        }
      }
    }
  });

  // 3. Filter properties that have enough total capacity AND enough available rooms
  const validProperties = properties.filter(property => {
    // Calculate total capacity from available rooms only
    const totalCapacity = property.roomTypes.reduce((sum, rt) => {
      // Only count rooms that are in the availableRoomIds set
      const availableRoomsCount = rt.rooms.filter(r => availableRoomIds.has(r.id)).length;
      const roomTypeCapacity = (rt.Occupancy + rt.extraBedCapacity) * availableRoomsCount;
      return sum + roomTypeCapacity;
    }, 0);

    // Calculate total available rooms count
    const totalAvailableRooms = property.roomTypes.reduce((sum, rt) => {
      return sum + rt.rooms.filter(r => availableRoomIds.has(r.id)).length;
    }, 0);

    // Check if property has enough capacity and enough rooms
    const hasEnoughCapacity = totalCapacity >= totalBedsNeeded;
    const hasEnoughRooms = totalAvailableRooms >= 1; // At least 1 room available

    if (hasEnoughCapacity && hasEnoughRooms) {
      console.log(`Property ${property.id} - Capacity: ${totalCapacity}, Needed: ${totalBedsNeeded}, Rooms: ${totalAvailableRooms}`);
    }

    return hasEnoughCapacity && hasEnoughRooms;
  });

  console.log(`\nValid Properties: ${validProperties.length} of ${properties.length}`);

  return validProperties;
}

// Fetch available room IDs for the given date range
async function fetchAvailableRoomIds(startDate, endDate) {
  
  // First get all active rooms from active properties
  const activeRooms = await prisma.room.findMany({
    where: {
      isDeleted: false,
      status: 'active',
      propertyRoomType: {
        isDeleted: false,
        isActive: true,
        property: {
          isDeleted: false,
          status: 'active'
        }
      }
    },
    select: {
      id: true,
      propertyRoomTypeId: true,
      propertyRoomType: {
        select: {
          propertyId: true
        }
      }
    }
  });

  const validRoomIds = new Set(activeRooms.map(r => r.id));

  if (validRoomIds.size === 0) {
    console.log('No active rooms found');
    return new Set();
  }

  console.log('\nTotal Active Rooms:', validRoomIds.size);

  // Get all unavailable rooms for the date range
  // Unavailable means: has availability record with status 'booked', 'maintenance', 'blocked', 'out_of_service'
  // OR has confirmed/cancelled bookings (excluding completed)
  const unavailableRoomRecords = await prisma.availability.findMany({
    where: {
      roomId: { in: Array.from(validRoomIds) },
      date: {
        gte: startDate,
        lt: endDate
      },
      isDeleted: false,
      status: {
        in: ['booked', 'maintenance', 'blocked', 'out_of_service']
      }
    },
    select: {
      roomId: true,
      date: true
    }
  });

  // Get bookings with confirmed/pending status that overlap the date range
  // Include bookingRoomSelections to get all rooms per booking
  const bookedRooms = await prisma.booking.findMany({
    where: {
      isDeleted: false,
      status: {
        in: ['confirmed', 'pending'] // Include pending as they're blocking rooms
      },
      // Booking overlaps if: startDate < checkOut AND endDate > checkIn
      OR: [
        {
          AND: [
            { startDate: { lt: endDate } },
            { endDate: { gt: startDate } }
          ]
        }
      ]
    },
    select: {
      id: true,
      startDate: true,
      endDate: true,
      bookingRoomSelections: {
        select: {
          id: true,
          roomIds: true, // JSON array of room IDs
          checkIn: true,
          checkOut: true,
          datesReserved: true, // JSON array of date strings
        },
      },
    },
  });

  // Build a set of room IDs that are unavailable for at least one day in the range
  const unavailableRoomsByDate = new Map();
  
  // Track unavailable rooms from Availability table
  unavailableRoomRecords.forEach(record => {
    const dateKey = record.date.toISOString().split('T')[0];
    if (!unavailableRoomsByDate.has(dateKey)) {
      unavailableRoomsByDate.set(dateKey, new Set());
    }
    unavailableRoomsByDate.get(dateKey).add(record.roomId);
  });

  // Track unavailable rooms from Bookings table
  // For each booking, iterate through bookingRoomSelections and mark all rooms as unavailable
  bookedRooms.forEach(booking => {
    if (!booking.bookingRoomSelections || booking.bookingRoomSelections.length === 0) {
      // Fallback: use booking-level dates if no room selections (legacy bookings)
      const bookingStart = dayUTC(booking.startDate);
      const bookingEnd = dayUTC(booking.endDate);
      let currentDate = new Date(bookingStart);
      
      while (currentDate < bookingEnd) {
        const dateKey = currentDate.toISOString().split('T')[0];
        
        // Only mark unavailable if date falls within our search range
        if (currentDate >= startDate && currentDate < endDate) {
          if (!unavailableRoomsByDate.has(dateKey)) {
            unavailableRoomsByDate.set(dateKey, new Set());
          }
          // Skip if no room ID available (legacy booking without roomId)
        }
        
        currentDate.setUTCDate(currentDate.getUTCDate() + 1);
      }
      return;
    }

    // Process each room selection in the booking
    booking.bookingRoomSelections.forEach(selection => {
      // Parse roomIds from JSON array
      const roomIds = Array.isArray(selection.roomIds)
        ? selection.roomIds
        : typeof selection.roomIds === 'string'
        ? JSON.parse(selection.roomIds || '[]')
        : [];

      if (roomIds.length === 0) {
        return; // Skip if no rooms in this selection
      }

      // Determine date range for this selection
      let selectionDates = [];
      
      // Use datesReserved if available (more accurate)
      if (selection.datesReserved) {
        selectionDates = Array.isArray(selection.datesReserved)
          ? selection.datesReserved
          : typeof selection.datesReserved === 'string'
          ? JSON.parse(selection.datesReserved || '[]')
          : [];
      }
      
      // Fallback: generate dates from checkIn to checkOut
      if (selectionDates.length === 0) {
        const selectionCheckIn = selection.checkIn ? dayUTC(selection.checkIn) : dayUTC(booking.startDate);
        const selectionCheckOut = selection.checkOut ? dayUTC(selection.checkOut) : dayUTC(booking.endDate);
        let currentDate = new Date(selectionCheckIn);
        
        while (currentDate < selectionCheckOut) {
          const dateKey = currentDate.toISOString().split('T')[0];
          selectionDates.push(dateKey);
          currentDate.setUTCDate(currentDate.getUTCDate() + 1);
        }
      }

      // Mark all rooms in this selection as unavailable for all dates
      selectionDates.forEach(dateKey => {
        // Only mark unavailable if date falls within our search range
        const dateObj = new Date(dateKey + 'T00:00:00.000Z');
        if (dateObj >= startDate && dateObj < endDate) {
          if (!unavailableRoomsByDate.has(dateKey)) {
            unavailableRoomsByDate.set(dateKey, new Set());
          }
          
          // Mark all rooms in this selection as unavailable for this date
          roomIds.forEach(roomId => {
            unavailableRoomsByDate.get(dateKey).add(roomId);
          });
        }
      });
    });
  });

  // Generate all dates in the search range
  const requiredDates = [];
  let currentDate = new Date(startDate);
  while (currentDate < endDate) {
    requiredDates.push(currentDate.toISOString().split('T')[0]);
    currentDate.setUTCDate(currentDate.getUTCDate() + 1);
  }

  const requiredNights = requiredDates.length;

  // Find rooms that are available for ALL dates in the range
  // A room is available if it doesn't appear in unavailableRoomsByDate for ANY required date
  const availableRoomIds = new Set();
  
  for (const roomId of validRoomIds) {
    let isAvailable = true;
    
    // Check if room is unavailable for any required date
    for (const dateKey of requiredDates) {
      const unavailableForDate = unavailableRoomsByDate.get(dateKey);
      if (unavailableForDate && unavailableForDate.has(roomId)) {
        isAvailable = false;
        break;
      }
    }
    
    if (isAvailable) {
      availableRoomIds.add(roomId);
    }
  }

  console.log('\nAvailable Rooms for Date Range:', {
    totalRooms: validRoomIds.size,
    availableRooms: availableRoomIds.size,
    unavailableFromAvailability: unavailableRoomRecords.length,
    bookings: bookedRooms.length
  });

  return availableRoomIds;
}



// Calculate room assignments and total price
function calculateRoomAssignments(properties, guestNeeds, infantsNeedBed, nights, dateList) {
  const results = [];

  for (const property of properties) {
    if (!property.roomTypes?.length) continue;

    // Calculate total capacity for each room type
    const totalCapacity = property.roomTypes.reduce((sum, rt) => {
      const roomTypeCapacity = (rt.Occupancy + rt.extraBedCapacity) * rt.rooms.length;
      console.log('RoomType:', rt.roomType?.name, 
                  'Base Occupancy:', rt.Occupancy,
                  'Extra Capacity:', rt.extraBedCapacity,
                  'Rooms:', rt.rooms.length,
                  'Total Capacity:', roomTypeCapacity);
      return sum + roomTypeCapacity;
    }, 0);

    console.log(`Property ${property.id} total capacity:`, totalCapacity);

    const totalGuests = guestNeeds.adults + guestNeeds.children + 
      (infantsNeedBed ? guestNeeds.infants : 0);

    if (totalCapacity >= totalGuests) {
      const propertyResult = {
        property: {
          ...property,
          amenities: property.amenities?.map(a => a.amenity) || [],
          facilities: property.facilities?.map(f => f.facility) || [],
          safeties: property.safeties?.map(s => s.safety) || []
        },
        totalCapacity,
        availableRooms: property.roomTypes.flatMap(rt => rt.rooms),
        nights
      };
      results.push(propertyResult);
    }
  }

  return results;
}

module.exports = {
  dayUTC,
  diffNights,
  eachDateUTC,
  fetchAvailableProperties,
  calculateRoomAssignments
};










