const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { applySpecialRates } = require('../../utils/specialRateMap.utils');

// "2025-09-29T00:00:00.000Z" -> "2025-09-29"
const toYMD = (d) =>
  (d instanceof Date ? d : new Date(d))
    .toISOString()
    .slice(0, 10);



const AvailabilityController = {
  getAvailability: async (req, res) => {
    const { propertyId } = req.params;
    const { startDate, endDate } = req.query;

    if (!propertyId ) {
      return res.status(400).json({
        message: 'Property ID, start date, and end date are required'
      });
    }

    try {
      const property = await prisma.property.findUnique({
        where: { id: propertyId },
        select: {
          id: true,
          title: true,
          description: true,
          roomTypes: {
            where: { isDeleted: false },
            select: {
              id: true,
              isActive: true,
              roomType: {
                select: { name: true }
              },
              mealPlanLinks:{
                where: { isActive: true },
              },

              rooms: {
                where: { isDeleted: false },
                select: {
                  id: true,
                  name: true,
                  availability: {
                    where: {
                      isDeleted: false,
                    },
                    select: {
                      id: true,
                      date: true,
                      status: true,
                     
                    },
                  },
                },
              }
             
            },
          },
        },
      });
      
//       const appliedSpecialRates = await prisma.specialRateApplication.findMany({
//   where: {
//     propertyId: propertyId,
//     isActive: true,
//   },
//   select: {
//     id: true,
//     dateFrom: true,
//     dateTo: true,
//     propertyRoomTypeId: true,
//     specialRate: {
//       select: {
//         name: true,
//         color: true,
//         pricingMode: true,
//         flatPrice: true,
//         percentAdj: true,
//         roomTypeLinks: {
//           where: { isActive: true },
//           select: {
//             propertyRoomTypeId: true,
//             pricingMode: true,
//             flatPrice: true,
//             percentAdj: true,
//           },
//         },
//       },
//     },
//   },
// });


     // console.log("appliedSpecialRates", JSON.stringify(appliedSpecialRates, null, 2))





     const getDates =property.roomTypes.flatMap((roomType)=>
        roomType.rooms.flatMap((room)=>
          room.availability.map((avail)=>avail.date.toISOString().split('T')[0])
        )
     )  
   
     const uniqueDates = [...new Set(getDates)];
     const Dates = uniqueDates.sort((a,b)=> new Date (a) - new Date(b))
     const data = Dates.map((date)=>{
      return{date,RoomType:property.roomTypes.map((roomType)=>{return {Type: roomType?.roomType?.name ,
        PropertyRoomTypeId:roomType?.id,
        TotalnoofRooms: roomType?.rooms?.length,AvailableRooms: roomType?.rooms?.filter((room)=>
        room.availability.some((avail)=>toYMD(avail.date)===date && avail.status==='available')
      ).length,
      BookedRooms: roomType?.rooms?.filter((room)=>
        room.availability.some((avail)=>toYMD(avail.date)===date && avail.status==='booked')
      ).length,UnderMaintenance: roomType?.rooms?.filter((room)=>
        room.availability.some((avail)=>toYMD(avail.date)===date && avail.status==='maintenance')
      ).length ,
      Rooms: roomType?.rooms?.map((room)=>{return{roomId:room.id,roomName:room.name,Avilability:room.availability.filter((avail)=>toYMD(avail.date)===date).map((a)=>{return{availabilityId:a.id,date:toYMD(a.date),status:a.status}}),

    }}),
       // Rate:roomType?.rates.filter((rate)=>toYMD(rate.date)===date).map((r)=>{return{rateId:r.id,price:r.price,isOpen:r.isOpen,date: toYMD(r.date)}})
        }
     })}
    })
  

   //dataWithSpecialRates = applySpecialRates(data, appliedSpecialRates);



      return res.json({property});
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        message: 'Error fetching property',
        error: error.message,
      });
    }
  },
};

module.exports = AvailabilityController;


// const prisma = new PrismaClient();

// // "2025-09-29T00:00:00.000Z" -> "2025-09-29"
// const toYMD = (d) =>
//   (d instanceof Date ? d : new Date(d))
//     .toISOString()
//     .slice(0, 10);

// // Helper function to calculate special rate price
// const calculateSpecialRatePrice = (basePrice, specialRate, roomTypeOverride = null) => {
//   // Use room-type-specific override if available, otherwise use special rate defaults
//   const pricingMode = roomTypeOverride?.pricingMode || specialRate.pricingMode;
//   const flatPrice = roomTypeOverride?.flatPrice || specialRate.flatPrice;
//   const percentAdj = roomTypeOverride?.percentAdj || specialRate.percentAdj;

//   if (pricingMode === 'flat' && flatPrice !== null) {
//     return parseFloat(flatPrice);
//   } else if (pricingMode === 'percent' && percentAdj !== null) {
//     const adjustment = (parseFloat(basePrice) * parseFloat(percentAdj)) / 100;
//     return parseFloat(basePrice) + adjustment;
//   }
  
//   return parseFloat(basePrice);
// };

// // Helper function to find applicable special rate for a given date and room type
// const findApplicableSpecialRate = (date, propertyRoomTypeId, appliedSpecialRates) => {
//   const dateObj = new Date(date);
  
//   for (const application of appliedSpecialRates) {
//     const dateFrom = new Date(application.dateFrom);
//     const dateTo = new Date(application.dateTo);
    
//     // Check if date falls within the application range
//     if (dateObj >= dateFrom && dateObj <= dateTo) {
//       // Check if it applies to this specific room type or property-wide (null)
//       if (application.propertyRoomTypeId === null || 
//           application.propertyRoomTypeId === propertyRoomTypeId) {
//         return application;
//       }
//     }
//   }
  
//   return null;
// };

// const AvailabilityController = {
//   getAvailability: async (req, res) => {
//     const { propertyId } = req.params;
//     const { startDate, endDate } = req.query;

//     if (!propertyId) {
//       return res.status(400).json({
//         message: 'Property ID, start date, and end date are required'
//       });
//     }

//     try {
//       const property = await prisma.property.findUnique({
//         where: { id: propertyId },
//         select: {
//           id: true,
//           title: true,
//           description: true,
//           roomTypes: {
//             where: { isDeleted: false },
//             select: {
//               id: true,
//               basePrice: true,
//               isActive: true,
//               roomType: {
//                 select: { name: true }
//               },
//               rooms: {
//                 where: { isDeleted: false },
//                 select: {
//                   id: true,
//                   name: true,
//                   availability: {
//                     where: {
//                       isDeleted: false,
//                       date: {
//                         gte: new Date(startDate),
//                         lt: new Date(endDate),
//                       },
//                     },
//                     select: {
//                       id: true,
//                       date: true,
//                       status: true,
//                     },
//                   },
//                 },
//               },
//               rates: {
//                 where: {
//                   isDeleted: false,
//                   date: {
//                     gte: new Date(startDate),
//                     lt: new Date(endDate),
//                   }
//                 },
//                 select: {
//                   id: true,
//                   date: true,
//                   price: true,
//                   isOpen: true,
//                 }
//               }
//             },
//           },
//         },
//       });

//       // Fetch applied special rates with room type overrides
//       const appliedSpecialRates = await prisma.specialRateApplication.findMany({
//         where: {
//           propertyId: propertyId,
//           isActive: true,
//           dateFrom: { lte: new Date(endDate) },
//           dateTo: { gte: new Date(startDate) },
//         },
//         include: {
//           specialRate: {
//             include: {
//               roomTypeLinks: {
//                 where: { isActive: true },
//                 select: {
//                   propertyRoomTypeId: true,
//                   pricingMode: true,
//                   flatPrice: true,
//                   percentAdj: true,
//                 }
//               }
//             }
//           }
//         }
//       });

//       // Extract unique dates from availability
//       const getDates = property.roomTypes.flatMap((roomType) =>
//         roomType.rooms.flatMap((room) =>
//           room.availability.map((avail) => avail.date.toISOString().split('T')[0])
//         )
//       );

//       const uniqueDates = [...new Set(getDates)];
//       const Dates = uniqueDates.sort((a, b) => new Date(a) - new Date(b));

//       // Build the response data with special rates applied
//       const data = Dates.map((date) => {
//         return {
//           date,
//           RoomType: property.roomTypes.map((roomType) => {
//             // Find applicable special rate for this date and room type
//             const applicableRate = findApplicableSpecialRate(
//               date,
//               roomType.id,
//               appliedSpecialRates
//             );

//             // Get base price from rate calendar or use basePrice
//             const rateCalendarEntry = roomType.rates.find(
//               (rate) => toYMD(rate.date) === date
//             );
            
//             let finalPrice = rateCalendarEntry?.price 
//               ? parseFloat(rateCalendarEntry.price)
//               : parseFloat(roomType.basePrice);

//             // Apply special rate if found
//             let specialRateInfo = null;
//             if (applicableRate) {
//               const roomTypeOverride = applicableRate.specialRate.roomTypeLinks.find(
//                 link => link.propertyRoomTypeId === roomType.id
//               );
              
//               const adjustedPrice = calculateSpecialRatePrice(
//                 finalPrice,
//                 applicableRate.specialRate,
//                 roomTypeOverride
//               );
              
//               specialRateInfo = {
//                 id: applicableRate.specialRate.id,
//                 name: applicableRate.specialRate.name,
//                 kind: applicableRate.specialRate.kind,
//                 color: applicableRate.specialRate.color,
//                 originalPrice: finalPrice,
//                 adjustedPrice: adjustedPrice,
//                 pricingMode: roomTypeOverride?.pricingMode || applicableRate.specialRate.pricingMode,
//                 adjustment: roomTypeOverride?.percentAdj || applicableRate.specialRate.percentAdj,
//               };
              
//               finalPrice = adjustedPrice;
//             }

//             return {
//               Type: roomType?.roomType?.name,
//               PropertyRoomTypeId: roomType?.id,
//               TotalnoofRooms: roomType?.rooms?.length,
//               AvailableRooms: roomType?.rooms?.filter((room) =>
//                 room.availability.some(
//                   (avail) => toYMD(avail.date) === date && avail.status === 'available'
//                 )
//               ).length,
//               BookedRooms: roomType?.rooms?.filter((room) =>
//                 room.availability.some(
//                   (avail) => toYMD(avail.date) === date && avail.status === 'booked'
//                 )
//               ).length,
//               UnderMaintenance: roomType?.rooms?.filter((room) =>
//                 room.availability.some(
//                   (avail) => toYMD(avail.date) === date && avail.status === 'maintenance'
//                 )
//               ).length,
//               Rooms: roomType?.rooms?.map((room) => {
//                 return {
//                   roomId: room.id,
//                   roomName: room.name,
//                   Availability: room.availability
//                     .filter((avail) => toYMD(avail.date) === date)
//                     .map((a) => {
//                       return {
//                         availabilityId: a.id,
//                         date: toYMD(a.date),
//                         status: a.status,
//                       };
//                     }),
//                 };
//               }),
//               Rate: {
//                 rateId: rateCalendarEntry?.id || null,
//                 basePrice: rateCalendarEntry?.price || roomType.basePrice,
//                 finalPrice: finalPrice,
//                 isOpen: rateCalendarEntry?.isOpen ?? true,
//                 date: date,
//                 specialRate: specialRateInfo,
//               },
//             };
//           }),
//         };
//       });

//       return res.json({ data });
//     } catch (error) {
//       console.error(error);
//       return res.status(500).json({
//         message: 'Error fetching property',
//         error: error.message,
//       });
//     }
//   },
// };

// module.exports = AvailabilityController;