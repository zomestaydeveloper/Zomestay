import React from 'react';
import { useSelector } from 'react-redux';
import AddRatePlan from '../../components/shared/AddRatePlan/AddRatePlan';
import { useLocation } from 'react-router-dom';

const HostAddRatePlanWrapper = () => {
  const location = useLocation();
  const { propertyId, adminProperty } = location.state || {};

  console.log('AdminAddRatePlan - location.state:', location.state);
  console.log('AdminAddRatePlan - propertyId:', propertyId);
  console.log('AdminAddRatePlan - adminProperty:', adminProperty);


  return (
    <AddRatePlan
      isAdmin={false}
      adminProperty={adminProperty}
      propertyId={propertyId}
    />
  );
};

export default HostAddRatePlanWrapper;
