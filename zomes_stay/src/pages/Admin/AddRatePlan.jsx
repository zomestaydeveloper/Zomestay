import React from 'react';
import { useLocation } from 'react-router-dom';
import AddRatePlan from '../../components/shared/AddRatePlan/AddRatePlan';

const AdminAddRatePlanPage = () => {
  const location = useLocation();
  const { propertyId, adminProperty } = location.state || {};
  
  console.log('AdminAddRatePlan - location.state:', location.state);
  console.log('AdminAddRatePlan - propertyId:', propertyId);
  console.log('AdminAddRatePlan - adminProperty:', adminProperty);

  return (
    <AddRatePlan 
      isAdmin={true} 
      propertyId={propertyId}
      adminProperty={adminProperty}
    />
  );
};

export default AdminAddRatePlanPage;
