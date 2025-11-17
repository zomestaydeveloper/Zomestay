const express = require('express');
const TravelAgentController = require('../../controllers/agentController/travelAgent.controller');

const router = express.Router();

// Get all approved active travel agents
router.get('/agents', TravelAgentController.getActiveAgents);

// Admin: Get all agents
router.get('/admin/agents', TravelAgentController.getAllAgents);

// Admin: Update agent status (approve/suspend/reject)
router.patch('/admin/agents/:agentId/status', TravelAgentController.updateAgentStatus);

// Admin: Soft delete agent
router.delete('/admin/agents/:agentId', TravelAgentController.softDeleteAgent);

module.exports = router;
