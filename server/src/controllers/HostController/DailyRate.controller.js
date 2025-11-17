const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * ===================== Daily Rate Plan Management =====================
 */

// Helper function to normalize dates to avoid timezone issues
// Converts date strings (YYYY-MM-DD) or Date objects to Date objects at midnight UTC
const normalizeDate = (dateInput) => {
  if (!dateInput) return null;
  // If it's already a Date object, normalize it to midnight UTC
  if (dateInput instanceof Date) {
    return new Date(Date.UTC(dateInput.getUTCFullYear(), dateInput.getUTCMonth(), dateInput.getUTCDate()));
  }
  // If it's a string in YYYY-MM-DD format
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    const [year, month, day] = dateInput.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  }
  // Try to parse as-is
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return null;
  // Normalize to midnight UTC
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
};

// Get all rate plan dates for a property
const getRatePlanDates = async (req, res) => {
  try {
    const { propertyId } = req.params;
    const { startDate, endDate } = req.query;

    if (!propertyId) {
      return res.status(400).json({
        success: false,
        message: 'Property ID is required'
      });
    }

    // Build where clause
    const whereClause = {
      propertyId,
      isDeleted: false
    };

    // Add date range filter if provided
    // Normalize dates to avoid timezone issues
    if (startDate && endDate) {
      const start = normalizeDate(startDate);
      const end = normalizeDate(endDate);
      
      if (start && end) {
        // For end date, we need to include the entire day
        // So we set it to end of day (23:59:59.999 UTC)
        const endOfDay = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate(), 23, 59, 59, 999));
        
        whereClause.date = {
          gte: start,
          lte: endOfDay
        };
      }
    }

    const ratePlanDates = await prisma.ratePlanDate.findMany({
      where: whereClause,
      include: {
        ratePlan: {
          select: {
            id: true,
            name: true,
            color: true,
            isActive: true
          }
        }
      },
      orderBy: {
        date: 'asc'
      }
    });

    return res.status(200).json({
      success: true,
      data: ratePlanDates
    });

  } catch (error) {
    console.error('Error fetching rate plan dates:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch rate plan dates',
      error: error.message
    });
  }
};

// Apply rate plan to single date
const applyRatePlanToDate = async (req, res) => {
  try {
    const { propertyId, ratePlanId, date } = req.body;

    if (!propertyId || !ratePlanId || !date) {
      return res.status(400).json({
        success: false,
        message: 'Property ID, Rate Plan ID, and Date are required'
      });
    }

    // Check if rate plan exists and is active
    const ratePlan = await prisma.ratePlan.findFirst({
      where: {
        id: ratePlanId,
        propertyId,
        isActive: true,
        isDeleted: false
      }
    });

    if (!ratePlan) {
      return res.status(404).json({
        success: false,
        message: 'Rate plan not found or inactive'
      });
    }

    // Normalize date to avoid timezone issues
    const normalizedDate = normalizeDate(date);
    if (!normalizedDate) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Expected YYYY-MM-DD format'
      });
    }

    // Check if rate plan is already applied to this date
    const existingRatePlanDate = await prisma.ratePlanDate.findFirst({
      where: {
        propertyId,
        date: normalizedDate,
        isDeleted: false
      }
    });

    if (existingRatePlanDate) {
      // Update existing rate plan date
      const updatedRatePlanDate = await prisma.ratePlanDate.update({
        where: {
          id: existingRatePlanDate.id
        },
        data: {
          ratePlanId,
          updatedAt: new Date()
        },
        include: {
          ratePlan: {
            select: {
              id: true,
              name: true,
              color: true,
              isActive: true
            }
          }
        }
      });

      return res.status(200).json({
        success: true,
        message: 'Rate plan updated successfully',
        data: updatedRatePlanDate
      });
    } else {
      // Create new rate plan date
      const newRatePlanDate = await prisma.ratePlanDate.create({
        data: {
          propertyId,
          ratePlanId,
          date: normalizedDate,
          isActive: true
        },
        include: {
          ratePlan: {
            select: {
              id: true,
              name: true,
              color: true,
              isActive: true
            }
          }
        }
      });

      return res.status(201).json({
        success: true,
        message: 'Rate plan applied successfully',
        data: newRatePlanDate
      });
    }

  } catch (error) {
    console.error('Error applying rate plan to date:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to apply rate plan to date',
      error: error.message
    });
  }
};

// Apply rate plan to date range
const applyRatePlanToDateRange = async (req, res) => {
  try {
    const { propertyId, ratePlanId, startDate, endDate } = req.body;

    if (!propertyId || !ratePlanId || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Property ID, Rate Plan ID, Start Date, and End Date are required'
      });
    }

    // Check if rate plan exists and is active
    const ratePlan = await prisma.ratePlan.findFirst({
      where: {
        id: ratePlanId,
        propertyId,
        isActive: true,
        isDeleted: false
      }
    });

    if (!ratePlan) {
      return res.status(404).json({
        success: false,
        message: 'Rate plan not found or inactive'
      });
    }

    // Normalize dates to avoid timezone issues
    const start = normalizeDate(startDate);
    const end = normalizeDate(endDate);
    
    if (!start || !end) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Expected YYYY-MM-DD format'
      });
    }

    if (start > end) {
      return res.status(400).json({
        success: false,
        message: 'Start date must be before end date'
      });
    }

    // Generate all dates in the range using UTC
    const dates = [];
    const currentDate = new Date(start);
    
    while (currentDate <= end) {
      // Create a normalized date at midnight UTC
      const normalizedDate = new Date(Date.UTC(
        currentDate.getUTCFullYear(),
        currentDate.getUTCMonth(),
        currentDate.getUTCDate()
      ));
      dates.push(normalizedDate);
      // Move to next day in UTC
      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }

    // Use transaction to ensure all operations succeed or fail together
    const result = await prisma.$transaction(async (tx) => {
      const createdRatePlanDates = [];
      const updatedRatePlanDates = [];

      for (const date of dates) {
        // Check if rate plan is already applied to this date
        const existingRatePlanDate = await tx.ratePlanDate.findFirst({
          where: {
            propertyId,
            date,
            isDeleted: false
          }
        });

        if (existingRatePlanDate) {
          // Update existing rate plan date
          const updated = await tx.ratePlanDate.update({
            where: {
              id: existingRatePlanDate.id
            },
            data: {
              ratePlanId,
              updatedAt: new Date()
            }
          });
          updatedRatePlanDates.push(updated);
        } else {
          // Create new rate plan date
          const created = await tx.ratePlanDate.create({
            data: {
              propertyId,
              ratePlanId,
              date,
              isActive: true
            }
          });
          createdRatePlanDates.push(created);
        }
      }

      return {
        created: createdRatePlanDates,
        updated: updatedRatePlanDates,
        totalDates: dates.length
      };
    });

    return res.status(200).json({
      success: true,
      message: `Rate plan applied to ${result.totalDates} dates successfully`,
      data: {
        created: result.created.length,
        updated: result.updated.length,
        totalDates: result.totalDates
      }
    });

  } catch (error) {
    console.error('Error applying rate plan to date range:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to apply rate plan to date range',
      error: error.message
    });
  }
};

// Remove rate plan from date
const removeRatePlanFromDate = async (req, res) => {
  try {
    const { propertyId, date } = req.body;

    if (!propertyId || !date) {
      return res.status(400).json({
        success: false,
        message: 'Property ID and Date are required'
      });
    }

    // Normalize date to avoid timezone issues
    const normalizedDate = normalizeDate(date);
    if (!normalizedDate) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Expected YYYY-MM-DD format'
      });
    }

    const ratePlanDate = await prisma.ratePlanDate.findFirst({
      where: {
        propertyId,
        date: normalizedDate,
        isDeleted: false
      }
    });

    if (!ratePlanDate) {
      return res.status(404).json({
        success: false,
        message: 'No rate plan found for this date'
      });
    }

    // Hard delete the rate plan date
    await prisma.ratePlanDate.delete({
      where: {
        id: ratePlanDate.id
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Rate plan removed from date successfully'
    });

  } catch (error) {
    console.error('Error removing rate plan from date:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to remove rate plan from date',
      error: error.message
    });
  }
};

// Get rate plan for specific date
const getRatePlanForDate = async (req, res) => {
  try {
    const { propertyId, date } = req.params;

    if (!propertyId || !date) {
      return res.status(400).json({
        success: false,
        message: 'Property ID and Date are required'
      });
    }

    // Normalize date to avoid timezone issues
    const normalizedDate = normalizeDate(date);
    if (!normalizedDate) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Expected YYYY-MM-DD format'
      });
    }

    const ratePlanDate = await prisma.ratePlanDate.findFirst({
      where: {
        propertyId,
        date: normalizedDate,
        isDeleted: false,
        isActive: true
      },
      include: {
        ratePlan: {
          select: {
            id: true,
            name: true,
            color: true,
            isActive: true,
            description: true
          }
        }
      }
    });

    if (!ratePlanDate) {
      return res.status(404).json({
        success: false,
        message: 'No rate plan found for this date'
      });
    }

    return res.status(200).json({
      success: true,
      data: ratePlanDate
    });

  } catch (error) {
    console.error('Error fetching rate plan for date:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch rate plan for date',
      error: error.message
    });
  }
};

module.exports = {
  getRatePlanDates,
  applyRatePlanToDate,
  applyRatePlanToDateRange,
  removeRatePlanFromDate,
  getRatePlanForDate
};

