const express = require('express');
const MealPlanRouter = express.Router();
const MealPlanController = require('../../controllers/adminController/mealplan.controller');

MealPlanRouter.post('/meal-plan', MealPlanController.createMealPlan);
MealPlanRouter.get('/meal-plan/:id', MealPlanController.getMealPlan);
MealPlanRouter.get('/meal-plan', MealPlanController.getMealPlans);
MealPlanRouter.patch('/meal-plan/:id', MealPlanController.updateMealPlan);
MealPlanRouter.delete('/meal-plan/:id', MealPlanController.deleteMealPlan);

module.exports = MealPlanRouter;
