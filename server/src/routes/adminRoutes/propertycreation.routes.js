// routes/property.js
const express = require('express');
const PropertycreateRoute = express.Router();

const { uploadPropertyMedia } = require('../../config/multer');
const propertyCreation = require('../../controllers/adminController/propertycreation.controller');
const { extractRole } = require('../../middleware/extractRole.middleware');

// Property creation routes
// POST /properties: Admin-only - Create new property
// Note: Room types and property images are added via edit page, not during creation
// uploadPropertyMedia.any() is optional - only needed for city icon upload
PropertycreateRoute.post('/properties', extractRole, uploadPropertyMedia.any(), propertyCreation.createProperty);

// GET /properties_utils: Admin and Host can access - Get form dropdown data
PropertycreateRoute.get('/properties_utils', extractRole, propertyCreation.getCreationFormData);

module.exports = PropertycreateRoute;