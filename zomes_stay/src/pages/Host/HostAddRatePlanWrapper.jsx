import React from 'react';
import { useSelector } from 'react-redux';
import AddRatePlan from '../../components/shared/AddRatePlan/AddRatePlan';

const HostAddRatePlanWrapper = () => {
  const { property } = useSelector((state) => state.property);
  
  return (
    <AddRatePlan 
      isAdmin={false}
      adminProperty={null}
      propertyId={property?.id}
    />
  );
};

export default HostAddRatePlanWrapper;
