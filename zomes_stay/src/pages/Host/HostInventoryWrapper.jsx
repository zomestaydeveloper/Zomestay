import React from 'react';
import { useSelector } from 'react-redux';
import Inventory from '../../components/shared/Inventory/Inventory';
import Host_inventory from './Host_inventory';

const HostInventoryWrapper = () => {
  const { property } = useSelector((state) => state.property);
  
  return (
    <Host_inventory />
  );
};

export default HostInventoryWrapper;
