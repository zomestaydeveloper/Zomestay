const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const AgentPropertyDiscountController = {
  // Set discount for agent-property combination
  setAgentPropertyDiscount: async (req, res) => {
    try {
      const { agentId, propertyId, discountType, discountValue } = req.body;

      // Validate input
      if (!agentId || !propertyId || !discountType || discountValue === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: agentId, propertyId, discountType, discountValue'
        });
      }

      if (!['percentage', 'flat'].includes(discountType)) {
        return res.status(400).json({
          success: false,
          message: 'discountType must be either "percentage" or "flat"'
        });
      }

      if (discountType === 'percentage' && (discountValue < 0 || discountValue > 100)) {
        return res.status(400).json({
          success: false,
          message: 'Percentage discount must be between 0 and 100'
        });
      }

      if (discountType === 'flat' && discountValue < 0) {
        return res.status(400).json({
          success: false,
          message: 'Flat discount must be positive'
        });
      }

      // Check if agent and property exist
      const agent = await prisma.travelAgent.findUnique({
        where: { id: agentId, isDeleted: false }
      });

      const property = await prisma.property.findUnique({
        where: { id: propertyId, isDeleted: false }
      });

      if (!agent) {
        return res.status(404).json({
          success: false,
          message: 'Travel agent not found'
        });
      }

      if (!property) {
        return res.status(404).json({
          success: false,
          message: 'Property not found'
        });
      }

      // Upsert discount (create or update)
      const discount = await prisma.travelAgentPropertyDiscount.upsert({
        where: {
          agentId_propertyId_isDeleted: {
            agentId,
            propertyId,
            isDeleted: false
          }
        },
        update: {
          discountType,
          discountValue,
          isActive: true,
          updatedAt: new Date()
        },
        create: {
          agentId,
          propertyId,
          discountType,
          discountValue,
          isActive: true
        }
      });

      res.json({
        success: true,
        message: 'Agent property discount set successfully',
        data: discount
      });
    } catch (err) {
      console.error('setAgentPropertyDiscount:', err);
      res.status(500).json({
        success: false,
        message: 'Error setting agent property discount'
      });
    }
  },

  // Remove discount for agent-property combination
  removeAgentPropertyDiscount: async (req, res) => {
    try {
      const { agentId, propertyId } = req.params;

      if (!agentId || !propertyId) {
        return res.status(400).json({
          success: false,
          message: 'Missing agentId or propertyId'
        });
      }

      // Hard delete the discount (fully remove the record)
      const discount = await prisma.travelAgentPropertyDiscount.deleteMany({
        where: {
          agentId,
          propertyId
        }
      });

      if (discount.count === 0) {
        return res.status(404).json({
          success: false,
          message: 'Discount not found'
        });
      }

      res.json({
        success: true,
        message: 'Agent property discount deleted successfully'
      });
    } catch (err) {
      console.error('removeAgentPropertyDiscount:', err);
      res.status(500).json({
        success: false,
        message: 'Error removing agent property discount'
      });
    }
  },

  // Get agent's discounts for all properties
  getAgentPropertyDiscounts: async (req, res) => {
    try {
      const { agentId } = req.params;

      if (!agentId) {
        return res.status(400).json({
          success: false,
          message: 'Missing agentId'
        });
      }

      const discounts = await prisma.travelAgentPropertyDiscount.findMany({
        where: {
          agentId,
          isDeleted: false,
          isActive: true
        },
        include: {
          property: {
            select: {
              id: true,
              title: true,
              location: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // Transform data
      const transformedDiscounts = discounts.map(discount => ({
        id: discount.id,
        propertyId: discount.propertyId,
        propertyName: discount.property.title,
        propertyLocation: discount.property.location?.address ? 
          `${discount.property.location.address.city}, ${discount.property.location.address.state}` : 
          'Location not specified',
        discountType: discount.discountType,
        discountValue: discount.discountValue,
        isActive: discount.isActive,
        createdAt: discount.createdAt,
        updatedAt: discount.updatedAt
      }));

      res.json({
        success: true,
        data: transformedDiscounts,
        count: transformedDiscounts.length
      });
    } catch (err) {
      console.error('getAgentPropertyDiscounts:', err);
      res.status(500).json({
        success: false,
        message: 'Error fetching agent property discounts'
      });
    }
  },

  // Get all agents with their property discounts (for admin)
  getAllAgentsWithDiscounts: async (req, res) => {
    try {
      // First, get all active property discounts with their properties
      // We need to filter out discounts where property is deleted
      const allDiscounts = await prisma.travelAgentPropertyDiscount.findMany({
        where: {
          isDeleted: false,
          isActive: true,
          property: {
            isDeleted: false
          }
        },
        include: {
          agent: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              agencyName: true,
              status: true,
              isDeleted: true
            }
          },
          property: {
            select: {
              id: true,
              title: true,
              location: true,
              isDeleted: true
            }
          }
        }
      });

      // Group discounts by agent
      const agentsMap = new Map();
      
      allDiscounts.forEach(discount => {
        const agent = discount.agent;
        
        // Skip if agent is deleted or not approved
        if (agent.isDeleted || agent.status !== 'approved') {
          return;
        }
        
        // Skip if property is deleted or missing
        if (!discount.property || discount.property.isDeleted) {
          return;
        }
        
        if (!agentsMap.has(agent.id)) {
          agentsMap.set(agent.id, {
            id: agent.id,
            name: `${agent.firstName || ''} ${agent.lastName || ''}`.trim() || 'Unknown',
            email: agent.email,
            phone: agent.phone,
            agencyName: agent.agencyName,
            status: agent.status,
            closedBookings: 0, // TODO: Calculate from bookings table
            propertyDiscounts: []
          });
        }
        
        const agentData = agentsMap.get(agent.id);
        agentData.propertyDiscounts.push({
          propertyId: discount.propertyId,
          propertyName: discount.property.title,
          propertyLocation: discount.property.location?.address ? 
            `${discount.property.location.address.city}, ${discount.property.location.address.state}` : 
            'Location not specified',
          discountType: discount.discountType,
          discountValue: discount.discountValue,
          isActive: discount.isActive
        });
      });

      // Convert map to array and sort by creation date (we don't have createdAt in the grouped data, so we'll use agent id)
      const transformedAgents = Array.from(agentsMap.values());

      // Also include agents with no discounts (approved agents without any property discounts)
      const agentsWithoutDiscounts = await prisma.travelAgent.findMany({
        where: {
          isDeleted: false,
          status: 'approved',
          propertyDiscounts: {
            none: {
              isDeleted: false,
              isActive: true,
              property: {
                isDeleted: false
              }
            }
          }
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          agencyName: true,
          status: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // Add agents without discounts to the result
      agentsWithoutDiscounts.forEach(agent => {
        transformedAgents.push({
          id: agent.id,
          name: `${agent.firstName || ''} ${agent.lastName || ''}`.trim() || 'Unknown',
          email: agent.email,
          phone: agent.phone,
          agencyName: agent.agencyName,
          status: agent.status,
          closedBookings: 0,
          propertyDiscounts: []
        });
      });

      res.json({
        success: true,
        data: transformedAgents,
        count: transformedAgents.length
      });
    } catch (err) {
      console.error('getAllAgentsWithDiscounts:', err);
      res.status(500).json({
        success: false,
        message: 'Error fetching agents with discounts'
      });
    }
  },

  // Block/Unblock agent from property
  toggleAgentPropertyAccess: async (req, res) => {
    try {
      const { agentId, propertyId } = req.params;
      const { isBlocked } = req.body;

      if (!agentId || !propertyId || typeof isBlocked !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: agentId, propertyId, isBlocked'
        });
      }

      // For now, we'll use the discount table to track blocked access
      // If blocked, we'll set isActive to false
      // If unblocked, we'll set isActive to true
      const discount = await prisma.travelAgentPropertyDiscount.findFirst({
        where: {
          agentId,
          propertyId,
          isDeleted: false
        }
      });

      if (discount) {
        // Update existing discount
        await prisma.travelAgentPropertyDiscount.update({
          where: { id: discount.id },
          data: {
            isActive: !isBlocked,
            updatedAt: new Date()
          }
        });
      } else if (!isBlocked) {
        // Create new discount entry for unblocking
        await prisma.travelAgentPropertyDiscount.create({
          data: {
            agentId,
            propertyId,
            discountType: 'percentage',
            discountValue: 0,
            isActive: true
          }
        });
      }

      res.json({
        success: true,
        message: `Agent ${isBlocked ? 'blocked from' : 'unblocked from'} property successfully`
      });
    } catch (err) {
      console.error('toggleAgentPropertyAccess:', err);
      res.status(500).json({
        success: false,
        message: 'Error toggling agent property access'
      });
    }
  }
};

module.exports = AgentPropertyDiscountController;
