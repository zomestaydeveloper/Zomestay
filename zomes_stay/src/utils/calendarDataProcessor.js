const processCalendarData = (propertyData) => {
  // Stores processed data by date: { [date]: { minRate, isAvailable, specialRate, finalPrice, type, basePrice } }
  const calendarData = {};
  console.log(propertyData)

  // 1. Process each room type's rates and availability
  propertyData.roomTypes.forEach(roomType => {
    // Get dates from rates
    roomType.rates.forEach(rate => {
      const date = rate.date.split('T')[0];
      
      if (!calendarData[date]) {
        calendarData[date] = {
          minRate: Infinity,
          isAvailable: false,
          specialRate: null,
          finalPrice: null,
          type: null,
          basePrice: null
        };
      }

      // Track minimum rate across all room types
      const price = Number(rate.price);
      if (price < calendarData[date].minRate) {
        calendarData[date].minRate = price;
        calendarData[date].basePrice = price;
      }

      // Check room availability
      const availableRooms = roomType.rooms.filter(room => 
        room.availability.some(a => 
          a.date.split('T')[0] === date && 
          a.status === 'available'
        )
      );

      // Mark date as available if any room is available
      if (availableRooms.length > 0) {
        calendarData[date].isAvailable = true;
      }
    });
  });

  // 2. Apply special rates from SpecialRateApplication
  const specialRatesArr = propertyData?.specialRates || propertyData?.specialRate || [];
  const specialRateApplicationsArr = propertyData?.SpecialRateApplication || [];

  // Build map for quick lookup
  const specialRateMap = {};
  specialRatesArr.forEach(rate => {
    specialRateMap[rate.id] = rate;
  });

  // For each application, apply to calendarData
  specialRateApplicationsArr.forEach(app => {
    const rate = specialRateMap[app.specialRateId];
    if (!rate) return;

    // Find roomTypeLink for this propertyRoomTypeId
    let roomTypeLink = null;
    if (Array.isArray(rate.roomTypeLinks)) {
      roomTypeLink = rate.roomTypeLinks.find(link => link.propertyRoomTypeId === app.propertyRoomTypeId);
    }
    // Use roomTypeLink pricing if available, else fallback to rate
    const pricingMode = roomTypeLink?.pricingMode || rate.pricingMode;
    const flatPrice = roomTypeLink?.flatPrice || rate.flatPrice;
    const percentAdj = roomTypeLink?.percentAdj || rate.percentAdj;

    // For each date in range
    const startDate = new Date(app.dateFrom);
    const endDate = new Date(app.dateTo);
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const date = d.toISOString().split('T')[0];
      if (!calendarData[date]) continue;
      const basePrice = calendarData[date].basePrice ?? calendarData[date].minRate;
      let finalPrice = basePrice;
      let type = rate.kind;

      if (pricingMode === 'flat' && flatPrice) {
        if (rate.kind === 'peak') {
          finalPrice = basePrice + Number(flatPrice);
        } else if (rate.kind === 'offer') {
          finalPrice = basePrice - Number(flatPrice);
        }
      } else if (pricingMode === 'percent' && percentAdj) {
        const adjustment = Number(percentAdj);
        if (rate.kind === 'offer') {
          finalPrice = basePrice * (1 - adjustment / 100);
        } else if (rate.kind === 'peak') {
          finalPrice = basePrice * (1 + adjustment / 100);
        }
      }

      // For "offer", keep basePrice for strikethrough
      calendarData[date].specialRate = {
        kind: rate.kind,
        pricingMode,
        flatPrice,
        percentAdj,
        name: rate.name,
        color: rate.color
      };
      calendarData[date].finalPrice = Math.round(finalPrice);
      calendarData[date].type = rate.kind;
      if (rate.kind === 'offer') {
        calendarData[date].basePrice = basePrice;
      } else {
        calendarData[date].basePrice = null;
      }
    }
  });

  return calendarData;
};

export default processCalendarData;
