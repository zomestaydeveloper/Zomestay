import React from 'react';
import MealPlans from '../../components/shared/MealPlans/MealPlans';
import { useSelector } from 'react-redux';
import Host_mealplan from './Host_Mealplan';

const MealPlan = ({ isAdmin = false, adminProperty = null, propertyId: adminPropertyId = null }) => {
  const { property } = useSelector((state) => state.property);
  
  return (
    <Host_mealplan />
  );
};

export default MealPlan;