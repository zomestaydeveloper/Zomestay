const express = require('express');
const SpecialRateController = require('../../controllers/adminController/specialRate.controller');

const SpecialRateRoute = express.Router();

SpecialRateRoute.post('/special-rates/:propertyId', SpecialRateController.createSpecialRate);

SpecialRateRoute.get('/special-rates/:propertyId/', SpecialRateController.getSpecialRates);

SpecialRateRoute.get('/special-rates/:id', SpecialRateController.getSpecialRateById);

SpecialRateRoute.put('/special-rates/:id', SpecialRateController.updateSpecialRate);

SpecialRateRoute.delete('/special-rates/:id', SpecialRateController.deleteSpecialRate);

SpecialRateRoute.patch('/special-rates/:id/toggle', SpecialRateController.toggleSpecialRate);


module.exports = SpecialRateRoute;  