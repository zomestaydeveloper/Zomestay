const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const PropertySearchController = {
  /**
   * Get unique cities with their icons from all active properties
   * Returns a list of unique cities (case-insensitive) with their icons
   */
  getUniqueCities: async (req, res) => {
    try {
      // Fetch all active, non-deleted properties with location data
      const properties = await prisma.property.findMany({
        where: {
          isDeleted: false,
          status: 'active'
        },
        select: {
          location: true
        }
      });

      // Extract unique cities (case-insensitive) with their icons
      const cityMap = new Map();

      properties.forEach(property => {
        const location = property.location;
        if (!location || typeof location !== 'object') return;

        const city = location.address?.city;
        if (!city || typeof city !== 'string') return;

        // Normalize city name to lowercase for case-insensitive comparison
        const cityKey = city.toLowerCase().trim();
        
        // If city not already in map, add it with icon
        if (!cityMap.has(cityKey)) {
          const cityIcon = location.cityIcon || null;
          cityMap.set(cityKey, {
            name: city, // Keep original casing
            icon: cityIcon
          });
        }
      });

      // Convert map to array and sort by city name
      const uniqueCities = Array.from(cityMap.values())
        .sort((a, b) => a.name.localeCompare(b.name));

      res.json({
        success: true,
        data: uniqueCities,
        count: uniqueCities.length,
        message: 'Unique cities retrieved successfully'
      });
    } catch (err) {
      console.error('getUniqueCities error:', err);
      res.status(500).json({
        success: false,
        message: 'Error fetching unique cities',
        error: err.message
      });
    }
  },

  /**
   * Get all property types from active, non-deleted PropertyType records
   * Returns a list of all property types
   */
  getPropertyTypes: async (req, res) => {
    try {
      // Fetch all active, non-deleted property types
      const propertyTypes = await prisma.propertyType.findMany({
        where: {
          isDeleted: false
        },
        select: {
          id: true,
          name: true,
          createdAt: true,
          updatedAt: true
        },
        orderBy: {
          name: 'asc'
        }
      });

      res.json({
        success: true,
        data: propertyTypes,
        count: propertyTypes.length,
        message: 'Property types retrieved successfully'
      });
    } catch (err) {
      console.error('getPropertyTypes error:', err);
      res.status(500).json({
        success: false,
        message: 'Error fetching property types',
        error: err.message
      });
    }
  }
};

module.exports = PropertySearchController;

