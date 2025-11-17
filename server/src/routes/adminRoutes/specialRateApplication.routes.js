const express = require('express');
const SpecialRateApplicationController = require('../../controllers/adminController/specialRateApplication.controller');

const SpecialRateApplicationRoute = express.Router();

SpecialRateApplicationRoute.post('/special-rate-applications', SpecialRateApplicationController.createSpecialRateApplication);
SpecialRateApplicationRoute.get('/special-rate-applications', SpecialRateApplicationController.getSpecialRateApplications);
SpecialRateApplicationRoute.delete('/special-rate-applications/:id', SpecialRateApplicationController.deleteSpecialRateApplication);
module.exports = SpecialRateApplicationRoute;