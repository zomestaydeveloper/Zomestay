const express = require("express");
const AvailabilityRoute = express.Router();

const AvailabilityController = require("../../controllers/adminController/inventory.controller");


/* --------------------------- AVAILABILITY ------------------------- */
AvailabilityRoute.get('/properties/:propertyId/availability', AvailabilityController.getAvailability);



module.exports = AvailabilityRoute;