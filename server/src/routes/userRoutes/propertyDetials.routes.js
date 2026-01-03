const express = require('express');
const router = express.Router();
const PropertyDetailsController = require('../../controllers/userController/propertyDetials.controller');
const { extractRole } = require('../../middleware/extractRole.middleware');

// More specific routes must come FIRST (Express matches in order)
router.get('/propertiesDetials/:id/booking-data', extractRole, PropertyDetailsController.getBookingData);
router.get('/propertiesDetials/:id/pricing', extractRole, PropertyDetailsController.getPropertyPricing);
router.get('/propertiesDetials/:id', extractRole, PropertyDetailsController.getPropertyDetails);

module.exports = router;