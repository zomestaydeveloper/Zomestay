import React, { useState, useEffect } from 'react';
import { X, Plus, Minus, Home } from 'lucide-react';
import { propertyService } from '../services';

const AddRoomModal = ({ isOpen, onClose, propertyId, onSave, mode = 'create' }) => {
  const [propertyRoomTypes, setPropertyRoomTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [selectedRoomType, setSelectedRoomType] = useState(null);
  const [roomTypeConfigs, setRoomTypeConfigs] = useState({});
  const [existingRoomConfigs, setExistingRoomConfigs] = useState([]);
  const [isEditMode, setIsEditMode] = useState(mode === 'edit');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmData, setConfirmData] = useState(null);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setErrors({});
      setSelectedRoomType(null);
      setRoomTypeConfigs({});
      setIsEditMode(mode === 'edit');
    }
  }, [isOpen, mode]);

  // Fetch data when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchPropertyRoomTypes();
      if (isEditMode) {
        fetchExistingRoomConfigurations();
      }
    }
  }, [isOpen, isEditMode]);

  const fetchPropertyRoomTypes = async () => {
    try {
      const response = await propertyService.getPropertyRoomTypes(propertyId);
      if (response.data.success) {
        console.log('Property room types data:', response.data.data);
        setPropertyRoomTypes(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching property room types:', error);
    }
  };

  const fetchExistingRoomConfigurations = async () => {
    try {
      const response = await propertyService.getRoomConfigurations(propertyId);
      if (response.data.success) {
        console.log('Existing room configurations:', response.data.data);
        setExistingRoomConfigs(response.data.data);
        
        // Populate roomTypeConfigs with existing data
        const configs = {};
        response.data.data.forEach(config => {
          if (config.hasRooms) {
            configs[config.propertyRoomTypeId] = {
              namePrefix: config.namePrefix,
              roomCount: config.roomCount
            };
          }
        });
        setRoomTypeConfigs(configs);
      }
    } catch (error) {
      console.error('Error fetching existing room configurations:', error);
    }
  };


  const handleRoomTypeSelect = (roomType) => {
    setSelectedRoomType(roomType);
  };

  const handleRoomTypeConfigChange = (field, value) => {
    if (!selectedRoomType) return;
    
    const roomTypeId = selectedRoomType.propertyRoomTypeId;
    
    setRoomTypeConfigs(prev => ({
      ...prev,
      [roomTypeId]: {
        ...prev[roomTypeId],
        [field]: value
      }
    }));
    
    // Clear error when user starts typing
    if (errors[`${roomTypeId}_${field}`]) {
      setErrors(prev => ({
        ...prev,
        [`${roomTypeId}_${field}`]: ''
      }));
    }
  };


  const handleRoomCountChange = (change) => {
    if (!selectedRoomType) return;
    
    const roomTypeId = selectedRoomType.propertyRoomTypeId;
    const currentCount = roomTypeConfigs[roomTypeId]?.roomCount || 1;
    const newCount = currentCount + change;
    
    if (newCount >= 1 && newCount <= 50) {
      handleRoomTypeConfigChange('roomCount', newCount);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Check if at least one room type is configured
    const configuredRoomTypes = Object.keys(roomTypeConfigs);
    if (configuredRoomTypes.length === 0) {
      newErrors.roomTypes = 'Please configure at least one room type';
    }

    // Check individual room type configurations
    configuredRoomTypes.forEach(roomTypeId => {
      const config = roomTypeConfigs[roomTypeId];
      if (!config.namePrefix?.trim()) {
        newErrors[`${roomTypeId}_namePrefix`] = 'Room name prefix is required';
      }
      if (!config.roomCount || config.roomCount < 1 || config.roomCount > 50) {
        newErrors[`${roomTypeId}_roomCount`] = 'Room count must be between 1 and 50';
      }
      // ✅ Date validation removed - rooms are available by default
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const checkForRoomReduction = () => {
    if (!isEditMode) return false;
    
    // Check if any room type has reduced room count
    for (const roomTypeId of Object.keys(roomTypeConfigs)) {
      const config = roomTypeConfigs[roomTypeId];
      const existingConfig = existingRoomConfigs.find(existing => 
        existing.propertyRoomTypeId === roomTypeId
      );
      
      if (existingConfig && config.roomCount < existingConfig.roomCount) {
        return {
          roomTypeId,
          roomTypeName: propertyRoomTypes.find(rt => rt.propertyRoomTypeId === roomTypeId)?.name,
          currentCount: existingConfig.roomCount,
          newCount: config.roomCount,
          roomsToDelete: existingConfig.roomCount - config.roomCount
        };
      }
    }
    return false;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Check for room reduction in edit mode
    const roomReduction = checkForRoomReduction();
    if (roomReduction) {
      setConfirmData(roomReduction);
      setShowConfirmModal(true);
      return;
    }

    // Proceed with submission if no room reduction
    await submitRoomConfigurations();
  };

  const submitRoomConfigurations = async () => {
    setLoading(true);
    try {
      // Create array of all configured room types
      const roomTypeConfigArray = Object.keys(roomTypeConfigs).map(roomTypeId => {
        const config = roomTypeConfigs[roomTypeId];
        return {
          propertyRoomTypeId: roomTypeId,
          namePrefix: config.namePrefix,
          roomCount: config.roomCount,
          propertyId: propertyId,
        };
      });

      console.log(`Sending room type configurations (${isEditMode ? 'UPDATE' : 'CREATE'}):`, roomTypeConfigArray);
      
      // Call onSave callback with the array
      await onSave(roomTypeConfigArray);
      
      // Close modal on success
      onClose();
    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} rooms:`, error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmUpdate = async () => {
    setShowConfirmModal(false);
    await submitRoomConfigurations();
  };

  const handleCancelUpdate = () => {
    setShowConfirmModal(false);
    setConfirmData(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-xl">
        {/* Header */}
        <div className="border-b border-gray-500 px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Home className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {isEditMode ? 'Edit Room Configurations' : 'Add Multiple Rooms'}
                </h2>
                <p className="text-xs text-gray-500">
                  {isEditMode ? 'Update existing room configurations' : 'Create multiple rooms with same settings'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex h-[calc(90vh-120px)]">
          {/* Left Sidebar - Room Types */}
          <div className="w-64 bg-gray-50 border-r border-gray-200 p-4 overflow-y-auto">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Room Types</h3>
            <div className="space-y-2">
              {propertyRoomTypes.map((roomType) => {
                const isConfigured = roomTypeConfigs[roomType.propertyRoomTypeId];
                return (
                  <button
                    key={roomType.propertyRoomTypeId}
                    onClick={() => handleRoomTypeSelect(roomType)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedRoomType?.propertyRoomTypeId === roomType.propertyRoomTypeId
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Home className="h-4 w-4" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{roomType.name}</div>
                        <div className="text-xs opacity-75">
                          {isConfigured ? `Configured (${isConfigured.roomCount})` : 
                           isEditMode ? 'No rooms created' : `Occupancy: ${roomType.Occupancy || 2}`}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Content - Form */}
          <div className="flex-1 overflow-y-auto p-6">
            {selectedRoomType ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {isEditMode ? 'Edit' : 'Configure'} {selectedRoomType.name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {isEditMode ? 'Update room details for this room type' : 'Set room details for this room type'}
                  </p>
                </div>

                {/* Room Name Prefix */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Room Name Prefix *
                  </label>
                  <input
                    type="text"
                    value={roomTypeConfigs[selectedRoomType.propertyRoomTypeId]?.namePrefix || selectedRoomType.name}
                    onChange={(e) => handleRoomTypeConfigChange('namePrefix', e.target.value)}
                    placeholder="e.g., Deluxe Suite"
                    className={`block w-full px-3 py-2 text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors[`${selectedRoomType.propertyRoomTypeId}_namePrefix`] ? 'border-red-500' : 'border-gray-500'
                    }`}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Rooms will be named: {roomTypeConfigs[selectedRoomType.propertyRoomTypeId]?.namePrefix || selectedRoomType.name} 1, {roomTypeConfigs[selectedRoomType.propertyRoomTypeId]?.namePrefix || selectedRoomType.name} 2, etc.
                  </p>
                  {errors[`${selectedRoomType.propertyRoomTypeId}_namePrefix`] && (
                    <p className="mt-1 text-xs text-red-600">{errors[`${selectedRoomType.propertyRoomTypeId}_namePrefix`]}</p>
                  )}
                </div>

                {/* Room Count */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Number of Rooms *
                  </label>
                  <div className="flex items-center space-x-3">
                    <button
                      type="button"
                      onClick={() => handleRoomCountChange(-1)}
                      disabled={(roomTypeConfigs[selectedRoomType.propertyRoomTypeId]?.roomCount || 1) <= 1}
                      className="p-2 border border-gray-500 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    
                    <div className="flex-1">
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={roomTypeConfigs[selectedRoomType.propertyRoomTypeId]?.roomCount || 1}
                        onChange={(e) => handleRoomTypeConfigChange('roomCount', parseInt(e.target.value) || 1)}
                        className={`block w-full px-3 py-2 text-xs border rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors[`${selectedRoomType.propertyRoomTypeId}_roomCount`] ? 'border-red-500' : 'border-gray-500'
                        }`}
                      />
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => handleRoomCountChange(1)}
                      disabled={(roomTypeConfigs[selectedRoomType.propertyRoomTypeId]?.roomCount || 1) >= 50}
                      className="p-2 border border-gray-500 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {(roomTypeConfigs[selectedRoomType.propertyRoomTypeId]?.roomCount || 1)} room{(roomTypeConfigs[selectedRoomType.propertyRoomTypeId]?.roomCount || 1) !== 1 ? 's' : ''} 
                    {isEditMode ? ' will be updated' : ' will be created'}
                  </p>
                  {errors[`${selectedRoomType.propertyRoomTypeId}_roomCount`] && (
                    <p className="mt-1 text-xs text-red-600">{errors[`${selectedRoomType.propertyRoomTypeId}_roomCount`]}</p>
                  )}
                </div>

                {/* ✅ Date Range Selection Removed - Rooms are available by default */}

                {/* Configured Room Types Summary */}
                {Object.keys(roomTypeConfigs).length > 0 && (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="text-xs font-medium text-blue-700 mb-2">Configured Room Types:</h4>
                    <div className="text-xs text-blue-600 space-y-1">
                      {Object.keys(roomTypeConfigs).map(roomTypeId => {
                        const config = roomTypeConfigs[roomTypeId];
                        const roomType = propertyRoomTypes.find(rt => rt.propertyRoomTypeId === roomTypeId);
                        return (
                          <p key={roomTypeId}>
                            {roomType?.name}: {config.roomCount} room{config.roomCount !== 1 ? 's' : ''} 
                            ({config.namePrefix} 1, {config.namePrefix} 2...) 
                            - Available by default
                          </p>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 pt-4 border-t border-gray-500">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-500 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || Object.keys(roomTypeConfigs).length === 0}
                    className="px-4 py-2 text-xs font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update All Configured Rooms' : 'Create All Configured Rooms')}
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Home className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500">Select a room type to {isEditMode ? 'edit' : 'create'} rooms</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && confirmData && (
        <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-lg w-full max-w-md shadow-xl">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange-50 rounded-lg">
                  <Home className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Confirm Room Reduction</h3>
                  <p className="text-sm text-gray-600">This action will permanently delete rooms</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-4">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center">
                      <span className="text-orange-600 text-sm font-semibold">!</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-orange-800 mb-2">
                      Room Reduction Warning
                    </h4>
                    <div className="text-sm text-orange-700 space-y-2">
                      <p>
                        <strong>{confirmData.roomTypeName}</strong>: Reducing from {confirmData.currentCount} to {confirmData.newCount} rooms
                      </p>
                      <p>
                        <strong>{confirmData.roomsToDelete} room{confirmData.roomsToDelete !== 1 ? 's' : ''}</strong> will be permanently deleted
                      </p>
                      <div className="bg-orange-100 border border-orange-300 rounded p-3 mt-3">
                        <p className="text-xs font-medium text-orange-800 mb-1">⚠️ Important:</p>
                        <p className="text-xs text-orange-700">
                          Please check with the front desk for existing bookings before proceeding. 
                          Deleting rooms may affect current reservations.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-sm text-gray-600">
                <p>Are you sure you want to proceed with this room reduction?</p>
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={handleCancelUpdate}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmUpdate}
                className="px-4 py-2 text-sm font-medium text-white bg-orange-600 border border-transparent rounded-lg hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors"
              >
                Yes, Proceed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddRoomModal;