const express = require('express');
const PropertyForAgentController = require('../../controllers/agentController/propertyForAgent.controller');

const router = express.Router();

// Get all active properties for agent discount management
router.get('/properties', PropertyForAgentController.getActiveProperties);

module.exports = router;
