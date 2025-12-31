// src/routes/adminRoutes/host.routes.js
const express = require('express');
const HostRoute = express.Router();
const { uploadImage, uploadMedia } = require('../../config/multer');
const HostController = require('../../controllers/adminController/host.controller');

// Create Host (multipart or JSON). If sending an image, use field name: profileImage
HostRoute.post('/create-host', uploadImage.single('profileImage'), HostController.createHost);
HostRoute.post('/host-login', HostController.hostLogin);
HostRoute.post('/host/register-otp', HostController.registerOTP);
HostRoute.post('/host-otp', HostController.sendOTP);
HostRoute.post('/host-resend-otp', HostController.resendOTP);
HostRoute.post('/host-verify-otp', HostController.verifyOTP);
HostRoute.post('/host-logout', HostController.hostLogout);
HostRoute.get('/host-properties/:hostId', HostController.hostPropertys);
HostRoute.patch('/host-property/:propertyId/basics', HostController.updateHostPropertyBasics);
HostRoute.patch('/host-property/:propertyId/location', HostController.updateHostPropertyLocation);
HostRoute.patch('/host-property/:propertyId/policy', HostController.updateHostPropertyPolicy);
HostRoute.patch('/host-property/:propertyId/features', HostController.updateHostPropertyFeatures);
HostRoute.patch(
  '/host-property/:propertyId/gallery',
  uploadMedia.any(),
  HostController.updateHostPropertyGallery
);
HostRoute.patch(
  '/host-property/:propertyId/room-types',
  uploadMedia.any(),
  HostController.updateHostPropertyRoomTypes
);
module.exports = HostRoute;
