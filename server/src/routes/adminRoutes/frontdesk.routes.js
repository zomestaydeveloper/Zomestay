const express = require('express');
const FrontDeskController = require('../../controllers/frontdeskController/frontdesk.controller');
const FrontDeskBookingController = require('../../controllers/frontdeskController/frontdeskBooking.controller');
const PaymentLinkController = require('../../controllers/frontdeskController/paymentLink.controller');
const CashPaymentController = require('../../controllers/frontdeskController/cashPayment.controller');
const FrontDeskRoomStatusController = require('../../controllers/frontdeskController/frontdeskRoomstatus.controller');
const { extractRole } = require('../../middleware/extractRole.middleware');
const FrontDeskRoute = express.Router();

FrontDeskRoute.get(
  '/properties/:propertyId/front-desk',
  extractRole,
  FrontDeskController.getFrontDeskBoard
);

FrontDeskRoute.get(
  '/properties/:propertyId/front-desk/room-types/:propertyRoomTypeId/booking-context',
  extractRole,
  FrontDeskBookingController.getBookingContext
);

FrontDeskRoute.post(
  '/properties/:propertyId/front-desk/holds', 
  extractRole,
  FrontDeskBookingController.createHold 
);

FrontDeskRoute.post(
  '/properties/:propertyId/front-desk/payment-links',
  extractRole,
  PaymentLinkController.createPaymentLink
);

FrontDeskRoute.post(
  '/properties/:propertyId/front-desk/bookings/cash',
  extractRole,
  CashPaymentController.createCashBooking
);

FrontDeskRoute.post(
  '/properties/:propertyId/front-desk/blocks',
  extractRole,
  FrontDeskRoomStatusController.createBlock
);

FrontDeskRoute.delete(
  '/properties/:propertyId/front-desk/blocks/:availabilityId',
  extractRole,
  FrontDeskRoomStatusController.releaseBlock
);

FrontDeskRoute.post(
  '/properties/:propertyId/front-desk/maintenance',
  extractRole,
  FrontDeskRoomStatusController.createMaintenance
);

FrontDeskRoute.delete(
  '/properties/:propertyId/front-desk/maintenance/:availabilityId',
  extractRole,
  FrontDeskRoomStatusController.releaseMaintenance
);

FrontDeskRoute.post(
  '/properties/:propertyId/front-desk/out-of-service',
  extractRole,
  FrontDeskRoomStatusController.createOutOfService
);

FrontDeskRoute.delete(
  '/properties/:propertyId/front-desk/out-of-service/:availabilityId',  
  extractRole,
  FrontDeskRoomStatusController.releaseOutOfService
);

FrontDeskRoute.get(
  '/host-front-desk/property/:hostId',
  extractRole,
  FrontDeskController.getHostFrontDeskProperty
);

module.exports = FrontDeskRoute;

