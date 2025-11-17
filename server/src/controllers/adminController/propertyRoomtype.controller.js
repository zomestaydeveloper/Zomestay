const { PrismaClient } = require('@prisma/client');
const { get } = require('../../routes/adminRoutes/property.routes');
const prisma = new PrismaClient();

const propertyRoomtypeController = {

    getPropertyRoomTypes: async (req, res) => {

         const { propertyId } = req.params;

         console.log('propertyId:', propertyId);

         try{
            const propertyRoomtypes = await prisma.propertyRoomType.findMany({
                where: { propertyId: propertyId },
                select: {
                    id: true,  
                    roomType:{
                        select:{
                            name: true
                        }
                    },            
                    Occupancy: true,
                   
                }
            })

            console.log('propertyRoomtypes:', propertyRoomtypes);
            res.json(propertyRoomtypes);
         }catch(error){
            console.error('Error fetching room types:', error);
            res.status(500).json({ error: 'Internal server error' });
         }
    },

    createPropertyRoomType: async (req, res) => {
        try {
            console.log('Request body:', req.body);
            console.log('Request headers:', req.headers);
            
            let { propertyId, roomTypeData } = req.body;
            console.log('Original roomTypeData:', roomTypeData);
            console.log('Type of roomTypeData:', typeof roomTypeData);
            
            // Parse roomTypeData if it's a string (from form-encoded data)
            if (typeof roomTypeData === 'string') {
                try {
                    roomTypeData = JSON.parse(roomTypeData);
                    console.log('Parsed roomTypeData:', roomTypeData);
                } catch (parseError) {
                    console.error('Error parsing roomTypeData:', parseError);
                    return res.status(400).json({ error: 'Invalid roomTypeData JSON format' });
                }
            }
            
            if (!propertyId) {
                return res.status(400).json({ error: 'Property ID is required' });
            }

            if (!roomTypeData || !Array.isArray(roomTypeData)) {
                return res.status(400).json({ error: 'Room type data array is required' });
            }

            // Validate that property exists
            const property = await prisma.property.findUnique({
                where: { id: propertyId, isDeleted: false }
            });

            if (!property) {
                return res.status(404).json({ error: 'Property not found' });
            }

            const results = [];

            for (const roomType of roomTypeData) {
                const {
                    roomTypeId,
                    name,
                    basePrice,
                    singleOccupancyPrice,
                    occupancy,
                    extraBedCapacity,
                    extraBedPriceAdult,
                    extraBedPriceChild,
                    extraBedPriceInfant,
                    baseMealPlanId,
                    mealPlans
                } = roomType;

                console.log('Processing room type:', name);
                console.log('singleOccupancyPrice value:', singleOccupancyPrice, 'type:', typeof singleOccupancyPrice);

                // Validate room type exists
                const existingRoomType = await prisma.roomType.findUnique({
                    where: { id: roomTypeId, isDeleted: false }
                });

                if (!existingRoomType) {
                    return res.status(404).json({ error: `Room type ${roomTypeId} not found` });
                }

                // Check if PropertyRoomType already exists
                const existingPropertyRoomType = await prisma.propertyRoomType.findFirst({
                    where: {
                        propertyId: propertyId,
                        roomTypeId: roomTypeId,
                        isDeleted: false
                    }
                });

                if (existingPropertyRoomType) {
                    return res.status(400).json({ 
                        error: `Property room type already exists for room type: ${name}` 
                    });
                }

                // Create PropertyRoomType
                const propertyRoomType = await prisma.propertyRoomType.create({
                    data: {
                        propertyId: propertyId,
                        roomTypeId: roomTypeId,
                        basePrice: parseFloat(basePrice) || 0,
                        singleoccupancyprice: parseFloat(singleOccupancyPrice) || 0,
                        Occupancy: parseInt(occupancy) || 2,
                        extraBedCapacity: parseInt(extraBedCapacity) || 0,
                        extraBedPriceAdult: parseFloat(extraBedPriceAdult) || 0,
                        extraBedPriceChild: parseFloat(extraBedPriceChild) || 0,
                        extraBedPriceInfant: parseFloat(extraBedPriceInfant) || 0,
                        baseMealPlanId: baseMealPlanId || null
                        // Remove isActive and isDeleted as they have defaults in schema
                    }
                });

                // Create meal plan links if provided
                if (mealPlans && Array.isArray(mealPlans)) {
                    for (const mealPlan of mealPlans) {
                        const { mealPlanId, adultPrice, childPrice, isActive } = mealPlan;

                        // Validate meal plan exists
                        const existingMealPlan = await prisma.mealPlan.findUnique({
                            where: { id: mealPlanId, isDeleted: false }
                        });

                        if (!existingMealPlan) {
                            console.warn(`Meal plan ${mealPlanId} not found, skipping...`);
                            continue;
                        }

                        // Create PropertyRoomTypeMealPlan link
                        await prisma.propertyRoomTypeMealPlan.create({
                            data: {
                                propertyRoomTypeId: propertyRoomType.id,
                                mealPlanId: mealPlanId,
                                adultPrice: parseFloat(adultPrice),
                                childPrice: parseFloat(childPrice),
                                isActive: isActive !== undefined ? isActive : true
                            }
                        });
                    }
                }

                results.push({
                    id: propertyRoomType.id,
                    propertyId: propertyRoomType.propertyId,
                    roomTypeId: propertyRoomType.roomTypeId,
                    name: name,
                    basePrice: propertyRoomType.basePrice,
                    singleOccupancyPrice: propertyRoomType.singleoccupancyprice,
                    occupancy: propertyRoomType.occupancy,
                    extraBedCapacity: propertyRoomType.extraBedCapacity,
                    extraBedPriceAdult: propertyRoomType.extraBedPriceAdult,
                    extraBedPriceChild: propertyRoomType.extraBedPriceChild,
                    extraBedPriceInfant: propertyRoomType.extraBedPriceInfant,
                    baseMealPlanId: propertyRoomType.baseMealPlanId,
                    mealPlansCount: mealPlans ? mealPlans.length : 0
                });
            }

            res.status(201).json({
                success: true,
                message: `${results.length} property room types created successfully`,
                data: results
            });

        } catch (error) {
            console.error('Error creating property room types:', error);
            
            // Check if it's a Prisma validation error
            if (error.code === 'P2002') {
                return res.status(400).json({ 
                    error: 'Duplicate entry',
                    details: 'Property room type already exists for this combination'
                });
            }
            
            // Check if it's a foreign key constraint error
            if (error.code === 'P2003') {
                return res.status(400).json({ 
                    error: 'Invalid reference',
                    details: 'Property, room type, or meal plan not found'
                });
            }
            
            res.status(500).json({ 
                error: 'Internal server error',
                details: error.message,
                code: error.code || 'UNKNOWN'
            });
        }
    }
}

module.exports = propertyRoomtypeController;