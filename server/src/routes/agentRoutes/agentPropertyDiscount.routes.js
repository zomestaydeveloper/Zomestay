const express = require('express');
const AgentPropertyDiscountController = require('../../controllers/agentController/agentPropertyDiscount.controller');

const router = express.Router();

// Get all agents with their property discounts (for admin)
router.get('/agents-with-discounts', AgentPropertyDiscountController.getAllAgentsWithDiscounts);

// Get agent's discounts for all properties
router.get('/agents/:agentId/discounts', AgentPropertyDiscountController.getAgentPropertyDiscounts);

// Set discount for agent-property combination
router.post('/discounts', AgentPropertyDiscountController.setAgentPropertyDiscount);

// Remove discount for agent-property combination
router.delete('/discounts/:agentId/:propertyId', AgentPropertyDiscountController.removeAgentPropertyDiscount);

// Block/Unblock agent from property
router.patch('/agents/:agentId/properties/:propertyId/access', AgentPropertyDiscountController.toggleAgentPropertyAccess);

module.exports = router;
