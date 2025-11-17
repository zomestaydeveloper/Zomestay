const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const PropertyForAgentController = {
  // Get all active properties for agent discount management
  getActiveProperties: async (req, res) => {
    try {
      const properties = await prisma.property.findMany({
        where: {
          isDeleted: false,
          status: 'active'
        },
        select: {
          id: true,
          title: true,
          location: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          ownerHost: {
            select: {
              firstName: true,
              lastName: true
            }
          },
          _count: {
            select: {
              roomTypes: true,
              ratePlans: true,
              MealPlan: true
            }
          }
        },
        orderBy: {
          title: 'asc'
        }
      });

      // Transform data to match frontend expectations
      const transformedProperties = properties.map(property => ({
        id: property.id,
        name: property.title,
        location: property.location?.address ? 
          `${property.location.address.city}, ${property.location.address.state}` : 
          'Location not specified',
        status: property.status,
        hostName: property.ownerHost ? 
          `${property.ownerHost.firstName || ''} ${property.ownerHost.lastName || ''}`.trim() : 
          'Unknown Host',
        totalRooms: property._count.roomTypes,
        ratePlans: property._count.ratePlans,
        mealPlans: property._count.MealPlan,
        createdAt: property.createdAt,
        updatedAt: property.updatedAt
      }));

      res.json({
        success: true,
        data: transformedProperties,
        count: transformedProperties.length
      });
    } catch (err) {
      console.error('getActiveProperties:', err);
      res.status(500).json({
        success: false,
        message: 'Error fetching active properties'
      });
    }
  }
};

module.exports = PropertyForAgentController;
