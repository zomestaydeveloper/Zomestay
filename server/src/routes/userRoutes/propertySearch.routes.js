const express = require('express');
const router = express.Router();
const PropertySearchController = require('../../controllers/userController/propertySearch.controller');

// Get unique cities with icons - public endpoint (no auth required)
router.get('/cities', PropertySearchController.getUniqueCities);

// Get all property types - public endpoint (no auth required)
router.get('/property-types', PropertySearchController.getPropertyTypes);

module.exports = router;

