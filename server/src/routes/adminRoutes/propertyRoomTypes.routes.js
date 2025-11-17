const express = require('express');
const PropertyRoomTypeRoute = express.Router();

const propertyRoomtypeController = require('../../controllers/adminController/propertyRoomtype.controller');

PropertyRoomTypeRoute.get('/propertyRoomType/:propertyId/room-types', propertyRoomtypeController.getPropertyRoomTypes);
PropertyRoomTypeRoute.post('/propertyRoomType', propertyRoomtypeController.createPropertyRoomType);



module.exports = PropertyRoomTypeRoute;