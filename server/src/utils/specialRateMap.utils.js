function applySpecialRates(data, appliedSpecialRates) {
    // Helper function to check if a date falls within special rate range
    const isDateInRange = (date, dateFrom, dateTo) => {
        const checkDate = new Date(date);
        const fromDate = new Date(dateFrom);
        const toDate = new Date(dateTo);
        return checkDate >= fromDate && checkDate < toDate;
    };

    // Helper function to calculate special rate price
    const calculateSpecialPrice = (basePrice, specialRate, roomTypeId) => {
        const base = parseFloat(basePrice);
        
        // Check for room-type-specific pricing in roomTypeLinks
        const roomTypeLink = specialRate.roomTypeLinks.find(
            link => link.propertyRoomTypeId === roomTypeId
        );
        
        if (roomTypeLink) {
            // Use room-specific pricing
            if (roomTypeLink.pricingMode === 'flat' && roomTypeLink.flatPrice) {
                return roomTypeLink.flatPrice;
            } else if (roomTypeLink.pricingMode === 'percent' && roomTypeLink.percentAdj) {
                const adjustment = (base * parseFloat(roomTypeLink.percentAdj)) / 100;
                return (base - adjustment).toString(); // Assuming discount
            }
        } else {
            // Use global special rate pricing
            if (specialRate.pricingMode === 'flat' && specialRate.flatPrice) {
                return specialRate.flatPrice;
            } else if (specialRate.pricingMode === 'percent' && specialRate.percentAdj) {
                const adjustment = (base * parseFloat(specialRate.percentAdj)) / 100;
                return (base - adjustment).toString(); // Assuming discount
            }
        }
        
        return basePrice; // Return original price if no special rate applies
    };

    // Process each day
    const modifiedData = data.map((day) => {
        const modifiedRoomTypes = day.RoomType.map((roomType) => {
            // Find applicable special rates for this date and room type
            const applicableSpecialRates = appliedSpecialRates.filter(specialRateApp => {
                const isInDateRange = isDateInRange(day.date, specialRateApp.dateFrom, specialRateApp.dateTo);
                
                if (!isInDateRange) return false;
                
                // Check if it's global (propertyRoomTypeId is null) or specific to this room type
                const isGlobal = specialRateApp.propertyRoomTypeId === null;
                const isSpecificToRoom = specialRateApp.propertyRoomTypeId === roomType.PropertyRoomTypeId;
                
                return isGlobal || isSpecificToRoom;
            });

            // Apply special rates to the room type's rates
            const modifiedRates = roomType.Rate.map((rate) => {
                let finalRate = { ...rate };
                
                // Apply each applicable special rate (priority: specific > global)
                applicableSpecialRates.forEach(specialRateApp => {
                    const specialRate = specialRateApp.specialRate;
                    
                    // Determine if this is global or room-specific
                    const isGlobal = specialRateApp.propertyRoomTypeId === null;
                    
                    if (isGlobal && specialRate.roomTypeLinks.length === 0) {
                        // Global pricing with no room-specific overrides
                        const newPrice = calculateSpecialPrice(rate.price, specialRate, roomType.PropertyRoomTypeId);
                        finalRate = {
                            ...finalRate,
                            originalPrice: rate.price,
                            price: newPrice,
                            specialRate: {
                                id: specialRate.id,
                                name: specialRate.name,
                                color: specialRate.color,
                                pricingMode: specialRate.pricingMode,
                                adjustment: parseFloat(newPrice) - parseFloat(rate.price),
                                isGlobal: true,
                                appliedFrom: 'global'
                            }
                        };
                    } else if (isGlobal && specialRate.roomTypeLinks.length > 0) {
                        // Global special rate with room-specific overrides
                        const roomTypeLink = specialRate.roomTypeLinks.find(
                            link => link.propertyRoomTypeId === roomType.PropertyRoomTypeId
                        );
                        
                        if (roomTypeLink) {
                            const newPrice = calculateSpecialPrice(rate.price, specialRate, roomType.PropertyRoomTypeId);
                            finalRate = {
                                ...finalRate,
                                originalPrice: rate.price,
                                price: newPrice,
                                specialRate: {
                                    id: specialRate.id,
                                    name: specialRate.name,
                                    color: specialRate.color,
                                    pricingMode: roomTypeLink.pricingMode,
                                    adjustment: parseFloat(newPrice) - parseFloat(rate.price),
                                    isGlobal: true,
                                    appliedFrom: 'room-specific-override'
                                }
                            };
                        } else {
                            // Apply global pricing as fallback
                            const newPrice = calculateSpecialPrice(rate.price, specialRate, roomType.PropertyRoomTypeId);
                            finalRate = {
                                ...finalRate,
                                originalPrice: rate.price,
                                price: newPrice,
                                specialRate: {
                                    id: specialRate.id,
                                    name: specialRate.name,
                                    color: specialRate.color,
                                    pricingMode: specialRate.pricingMode,
                                    adjustment: parseFloat(newPrice) - parseFloat(rate.price),
                                    isGlobal: true,
                                    appliedFrom: 'global-fallback'
                                }
                            };
                        }
                    } else {
                        // Room-specific special rate
                        const newPrice = calculateSpecialPrice(rate.price, specialRate, roomType.PropertyRoomTypeId);
                        finalRate = {
                            ...finalRate,
                            originalPrice: rate.price,
                            price: newPrice,
                            specialRate: {
                                id: specialRate.id,
                                name: specialRate.name,
                                color: specialRate.color,
                                pricingMode: specialRate.pricingMode,
                                adjustment: parseFloat(newPrice) - parseFloat(rate.price),
                                isGlobal: false,
                                appliedFrom: 'room-specific'
                            }
                        };
                    }
                });
                
                return finalRate;
            });

            return {
                ...roomType,
                Rate: modifiedRates,
                hasSpecialRate: applicableSpecialRates.length > 0,
                appliedSpecialRates: applicableSpecialRates.map(app => ({
                    id: app.id,
                    name: app.specialRate.name,
                    color: app.specialRate.color
                }))
            };
        });

        return {
            ...day,
            RoomType: modifiedRoomTypes
        };
    });

    return modifiedData;
}

module.exports = { applySpecialRates };