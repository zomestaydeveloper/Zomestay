import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { roomtypeMealPlanService } from '../../../services';
import NotificationModal from '../../../components/NotificationModal';
import { Map, Plus, Edit, Trash2, Eye, EyeOff, Target, Calendar, Users, DollarSign, AlertCircle, CheckCircle, Loader2, IndianRupee, ChevronDown, ChevronRight } from 'lucide-react';

const RatePlans = ({ isAdmin = false, adminProperty = null, propertyId: adminPropertyId = null }) => {
  const navigate = useNavigate();
  const { property } = useSelector((state) => state.property);
  // Use admin property ID if in admin mode, otherwise use Redux state
  const propertyId = isAdmin ? adminPropertyId : property?.id;
  
console.log("adminProperty",adminProperty)
console.log("propertyId",propertyId)
console.log("isAdmin",isAdmin)  
  // Dynamic route generation based on context
  const getRoutes = () => {
    if (isAdmin) {
      return {
        addRatePlan: '/admin/base/add-rate-plan',
        inventory: '/admin/base/inventory_management'
      };
    } else {
      return {
        addRatePlan: '/host/base/add-rate-plan',
        inventory: '/host/base/inventory_management'
      };
    }
  };
  
  const routes = getRoutes();

  const [loading, setLoading] = useState(true);
  const [ratePlans, setRatePlans] = useState([]);

  const [activeRates, setActiveRates] = useState([]);
  const [inactiveRates, setInactiveRates] = useState([]);
  const [showInactive, setShowInactive] = useState(false);
  const [editingRatePlan, setEditingRatePlan] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    color: '#3B82F6'
  });
  const [updateLoading, setUpdateLoading] = useState(false);
  
  // Combined editing state - when a rate plan is expanded, it's in edit mode
  const [priceEditData, setPriceEditData] = useState({});

  // Notification modal state
  const [notification, setNotification] = useState({
    isOpen: false,
    type: 'success',
    title: '',
    message: ''
  });

  // Helper functions for notifications
  const showNotification = (type, title, message) => {
    setNotification({
      isOpen: true,
      type,
      title,
      message
    });
  };

  const closeNotification = () => {
    setNotification(prev => ({ ...prev, isOpen: false }));
  };

    const fetchBestRates = async () => {
    try {
      setLoading(true);
      const response = await roomtypeMealPlanService.getPropertyRatePlans(propertyId);
      console.log("Rate plans response:", response);
      
      if (response.data && response.data.data) {
        setRatePlans(response.data.data);
        
        // Separate active and inactive rates
        const active = response.data.data.filter(rate => rate.isActive);
        const inactive = response.data.data.filter(rate => !rate.isActive);
        
        setActiveRates(active);
        setInactiveRates(inactive);
      } else {
        setRatePlans([]);
        setActiveRates([]);
        setInactiveRates([]);
      }
    } catch (error) {
      console.error('Error fetching rate plans:', error);
      showNotification('error', 'Error', 'Failed to load rate plans');
      setRatePlans([]);
      setActiveRates([]);
      setInactiveRates([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleRateStatus = async (rateId, currentStatus) => {
    try {
      // This would need a new API endpoint to toggle rate plan status
      showNotification('success', 'Success', `Rate plan ${currentStatus ? 'deactivated' : 'activated'} successfully`);
      await fetchBestRates(); // Refresh data
    } catch (error) {
      console.error('Error toggling rate status:', error);
      showNotification('error', 'Error', 'Failed to update rate plan status');
    }
  };

  const deleteRatePlan = async (rateId, rateName) => {
    if (!window.confirm(`Are you sure you want to delete "${rateName}"? This action cannot be undone.`)) {
      return;
    }
    
    try {
      // This would need a new API endpoint to delete rate plans
      showNotification('success', 'Success', 'Rate plan deleted successfully');
      await fetchBestRates(); // Refresh data
    } catch (error) {
      console.error('Error deleting rate plan:', error);
      showNotification('error', 'Error', 'Failed to delete rate plan');
    }
  };

  const handleEditRatePlan = (ratePlan) => {
    setEditingRatePlan(ratePlan.id);
    setEditFormData({
      name: ratePlan.name,
      color: ratePlan.color
    });
    
    // Initialize price edit data when starting to edit
    const pricingData = ratePlan.roomTypeMealPlanPricing || [];
    console.log("Rate plan data:", ratePlan);
    console.log("Pricing data:", pricingData);
    
    const priceData = {};
    const seenKeys = new Set();
    
    pricingData.forEach((pricing, index) => {
      const key = `${pricing.propertyRoomTypeId}|||${pricing.mealPlanId}`;
      console.log(`Processing pricing ${index}:`, pricing, "Key:", key);
      
      // Check if key already exists
      if (seenKeys.has(key)) {
        console.warn(`Duplicate key found: ${key}. Skipping duplicate entry.`);
        return; // Skip duplicate entries
      }
      
      seenKeys.add(key);
      priceData[key] = {
        singleOccupancyPrice: pricing.singleOccupancyPrice || 0,
        doubleOccupancyPrice: pricing.doubleOccupancyPrice || 0,
        extraBedPriceAdult: pricing.extraBedPriceAdult || 0,
        extraBedPriceChild: pricing.extraBedPriceChild || 0,
        extraBedPriceInfant: pricing.extraBedPriceInfant || 0,
        groupOccupancyPrice: pricing.groupOccupancyPrice || 0
      };
    });
    console.log("Price data initialized:", priceData);
    setPriceEditData(priceData);
  };

  const handleCancelEdit = () => {
    setEditingRatePlan(null);
    setEditFormData({
      name: '',
      color: '#3B82F6'
    });
    setPriceEditData({});
  };

  const handleUpdateRatePlan = async () => {
    if (!editFormData.name.trim()) {
      showNotification('error', 'Validation Error', 'Rate plan name is required');
      return;
    }

    try {
      setUpdateLoading(true);
      

      console.log("Price edit data:", editFormData); 
      console.log("Price edit data:", priceEditData); 
      // Prepare update data with both name/color and pricing
      const updateData = {
        name: editFormData.name,
        color: editFormData.color,
        roomTypeMealPlanCombinations: Object.keys(priceEditData).map((key, index) => {
          const [propertyRoomTypeId, mealPlanId] = key.split('|||');
          const prices = priceEditData[key];
          console.log(`Processing key ${index}: ${key} -> propertyRoomTypeId: ${propertyRoomTypeId}, mealPlanId: ${mealPlanId}`);
          return {
            propertyRoomTypeId: propertyRoomTypeId, // Keep as string (UUID)
            mealPlanId: mealPlanId, // Keep as string (UUID)
            singleOccupancyPrice: prices.singleOccupancyPrice,
            doubleOccupancyPrice: prices.doubleOccupancyPrice,
            extraBedPriceAdult: prices.extraBedPriceAdult,
            extraBedPriceChild: prices.extraBedPriceChild,
            extraBedPriceInfant: prices.extraBedPriceInfant,
            groupOccupancyPrice: prices.groupOccupancyPrice
          };
        })
      };
      console.log("Update data:", updateData);
      console.log("Rate plan ID:", editingRatePlan);
      console.log("Price edit data keys:", Object.keys(priceEditData));
      console.log("Price edit data:", priceEditData);
      
      await roomtypeMealPlanService.updateRatePlan(editingRatePlan, updateData);
      
      showNotification('success', 'Success', 'Rate plan updated successfully');
      setEditingRatePlan(null);
      setEditFormData({
        name: '',
        color: '#3B82F6'
      });
      setPriceEditData({});
      await fetchBestRates(); // Refresh data
      
    } catch (error) {
      console.error('Error updating rate plan:', error);
      
      // Handle specific error messages from backend
      if (error.response?.data?.message) {
        showNotification('error', 'Error', error.response.data.message);
      } else {
        showNotification('error', 'Error', 'Failed to update rate plan. Please try again.');
      }
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePriceInputChange = (pricingKey, field, value) => {
    setPriceEditData(prev => ({
      ...prev,
      [pricingKey]: {
        ...prev[pricingKey],
        [field]: parseFloat(value) || 0
      }
    }));
  };

  useEffect(() => {
    if (propertyId) {
      fetchBestRates();
    }
  }, [propertyId, isAdmin]);

  if (loading) {
  return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading rate plans...</p>
        </div>
    </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Target className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Rate Plans</h1>
                <p className="text-sm text-gray-500">
                  {isAdmin 
                    ? `Managing rate plans for: ${adminProperty?.name}` 
                    : "Manage your property's rate plans and pricing"
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate(routes.inventory)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <Map className="h-4 w-4 mr-2" />
                Map Rates
              </button>
              <button
                onClick={() => navigate(routes.addRatePlan, { 
                  state: { 
                    propertyId: propertyId,
                    adminProperty: isAdmin ? adminProperty : null
                  } 
                })}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Rate Plan
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Active Rates */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
              Active Rate Plans ({activeRates.length})
            </h2>
          </div>

          {activeRates.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
              <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Rate Plans</h3>
              <p className="text-gray-500 mb-4">Create your first rate plan to start managing your property's pricing.</p>
              <button
                onClick={() => navigate(routes.addRatePlan, { 
                  state: { 
                    propertyId: propertyId,
                    adminProperty: isAdmin ? adminProperty : null
                  } 
                })}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Rate Plan
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {activeRates.map((ratePlan) => (
                <RatePlanAccordion
                  key={ratePlan.id}
                  ratePlan={ratePlan}
                  onToggleStatus={toggleRateStatus}
                  onDelete={deleteRatePlan}
                  onEdit={handleEditRatePlan}
                  isEditing={editingRatePlan === ratePlan.id}
                  editFormData={editFormData}
                  onInputChange={handleInputChange}
                  onUpdate={handleUpdateRatePlan}
                  onCancelEdit={handleCancelEdit}
                  updateLoading={updateLoading}
                  onPriceInputChange={handlePriceInputChange}
                  priceEditData={priceEditData}
                />
              ))}
            </div>
          )}
        </div>

        {/* Inactive Rates */}
        {inactiveRates.length > 0 && (
    <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <EyeOff className="h-5 w-5 text-gray-400 mr-2" />
                Inactive Rate Plans ({inactiveRates.length})
              </h2>
              <button
                onClick={() => setShowInactive(!showInactive)}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                {showInactive ? 'Hide' : 'Show'} Inactive
              </button>
            </div>

            {showInactive && (
              <div className="space-y-4">
                {inactiveRates.map((ratePlan) => (
                  <RatePlanAccordion
                    key={ratePlan.id}
                    ratePlan={ratePlan}
                    onToggleStatus={toggleRateStatus}
                    onDelete={deleteRatePlan}
                    onEdit={handleEditRatePlan}
                    isInactive={true}
                    isEditing={editingRatePlan === ratePlan.id}
                    editFormData={editFormData}
                    onInputChange={handleInputChange}
                    onUpdate={handleUpdateRatePlan}
                    onCancelEdit={handleCancelEdit}
                    updateLoading={updateLoading}
                    onPriceInputChange={handlePriceInputChange}
                    priceEditData={priceEditData}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Notification Modal */}
      <NotificationModal
        isOpen={notification.isOpen}
        type={notification.type}
        title={notification.title}
        message={notification.message}
        onClose={closeNotification}
      />

    </div>
  );
};

// Rate Plan Accordion Component
const RatePlanAccordion = ({ 
  ratePlan, 
  onToggleStatus, 
  onDelete, 
  onEdit, 
  isInactive = false,
  isEditing,
  editFormData,
  onInputChange,
  onUpdate,
  onCancelEdit,
  updateLoading,
  onPriceInputChange,
  priceEditData
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const pricingData = ratePlan.roomTypeMealPlanPricing || [];
  console.log("Pricing data:", ratePlan);
  const combinationsCount = pricingData.length;

  return (
    <div className={`bg-white rounded-lg border transition-all ${isInactive ? 'border-gray-200 opacity-75' : 'border-gray-200'}`}>
      {/* Accordion Header */}
      <div 
        className="px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => {
          if (!isEditing) {
            setIsExpanded(!isExpanded);
            if (!isExpanded) {
              // Start editing when expanding
              onEdit(ratePlan);
            }
          }
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {!isEditing && (
              isExpanded ? (
                <ChevronDown className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-500" />
              )
            )}
            
            {isEditing ? (
              <div className="flex items-center space-x-3 flex-1">
                <input
                  type="text"
                  name="name"
                  value={editFormData.name}
                  onChange={onInputChange}
                  className="px-2 py-1 text-sm font-semibold text-gray-900 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Rate plan name"
                />
                <input
                  type="color"
                  name="color"
                  value={editFormData.color}
                  onChange={onInputChange}
                  className="w-6 h-6 border border-gray-300 rounded cursor-pointer"
                />
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  isInactive ? 'bg-gray-100 text-gray-600' : 'bg-green-100 text-green-800'
                }`}>
                  {isInactive ? 'Inactive' : 'Active'}
                </span>
                <span className="text-xs text-gray-500">
                  ({combinationsCount} combinations)
                </span>
              </div>
            ) : (
              <>
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: ratePlan.color }}
                ></div>
                <h3 className="text-sm font-semibold text-gray-900">{ratePlan.name}</h3>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  isInactive ? 'bg-gray-100 text-gray-600' : 'bg-green-100 text-green-800'
                }`}>
                  {isInactive ? 'Inactive' : 'Active'}
                </span>
                <span className="text-xs text-gray-500">
                  ({combinationsCount} combinations)
                </span>
              </>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {isEditing ? (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdate();
                  }}
                  disabled={updateLoading}
                  className="px-3 py-1 text-xs font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updateLoading ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCancelEdit();
                    setIsExpanded(false);
                  }}
                  className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleStatus(ratePlan.id, ratePlan.isActive);
                  }}
                  className={`p-1 transition-colors ${
                    isInactive 
                      ? 'text-gray-400 hover:text-green-600' 
                      : 'text-gray-400 hover:text-yellow-600'
                  }`}
                  title={isInactive ? 'Activate rate plan' : 'Deactivate rate plan'}
                >
                  {isInactive ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                </button>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(ratePlan.id, ratePlan.name);
                  }}
                  className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                  title="Delete rate plan"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(routes.inventory, {
                      state: { 
                        selectedRatePlan: ratePlan,
                        propertyId: propertyId 
                      }
                    });
                  }}
                  className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
                >
                  <Map className="h-3 w-3 mr-1" />
                  Map Rates
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Accordion Content */}
      {isExpanded && (
        <div className="border-t border-gray-200">
          {pricingData.length > 0 ? (
            <div className="space-y-4">
              {/* Group pricing data by room type */}
              {(() => {
                const groupedByRoomType = pricingData.reduce((acc, pricing) => {
                  const roomTypeName = pricing.propertyRoomType?.roomType?.name || 'Unknown';
                  if (!acc[roomTypeName]) {
                    acc[roomTypeName] = [];
                  }
                  acc[roomTypeName].push(pricing);
                  return acc;
                }, {});

                return Object.entries(groupedByRoomType).map(([roomTypeName, roomPricing]) => (
                  console.log("Room pricing:", roomPricing),
                  <div key={roomTypeName} className="border border-gray-200 rounded-lg overflow-hidden">
                    {/* Room Type Header */}
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                      <h4 className="text-sm font-semibold text-gray-900">{roomTypeName}</h4>
                    </div>
                    
                    {/* Meal Plans Table */}
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Meal Plan
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Single
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Double
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Extra Adult
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Extra Child
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Extra Infant
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Group
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {roomPricing.map((pricing) => {
                            const pricingKey = `${pricing.propertyRoomTypeId}|||${pricing.mealPlanId}`;
                            
                            return (
                              <tr key={pricingKey} className="hover:bg-gray-50">
                                <td className="px-4 py-2 whitespace-nowrap text-xs font-medium text-gray-900">
                                  {pricing.mealPlan?.name || pricing.mealPlan?.code || 'Unknown'}
                                </td>
                                <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-900">
                                  <div className="flex items-center">
                                    <IndianRupee className="h-3 w-3 mr-1 text-green-600" />
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={priceEditData[pricingKey]?.singleOccupancyPrice || 0}
                                      onChange={(e) => onPriceInputChange(pricingKey, 'singleOccupancyPrice', e.target.value)}
                                      className="w-16 px-1 py-0.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                  </div>
                                </td>
                                <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-900">
                                  <div className="flex items-center">
                                    <IndianRupee className="h-3 w-3 mr-1 text-green-600" />
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={priceEditData[pricingKey]?.doubleOccupancyPrice || 0}
                                      onChange={(e) => onPriceInputChange(pricingKey, 'doubleOccupancyPrice', e.target.value)}
                                      className="w-16 px-1 py-0.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                  </div>
                                </td>
                                <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-900">
                                  <div className="flex items-center">
                                    <IndianRupee className="h-3 w-3 mr-1 text-blue-600" />
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={priceEditData[pricingKey]?.extraBedPriceAdult || 0}
                                      onChange={(e) => onPriceInputChange(pricingKey, 'extraBedPriceAdult', e.target.value)}
                                      className="w-16 px-1 py-0.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                  </div>
                                </td>
                                <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-900">
                                  <div className="flex items-center">
                                    <IndianRupee className="h-3 w-3 mr-1 text-blue-600" />
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={priceEditData[pricingKey]?.extraBedPriceChild || 0}
                                      onChange={(e) => onPriceInputChange(pricingKey, 'extraBedPriceChild', e.target.value)}
                                      className="w-16 px-1 py-0.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                  </div>
                                </td>
                                <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-900">
                                  <div className="flex items-center">
                                    <IndianRupee className="h-3 w-3 mr-1 text-blue-600" />
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={priceEditData[pricingKey]?.extraBedPriceInfant || 0}
                                      onChange={(e) => onPriceInputChange(pricingKey, 'extraBedPriceInfant', e.target.value)}
                                      className="w-16 px-1 py-0.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                  </div>
                                </td>
                                <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-900">
                                  <div className="flex items-center">
                                    <IndianRupee className="h-3 w-3 mr-1 text-purple-600" />
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={priceEditData[pricingKey]?.groupOccupancyPrice || 0}
                                      onChange={(e) => onPriceInputChange(pricingKey, 'groupOccupancyPrice', e.target.value)}
                                      className="w-16 px-1 py-0.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ));
              })()}
            </div>
          ) : (
            <div className="px-4 py-6 text-center text-gray-500">
              <AlertCircle className="h-6 w-6 mx-auto mb-2 text-gray-400" />
              <p className="text-xs">No pricing data available for this rate plan.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};


export default RatePlans;
