const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();


const SpecialRateApplicationController = {
  createSpecialRateApplication: async (req, res) => {
    try {
      const { specialRateId, propertyId, propertyRoomTypeId, dateFrom, dateTo } = req.body;
    
      console.log("Received special rate application data:", req.body);
      
      // Validate required fields
      if (!specialRateId || !propertyId || !dateFrom || !dateTo) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: specialRateId, propertyId, dateFrom, dateTo'
        });
      }

      // Parse dates from DD-MM-YYYY format
      const parseDateFromDDMMYYYY = (dateString) => {
        try {
          // Handle DD-MM-YYYY format
          const [day, month, year] = dateString.split('-');
          return new Date(year, month - 1, day); // month is 0-indexed in JavaScript
        } catch (error) {
          throw new Error(`Invalid date format: ${dateString}. Expected DD-MM-YYYY`);
        }
      };

      let startDate, endDate;
      
      try {
        startDate = parseDateFromDDMMYYYY(dateFrom);
        endDate = parseDateFromDDMMYYYY(dateTo);
        
        // Validate parsed dates
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          throw new Error('Invalid date values');
        }
      } catch (dateError) {
        return res.status(400).json({
          success: false,
          message: `Date parsing error: ${dateError.message}. Please provide dates in DD-MM-YYYY format.`
        });
      }
      
      if (startDate >= endDate) {
        // Allow same day applications (startDate === endDate)
        if (startDate.getTime() !== endDate.getTime()) {
          return res.status(400).json({
            success: false,
            message: 'dateFrom must be before or equal to dateTo'
          });
        }
      }

      console.log("Parsed dates:", { 
        startDate, 
        endDate, 
        isSingleDay: startDate.getTime() === endDate.getTime() 
      });

      // Fetch special rate with room type links
      const specialRate = await prisma.specialRate.findUnique({
        where: { 
          id: specialRateId,
          isActive: true, 
          isDeleted: false,
          propertyId: propertyId // Ensure rate belongs to this property
        },
        include: {
          roomTypeLinks: {
            include: {
              propertyRoomType: {
                include: {
                  roomType: true
                }
              }
            }
          }
        }
      });

      if (!specialRate) {
        return res.status(404).json({
          success: false,
          message: 'Special rate not found or inactive'
        });
      }

      let specialRateApplication;


      console.log("specialRate",specialRate)
      // Check if this special rate applies to specific room types
      if (specialRate.roomTypeLinks.length > 0) {
        // Room-type-specific special rate
        
        if (!propertyRoomTypeId) {
          return res.status(400).json({
            success: false,
            message: 'propertyRoomTypeId is required for room-type-specific special rates',
          });
        }

        // Parse propertyRoomTypeId if it's a JSON string array
        let roomTypeIds = [];
        try {
          if (typeof propertyRoomTypeId === 'string') {
            roomTypeIds = JSON.parse(propertyRoomTypeId);
          } else if (Array.isArray(propertyRoomTypeId)) {
            roomTypeIds = propertyRoomTypeId;
          } else {
            roomTypeIds = [propertyRoomTypeId];
          }
        } catch (parseError) {
          return res.status(400).json({
            success: false,
            message: 'Invalid propertyRoomTypeId format. Expected array of IDs or single ID.'
          });
        }

        console.log("Parsed room type IDs:", roomTypeIds);

        // Validate that all provided room types are in the special rate's applicable room types
        const applicableRoomTypes = [];

        for (const roomTypeId of roomTypeIds) {
          const applicableRoomType = specialRate.roomTypeLinks.find(
            link => link.propertyRoomTypeId === roomTypeId && link.isActive
          );
          
          if (applicableRoomType) {
            applicableRoomTypes.push(applicableRoomType);
          }
        }

        // Only proceed if we have at least one valid room type
        if (applicableRoomTypes.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'No valid room types found for this special rate',
            availableRoomTypes: specialRate.roomTypeLinks
              .filter(link => link.isActive)
              .map(link => ({
                propertyRoomTypeId: link.propertyRoomTypeId,
                roomTypeName: link.propertyRoomType.roomType.name,
                pricingMode: link.pricingMode,
                flatPrice: link.flatPrice,
                percentAdj: link.percentAdj
              }))
          });
        }

        // Get only the valid room type IDs for conflict checking and application creation
        const validRoomTypeIds = applicableRoomTypes.map(room => room.propertyRoomTypeId);

        console.log(`Found ${validRoomTypeIds.length} valid room types out of ${roomTypeIds.length} requested`);

        // Check for existing applications in the date range for these valid room types only
        const existingApplication = await prisma.specialRateApplication.findFirst({
          where: {
            propertyId: propertyId,
            propertyRoomTypeId: { in: validRoomTypeIds },
            isActive: true,
            OR: [
              {
                AND: [
                  { dateFrom: { lte: startDate } },
                  { dateTo: { gt: startDate } }
                ]
              },
              {
                AND: [
                  { dateFrom: { lt: endDate } },
                  { dateTo: { gte: endDate } }
                ]
              },
              {
                AND: [
                  { dateFrom: { gte: startDate } },
                  { dateTo: { lte: endDate } }
                ]
              }
            ]
          }
        });

        if (existingApplication) {
          return res.status(409).json({
            success: false,
            message: 'There is already an active special rate application for one or more of these room types in the specified date range',
            conflictingApplication: {
              id: existingApplication.id,
              dateFrom: existingApplication.dateFrom,
              dateTo: existingApplication.dateTo,
              specialRateId: existingApplication.specialRateId,
              conflictingRoomTypeId: existingApplication.propertyRoomTypeId
            }
          });
        }

        // Create applications for each valid room type only
        const createdApplications = [];
        
        for (const roomTypeId of validRoomTypeIds) {
          const application = await prisma.specialRateApplication.create({
            data: {
              specialRateId,
              propertyId,
              propertyRoomTypeId: roomTypeId,
              dateFrom: startDate,
              dateTo: endDate,
              isActive: true,
              createdBy: req.user?.id || null
            },
            include: {
              specialRate: true,
              propertyRoomType: {
                include: {
                  roomType: true
                }
              }
            }
          });
          createdApplications.push(application);
        }

        specialRateApplication = createdApplications;

      } else {
        // Global special rate (applies to entire property)
        
        // if (propertyRoomTypeId) {
        //   return res.status(400).json({
        //     success: false,
        //     message: 'propertyRoomTypeId should not be provided for global special rates'
        //   });
        // }

        // Check for existing global applications in the date range
        const existingApplication = await prisma.specialRateApplication.findFirst({
          where: {
            propertyId: propertyId,
            propertyRoomTypeId: null, // Global application
            isActive: true,
            OR: [
              {
                AND: [
                  { dateFrom: { lte: startDate } },
                  { dateTo: { gt: startDate } }
                ]
              },
              {
                AND: [
                  { dateFrom: { lt: endDate } },
                  { dateTo: { gte: endDate } }
                ]
              },
              {
                AND: [
                  { dateFrom: { gte: startDate } },
                  { dateTo: { lte: endDate } }
                ]
              }
            ]
          }
        });

        if (existingApplication) {
          return res.status(409).json({
            success: false,
            message: 'There is already an active global special rate application for this property in the specified date range',
            conflictingApplication: {
              id: existingApplication.id,
              dateFrom: existingApplication.dateFrom,
              dateTo: existingApplication.dateTo,
              specialRateId: existingApplication.specialRateId
            }
          });
        }

        // Create global application
        specialRateApplication = await prisma.specialRateApplication.create({
          data: {
            specialRateId,
            propertyId,
            propertyRoomTypeId: null, // Global application
            dateFrom: startDate,
            dateTo: endDate,
            isActive: true,
          },
          include: {
            specialRate: true
          }
        });
      }

      res.status(201).json({
        success: true,
        message: 'Special rate application created successfully',
        data: specialRateApplication,
        appliedTo: specialRate.roomTypeLinks.length > 0 ? 'specific room types' : 'entire property',
        roomTypesCount: Array.isArray(specialRateApplication) ? specialRateApplication.length : 1,
        dateRange: {
          from: dateFrom,
          to: dateTo,
          parsedStartDate: startDate,
          parsedEndDate: endDate,
          isSingleDay: startDate.getTime() === endDate.getTime(),
          totalDays: Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1 // +1 to include the end date
        }
      });

    } catch (error) {
      console.error('Create Special Rate Application Error:', error);
      
      // Handle Prisma unique constraint violations
      if (error.code === 'P2002') {
        return res.status(409).json({
          success: false,
          message: 'A special rate application with these exact parameters already exists'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  },
  getSpecialRateApplications: async (req,res)=>{
    try {
      const { propertyId } = req.query; 

      if (!propertyId) {
        return res.status(400).json({ success: false, message: 'Missing property ID' });
      }

      const specialRates = await prisma.specialRateApplication.findMany({
        where: {
          propertyId: propertyId,
          isActive: true
        },
        include: {
          specialRate: true
        }
      });

      res.status(200).json({
        success: true,
        data: specialRates
      });
    } catch (error) {
      console.error('Get Applied Special Rates Error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  },
  deleteSpecialRateApplication: async (req,res)=>{
    try {
      const { id } = req.params;
      const deletedApplication = await prisma.specialRateApplication.delete({
        where: { id: id }
      });
      res.status(200).json({
        success: true,
        message: 'Special rate application deleted successfully',
        data: deletedApplication
      });
    } catch (error) {
      console.error('Delete Special Rate Application Error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
};
module.exports = SpecialRateApplicationController;