import apiService from '../../api/apiService';

const ROOMTYPE_MEALPLAN = {
  SAVE: '/roomtype-mealplan/save',
  GET_BY_PROPERTY: '/roomtype-mealplan/property',
  DELETE: '/roomtype-mealplan'
};

const roomtypeMealPlanService = {
  // Save PropertyRoomTypeMealPlans
  savePropertyRoomTypeMealPlans: (data) => apiService.post(ROOMTYPE_MEALPLAN.SAVE, data),
  
  // Get PropertyRoomTypeMealPlans for a property
  getPropertyRoomTypeMealPlans: (propertyId) => apiService.get(`${ROOMTYPE_MEALPLAN.GET_BY_PROPERTY}/${propertyId}`),
  
  // Delete PropertyRoomTypeMealPlan
  deletePropertyRoomTypeMealPlan: (id) => apiService.delete(`${ROOMTYPE_MEALPLAN.DELETE}/${id}`),

  // NEW: Bulk save rate plan (single API call)
  saveRatePlanBulk: (ratePlanData) => apiService.post('/roomtype-mealplan/save-bulk', ratePlanData),
  
  // NEW: Get all rate plans for a property
  getPropertyRatePlans: (propertyId) => apiService.get(`/rate-plans/${propertyId}`),
  
  // NEW: Update rate plan
  updateRatePlan: (ratePlanId, ratePlanData) => apiService.put(`/rate-plan/${ratePlanId}`, ratePlanData)
};

export default roomtypeMealPlanService;
