const express = require('express');
const roomtypeMealplanRouter = express.Router();
const { savePropertyRoomTypeMealPlans,savePlanBulk, getPropertyRoomTypeMealPlans, deletePropertyRoomTypeMealPlan, getPropertyRatePlans, updateRatePlan } = require('../../controllers/HostController/Roomtype_mealplan.controller');

// Save PropertyRoomTypeMealPlans
roomtypeMealplanRouter.post('/roomtype-mealplan/save', savePropertyRoomTypeMealPlans);

// Get PropertyRoomTypeMealPlans for a property
roomtypeMealplanRouter.get('/roomtype-mealplan/property/:propertyId', getPropertyRoomTypeMealPlans);

// Delete PropertyRoomTypeMealPlan
roomtypeMealplanRouter.delete('/roomtype-mealplan/:id', deletePropertyRoomTypeMealPlan);

// Save Plan Bulk
roomtypeMealplanRouter.post('/api/roomtype-mealplan/save-bulk', savePlanBulk);

// Get all rate plans for a property
roomtypeMealplanRouter.get('/rate-plans/:propertyId', getPropertyRatePlans);

// Update rate plan
roomtypeMealplanRouter.put('/rate-plan/:ratePlanId', updateRatePlan);

module.exports = roomtypeMealplanRouter;
