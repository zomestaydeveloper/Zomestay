import React from 'react';
import RatePlans from '../../components/shared/RatePlans/RatePlans';
import { useSelector } from 'react-redux';

const Best_rates = ({ isAdmin = false, adminProperty = null, propertyId: adminPropertyId = null }) => {
  const { property } = useSelector((state) => state.property);

  console.log("property", property);
  console.log("isAdmin", isAdmin);
  console.log("adminProperty", adminProperty);
  console.log("propertyId", property?.id);
  console.log("adminPropertyId", adminPropertyId);

  return (
    <RatePlans 
      isAdmin={isAdmin}
      adminProperty={adminProperty}
      propertyId={property?.id}
    />
  );
};

export default Best_rates;
