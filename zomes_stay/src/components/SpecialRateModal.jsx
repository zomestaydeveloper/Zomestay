import React, { useEffect, useState } from 'react';
import { propertyService ,specialRateService} from '../services';
import {
  Target,
  CalendarDays,
  IndianRupee,
  AlertTriangle,
  X,
  Check,
  Home,
  Settings,
  Loader2,
} from 'lucide-react';

const SpecialRateModal = ({ isOpen, onClose, propertyId, onApplied }) => {
  // Form state
  const [kind, setKind] = useState();
  const [name, setName] = useState('');
  const [color, setColor] = useState(); 
  const [isGlobalPricing, setIsGlobalPricing] = useState(true);

  // Global pricing states
  const [globalPricingMode, setGlobalPricingMode] = useState(null)
  const [globalFlatPrice, setGlobalFlatPrice] = useState('');
  const [globalPercentAdj, setGlobalPercentAdj] = useState('');

  // Room rows
  const [roomRows, setRoomRows] = useState([]);

  // UI states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  

  // Form validation
  const validateField = (fieldName, value, allValues = {}) => {
    const currentValues = {
      name,
      color,
      globalFlatPrice,
      globalPercentAdj,
      ...allValues
    };

    switch (fieldName) {
      case 'name':
        if (!value?.trim()) return 'Rate name is required';
        if (value.trim().length < 2) return 'Rate name must be at least 2 characters';
        if (value.trim().length > 100) return 'Rate name must be less than 100 characters';
        if (!/^[a-zA-Z0-9\s\-_.,()]+$/.test(value.trim())) return 'Rate name contains invalid characters';
        return null;

      case 'color':
        if (!value) return 'Color selection is required';
        if (!/^#[0-9A-Fa-f]{6}$/.test(value)) return 'Invalid color format';
        return null;

      case 'globalFlatPrice':
        if (isGlobalPricing && globalPricingMode === 'flat') {
          if (!value?.toString().trim()) return 'Fixed price is required';
          const price = parseFloat(value);
          if (isNaN(price)) return 'Please enter a valid number';
          if (price <= 0) return 'Price must be greater than 0';
          if (price > 1000000) return 'Price cannot exceed ₹10,00,000';
          if (price < 100) return 'Price must be at least ₹100';
          return null;
        }
        return null;

      case 'globalPercentAdj':
        if (isGlobalPricing && globalPricingMode === 'percent') {
          if (!value?.toString().trim()) return 'Percentage is required';
          const percent = parseFloat(value);
          if (isNaN(percent)) return 'Please enter a valid number';
          if (percent <= 0) return 'Percentage must be greater than 0';
          if (percent > 100) return 'Percentage cannot exceed 100%';
          return null;
        }
        return null;

      case 'roomRows':
        if (!isGlobalPricing) {
          if (roomRows.length === 0) {
            return 'No room types available';
          }
          
          const activeRooms = roomRows.filter(row => row.IsToggleActive);
          if (activeRooms.length === 0) {
            return 'At least one room type must be active';
          }

          for (let i = 0; i < activeRooms.length; i++) {
            const room = activeRooms[i];
            if (room.pricingMode === 'flat') {
              if (!room.flatPrice?.toString().trim()) {
                return `Fixed price is required for ${room.name}`;
              }
              const price = parseFloat(room.flatPrice);
              if (isNaN(price) || price <= 0) {
                return `Valid price is required for ${room.name}`;
              }
              if (price > 1000000) {
                return `Price for ${room.name} cannot exceed ₹10,00,000`;
              }
              if (price < 100) {
                return `Price for ${room.name} must be at least ₹100`;
              }
            } else if (room.pricingMode === 'percent') {
              if (!room.percentAdj?.toString().trim()) {
                return `Percentage is required for ${room.name}`;
              }
              const percent = parseFloat(room.percentAdj);
              if (isNaN(percent) || percent <= 0) {
                return `Valid percentage is required for ${room.name}`;
              }
              if (percent > 100) {
                return `Percentage for ${room.name} cannot exceed 100%`;
              }
            }
          }
        }
        return null;

      default:
        return null;
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Basic validations
    const nameError = validateField('name', name);
    if (nameError) newErrors.name = nameError;

    // Global pricing validations
    if (isGlobalPricing) {
      if (globalPricingMode === 'flat') {
        const priceError = validateField('globalFlatPrice', globalFlatPrice);
        if (priceError) newErrors.globalFlatPrice = priceError;
      } else {
        const percentError = validateField('globalPercentAdj', globalPercentAdj);
        if (percentError) newErrors.globalPercentAdj = percentError;
      }
    } else {
      // Room-specific validations
      const roomError = validateField('roomRows', roomRows);
      if (roomError) newErrors.roomRows = roomError;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFieldChange = (fieldName, value, additionalData = {}) => {
    // Clear existing error
    setErrors(prev => ({ ...prev, [fieldName]: null }));

    // Validate in real-time
    const error = validateField(fieldName, value, additionalData);
    if (error) {
      setErrors(prev => ({ ...prev, [fieldName]: error }));
    }
  };

  

  // Fetch room types
  useEffect(() => {
    if (!isOpen || !propertyId) return;

    let isCancelled = false;
    setIsLoading(true);
    setErrors({});

    const fetchRoomTypes = async () => {
      try {
        const response = await propertyService.getPropertyRoomTypes(propertyId);
        
        if (isCancelled) return;

        if (!response || response.status !== 200 || !response.data?.success) {
          throw new Error(response?.data?.message || 'Failed to fetch room types');
        }

        const roomTypes = response.data.data || [];
        const rows = roomTypes.map((rt, index) => ({
          propertyRoomTypeId: rt.propertyRoomTypeId || rt.id || `room_${index}`,
          name: rt.name || rt.roomType?.name || `Room ${index + 1}`,
          pricingMode: 'flat',
          percentAdj: '',
          flatPrice: '',
          isActive: true,
          IsToggleActive: true,
        }));

        setRoomRows(rows);
      } catch (error) {
        if (!isCancelled) {
          console.error('Error fetching room types:', error);
          setErrors({ general: 'Failed to load room types. Please try again.' });
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchRoomTypes();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, propertyId]);

  const updateRow = (index, field, value) => {
    if (index < 0 || index >= roomRows.length) return;
    
    const updatedRows = roomRows.map((row, i) => 
      i === index ? { ...row, [field]: value } : row
    );
    setRoomRows(updatedRows);
    
    // Clear room-specific errors
    if (errors.roomRows) {
      setErrors(prev => ({ ...prev, roomRows: null }));
    }
  };

  const handleSubmit = async () => {
    setSubmitError('');
    setSubmitSuccess(false);

    if (!validateForm()) {
      setSubmitError('Please fix the validation errors before submitting.');
      return;
    }

    if (!propertyId) {
      setSubmitError('Property ID is required.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        kind,
        name: name.trim(),
        color, // Add color to payload
        propertyId,
      };

      if (isGlobalPricing) {
        payload.pricingMode = globalPricingMode;
        payload.flatPrice = globalPricingMode === 'flat' ? parseFloat(globalFlatPrice) : null;
        payload.percentAdj = globalPricingMode === 'percent' ? parseFloat(globalPercentAdj) : null;
      } else {
        const activeRoomTypes = roomRows.filter(row => row.IsToggleActive);
        payload.roomTypeLinks = activeRoomTypes.map(room => ({
          propertyRoomTypeId: room.propertyRoomTypeId,
          pricingMode: room.pricingMode,
          flatPrice: room.pricingMode === 'flat' ? parseFloat(room.flatPrice) : null,
          percentAdj: room.pricingMode === 'percent' ? parseFloat(room.percentAdj) : null,
          isActive: true,
        }));
      }

    
      
      
     const response = await specialRateService.createSpecialRate(propertyId, payload);     

      setSubmitSuccess(true);
      
      setTimeout(() => {
        if (onApplied) onApplied();
        onClose();
        resetForm();
      }, 1000);
      
    } catch (error) {
      console.error('Submit error:', error);
      setSubmitError(error.message || 'Failed to create special rate. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setKind('');
    setName('');
    setColor(''); 
    setIsGlobalPricing(true);
    setGlobalPricingMode('flat');
    setGlobalFlatPrice('');
    setGlobalPercentAdj('');
    setRoomRows([]);
    setErrors({});
    setSubmitError('');
    setSubmitSuccess(false);
    setIsSubmitting(false);
  };

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  // Clear pricing mode errors when switching modes
  useEffect(() => {
    if (isGlobalPricing) {
      setErrors(prev => ({ ...prev, roomRows: null }));
    } else {
      setErrors(prev => ({ 
        ...prev, 
        globalFlatPrice: null, 
        globalPercentAdj: null 
      }));
    }
  }, [isGlobalPricing]);

  useEffect(() => {
    if (isGlobalPricing) {
      setErrors(prev => ({ 
        ...prev, 
        globalFlatPrice: null, 
        globalPercentAdj: null 
      }));
    }
  }, [globalPricingMode]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[95vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-white rounded-t-2xl flex-shrink-0">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-violet-100 rounded-lg">
                <Target className="h-6 w-6 text-violet-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Smart Rate Management
                </h2>
                
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              aria-label="Close modal"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex items-center space-x-3 text-gray-600">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span>Loading room types...</span>
              </div>
            </div>
          ) : (
            <div className="p-6 space-y-6">
              {/* General Error */}
              {errors.general && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    <span className="text-sm text-red-800">{errors.general}</span>
                  </div>
                </div>
              )}

              {/* Basic Info Section */}
              <BasicInfoSection
                name={name}
                setName={setName}
                color={color}
                setColor={setColor}
                kind={kind}
                setKind={setKind}
                errors={errors}
                onFieldChange={handleFieldChange}
              />

              {/* Dates Section */}
              

              {/* Pricing Strategy Toggle */}
              <PricingStrategySection
                isGlobalPricing={isGlobalPricing}
                setIsGlobalPricing={setIsGlobalPricing}
              />

              {/* Global Pricing Section */}
              {isGlobalPricing && (
                <GlobalPricingSection
                  pricingMode={globalPricingMode}
                  setPricingMode={setGlobalPricingMode}
                  flatPrice={globalFlatPrice}
                  setFlatPrice={setGlobalFlatPrice}
                  percentAdj={globalPercentAdj}
                  setPercentAdj={setGlobalPercentAdj}
                  kind={kind}
                  errors={errors}
                  onFieldChange={handleFieldChange}
                />
              )}

              {/* Room-Specific Pricing Section */}
              {!isGlobalPricing && (
                <RoomSpecificPricingSection
                  rows={roomRows}
                  updateRow={updateRow}
                  kind={kind}
                  errors={errors}
                />
              )}

              {/* Conflict Policy */}
             
            </div>
          )}
        </div>

        {/* Sticky Footer */}
        <StickyFooter
          isSubmitting={isSubmitting}
          submitError={submitError}
          submitSuccess={submitSuccess}
          onSubmit={handleSubmit}
          onClose={onClose}
          hasErrors={Object.keys(errors).some(key => errors[key])}
          disabled={isLoading}
        />
      </div>
    </div>
  );
};

// Basic Info Section Component
const BasicInfoSection = ({ name, setName, color, setColor, kind, setKind, errors, onFieldChange }) => (
  <div className="space-y-4">
    

    <div className="space-y-4">
      {/* Rate Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Rate Type *</label>
        <div className="flex space-x-4">
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              value="offer"
              checked={kind === 'offer'}
              onChange={(e) => setKind(e.target.value)}
              className="mr-2 text-green-600 focus:ring-green-500"
            />
            <span className="text-sm flex items-center">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              Decrease (Discount)
            </span>
          </label>
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              value="peak"
              checked={kind === 'peak'}
              onChange={(e) => setKind(e.target.value)}
              className="mr-2 text-red-600 focus:ring-red-500"
            />
            <span className="text-sm flex items-center">
              <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
              Increase (Surcharge)
            </span>
          </label>
        </div>
      </div>

      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Rate Name *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            onFieldChange('name', e.target.value);
          }}
          placeholder={kind === 'offer' ? 'e.g., Diwali Special, Early Bird' : 'e.g., Weekend Premium, Festival Rush'}
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
            errors.name 
              ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
              : 'border-gray-300 focus:ring-violet-500 focus:border-violet-500'
          }`}
          maxLength={100}
        />
        {errors.name && (
          <div className="mt-1 flex items-center space-x-1 text-red-600 text-xs">
            <AlertTriangle className="h-3 w-3" />
            <span>{errors.name}</span>
          </div>
        )}
      </div>

      {/* Color Picker */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Rate Color *</label>
        <div className="space-y-3">
          {/* Color Preview */}
          <div className="flex items-center space-x-3">
            <div 
              className="w-8 h-8 rounded-lg border-2 border-gray-200 shadow-sm"
              style={{ backgroundColor: color }}
            ></div>
            <span className="text-sm text-gray-600">Selected: {color}</span>
          </div>
          
          
          
          <div>
            <div className="flex items-center space-x-2">
              <input
                type="color"
                value={color}
                onChange={(e) => {
                  setColor(e.target.value);
                  onFieldChange('color', e.target.value);
                }}
                className="w-12 h-10 border border-gray-300 rounded-lg cursor-pointer"
              />
              <input
                type="text"
                value={color}
                onChange={(e) => {
                  setColor(e.target.value);
                  onFieldChange('color', e.target.value);
                }}
                placeholder="#10B981"
                className={`flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors font-mono text-sm ${
                  errors.color 
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                    : 'border-gray-300 focus:ring-violet-500 focus:border-violet-500'
                }`}
                pattern="^#[0-9A-Fa-f]{6}$"
                maxLength={7}
              />
            </div>
            {errors.color && (
              <div className="mt-1 flex items-center space-x-1 text-red-600 text-xs">
                <AlertTriangle className="h-3 w-3" />
                <span>{errors.color}</span>
              </div>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Use hex format (e.g., #10B981). This color will be used to identify this rate in the calendar.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
);



// Pricing Strategy Section Component
const PricingStrategySection = ({ isGlobalPricing, setIsGlobalPricing }) => (
  <div className="space-y-4">
    <div className="flex items-center space-x-2">
      <Settings className="h-5 w-5 text-blue-600" />
      <h3 className="text-lg font-medium text-gray-900">Pricing Strategy</h3>
    </div>

    <div className="bg-gray-50 p-4 rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isGlobalPricing}
              onChange={(e) => setIsGlobalPricing(e.target.checked)}
              className="sr-only"
            />
            <div
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isGlobalPricing ? 'bg-violet-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isGlobalPricing ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </div>
            <span className="ml-3 text-sm font-medium text-gray-900">
              {isGlobalPricing ? 'Global Pricing' : 'Room-Specific Pricing'}
            </span>
          </label>
        </div>
      </div>
      <p className="mt-2 text-xs text-gray-600">
        {isGlobalPricing ? 'Apply the same pricing to all room types' : 'Set different pricing for each room type'}
      </p>
    </div>
  </div>
);

// Global Pricing Section Component
const GlobalPricingSection = ({ pricingMode, setPricingMode, flatPrice, setFlatPrice, percentAdj, setPercentAdj, kind, errors, onFieldChange }) => (
  <div className="space-y-4">
    <div className="flex items-center space-x-2">
      <IndianRupee className="h-5 w-5 text-orange-600" />
      <h3 className="text-lg font-medium text-gray-900">Global Pricing</h3>
    </div>

    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Pricing Mode *</label>
        <div className="flex space-x-4">
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              value="flat"
              checked={pricingMode === 'flat'}
              onChange={(e) => setPricingMode(e.target.value)}
              className="mr-2 text-violet-600 focus:ring-violet-500"
            />
            <span className="text-sm">Set Fixed Price</span>
          </label>
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              value="percent"
              checked={pricingMode === 'percent'}
              onChange={(e) => setPricingMode(e.target.value)}
              className="mr-2 text-violet-600 focus:ring-violet-500"
            />
            <span className="text-sm">Percentage Adjustment</span>
          </label>
        </div>
      </div>

      {pricingMode === 'flat' ? (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fixed Price (₹) *</label>
          <input
            type="number"
            value={flatPrice}
            onChange={(e) => {
              setFlatPrice(e.target.value);
              onFieldChange('globalFlatPrice', e.target.value);
            }}
            placeholder="e.g., 5999"
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
              errors.globalFlatPrice 
                ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                : 'border-gray-300 focus:ring-violet-500 focus:border-violet-500'
            }`}
            min="100"
            max="1000000"
            step="1"
          />
          {errors.globalFlatPrice && (
            <div className="mt-1 flex items-center space-x-1 text-red-600 text-xs">
              <AlertTriangle className="h-3 w-3" />
              <span>{errors.globalFlatPrice}</span>
            </div>
          )}
        </div>
      ) : (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {kind === 'offer' ? 'Discount Percentage (%) *' : 'Premium Percentage (%) *'}
          </label>
          <div className="relative">
            <input
              type="number"
              value={percentAdj}
              onChange={(e) => {
                setPercentAdj(e.target.value);
                onFieldChange('globalPercentAdj', e.target.value);
              }}
              placeholder={kind === 'offer' ? 'e.g., 15 for 15% discount' : 'e.g., 25 for 25% premium'}
              className={`w-full px-3 py-2 pr-12 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                errors.globalPercentAdj 
                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                  : kind === 'offer'
                  ? 'border-green-300 focus:ring-green-500 focus:border-green-500'
                  : 'border-red-300 focus:ring-red-500 focus:border-red-500'
              }`}
              min="0.1"
              max="100"
              step="0.1"
            />
            <div
              className={`absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-sm font-medium ${
                kind === 'offer' ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {kind === 'offer' ? '-' : '+'}%
            </div>
          </div>
          {errors.globalPercentAdj && (
            <div className="mt-1 flex items-center space-x-1 text-red-600 text-xs">
              <AlertTriangle className="h-3 w-3" />
              <span>{errors.globalPercentAdj}</span>
            </div>
          )}
          <p className="text-xs text-gray-500 mt-1">
            {kind === 'offer' 
              ? 'Enter discount amount (e.g., 15 for 15% off)' 
              : 'Enter premium amount (e.g., 25 for 25% increase)'
            }
          </p>
        </div>
      )}
    </div>
  </div>
);

// Room-Specific Pricing Section Component
const RoomSpecificPricingSection = ({ rows, updateRow, kind, errors }) => (
  <div className="space-y-4">
    <div className="flex items-center space-x-2">
      <Home className="h-5 w-5 text-blue-600" />
      <h3 className="text-lg font-medium text-gray-900">Room-Specific Pricing</h3>
    </div>

    {errors.roomRows && (
      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <span className="text-sm text-red-800">{errors.roomRows}</span>
        </div>
      </div>
    )}

    <div className="space-y-4">
      {rows.length === 0 ? (
        <div className="p-4 bg-gray-50 rounded-lg text-center">
          <p className="text-gray-500 text-sm">No room types available</p>
        </div>
      ) : (
        rows.map((setting, index) => (
          <div
            key={setting.propertyRoomTypeId}
            className={`border rounded-lg p-4 transition-colors ${
              setting.IsToggleActive ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className={`font-medium ${setting.IsToggleActive ? 'text-gray-900' : 'text-gray-500'}`}>
                {setting.name}
              </h4>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={setting.IsToggleActive}
                  onChange={(e) => updateRow(index, 'IsToggleActive', e.target.checked)}
                  className="mr-2 text-violet-600 focus:ring-violet-500"
                />
                <span className="text-sm text-gray-700">Active</span>
              </label>
            </div>
            
            {setting.IsToggleActive && (
              <div className="space-y-3">
                <div className="flex space-x-4">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      value="flat"
                      checked={setting.pricingMode === 'flat'}
                      onChange={(e) => updateRow(index, 'pricingMode', e.target.value)}
                      className="mr-2 text-violet-600 focus:ring-violet-500"
                    />
                    <span className="text-sm">Fixed Price</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      value="percent"
                      checked={setting.pricingMode === 'percent'}
                      onChange={(e) => updateRow(index, 'pricingMode', e.target.value)}
                      className="mr-2 text-violet-600 focus:ring-violet-500"
                    />
                    <span className="text-sm">Percentage</span>
                  </label>
                </div>
                
                {setting.pricingMode === 'flat' ? (
                  <div>
                    <input
                      type="number"
                      value={setting.flatPrice}
                      onChange={(e) => updateRow(index, 'flatPrice', e.target.value)}
                      placeholder="Fixed price (₹)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                      min="100"
                      max="1000000"
                      step="1"
                    />
                    <p className="text-xs text-gray-500 mt-1">Minimum ₹100</p>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="number"
                      value={setting.percentAdj}
                      onChange={(e) => updateRow(index, 'percentAdj', e.target.value)}
                      placeholder={kind === 'offer' ? 'e.g., 20 for 20% off' : 'e.g., 30 for 30% premium'}
                      className={`w-full px-3 py-2 pr-12 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                        kind === 'offer'
                          ? 'border-green-300 focus:ring-green-500 focus:border-green-500'
                          : 'border-red-300 focus:ring-red-500 focus:border-red-500'
                      }`}
                      min="0.1"
                      max="100"
                      step="0.1"
                    />
                    <div
                      className={`absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-sm font-medium ${
                        kind === 'offer' ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {kind === 'offer' ? '-' : '+'}%
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  </div>
);


// Sticky Footer Component
const StickyFooter = ({ isSubmitting, submitError, submitSuccess, onSubmit, onClose, hasErrors, disabled }) => (
  <div className="px-6 py-4 border-t border-gray-200 bg-white rounded-b-2xl flex-shrink-0">
    <div>
      {(submitError || submitSuccess) && (
        <div className="mb-4">
          {submitError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span className="text-sm text-red-800">{submitError}</span>
              </div>
            </div>
          )}
          {submitSuccess && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-800">Special rate applied successfully!</span>
              </div>
            </div>
          )}
        </div>
      )}
      <div className="text-sm text-gray-500">
        {hasErrors && (
          <div className="flex items-center space-x-2 text-red-600">
            <AlertTriangle className="h-4 w-4" />
            <span>Please fix validation errors</span>
          </div>
        )}
      </div>
      <div className="flex space-x-3">
        <button
          onClick={onClose}
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          onClick={onSubmit}
          disabled={isSubmitting || hasErrors || disabled}
          className="px-4 py-2 text-sm font-medium text-white bg-violet-600 border border-transparent rounded-lg hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Creating...</span>
            </>
          ) : (
            <>
              <Target className="h-4 w-4" />
              <span>Create Special Rate</span>
            </>
          )}
        </button>
      </div>
    </div>
    <div className="mt-2 text-xs text-gray-400 text-center">
      * Required fields
    </div>
  </div>
);

export default SpecialRateModal;