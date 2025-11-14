import React, { useState, useEffect } from 'react';
import { X, Target, Home, Utensils, Users, Baby, User, Save, CheckCircle, AlertCircle, Edit, Trash2, Palette } from 'lucide-react';
import { toast } from 'react-toastify';
import { roomtypeMealPlanService } from '../services';

const RatePlannerModal = ({ isOpen, onClose, roomTypesMap = [], mealPlans = [], onSave, propertyId }) => {
  const [ratePlanForm, setRatePlanForm] = useState({
    name: '',
    color: '#3B82F6' // Default blue
  });
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
  // Pricing grid state - stores pricing for each room type + meal plan combination
  const [pricingGrid, setPricingGrid] = useState({});
  const [existingDataMap, setExistingDataMap] = useState({});
  
  // Predefined colors
  const colorOptions = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', 
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
  ];

  // Fetch existing data when modal opens
  useEffect(() => {
    if (isOpen && roomTypesMap.length > 0 && mealPlans.length > 0) {
      fetchExistingData();
    }
  }, [isOpen, roomTypesMap, mealPlans]);

  const fetchExistingData = async () => {
    try {
      setLoading(true);
      const existingData = {};
      
      // Fetch existing PropertyRoomTypeMealPlan data
      for (const roomType of roomTypesMap) {
        const response = await roomtypeMealPlanService.getPropertyRoomTypeMealPlans(roomType.id);
        if (response.success && response.data) {
          existingData[roomType.id] = {};
          response.data.forEach(item => {
            existingData[roomType.id][item.mealPlanId] = item;
          });
        }
      }
      
      setExistingDataMap(existingData);
      initializePricingGrid(existingData);
    } catch (error) {
      console.error('Error fetching existing data:', error);
      toast.error('Failed to load existing pricing data');
    } finally {
      setLoading(false);
    }
  };

  const initializePricingGrid = (existingData = {}) => {
    const grid = {};
    
    roomTypesMap.forEach(roomType => {
      grid[roomType.id] = {};
      mealPlans.forEach(mealPlan => {
        const existing = existingData[roomType.id]?.[mealPlan.id];
        grid[roomType.id][mealPlan.id] = {
          singleOccupancyPrice: existing?.singleOccupancyPrice || '',
          doubleOccupancyPrice: existing?.doubleOccupancyPrice || '',
          extraBedPriceAdult: existing?.extraBedPriceAdult || '',
          extraBedPriceChild: existing?.extraBedPriceChild || '',
          extraBedPriceInfant: existing?.extraBedPriceInfant || '0',
          groupOccupancyPrice: existing?.groupOccupancyPrice || '',
          existingRecordId: existing?.id || null
        };
      });
    });
    
    setPricingGrid(grid);
  };

  const handleRatePlanFormChange = (field, value) => {
    setRatePlanForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePricingChange = (roomTypeId, mealPlanId, field, value) => {
    setPricingGrid(prev => ({
      ...prev,
      [roomTypeId]: {
        ...prev[roomTypeId],
        [mealPlanId]: {
          ...prev[roomTypeId][mealPlanId],
          [field]: value
        }
      }
    }));
  };

  const handleSave = async () => {
    if (!ratePlanForm.name.trim()) {
      toast.error('Please enter a rate plan name');
      return;
    }

    try {
      setLoading(true);
      
      // Prepare data for each room type + meal plan combination
      const savePromises = [];
      
      Object.keys(pricingGrid).forEach(roomTypeId => {
        Object.keys(pricingGrid[roomTypeId]).forEach(mealPlanId => {
          const pricing = pricingGrid[roomTypeId][mealPlanId];
          
          // Only save if at least one price is provided
          if (pricing.singleOccupancyPrice || pricing.doubleOccupancyPrice || 
              pricing.extraBedPriceAdult || pricing.extraBedPriceChild || pricing.groupOccupancyPrice) {
            
            const data = {
              propertyRoomTypeId: roomTypeId,
              mealPlanId: mealPlanId,
              singleOccupancyPrice: parseFloat(pricing.singleOccupancyPrice) || 0,
              doubleOccupancyPrice: parseFloat(pricing.doubleOccupancyPrice) || 0,
              extraBedPriceAdult: parseFloat(pricing.extraBedPriceAdult) || 0,
              extraBedPriceChild: parseFloat(pricing.extraBedPriceChild) || 0,
              extraBedPriceInfant: parseFloat(pricing.extraBedPriceInfant) || 0,
              groupOccupancyPrice: parseFloat(pricing.groupOccupancyPrice) || 0,
              // Add rate plan name and color to the data
              ratePlanName: ratePlanForm.name,
              ratePlanColor: ratePlanForm.color
            };

            if (pricing.existingRecordId) {
              // Update existing record
              savePromises.push(
                roomtypeMealPlanService.updatePropertyRoomTypeMealPlan(pricing.existingRecordId, data)
              );
            } else {
              // Create new record
              savePromises.push(
                roomtypeMealPlanService.createPropertyRoomTypeMealPlan(data)
              );
            }
          }
        });
      });

      await Promise.all(savePromises);
      
      setSuccessMessage(`Rate plan "${ratePlanForm.name}" saved successfully!`);
      setShowSuccessModal(true);
      
      if (onSave) {
        onSave();
      }
    } catch (error) {
      console.error('Error saving rate plan:', error);
      setErrorMessage('Failed to save rate plan. Please try again.');
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setRatePlanForm({ name: '', color: '#3B82F6' });
    setPricingGrid({});
    setExistingDataMap({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-xl flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 px-4 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Target className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Add Rate Plan</h2>
                <p className="text-sm text-gray-600">Set pricing for room types and meal plans</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-3 min-h-0">
          <div className="max-w-full mx-auto">
            {/* Rate Plan Details */}
            <div className="bg-gray-50 rounded-lg p-3 mb-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rate Plan Name *
                  </label>
                  <input
                    type="text"
                    value={ratePlanForm.name}
                    onChange={(e) => handleRatePlanFormChange('name', e.target.value)}
                    placeholder="e.g., Best Available Rate, Weekend Special"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Color *
                  </label>
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <input
                        type="color"
                        value={ratePlanForm.color}
                        onChange={(e) => handleRatePlanFormChange('color', e.target.value)}
                        className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer"
                      />
                      <Palette className="h-4 w-4 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white pointer-events-none" />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {colorOptions.map((color) => (
                        <button
                          key={color}
                          onClick={() => handleRatePlanFormChange('color', color)}
                          className={`w-6 h-6 rounded-full border-2 transition-all ${
                            ratePlanForm.color === color ? 'border-gray-400 scale-110' : 'border-gray-200'
                          }`}
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Pricing Grid */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                <h3 className="font-medium text-gray-900">Pricing Grid</h3>
                <p className="text-sm text-gray-600">Set prices for each room type and meal plan combination</p>
              </div>
              
              <div className="overflow-auto max-h-96">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Meal Plan
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Occupancy
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        All Days
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {roomTypesMap.map((roomType) => 
                      mealPlans.map((mealPlan) => (
                        <React.Fragment key={`${roomType.id}-${mealPlan.id}`}>
                          {/* Single */}
                          <tr className="hover:bg-gray-50">
                            <td className="px-4 py-2 whitespace-nowrap text-xs font-medium text-gray-900">
                              {roomType.roomType?.name || 'Unknown'}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-600">
                              {mealPlan.name}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-600">
                              Single
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap">
                              <input
                                type="number"
                                value={pricingGrid[roomType.id]?.[mealPlan.id]?.singleOccupancyPrice || ''}
                                onChange={(e) => handlePricingChange(roomType.id, mealPlan.id, 'singleOccupancyPrice', e.target.value)}
                                placeholder="0"
                                className="w-20 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </td>
                          </tr>
                          
                          {/* Double */}
                          <tr className="hover:bg-gray-50">
                            <td className="px-4 py-2 whitespace-nowrap text-xs font-medium text-gray-900">
                              {/* Empty cell */}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-600">
                              {/* Empty cell */}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-600">
                              Double
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap">
                              <input
                                type="number"
                                value={pricingGrid[roomType.id]?.[mealPlan.id]?.doubleOccupancyPrice || ''}
                                onChange={(e) => handlePricingChange(roomType.id, mealPlan.id, 'doubleOccupancyPrice', e.target.value)}
                                placeholder="0"
                                className="w-20 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </td>
                          </tr>
                          
                          {/* Extra Person */}
                          <tr className="hover:bg-gray-50">
                            <td className="px-4 py-2 whitespace-nowrap text-xs font-medium text-gray-900">
                              {/* Empty cell */}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-600">
                              {/* Empty cell */}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-600">
                              Extra Person
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap">
                              <input
                                type="number"
                                value={pricingGrid[roomType.id]?.[mealPlan.id]?.extraBedPriceAdult || ''}
                                onChange={(e) => handlePricingChange(roomType.id, mealPlan.id, 'extraBedPriceAdult', e.target.value)}
                                placeholder="0"
                                className="w-20 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </td>
                          </tr>
                          
                          {/* Extra Child */}
                          <tr className="hover:bg-gray-50">
                            <td className="px-4 py-2 whitespace-nowrap text-xs font-medium text-gray-900">
                              {/* Empty cell */}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-600">
                              {/* Empty cell */}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-600">
                              Extra Child
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap">
                              <input
                                type="number"
                                value={pricingGrid[roomType.id]?.[mealPlan.id]?.extraBedPriceChild || ''}
                                onChange={(e) => handlePricingChange(roomType.id, mealPlan.id, 'extraBedPriceChild', e.target.value)}
                                placeholder="0"
                                className="w-20 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </td>
                          </tr>
                          
                          {/* Group Occupancy (if room occupancy > 2) */}
                          {roomType.Occupancy > 2 && (
                            <tr className="hover:bg-gray-50">
                              <td className="px-4 py-2 whitespace-nowrap text-xs font-medium text-gray-900">
                                {/* Empty cell */}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-600">
                                {/* Empty cell */}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-600">
                                Group ({roomType.Occupancy}+)
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap">
                                <input
                                  type="number"
                                  value={pricingGrid[roomType.id]?.[mealPlan.id]?.groupOccupancyPrice || ''}
                                  onChange={(e) => handlePricingChange(roomType.id, mealPlan.id, 'groupOccupancyPrice', e.target.value)}
                                  placeholder="0"
                                  className="w-20 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end mt-4">
              <button
                onClick={handleSave}
                disabled={loading || !ratePlanForm.name.trim()}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Save Rate Plan</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="text-sm text-gray-600">
            Set pricing for all room type and meal plan combinations
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-60">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-green-100 rounded-full">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Success!</h3>
            </div>
            <p className="text-gray-600 mb-6">{successMessage}</p>
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  handleClose();
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {showErrorModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-60">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Error</h3>
            </div>
            <p className="text-gray-600 mb-6">{errorMessage}</p>
            <div className="flex justify-end">
              <button
                onClick={() => setShowErrorModal(false)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RatePlannerModal;