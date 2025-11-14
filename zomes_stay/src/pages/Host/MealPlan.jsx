import React from 'react';
import MealPlans from '../../components/shared/MealPlans/MealPlans';
import { useSelector } from 'react-redux';

const MealPlan = ({ isAdmin = false, adminProperty = null, propertyId: adminPropertyId = null }) => {
  const { property } = useSelector((state) => state.property);
  
  return (
    <MealPlans 
      isAdmin={isAdmin}
      adminProperty={adminProperty}
      propertyId={property?.id}
    />
  );
};

export default MealPlan;