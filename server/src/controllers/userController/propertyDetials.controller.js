const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const PropertyDetailsController = {
    // Basic property details (fast load)
    getPropertyDetails: async (req, res) => {
        try {
            const { id } = req.params;

            const property = await prisma.property.findUnique({
                where: { 
                    id,
                    isDeleted: false,
                    status: 'active'
                },
                select: {
                    id: true,
                    title: true,
                    description: true,
                    rulesAndPolicies: true,
                    status: true,
                    location: true,
                    avgRating: true,
                    reviewCount: true,
                    coverImage: true,
                    checkInTime: true,
                    checkOutTime: true,
                    createdAt: true,
                    updatedAt: true,

                    // Owner information
                    ownerHost: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            phone: true,
                            isVerified: true,
                            isActive: true
                        }
                    },

                    // Property type
                    propertyType: { 
                        select: { id: true, name: true } 
                    },

                    // Media
                    media: {
                        where: { isDeleted: false },
                        orderBy: { order: 'asc' },
                        select: { 
                            id: true, 
                            url: true, 
                            type: true, 
                            isFeatured: true, 
                            order: true 
                        },
                    },

                    // Amenities
                    amenities: {
                        where: { isDeleted: false },
                        select: {
                            amenity: { 
                                select: { 
                                    id: true, 
                                    name: true, 
                                    icon: true, 
                                    category: true,
                                    isActive: true 
                                } 
                            },
                        },
                    },

                    // Facilities
                    facilities: {
                        where: { isDeleted: false },
                        select: {
                            facility: { 
                                select: { 
                                    id: true, 
                                    name: true, 
                                    icon: true, 
                                    category: true,
                                    isActive: true 
                                } 
                            },
                        },
                    },

                    // Safety features
                    safeties: {
                        where: { isDeleted: false },
                        select: {
                            safety: { 
                                select: { 
                                    id: true, 
                                    name: true, 
                                    icon: true, 
                                    category: true,
                                    isActive: true 
                                } 
                            },
                        },
                    },

                    // Reviews
                    reviews: {
                        where: { isDeleted: false },
                        orderBy: { createdAt: 'desc' },
                        take: 10,
                        select: {
                            id: true,
                            rating: true,
                            description: true,
                            createdAt: true,
                            user: {
                                select: {
                                    id: true,
                                    username: true,
                                    firstname: true,
                                    lastname: true,
                                    profileImage: true,
                                },
                            },
                        },
                    },

                    // Special rates
                    specialRates: {
                        where: { 
                            isDeleted: false, 
                            isActive: true 
                        },
                        select: {
                            id: true,
                            kind: true,
                            name: true,
                            pricingMode: true,
                            color: true,
                            flatPrice: true,
                            percentAdj: true,
                            createdAt: true,
                            roomTypeLinks: {
                                where: { isActive: true },
                                select: {
                                    id: true,
                                    pricingMode: true,
                                    flatPrice: true,
                                    percentAdj: true,
                                    propertyRoomType: {
                                        select: {
                                            id: true,
                                            roomType: { select: { name: true } }
                                        }
                                    }
                                }
                            },
                            SpecialRateApplication: {
                                where: { isActive: true },
                                select: {
                                    id: true,
                                    dateFrom: true,
                                    dateTo: true,
                                    propertyRoomType: {
                                        select: {
                                            id: true,
                                            roomType: { select: { name: true } }
                                        }
                                    }
                                },
                                orderBy: { dateFrom: 'asc' }
                            }
                        },
                    },

                  
                }
            });

            if (!property) {
                return res.status(404).json({
                    success: false,
                    message: 'Property not found'
                });
            }

            // Transform and format the response
            const formattedProperty = {
                ...property,
                // Flatten nested relationships
                amenities: property.amenities.map(a => a.amenity),
                facilities: property.facilities.map(f => f.facility),
                safeties: property.safeties.map(s => s.safety),
                
                // Add computed fields
              
                totalAmenities: property.amenities.length,
                totalFacilities: property.facilities.length,
                totalSafetyFeatures: property.safeties.length,
                
               
                
                // Add media summary
                mediaSummary: {
                    total: property.media.length,
                    featured: property.media.filter(m => m.isFeatured).length,
                    images: property.media.filter(m => m.type === 'image').length,
                    videos: property.media.filter(m => m.type === 'video').length
                }
            };

            return res.json({
                success: true,
                data: formattedProperty
            });

        } catch (error) {
            console.error('Error fetching property details:', error);
            return res.status(500).json({
                success: false,
                message: 'Error fetching property details',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    },
    // Pricing and availability data (on demand) - Month-based loading
    getPropertyPricing: async (req, res) => {
        try {
            const { id } = req.params;
            const { startDate, endDate, month, year } = req.query;

            console.log(startDate, endDate, month, year)

            // Check if role is agent and fetch agent discount
            let agentDiscount = null;
            let isApprovedAgent = false;

            if (req.user?.role === 'agent' && req.user?.id) {
                try {
                    // Check if agent is approved
                    const agent = await prisma.travelAgent.findFirst({
                        where: {
                            id: req.user.id,
                            isDeleted: false,
                            status: 'approved'
                        },
                        select: {
                            id: true,
                            status: true
                        }
                    });

                    if (agent) {
                        isApprovedAgent = true;
                        console.log('getPropertyPricing - Agent is approved:', agent.id);

                        // Fetch agent's discount for this property
                        const discount = await prisma.travelAgentPropertyDiscount.findFirst({
                            where: {
                                agentId: agent.id,
                                propertyId: id,
                                isDeleted: false,
                                isActive: true
                            },
                            select: {
                                discountType: true,
                                discountValue: true
                            }
                        });

                        if (discount) {
                            agentDiscount = {
                                type: discount.discountType,
                                value: Number(discount.discountValue)
                            };
                            console.log('getPropertyPricing - Agent discount found:', agentDiscount);
                        }
                    }
                } catch (agentError) {
                    console.error('getPropertyPricing - Error checking agent:', agentError);
                    // Continue without agent discounts if there's an error
                }
            }

            // Support multiple loading strategies
            // Use UTC dates to avoid timezone conversion issues
            let queryStartDate, queryEndDate;
            
            if (month && year) {
                // Single month loading (e.g., month=1, year=2024)
                // Use UTC to ensure consistent date boundaries
                const startOfMonth = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
                const endOfMonth = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)); // Last day of month at end of day
                queryStartDate = startOfMonth;
                queryEndDate = endOfMonth;
            } else if (startDate && endDate) {
                // Date range loading (for initial load: current + next month)
                // Parse date strings as UTC to avoid timezone shifts
                const startDateUTC = new Date(startDate + 'T00:00:00Z');
                const endDateUTC = new Date(endDate + 'T23:59:59Z'); // Include full end date
                queryStartDate = startDateUTC;
                queryEndDate = endDateUTC;
            } else {
                // Default: Load current month + next month
                const now = new Date();
                const currentYear = now.getUTCFullYear();
                const currentMonth = now.getUTCMonth();
                const currentMonthStart = new Date(Date.UTC(currentYear, currentMonth, 1, 0, 0, 0, 0));
                const nextMonthEnd = new Date(Date.UTC(currentYear, currentMonth + 2, 0, 23, 59, 59, 999)); // Last day of next month
                queryStartDate = currentMonthStart;
                queryEndDate = nextMonthEnd;
            }

            // Step 1: Get all RatePlanDates for the date range
            const ratePlanDates = await prisma.ratePlanDate.findMany({
                where: {
                    propertyId: id,
                    isDeleted: false,
                    isActive: true,
                    date: {
                        gte: queryStartDate,
                        lte: queryEndDate
                    }
                },
                select: {
                    id: true,
                    date: true,
                    ratePlanId: true,
                    isActive: true
                },
                orderBy: { date: 'asc' }
            });

            // Step 2: Get unique rate plan IDs
            const ratePlanIds = [...new Set(ratePlanDates.map(rpd => rpd.ratePlanId))];

            console.log(ratePlanIds)

            // Step 3: Get RatePlan details with pricing
            const ratePlans = await prisma.ratePlan.findMany({
                where: {
                    id: { in: ratePlanIds },
                    isDeleted: false,
                    isActive: true
                },
                select: {
                    id: true,
                    name: true,
                    color: true,
                    description: true,
                    isActive: true,
                    createdAt: true,
                    roomTypeMealPlanPricing: {
                        where: { isDeleted: false, isActive: true },
                        select: {
                            id: true,
                            doubleOccupancyPrice: true,
                            singleOccupancyPrice: true,
                            groupOccupancyPrice: true,
                            extraBedPriceAdult: true,
                            extraBedPriceChild: true,
                            extraBedPriceInfant: true,
                            propertyRoomType: {
                                select: {
                                    id: true,
                                    roomType: { select: { name: true } }
                                }
                            },
                            mealPlan: {
                                select: {
                                    id: true,
                                    name: true,
                                    code: true,
                                    kind: true
                                }
                            }
                        }
                    }
                }
            });

            console.log(ratePlans)

            // Step 4: Get property room types and total rooms
            const roomTypes = await prisma.propertyRoomType.findMany({
                where: {
                    propertyId: id,
                    isDeleted: false,
                    isActive: true
                },
                select: {
                    id: true,
                    roomType: {
                        select: {
                            id: true,
                            name: true
                        }
                    },
                    rooms: {
                        where: { isDeleted: false },
                        select: {
                            id: true,
                            name: true,
                            code: true
                        }
                    }
                }
            });

            // Step 5: Calculate total rooms per room type
            const totalRoomsPerType = roomTypes.map(rt => ({
                ...rt,
                totalRooms: rt.rooms.length
            }));

            console.log(totalRoomsPerType)

            // Step 6: Get availability data for the date range
            const availabilityData = await prisma.availability.findMany({
                where: {
                    room: {
                        propertyRoomType: {
                            propertyId: id
                        }
                    },
                    date: {
                        gte: queryStartDate,
                        lte: queryEndDate
                    },
                    isDeleted: false
                },
                select: {
                    id: true,
                    roomId: true,
                    date: true,
                    status: true,
                    minNights: true,
                    reason: true,
                    blockedBy: true,
                    room: {
                        select: {
                            id: true,
                            propertyRoomTypeId: true,
                            name: true,
                            code: true
                        }
                    }
                },
                orderBy: { date: 'asc' }
            });

            console.log(availabilityData)

            // Step 7: Calculate simplified availability and pricing per date
            const availabilityByDate = {};
            const dateRange = [];
            
            // Normalize start and end dates to UTC midnight for consistent date iteration
            const startDateUTC = new Date(Date.UTC(
                queryStartDate.getUTCFullYear(),
                queryStartDate.getUTCMonth(),
                queryStartDate.getUTCDate(),
                0, 0, 0, 0
            ));
            const endDateUTC = new Date(Date.UTC(
                queryEndDate.getUTCFullYear(),
                queryEndDate.getUTCMonth(),
                queryEndDate.getUTCDate(),
                0, 0, 0, 0
            ));
            
            let currentDate = new Date(startDateUTC);
            
            while (currentDate <= endDateUTC) {
                // Format date as YYYY-MM-DD using UTC methods to avoid timezone shifts
                const year = currentDate.getUTCFullYear();
                const month = String(currentDate.getUTCMonth() + 1).padStart(2, '0');
                const day = String(currentDate.getUTCDate()).padStart(2, '0');
                const dateStr = `${year}-${month}-${day}`;
                dateRange.push(dateStr);
                
                let totalAvailableRoomsForDate = 0;
                let minimumPriceForDate = null;
                
                // Calculate availability and pricing for each room type
                totalRoomsPerType.forEach(roomType => {
                    const totalRooms = roomType.totalRooms;
                    
                    // Count blocked/unavailable rooms for this date and room type
                    // Format database date as YYYY-MM-DD using UTC to match dateStr format
                    const blockedRooms = availabilityData.filter(av => {
                        const avDateObj = new Date(av.date);
                        const avYear = avDateObj.getUTCFullYear();
                        const avMonth = String(avDateObj.getUTCMonth() + 1).padStart(2, '0');
                        const avDay = String(avDateObj.getUTCDate()).padStart(2, '0');
                        const avDate = `${avYear}-${avMonth}-${avDay}`;
                        return avDate === dateStr && 
                               av.room.propertyRoomTypeId === roomType.id &&
                               (av.status === 'booked' || av.status === 'maintenance' || av.status === 'blocked');
                    }).length;
                    
                    // Available rooms = Total rooms - Blocked rooms
                    const availableRooms = Math.max(0, totalRooms - blockedRooms);
                    totalAvailableRoomsForDate += availableRooms;
                    
                    // Find rate plan for this date
                    // Format database date as YYYY-MM-DD using UTC to match dateStr format
                    const ratePlanForDate = ratePlanDates.find(rpd => {
                        const rpdDateObj = new Date(rpd.date);
                        const rpdYear = rpdDateObj.getUTCFullYear();
                        const rpdMonth = String(rpdDateObj.getUTCMonth() + 1).padStart(2, '0');
                        const rpdDay = String(rpdDateObj.getUTCDate()).padStart(2, '0');
                        const rpdDate = `${rpdYear}-${rpdMonth}-${rpdDay}`;
                        return rpdDate === dateStr;
                    });
                    
                    // Get pricing for this room type and rate plan
                    let roomTypePricing = null;
                    if (ratePlanForDate) {
                        const ratePlan = ratePlans.find(rp => rp.id === ratePlanForDate.ratePlanId);
                        if (ratePlan) {
                            roomTypePricing = ratePlan.roomTypeMealPlanPricing.find(pricing => 
                                pricing.propertyRoomType.id === roomType.id
                            );
                        }
                    }
                    
                    // Calculate minimum price for this room type
                    let roomTypeMinPrice = null;
                    if (roomTypePricing) {
                        const prices = [
                            roomTypePricing.doubleOccupancyPrice,
                            roomTypePricing.singleOccupancyPrice,
                            roomTypePricing.groupOccupancyPrice
                        ].filter(price => price && price > 0);
                        
                        if (prices.length > 0) {
                            roomTypeMinPrice = Math.min(...prices);
                        }
                    }
                    
                    // Update overall minimum price for this date
                    if (roomTypeMinPrice && (minimumPriceForDate === null || roomTypeMinPrice < minimumPriceForDate)) {
                        minimumPriceForDate = roomTypeMinPrice;
                    }
                });
                
                // Apply agent discount if applicable
                let discountedPrice = null;
                let originalPrice = minimumPriceForDate;
                
                if (isApprovedAgent && agentDiscount && minimumPriceForDate) {
                    if (agentDiscount.type === 'percentage') {
                        // Percentage discount: discountedPrice = originalPrice * (1 - discountValue/100)
                        discountedPrice = minimumPriceForDate * (1 - agentDiscount.value / 100);
                    } else {
                        // Flat discount: discountedPrice = originalPrice - discountValue
                        discountedPrice = Math.max(0, minimumPriceForDate - agentDiscount.value);
                    }
                    discountedPrice = Math.round(discountedPrice * 100) / 100; // Round to 2 decimal places
                }
                
                // Simplified date information - only essential data
                availabilityByDate[dateStr] = {
                    totalAvailableRooms: totalAvailableRoomsForDate,
                    minimumPrice: discountedPrice || minimumPriceForDate, // Use discounted price if available, otherwise original
                    originalPrice: discountedPrice ? originalPrice : null, // Only include originalPrice if discount is applied
                    agentDiscount: discountedPrice ? {
                        type: agentDiscount.type,
                        value: agentDiscount.value
                    } : null
                };
                
                // Increment date using UTC methods to avoid timezone shifts
                currentDate = new Date(Date.UTC(
                    currentDate.getUTCFullYear(),
                    currentDate.getUTCMonth(),
                    currentDate.getUTCDate() + 1,
                    0, 0, 0, 0
                ));
            }

          

           ;

            // Return only the availability data
            return res.json({
                success: true,
                data: availabilityByDate
            });

        } catch (error) {
            console.error('Error fetching property pricing:', error);
            return res.status(500).json({
                success: false,
                message: 'Error fetching property pricing',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    },
    getBookingData: async (req, res) => {
        try {
            // ===================== STEP 1: EXTRACT REQUEST PARAMETERS =====================
            // Extract query parameters and route parameters from the request
            const { checkIn, checkOut, guests, rooms, children ,adults} = req.query;
            const { id } = req.params;
            
            // ===================== STEP 2: INPUT VALIDATION =====================
            // Validate all required inputs before processing

            console.log(checkIn, checkOut, guests, rooms, children, adults)
            
            // Step 2.1: Validate required parameters exist
            if (!id || !checkIn || !checkOut) {
                return res.status(400).json({
                    success: false,
                    message: 'Property ID, check-in, and check-out dates are required'
                });
            }

            // Step 2.2: Validate property ID format (must be a valid UUID)
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid property ID format'
                });
            }

            const propertyId = id;
            
            // Step 2.3: Parse and validate guest/room counts
            const guestCount = parseInt(adults);
            const roomCount = parseInt(rooms);
            const childrenCount = parseInt(children) || 0;
            
            // Validate adults and rooms are valid positive numbers
            if (isNaN(guestCount) || isNaN(roomCount) || guestCount < 1 || roomCount < 1) {
                return res.status(400).json({
                    success: false,
                    message: 'Guests and rooms must be valid numbers greater than 0'
                });
            }
            
            // Validate children count is a valid non-negative number
            if (isNaN(childrenCount) || childrenCount < 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Children count must be a valid number greater than or equal to 0'
                });
            }

            // Step 2.4: Parse and validate dates (base values without time adjustments yet)
            const rawStartDate = new Date(checkIn);
            const rawEndDate = new Date(checkOut);

            // Step 2.5: Check for invalid date formats
            if (isNaN(rawStartDate.getTime()) || isNaN(rawEndDate.getTime())) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid date format. Please use YYYY-MM-DD format'
                });
            }

            // Step 2.6: Check for past dates (check-in cannot be in the past)
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (rawStartDate < today) {
                return res.status(400).json({
                    success: false,
                    message: 'Check-in date cannot be in the past'
                });
            }

            // Step 2.7: Validate date range (check-out must be after check-in)
            if (rawStartDate >= rawEndDate) {
                return res.status(400).json({
                    success: false,
                    message: 'Check-out date must be after check-in date'
                });
            }

            // Step 2.8: Check for very long stays (maximum 30 days)
            const nights = Math.ceil((rawEndDate - rawStartDate) / (1000 * 60 * 60 * 24));
            if (nights > 30) {
                return res.status(400).json({
                    success: false,
                    message: 'Maximum stay duration is 30 days'
                });
            }

            // ===================== STEP 3: PROPERTY VALIDATION =====================
            // Verify the property exists, is active, and fetch its check-in/check-out times
            
            // Step 3.1: Fetch property details (including check-in/check-out times)
            const property = await prisma.property.findFirst({
                where: {
                    id: propertyId,
                    isDeleted: false,
                    status: 'active'
                },
                select: {
                    id: true,
                    title: true,
                    status: true,
                    checkInTime: true,  // Property-specific check-in time (e.g., "14:00")
                    checkOutTime: true  // Property-specific check-out time (e.g., "11:00")
                }
            });

            // Step 3.2: Validate property exists and is active
            if (!property) {
                return res.status(404).json({
                    success: false,
                    message: 'Property not found or inactive'
                });
            }

            // Step 3.3: Helper function to parse time strings from property
            // Converts time string (e.g., "14:00") to hours and minutes object
            // Returns midnight (00:00) if time is missing or invalid
            const parseTimeString = (timeString) => {
                if (!timeString || typeof timeString !== 'string' || timeString.trim().length === 0) {
                    return { hours: 0, minutes: 0 }; // Default to midnight if not provided
                }
                const [hoursStr, minutesStr = '00'] = timeString.trim().split(':');
                const hours = parseInt(hoursStr, 10);
                const minutes = parseInt(minutesStr, 10);
                if (Number.isNaN(hours) || Number.isNaN(minutes)) {
                    return { hours: 0, minutes: 0 }; // Default to midnight if invalid
                }
                return { hours, minutes };
            };

            // Step 3.4: Extract check-in and check-out times from property (no hardcoded defaults)
            const { hours: checkInHours, minutes: checkInMinutes } = parseTimeString(property.checkInTime);
            const { hours: checkOutHours, minutes: checkOutMinutes } = parseTimeString(property.checkOutTime);

            // Step 3.5: Create dates with property's actual check-in/check-out times
            // These dates are used for business logic (calculating date ranges, etc.)
            const startDate = new Date(rawStartDate);
            startDate.setHours(checkInHours, checkInMinutes, 0, 0);

            const endDate = new Date(rawEndDate);
            endDate.setHours(checkOutHours, checkOutMinutes, 0, 0);

            // Step 3.6: Create normalized dates (midnight) for database queries
            // Database stores dates as midnight (00:00:00), so we need to query with midnight dates
            // This is ONLY for querying - we use actual check-in/check-out times for business logic
            const startDateForQuery = new Date(rawStartDate);
            startDateForQuery.setHours(0, 0, 0, 0);

            const endDateForQuery = new Date(rawEndDate);
            endDateForQuery.setHours(0, 0, 0, 0);

            // ===================== STEP 4: CHECK AGENT DISCOUNT =====================
            // If the logged-in user is an approved agent, check if they have a discount for this property
            
            let agentRates = null;

            // Step 4.1: Check if the request is from an authenticated agent
            if (req.user?.role === 'agent' && req.user?.id) {
                try {
                    // Step 4.2: Verify the agent exists and is approved
                    const agent = await prisma.travelAgent.findFirst({
                        where: {
                            id: req.user.id,
                            isDeleted: false,
                            status: 'approved'  // Only approved agents get discounts
                        },
                        select: {
                            id: true,
                            status: true
                        }
                    });

                    if (agent) {
                        console.log('getBookingData - Agent is approved:', agent.id);

                        // Step 4.3: Fetch agent's discount for this specific property
                        const discount = await prisma.travelAgentPropertyDiscount.findFirst({
                            where: {
                                agentId: agent.id,
                                propertyId: propertyId,
                                isDeleted: false,
                                isActive: true  // Only active discounts apply
                            },
                            select: {
                                discountType: true,   // 'percentage' or 'flat'
                                discountValue: true  // Discount amount
                            }
                        });

                        // Step 4.4: If discount exists, store it for later use in response
                        if (discount) {
                            agentRates = {
                                agentId: agent.id,
                                discount: Number(discount.discountValue),
                                type: discount.discountType
                            };
                            console.log('getBookingData - Agent discount found:', agentRates);
                        }
                    }
                } catch (agentError) {
                    console.error('getBookingData - Error checking agent:', agentError);
                    // Continue without agent discount if there's an error (non-blocking)
                }
            }

            // ===================== STEP 5: CALCULATE DATE RANGE =====================
            // Generate an array of all dates from check-in to check-out (exclusive of check-out date)
            // Example: Check-in Nov 25, Check-out Nov 28 → [Nov 25, Nov 26, Nov 27]
            
            const dateRange = [];
            let currentDate = new Date(startDate);
            // Loop through each date from check-in to check-out (exclusive)
            while (currentDate < endDate) {
                dateRange.push(new Date(currentDate));
                currentDate.setDate(currentDate.getDate() + 1);  // Move to next day
            }

            // ===================== STEP 6: FETCH ROOM TYPES =====================
            // Fetch all active room types for this property along with their rooms
            

             console.log(dateRange)
            // Step 6.1: Fetch all room types and their associated rooms
            const roomTypes = await prisma.propertyRoomType.findMany({
                where: {
                    propertyId: propertyId,
                    isDeleted: false,
                    isActive: true  // Only active room types
                },
                include: {
                    roomType: {
                        select: {
                            id: true,
                            name: true  // Room type name (e.g., "Deluxe Room")
                        }
                    },
                    rooms: {
                        where: {
                            isDeleted: false,
                            status: 'active'  // Only active rooms
                        },
                        select: {
                            id: true,
                            name: true,
                            code: true  // Room code/number
                            
                        }
                    },
                    media: {
                        where: {
                            isDeleted: false
                        },
                        orderBy: {
                            order: 'asc'
                        },
                        select: {
                            url: true
                        }
                    }
                }
            });

            // Step 6.2: Validate that room types exist
            if (roomTypes.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'No room types found for this property'
                });
            }

            // ===================== STEP 7: FETCH AVAILABILITY DATA =====================
            // Fetch all blocked/booked rooms for the date range
            // This helps determine which rooms are available for the entire stay
            
            // Step 7.1: Query availability table for blocked/booked rooms
            const availabilityData = await prisma.availability.findMany({
                where: {
                    room: {
                        propertyRoomType: {
                            propertyId: propertyId
                        }
                    },
                    date: {
                        gte: startDateForQuery,  // Use midnight-normalized dates for query
                        lt: endDateForQuery
                    },
                    isDeleted: false,
                    status: {
                        in: ['booked', 'maintenance', 'blocked', 'out_of_service']  // Only blocked statuses
                    }
                },
                include: {
                    room: {
                        select: {
                            id: true,
                            propertyRoomTypeId: true
                        }
                    }
                }
            });

            console.log(availabilityData)

            // ===================== STEP 8: FETCH RATE PLANS =====================
            // Fetch pricing information (rate plans) for each date in the stay
            // Rate plans contain meal plan pricing (EP, CP, MAP, AP, etc.)
            
            // Step 8.1: Query rate plan dates for the date range
            const ratePlanDates = await prisma.ratePlanDate.findMany({
                where: {
                    propertyId: propertyId,
                    date: {
                        gte: startDateForQuery,  // Use midnight-normalized dates for query
                        lt: endDateForQuery
                    },
                    isDeleted: false,
                    isActive: true  // Only active rate plans
                },
                select: {
                    date: true,
                    ratePlan: {
                        select: {
                            id: true,
                            name: true,
                            color: true,
                            roomTypeMealPlanPricing: {
                                where: {
                                    isDeleted: false,
                                    isActive: true
                                },
                                select: {
                                    propertyRoomTypeId: true,
                                    mealPlanId: true,
                                    singleOccupancyPrice: true,
                                    doubleOccupancyPrice: true,
                                    groupOccupancyPrice: true,
                                    extraBedPriceAdult: true,
                                    extraBedPriceChild: true,
                                    extraBedPriceInfant: true,
                                    mealPlan: {
                                        select: {
                                            id: true,
                                            name: true,
                                            kind: true,  // EP, CP, MAP, AP, etc.
                                            description: true
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            });

            // ===================== STEP 9: PROCESS ROOM TYPES =====================
            // For each room type, determine which rooms are available for the entire stay
            // and build pricing information for each date
            
            const processedRoomTypes = [];

            // Step 9.1: Loop through each room type
            for (const roomType of roomTypes) {
                const roomTypeId = roomType.id;
                const totalRooms = roomType.rooms.length;
                
                // Get all rooms for this room type
                const roomTypeRooms = roomType.rooms;
                
                // Step 9.2: Find rooms that are available for ALL dates in the stay
                // A room is only available if it's not blocked on ANY date during the stay
                const availableRoomsForEntireStay = [];
                
                for (const room of roomTypeRooms) {
                    let isAvailableForEntireStay = true;
                    
                    // Step 9.3: Check if this room is available for ALL dates
                    for (const date of dateRange) {
                        const dateStr = date.toISOString().split('T')[0];  // Convert to YYYY-MM-DD format
                        
                        // Step 9.4: Check if this specific room is blocked on this date
                        const isBlocked = availabilityData.some(av => {
                            const avDate = av.date.toISOString().split('T')[0];
                            return avDate === dateStr && 
                                   av.room.id === room.id;
                        });
                        
                        // If blocked on any date, the room is not available for the entire stay
                        if (isBlocked) {
                            isAvailableForEntireStay = false;
                            break; // No need to check other dates
                        }
                    }
                    
                    // Step 9.5: If room is available for all dates, add it to the list
                    if (isAvailableForEntireStay) {
                        availableRoomsForEntireStay.push(room);
                    }
                }
                
                // Step 9.6: Only process room types that have at least one available room
                if (availableRoomsForEntireStay.length > 0) {
                    const roomTypeRatePlanDates = [];
                    
                    // Step 9.7: Process rate plans for each date in the stay
                    for (const date of dateRange) {
                        const dateStr = date.toISOString().split('T')[0];  // Convert to YYYY-MM-DD format
                        
                        // Step 9.8: Find rate plan for this specific date
                        const ratePlanForDate = ratePlanDates.find(rpd => {
                            const rpdDate = rpd.date.toISOString().split('T')[0];
                            return rpdDate === dateStr;
                        });
                        
                        // Step 9.9: If rate plan exists for this date, extract pricing
                        if (ratePlanForDate) {
                            // Filter pricing for this specific room type
                            const roomTypePricing = ratePlanForDate.ratePlan.roomTypeMealPlanPricing.filter(
                                pricing => pricing.propertyRoomTypeId === roomTypeId
                            );
                            
                            // Step 9.10: Create meal plan pricing object with descriptions
                            // Organize pricing by meal plan kind (EP, CP, MAP, AP, etc.)
                            const mealPlanPricing = {};
                            roomTypePricing.forEach(pricing => {
                                const mealPlanKind = pricing.mealPlan.kind;  // EP, CP, MAP, AP, etc.
                                const basePrice = parseFloat(pricing.doubleOccupancyPrice || pricing.singleOccupancyPrice || 0);
                                
                                mealPlanPricing[mealPlanKind] = {
                                    mealPlanId: pricing.mealPlan.id,
                                    price: basePrice,
                                    name: pricing.mealPlan.name,
                                    description: pricing.mealPlan.description,
                                    singleOccupancyPrice: parseFloat(pricing.singleOccupancyPrice || 0),
                                    doubleOccupancyPrice: parseFloat(pricing.doubleOccupancyPrice || 0),
                                    groupOccupancyPrice: parseFloat(pricing.groupOccupancyPrice || 0),
                                    extraBedPriceAdult: parseFloat(pricing.extraBedPriceAdult || 0),
                                    extraBedPriceChild: parseFloat(pricing.extraBedPriceChild || 0),
                                    extraBedPriceInfant: parseFloat(pricing.extraBedPriceInfant || 0)
                                };
                            });
                            
                            // Step 9.11: Add pricing for this date to the room type's rate plan dates
                            roomTypeRatePlanDates.push({
                                date: dateStr,
                                ...mealPlanPricing  // Spread meal plan pricing (EP, CP, etc.)
                            });
                        }
                    }

                    // Step 9.12: Build the final room type object with all information
                    processedRoomTypes.push({
                        roomTypeId,
                        roomTypeName: roomType.roomType.name,
                        maxOccupancy: roomType.maxOccupancy,
                        minOccupancy: roomType.minOccupancy,
                        occupancy: roomType.Occupancy,
                        extraBedCapacity: roomType.extraBedCapacity,
                        totalRooms,
                        availableRooms: availableRoomsForEntireStay.length,  // Count of available rooms
                        availableRoomsForEntireStay: availableRoomsForEntireStay,  // Actual room details
                        ratePlanDates: roomTypeRatePlanDates,  // Pricing for each date
                        media: roomType.media.map(m => m.url)  // Array of image URLs
                    });
                }
            }

            // ===================== STEP 10: BUILD RESPONSE =====================
            // Return the processed room types with availability and pricing information
            
            // Step 10.1: Validate that at least one room type has available rooms
            if (processedRoomTypes.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'No rooms available for the selected dates and guest count'
                });
            }

            // Step 10.2: Return successful response with all booking data
            return res.status(200).json({
                success: true,
                data: processedRoomTypes,  // Array of room types with availability and pricing
                requestedGuests: guestCount,  // Number of adult guests
                requestedRooms: roomCount,  // Number of rooms requested
                requestedChildren: childrenCount,  // Number of children
                agentRates: agentRates || null  // Agent discount info (agentId, discount, type) - null if not applicable
            });

        } catch (error) {
            console.error('Error fetching booking data:', error);
            return res.status(500).json({
                success: false,
                message: 'Error fetching booking data',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
};

module.exports = PropertyDetailsController; 