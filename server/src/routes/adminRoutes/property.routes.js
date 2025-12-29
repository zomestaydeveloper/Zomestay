// src/routes/adminRoutes/property.routes.js
const express = require('express');
const PropertyRoute = express.Router();

const { uploadImage, uploadVideo, uploadMedia, uploadPropertyMedia } = require('../../config/multer');
const PropertyController = require('../../controllers/adminController/property.controller');
const PropertyUpdateController = require('../../controllers/adminController/propertyUpdation.controller');
const { extractRole } = require('../../middleware/extractRole.middleware');

/* --------------------------- AMENITIES --------------------------- */
// GET: Admin and Host can view
// POST: Admin and Host can create
// PATCH/DELETE: Only Admin can update/delete
PropertyRoute.get('/amenities', extractRole, PropertyController.getAmenities);
PropertyRoute.post('/amenities', extractRole, uploadImage.single('icon'), PropertyController.createAmenity);
PropertyRoute.patch('/amenities/:id', extractRole, uploadImage.single('icon'), PropertyController.updateAmenity);
PropertyRoute.delete('/amenities/:id', extractRole, PropertyController.deleteAmenity);

/* --------------------------- FACILITIES -------------------------- */
// GET: Admin and Host can view
// POST: Admin and Host can create
// PUT/DELETE: Only Admin can update/delete
PropertyRoute.get('/facilities', extractRole, PropertyController.getFacilities);
PropertyRoute.post('/facilities', extractRole, uploadImage.single('icon'), PropertyController.createFacility);
PropertyRoute.put('/facilities/:id', extractRole, uploadImage.single('icon'), PropertyController.updateFacility);
PropertyRoute.delete('/facilities/:id', extractRole, PropertyController.deleteFacility);

/* ----------------------- SAFETY & HYGIENE ------------------------ */
// GET: Admin and Host can view
// POST: Admin and Host can create
// PUT/DELETE: Only Admin can update/delete
PropertyRoute.get('/safety-hygiene', extractRole, PropertyController.getSafetyHygienes);
PropertyRoute.post('/safety-hygiene', extractRole, uploadImage.single('icon'), PropertyController.createSafetyHygiene);
PropertyRoute.put('/safety-hygiene/:id', extractRole, uploadImage.single('icon'), PropertyController.updateSafetyHygiene);
PropertyRoute.delete('/safety-hygiene/:id', extractRole, PropertyController.deleteSafetyHygiene);

/* ------------------------- PROPERTY TYPES ------------------------ */
// GET: Admin and Host can view
// POST: Admin and Host can create
// PUT/DELETE: Only Admin can update/delete
PropertyRoute.get('/property-types', extractRole, PropertyController.getPropertyTypes);
PropertyRoute.post('/property-types', extractRole, PropertyController.createPropertyType);
PropertyRoute.put('/property-types/:id', extractRole, PropertyController.updatePropertyType);
PropertyRoute.delete('/property-types/:id', extractRole, PropertyController.deletePropertyType);

/* --------------------------- ROOM TYPES -------------------------- */
// GET: Admin and Host can view
// POST: Admin and Host can create
// PUT/DELETE: Only Admin can update/delete
PropertyRoute.get('/room-types', extractRole, PropertyController.getRoomTypes);
PropertyRoute.post('/room-types', extractRole, PropertyController.createRoomType);
PropertyRoute.put('/room-types/:id', extractRole, PropertyController.updateRoomType);
PropertyRoute.delete('/room-types/:id', extractRole, PropertyController.deleteRoomType);

/* ---------------------------- PROPERTIES ------------------------- */
// PropertyRoute.post(
//   '/properties',
//   uploadMedia.any(),
//   PropertyController.createProperty
// );
// common for all roles - but we given here 
PropertyRoute.get('/properties', extractRole, PropertyController.getProperties);
PropertyRoute.get('/properties/list', extractRole, PropertyController.getPropertiesList);
PropertyRoute.get('/properties/search', extractRole, PropertyController.searchProperties);
PropertyRoute.get('/properties/:id', extractRole, PropertyController.getProperty);

/* ----------------------- PROPERTY UPDATION ROUTES ----------------------- */
// All property update routes use PropertyUpdateController
// All routes are protected with extractRole middleware
// Hosts can only update their own properties (verified in controllers via verifyPropertyAccess)

PropertyRoute.get('/properties/:id/edit', extractRole, PropertyUpdateController.getPropertyForEdit);
PropertyRoute.put(
  '/properties/:id/edit',
  extractRole,
  uploadPropertyMedia.any(),
  PropertyUpdateController.updateProperty
);
PropertyRoute.patch('/properties/:id/basics', extractRole, PropertyUpdateController.updatePropertyBasics);
PropertyRoute.patch('/properties/:id/location', extractRole, uploadPropertyMedia.any(), PropertyUpdateController.updatePropertyLocation);
PropertyRoute.patch('/properties/:id/policy', extractRole, PropertyUpdateController.updatePropertyPolicy);
PropertyRoute.patch('/properties/:id/features', extractRole, PropertyUpdateController.updatePropertyFeatures);
PropertyRoute.patch('/properties/:id/tax', extractRole, PropertyUpdateController.updatePropertyTax);
PropertyRoute.patch(
  '/properties/:id/room-types',
  extractRole,
  uploadPropertyMedia.any(),
  PropertyUpdateController.updatePropertyRoomTypes
);
PropertyRoute.patch(
  '/properties/:id/gallery',
  extractRole,
  uploadPropertyMedia.any(),
  PropertyUpdateController.updatePropertyMedia
);
PropertyRoute.delete(
  '/properties/:propertyId/room-types/:roomTypeId',
  extractRole,
  PropertyUpdateController.deletePropertyRoomType
);
PropertyRoute.patch('/properties/:id/status', extractRole, PropertyUpdateController.updatePropertyStatus);
PropertyRoute.delete('/properties/:id', extractRole, PropertyUpdateController.softDeleteProperty);

/* ----------------------------- ROOMS ----------------------------- */
// Add multiple rooms (bulk creation)
PropertyRoute.post(
  '/properties/:propertyId/rooms',
  uploadMedia.any(),  
  PropertyController.addRooms
);

// Update multiple rooms (bulk update with edge case handling)
PropertyRoute.put(
  '/properties/:propertyId/rooms',
  PropertyController.updateRooms
);

// Get room configurations for editing (existing rooms with availability)
PropertyRoute.get(
  '/properties/:propertyId/room-configurations',
  PropertyController.getRoomConfigurations
);

PropertyRoute.get('/properties/:propertyId/rooms', PropertyController.getRooms);
PropertyRoute.get('/propertiesbyhost/:ownerHostId', extractRole, PropertyController.getPropertyByOwener);
PropertyRoute.put('/rooms/:id', PropertyController.updateRoom);
PropertyRoute.delete('/rooms/:id', PropertyController.deleteRoom);
PropertyRoute.get('/propertyroomtype/:propertyId', PropertyController.getPropertyRoomtype)


module.exports = PropertyRoute;
