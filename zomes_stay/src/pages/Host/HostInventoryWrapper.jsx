import React from 'react';
import { useSelector } from 'react-redux';
import Inventory from '../../components/shared/Inventory/Inventory';

const HostInventoryWrapper = () => {
  const { property } = useSelector((state) => state.property);
  
  return (
    <Inventory 
      isAdmin={false}
      adminProperty={null}
      propertyId={property?.id}
    />
  );
};

export default HostInventoryWrapper;
