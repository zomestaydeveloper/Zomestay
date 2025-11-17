const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Save PropertyRoomTypeMealPlan data
const savePropertyRoomTypeMealPlans = async (req, res) => {
  try {
    const { propertyId, ratePlans } = req.body;

    // Validation
    if (!propertyId) {
      return res.status(400).json({
        success: false,
        message: 'Property ID is required'
      });
    }

    if (!ratePlans || !Array.isArray(ratePlans) || ratePlans.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Rate plans array is required and cannot be empty'
      });
    }

    // Validate each rate plan
    for (const plan of ratePlans) {
      const { propertyRoomTypeId, mealPlan, groupOccupancyPrice, doubleOccupancyPrice, singleOccupancyPrice, extraBedPriceAdult, extraBedPriceChild, extraBedPriceInfant } = plan;

      if (!propertyRoomTypeId) {
        return res.status(400).json({
          success: false,
          message: 'PropertyRoomTypeId is required for each rate plan'
        });
      }

      if (!mealPlan) {
        return res.status(400).json({
          success: false,
          message: 'Meal plan is required for each rate plan'
        });
      }

      // Validate that at least one price is provided
      if (!doubleOccupancyPrice && !groupOccupancyPrice && !singleOccupancyPrice && !extraBedPriceAdult && !extraBedPriceChild) {
        return res.status(400).json({
          success: false,
          message: 'At least one price must be provided for each rate plan'
        });
      }

      // Validate price values (must be positive numbers)
      const prices = [doubleOccupancyPrice, groupOccupancyPrice, singleOccupancyPrice, extraBedPriceAdult, extraBedPriceChild, extraBedPriceInfant];
      for (const price of prices) {
        if (price !== undefined && price !== null && price !== '') {
          const numPrice = parseFloat(price);
          if (isNaN(numPrice) || numPrice < 0) {
            return res.status(400).json({
              success: false,
              message: 'All prices must be valid positive numbers'
            });
          }
        }
      }
    }

    // Check if property exists and belongs to the user
    const property = await prisma.property.findFirst({
      where: {
        id: propertyId,
        isDeleted: false
      }
    });

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    // Use transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      const savedPlans = [];

      for (const plan of ratePlans) {
        const { propertyRoomTypeId, mealPlan, doubleOccupancyPrice, groupOccupancyPrice, singleOccupancyPrice, extraBedPriceAdult, extraBedPriceChild, extraBedPriceInfant } = plan;

        // Check if PropertyRoomType exists
        const propertyRoomType = await tx.propertyRoomType.findFirst({
          where: {
            id: propertyRoomTypeId,
            propertyId: propertyId
          }
        });

        if (!propertyRoomType) {
          throw new Error(`PropertyRoomType with ID ${propertyRoomTypeId} not found for this property`);
        }

        // Check if MealPlan exists
        const mealPlanRecord = await tx.mealPlan.findFirst({
          where: {
            id: mealPlan,
            isDeleted: false
          }
        });

        if (!mealPlanRecord) {
          throw new Error(`MealPlan with ID ${mealPlan} not found or inactive`);
        }

        // Prepare data for upsert
        const planData = {
          propertyRoomTypeId,
          mealPlanId: mealPlan,
          doubleOccupancyPrice: doubleOccupancyPrice ? parseFloat(doubleOccupancyPrice) : 0,
          singleOccupancyPrice: singleOccupancyPrice ? parseFloat(singleOccupancyPrice) : 0,
          extraBedPriceAdult: extraBedPriceAdult ? parseFloat(extraBedPriceAdult) : 0,
          extraBedPriceChild: extraBedPriceChild ? parseFloat(extraBedPriceChild) : 0,
          extraBedPriceInfant: extraBedPriceInfant ? parseFloat(extraBedPriceInfant) : 0,
          isActive: true,
          groupOccupancyPrice: groupOccupancyPrice ? parseFloat(groupOccupancyPrice) : 0,
        };

        // Upsert the PropertyRoomTypeMealPlan
        const savedPlan = await tx.propertyRoomTypeMealPlan.upsert({
          where: {
            propertyRoomTypeId_mealPlanId: {
              propertyRoomTypeId: propertyRoomTypeId,
              mealPlanId: mealPlan
            }
          },
          update: planData,
          create: planData
        });

        savedPlans.push(savedPlan);
      }

      return savedPlans;
    });

    return res.status(200).json({
      success: true,
      message: 'Rate plans saved successfully',
      data: {
        savedCount: result.length,
        plans: result
      }
    });

  } catch (error) {
    console.error('Error saving PropertyRoomTypeMealPlans:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get PropertyRoomTypeMealPlans for a property
const getPropertyRoomTypeMealPlans = async (req, res) => {
  try {
    const { propertyId } = req.params;

    if (!propertyId) {
      return res.status(400).json({
        success: false,
        message: 'Property ID is required'
      });
    }

    // Get all PropertyRoomTypeMealPlans for the property
    const plans = await prisma.propertyRoomTypeMealPlan.findMany({
      where: {
        propertyRoomType: {
          propertyId: propertyId
        },
        isActive: true
      },
      include: {
        propertyRoomType: {
          include: {
            roomType: true
          }
        },
        mealPlan: true
      }
    });

    return res.status(200).json({
      success: true,
      data: plans
    });

  } catch (error) {
    console.error('Error fetching PropertyRoomTypeMealPlans:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Delete PropertyRoomTypeMealPlan
const deletePropertyRoomTypeMealPlan = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Plan ID is required'
      });
    }

    const deletedPlan = await prisma.propertyRoomTypeMealPlan.update({
      where: { id },
      data: { isActive: false }
    });

    return res.status(200).json({
      success: true,
      message: 'Rate plan deleted successfully',
      data: deletedPlan
    });

  } catch (error) {
    console.error('Error deleting PropertyRoomTypeMealPlan:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

const savePlanBulk = async (req, res) => {
  try {
    const { 
      propertyId, 
      ratePlanName, 
      ratePlanColor, 
      roomTypeMealPlanCombinations 
    } = req.body;

    console.log('Bulk save request:', req.body);

    // Validation
    if (!propertyId) {
      return res.status(400).json({
        success: false,
        message: 'Property ID is required'
      });
    }

    if (!ratePlanName || !ratePlanColor) {
      return res.status(400).json({
        success: false,
        message: 'Rate plan name and color are required'
      });
    }

    if (!roomTypeMealPlanCombinations || !Array.isArray(roomTypeMealPlanCombinations) || roomTypeMealPlanCombinations.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Room type meal plan combinations are required and cannot be empty'
      });
    }

    // Use database transaction for atomicity
    const result = await prisma.$transaction(async (tx) => {
      // First, create or find the rate plan
      let ratePlan = await tx.ratePlan.findFirst({
        where: {
          propertyId: propertyId,
          name: ratePlanName,
          isDeleted: false
        }
      });

      if (!ratePlan) {
        // Create new rate plan
        ratePlan = await tx.ratePlan.create({
          data: {
            propertyId,
            name: ratePlanName,
            color: ratePlanColor,
            isActive: true
          }
        });
      } else {
        // Update existing rate plan color if needed
        if (ratePlan.color !== ratePlanColor) {
          ratePlan = await tx.ratePlan.update({
            where: { id: ratePlan.id },
            data: {
              color: ratePlanColor,
              isActive: true
            }
          });
        }
      }

      // Get all existing combinations for this rate plan
      const existingCombinations = await tx.propertyRoomTypeMealPlan.findMany({
        where: {
          ratePlanId: ratePlan.id,
          isDeleted: false
        }
      });

      // Create a set of incoming combinations for comparison
      const incomingCombinations = new Set();
      for (const combination of roomTypeMealPlanCombinations) {
        incomingCombinations.add(`${combination.propertyRoomTypeId}-${combination.mealPlanId}`);
      }

      // Soft-delete combinations that are no longer in the incoming data
      for (const existing of existingCombinations) {
        const combinationKey = `${existing.propertyRoomTypeId}-${existing.mealPlanId}`;
        if (!incomingCombinations.has(combinationKey)) {
          await tx.propertyRoomTypeMealPlan.update({
            where: { id: existing.id },
            data: { isDeleted: true }
          });
        }
      }

      const savedRecords = [];
      const updatedRecords = [];

      for (const combination of roomTypeMealPlanCombinations) {
        const {
          propertyRoomTypeId,
          mealPlanId,
          singleOccupancyPrice,
          doubleOccupancyPrice,
          extraBedPriceAdult,
          extraBedPriceChild,
          extraBedPriceInfant,
          groupOccupancyPrice,
          existingRecordId
        } = combination;

        const pricingData = {
          propertyId,
          ratePlanId: ratePlan.id,
          propertyRoomTypeId,
          mealPlanId,
          singleOccupancyPrice: parseFloat(singleOccupancyPrice) || 0,
          doubleOccupancyPrice: parseFloat(doubleOccupancyPrice) || 0,
          extraBedPriceAdult: parseFloat(extraBedPriceAdult) || 0,
          extraBedPriceChild: parseFloat(extraBedPriceChild) || 0,
          extraBedPriceInfant: parseFloat(extraBedPriceInfant) || 0,
          groupOccupancyPrice: parseFloat(groupOccupancyPrice) || 0,
          isActive: true
        };

        // Check if a record already exists for this combination
        const existingRecord = await tx.propertyRoomTypeMealPlan.findFirst({
          where: {
            ratePlanId: ratePlan.id,
            propertyRoomTypeId,
            mealPlanId,
            isDeleted: false
          }
        });

        if (existingRecord) {
          // Update existing record
          const updated = await tx.propertyRoomTypeMealPlan.update({
            where: { id: existingRecord.id },
            data: pricingData
          });
          updatedRecords.push(updated);
        } else {
          // Create new record
          const created = await tx.propertyRoomTypeMealPlan.create({
            data: pricingData
          });
          savedRecords.push(created);
        }
      }

      return {
        ratePlan,
        saved: savedRecords,
        updated: updatedRecords,
        total: savedRecords.length + updatedRecords.length
      };
    });

    return res.status(200).json({
      success: true,
      message: `Rate plan "${ratePlanName}" saved successfully`,
      data: {
        ratePlan: result.ratePlan,
        savedCount: result.saved.length,
        updatedCount: result.updated.length,
        totalCount: result.total,
        ratePlanName,
        ratePlanColor
      }
    });

  } catch (error) {
    console.error('Error saving bulk rate plan:', error);
    
    // Handle Prisma unique constraint errors
    if (error.code === 'P2002') {
      const field = error.meta?.target;
      if (field && field.includes('name')) {
        return res.status(400).json({
          success: false,
          message: 'A rate plan with this name already exists for this property',
          error: 'Duplicate rate plan name'
        });
      } else if (field && field.includes('color')) {
        return res.status(400).json({
          success: false,
          message: 'A rate plan with this color already exists for this property',
          error: 'Duplicate rate plan color'
        });
      } else if (field && field.includes('ratePlanId') && field.includes('propertyRoomTypeId') && field.includes('mealPlanId')) {
        return res.status(400).json({
          success: false,
          message: 'This room type and meal plan combination already exists in this rate plan',
          error: 'Duplicate combination'
        });
      } else {
        return res.status(400).json({
          success: false,
          message: 'A duplicate entry was found. Please check your data.',
          error: 'Duplicate entry'
        });
      }
    }

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};
// Get all rate plans for a property
const getPropertyRatePlans = async (req, res) => {
  try {
    const { propertyId } = req.params;

    if (!propertyId) {
      return res.status(400).json({
        success: false,
        message: 'Property ID is required'
      });
    }

    const ratePlans = await prisma.ratePlan.findMany({
      where: {
        propertyId: propertyId,
        isDeleted: false
      },include:{
        roomTypeMealPlanPricing:{
          include:{
            propertyRoomType:{
              select:{
                roomType:{
                  select:{
                    name:true,
                  }
                }
              }
            },
            mealPlan:{
              select:{
                id: true,
                name: true,
                code: true
              }
            }
          }
        }
      }
    });

    return res.status(200).json({
      success: true,
      data: ratePlans
    });

  } catch (error) {
    console.error('Error fetching rate plans:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};


const updateRatePlan = async (req, res) => {
  try {
    const { ratePlanId } = req.params;
    const {
      name,
      color,
      description,
      isActive,
      roomTypeMealPlanCombinations
    } = req.body;

    console.log('Update rate plan request:', req.body);

    // Validation
    if (!ratePlanId) {
      return res.status(400).json({
        success: false,
        message: 'Rate plan ID is required'
      });
    }

    if (!name || !color) {
      return res.status(400).json({
        success: false,
        message: 'Rate plan name and color are required'
      });
    }

    // Use database transaction for atomicity
    const result = await prisma.$transaction(async (tx) => {
      // First, update the rate plan basic info
      const updatedRatePlan = await tx.ratePlan.update({
        where: { 
          id: ratePlanId,
          isDeleted: false 
        },
        data: {
          name,
          color,
          description: description || null,
          isActive: isActive !== undefined ? isActive : true
        }
      });

      // If room type meal plan combinations are provided, update them
      if (roomTypeMealPlanCombinations && Array.isArray(roomTypeMealPlanCombinations)) {
        // Get all existing combinations for this rate plan
        const existingCombinations = await tx.propertyRoomTypeMealPlan.findMany({
          where: {
            ratePlanId: ratePlanId,
            isDeleted: false
          }
        });

        // Create a set of incoming combinations for comparison
        const incomingCombinations = new Set();
        for (const combination of roomTypeMealPlanCombinations) {
          incomingCombinations.add(`${combination.propertyRoomTypeId}-${combination.mealPlanId}`);
        }

        // Soft-delete combinations that are no longer in the incoming data
        for (const existing of existingCombinations) {
          const combinationKey = `${existing.propertyRoomTypeId}-${existing.mealPlanId}`;
          if (!incomingCombinations.has(combinationKey)) {
            await tx.propertyRoomTypeMealPlan.update({
              where: { id: existing.id },
              data: { isDeleted: true }
            });
          }
        }

        const savedRecords = [];
        const updatedRecords = [];

        for (const combination of roomTypeMealPlanCombinations) {
          const {
            propertyRoomTypeId,
            mealPlanId,
            singleOccupancyPrice,
            doubleOccupancyPrice,
            extraBedPriceAdult,
            extraBedPriceChild,
            extraBedPriceInfant,
            groupOccupancyPrice
          } = combination;

          console.log('Processing combination:', {
            propertyRoomTypeId,
            mealPlanId,
            propertyRoomTypeIdType: typeof propertyRoomTypeId,
            mealPlanIdType: typeof mealPlanId
          });

          const pricingData = {
            singleOccupancyPrice: parseFloat(singleOccupancyPrice) || 0,
            doubleOccupancyPrice: parseFloat(doubleOccupancyPrice) || 0,
            extraBedPriceAdult: parseFloat(extraBedPriceAdult) || 0,
            extraBedPriceChild: parseFloat(extraBedPriceChild) || 0,
            extraBedPriceInfant: parseFloat(extraBedPriceInfant) || 0,
            groupOccupancyPrice: parseFloat(groupOccupancyPrice) || 0,
            isActive: true
          };

          // Check if a record already exists for this combination
          const existingRecord = await tx.propertyRoomTypeMealPlan.findFirst({
            where: {
              ratePlanId: ratePlanId,
              propertyRoomTypeId,
              mealPlanId,
              isDeleted: false
            }
          });

          if (existingRecord) {
            // Update existing record
            const updated = await tx.propertyRoomTypeMealPlan.update({
              where: { id: existingRecord.id },
              data: pricingData
            });
            updatedRecords.push(updated);
          } else {
            // Create new record
            const created = await tx.propertyRoomTypeMealPlan.create({
              data: {
                ...pricingData,
                propertyId: updatedRatePlan.propertyId,
                ratePlanId: ratePlanId,
                propertyRoomTypeId,
                mealPlanId
              }
            });
            savedRecords.push(created);
          }
        }

        return {
          ratePlan: updatedRatePlan,
          saved: savedRecords,
          updated: updatedRecords,
          total: savedRecords.length + updatedRecords.length
        };
      }

      return {
        ratePlan: updatedRatePlan,
        saved: [],
        updated: [],
        total: 0
      };
    });

    return res.status(200).json({
      success: true,
      message: `Rate plan "${name}" updated successfully`,
      data: {
        ratePlan: result.ratePlan,
        savedCount: result.saved.length,
        updatedCount: result.updated.length,
        totalCount: result.total
      }
    });

  } catch (error) {
    console.error('Error updating rate plan:', error);

    // Handle Prisma unique constraint errors
    if (error.code === 'P2002') {
      const field = error.meta?.target;
      if (field && field.includes('name')) {
        return res.status(400).json({
          success: false,
          message: 'A rate plan with this name already exists for this property',
          error: 'Duplicate rate plan name'
        });
      } else if (field && field.includes('color')) {
        return res.status(400).json({
          success: false,
          message: 'A rate plan with this color already exists for this property',
          error: 'Duplicate rate plan color'
        });
      } else if (field && field.includes('ratePlanId') && field.includes('propertyRoomTypeId') && field.includes('mealPlanId')) {
        return res.status(400).json({
          success: false,
          message: 'This room type and meal plan combination already exists in this rate plan',
          error: 'Duplicate combination'
        });
      } else {
        return res.status(400).json({
          success: false,
          message: 'A duplicate entry was found. Please check your data.',
          error: 'Duplicate entry'
        });
      }
    }

    // Handle record not found
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Rate plan not found or already deleted',
        error: 'Rate plan not found'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}



module.exports = {
  savePropertyRoomTypeMealPlans,
  updateRatePlan,
  getPropertyRoomTypeMealPlans,
  deletePropertyRoomTypeMealPlan,
  savePlanBulk,
  getPropertyRatePlans
};








