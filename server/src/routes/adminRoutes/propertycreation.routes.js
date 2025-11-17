// routes/property.js
const express = require('express');
const PropertycreateRoute = express.Router();

const { uploadPropertyMedia } = require('../../config/multer');
const propertyCreation = require('../../controllers/adminController/propertycreation.controller');
const { extractRole } = require('../../middleware/extractRole.middleware');

// Property creation routes
// POST /properties: Admin-only - Create new property
// uploadPropertyMedia.any() accepts all file fields (limits: 2MB per file, 60 files max)
// Maximum: 12 property images + 12 images per room type × 4 room types = 60 files
PropertycreateRoute.post('/properties', extractRole, uploadPropertyMedia.any(), propertyCreation.createProperty);

// GET /properties_utils: Admin and Host can access - Get form dropdown data
PropertycreateRoute.get('/properties_utils', extractRole, propertyCreation.getCreationFormData);

module.exports = PropertycreateRoute;