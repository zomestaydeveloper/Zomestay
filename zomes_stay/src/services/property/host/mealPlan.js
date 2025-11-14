import apiService from "../../api/apiService";
import { MEAL_PLAN } from "../../api/apiEndpoints";


const mealPlanService = {
  async createMealPlan(mealPlanData) {
    const res = await apiService.post(MEAL_PLAN.MEAL_PLAN, mealPlanData);
    return res.data;
  },
  async getMealPlans(propertyId) {
    const res = await apiService.get(`${MEAL_PLAN.MEAL_PLAN}?propertyId=${propertyId}`);
    return res.data;
  },
  async getMealPlan(id) {
    const res = await apiService.get(`${MEAL_PLAN.MEAL_PLAN}/${id}`);
    return res.data;
  },
  async updateMealPlan(id, mealPlanData) {
    const res = await apiService.patch(`${MEAL_PLAN.MEAL_PLAN}/${id}`, mealPlanData);
    console.log(res.data);
    return res.data;
  },
  async deleteMealPlan(id) {
    const res = await apiService.delete(`${MEAL_PLAN.MEAL_PLAN}/${id}`);
    return res.data;
  }
};

export default mealPlanService;

