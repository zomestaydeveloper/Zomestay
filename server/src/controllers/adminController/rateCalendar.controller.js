const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const rateCalendarController = {
    
    // Seed rates for a PropertyRoomType
    seedRates: async (req, res) => {
        try {
            const { propertyRoomTypeId,fromDate,toDate  } = req.body;
            
            console.log('Seeding rates for PropertyRoomType:', propertyRoomTypeId);
            console.log('Date range:', startDate, 'to', endDate);
            
            // Validate required fields
            if (!propertyRoomTypeId) {
                return res.status(400).json({ error: 'PropertyRoomType ID is required' });
            }
          
            
            // Validate PropertyRoomType exists
            const propertyRoomType = await prisma.propertyRoomType.findUnique({
                where: { id: propertyRoomTypeId, isDeleted: false }
            });
            
            if (!propertyRoomType) {
                return res.status(404).json({ error: 'PropertyRoomType not found' });
            }
            
             // Parse dates

             const startDate = fromDate
             const endDate = toDate

             if (!startDate || !endDate) {
                return res.status(400).json({ error: 'Start date and end date are required' });
             }

             if (startDate > endDate) {
                return res.status(400).json({ error: 'Start date must be before end date' });
             }

            const start = startDate ? new Date(startDate) : new Date();
            const end = endDate ? new Date(endDate) : new Date(Date.now() + (daysToSeed * 24 * 60 * 60 * 1000));
            
            // Validate date range
            if (start >= end) {
                return res.status(400).json({ error: 'Start date must be before end date' });
            }
            
            const results = [];
            const errors = [];
            
            // Generate dates and create rate entries
            const currentDate = new Date(start);

            console.log('Current date:', currentDate);
            console.log('End date:', end);
            while (currentDate <= end) {
                try {
                    // Check if rate already exists for this date
                    const existingRate = await prisma.rateCalendar.findFirst({
                        where: {
                            propertyRoomTypeId: propertyRoomTypeId,
                            date: currentDate,
                            isDeleted: false
                        }
                    });
                    
                    if (existingRate) {
                        console.log(`Rate already exists for ${currentDate.toISOString().split('T')[0]}, skipping...`);
                        currentDate.setDate(currentDate.getDate() + 1);
                        continue;
                    }
                    
                    // Create new rate entry
                    const rateEntry = await prisma.rateCalendar.create({
                        data: {
                            propertyRoomTypeId: propertyRoomTypeId,
                            date: new Date(currentDate),
                            price: parseFloat(defaultPrice),
                            isOpen: true,
                            isDeleted: false
                        }
                    });
                    
                    results.push({
                        id: rateEntry.id,
                        date: rateEntry.date.toISOString().split('T')[0],
                        price: rateEntry.price,
                        isOpen: rateEntry.isOpen
                    });
                    
                } catch (error) {
                    console.error(`Error creating rate for ${currentDate.toISOString().split('T')[0]}:`, error.message);
                    errors.push({
                        date: currentDate.toISOString().split('T')[0],
                        error: error.message
                    });
                }
                
                currentDate.setDate(currentDate.getDate() + 1);
            }
            
            res.status(201).json({
                success: true,
                message: `Rate seeding completed`,
                summary: {
                    totalDates: Math.ceil((end - start) / (24 * 60 * 60 * 1000)),
                    created: results.length,
                    skipped: Math.ceil((end - start) / (24 * 60 * 60 * 1000)) - results.length - errors.length,
                    errors: errors.length
                },
                data: results,
                errors: errors.length > 0 ? errors : undefined
            });
            
        } catch (error) {
            console.error('Error seeding rates:', error);
            res.status(500).json({ 
                error: 'Internal server error',
                details: error.message 
            });
        }
    },

    // Bulk seed rates for multiple PropertyRoomTypes
    bulkSeedRates: async (req, res) => {
        try {
            const { 
                propertyId, 
                startDate, 
                endDate, 
                propertyRoomTypeIds = [] // Optional: specific room types, otherwise all for property
            } = req.body;
            
            console.log('Bulk seeding rates for Property:', propertyId);
            
            // Validate required fields
            if (!propertyId && !propertyRoomTypeIds.length) {
                return res.status(400).json({ error: 'Either Property ID or PropertyRoomType IDs are required' });
            }
            
            if (!defaultPrice && defaultPrice !== 0) {
                return res.status(400).json({ error: 'Default price is required' });
            }
            
            let targetPropertyRoomTypes = [];
            
            // Get PropertyRoomTypes to seed
            if (propertyRoomTypeIds.length > 0) {
                // Use specific PropertyRoomType IDs
                targetPropertyRoomTypes = await prisma.propertyRoomType.findMany({
                    where: { 
                        id: { in: propertyRoomTypeIds },
                        isDeleted: false 
                    },
                    select: { id: true, propertyId: true }
                });
            } else {
                // Get all PropertyRoomTypes for the property
                targetPropertyRoomTypes = await prisma.propertyRoomType.findMany({
                    where: { 
                        propertyId: propertyId,
                        isDeleted: false 
                    },
                    select: { id: true, propertyId: true }
                });
            }
            
            if (targetPropertyRoomTypes.length === 0) {
                return res.status(404).json({ error: 'No PropertyRoomTypes found' });
            }
            
            // Parse dates
            const start = startDate ? new Date(startDate) : new Date();
            const end = endDate ? new Date(endDate) : new Date(Date.now() + (daysToSeed * 24 * 60 * 60 * 1000));
            
            const allResults = [];
            const allErrors = [];
            
            // Process each PropertyRoomType
            for (const propertyRoomType of targetPropertyRoomTypes) {
                console.log(`Processing PropertyRoomType: ${propertyRoomType.id}`);
                
                const currentDate = new Date(start);
                while (currentDate <= end) {
                    try {
                        // Check if rate already exists
                        const existingRate = await prisma.rateCalendar.findFirst({
                            where: {
                                propertyRoomTypeId: propertyRoomType.id,
                                date: currentDate,
                                isDeleted: false
                            }
                        });
                        
                        if (existingRate) {
                            currentDate.setDate(currentDate.getDate() + 1);
                            continue;
                        }
                        
                        // Create new rate entry
                        const rateEntry = await prisma.rateCalendar.create({
                            data: {
                                propertyRoomTypeId: propertyRoomType.id,
                                date: new Date(currentDate),
                                price: parseFloat(defaultPrice),
                                isOpen: true,
                                isDeleted: false
                            }
                        });
                        
                        allResults.push({
                            propertyRoomTypeId: propertyRoomType.id,
                            date: rateEntry.date.toISOString().split('T')[0],
                            price: rateEntry.price,
                            isOpen: rateEntry.isOpen
                        });
                        
                    } catch (error) {
                        allErrors.push({
                            propertyRoomTypeId: propertyRoomType.id,
                            date: currentDate.toISOString().split('T')[0],
                            error: error.message
                        });
                    }
                    
                    currentDate.setDate(currentDate.getDate() + 1);
                }
            }
            
            res.status(201).json({
                success: true,
                message: `Bulk rate seeding completed`,
                summary: {
                    propertyRoomTypesProcessed: targetPropertyRoomTypes.length,
                    totalDatesPerRoomType: Math.ceil((end - start) / (24 * 60 * 60 * 1000)),
                    totalCreated: allResults.length,
                    totalErrors: allErrors.length
                },
                data: allResults,
                errors: allErrors.length > 0 ? allErrors : undefined
            });
            
        } catch (error) {
            console.error('Error bulk seeding rates:', error);
            res.status(500).json({ 
                error: 'Internal server error',
                details: error.message 
            });
        }
    },
    
    // Update specific rate
    updateRate: async (req, res) => {
        try {
            const { id } = req.params;
            const { price, isOpen } = req.body;
            
            const rate = await prisma.rateCalendar.findUnique({
                where: { id: id }
            });
            
            if (!rate) {
                return res.status(404).json({ error: 'Rate not found' });
            }
            
            const updatedRate = await prisma.rateCalendar.update({
                where: { id: id },
                data: {
                    price: price !== undefined ? parseFloat(price) : rate.price,
                    isOpen: isOpen !== undefined ? isOpen : rate.isOpen
                }
            });
            
            res.json({
                success: true,
                message: 'Rate updated successfully',
                data: {
                    id: updatedRate.id,
                    propertyRoomTypeId: updatedRate.propertyRoomTypeId,
                    date: updatedRate.date.toISOString().split('T')[0],
                    price: updatedRate.price,
                    isOpen: updatedRate.isOpen
                }
            });
            
        } catch (error) {
            console.error('Error updating rate:', error);
            res.status(500).json({ 
                error: 'Internal server error',
                details: error.message 
            });
        }
    },

    // Get rates for a PropertyRoomType
    getRates: async (req, res) => {
        try {
            const { propertyRoomTypeId } = req.params;
            const { startDate, endDate, limit = 100, offset = 0 } = req.query;
            
            const where = {
                propertyRoomTypeId: propertyRoomTypeId,
                isDeleted: false
            };
            
            // Add date filters if provided
            if (startDate || endDate) {
                where.date = {};
                if (startDate) where.date.gte = new Date(startDate);
                if (endDate) where.date.lte = new Date(endDate);
            }
            
            const rates = await prisma.rateCalendar.findMany({
                where: where,
                orderBy: { date: 'asc' },
                take: parseInt(limit),
                skip: parseInt(offset),
                select: {
                    id: true,
                    date: true,
                    price: true,
                    isOpen: true,
                    createdAt: true
                }
            });
            
            const total = await prisma.rateCalendar.count({ where: where });
            
            res.json({
                success: true,
                data: rates.map(rate => ({
                    id: rate.id,
                    date: rate.date.toISOString().split('T')[0],
                    price: rate.price,
                    isOpen: rate.isOpen,
                    createdAt: rate.createdAt
                })),
                pagination: {
                    total: total,
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    hasMore: (parseInt(offset) + parseInt(limit)) < total
                }
            });
            
        } catch (error) {
            console.error('Error fetching rates:', error);
            res.status(500).json({ 
                error: 'Internal server error',
                details: error.message 
            });
        }
    },

    // Delete rates (soft delete)
    deleteRates: async (req, res) => {
        try {
            const { propertyRoomTypeId } = req.params;
            const { startDate, endDate } = req.body;
            
            const where = {
                propertyRoomTypeId: propertyRoomTypeId,
                isDeleted: false
            };
            
            // Add date filters if provided
            if (startDate || endDate) {
                where.date = {};
                if (startDate) where.date.gte = new Date(startDate);
                if (endDate) where.date.lte = new Date(endDate);
            }
            
            const deletedCount = await prisma.rateCalendar.updateMany({
                where: where,
                data: { isDeleted: true }
            });
            
            res.json({
                success: true,
                message: `${deletedCount.count} rates deleted successfully`,
                deletedCount: deletedCount.count
            });
            
        } catch (error) {
            console.error('Error deleting rates:', error);
            res.status(500).json({ 
                error: 'Internal server error',
                details: error.message 
            });
        }
    }
};

module.exports = rateCalendarController;
