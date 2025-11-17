const express = require('express');
const router = express.Router();
const PropertyDetailsController = require('../../controllers/userController/propertyDetials.controller');
const { extractRole } = require('../../middleware/extractRole.middleware');

router.get('/propertiesDetials/:id', extractRole, PropertyDetailsController.getPropertyDetails);
router.get('/propertiesDetials/:id/pricing', extractRole, PropertyDetailsController.getPropertyPricing);
router.get('/propertiesDetials/:id/booking-data', extractRole, PropertyDetailsController.getBookingData);

module.exports = router;