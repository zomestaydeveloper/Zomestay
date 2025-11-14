import React, { useState, useEffect, useCallback } from 'react';
import { Target, CalendarDays, IndianRupee, AlertTriangle, Eye, X, Check, Home, Settings, Zap } from 'lucide-react';
import { specialRateService } from '../services/';

const SpecialRateModal = ({ isOpen, onClose, availabilityData, propertyId, onApplied, }) => {

  
  // State management
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [kind, setKind] = useState('offer');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [isGlobalPricing, setIsGlobalPricing] = useState(true);
  
  // Global pricing states
  const [globalPricingMode, setGlobalPricingMode] = useState('flat');
  const [globalFlatPrice, setGlobalFlatPrice] = useState('');
  const [globalPercentAdj, setGlobalPercentAdj] = useState('');
  
  // Room-specific pricing states
  const [roomTypeSettings, setRoomTypeSettings] = useState([]);
  
  const [conflictPolicy, setConflictPolicy] = useState('override');
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Helper functions
  const getRoomTypesFromData = (calendarData) => {
    console.log('calendarData', calendarData);
    if (!calendarData) return [];
    const roomTypeSet = new Set();
    Object.values(calendarData).forEach(dateData => {
      Object.keys(dateData).forEach(roomType => roomTypeSet.add(roomType));
    });
    return Array.from(roomTypeSet);
  };


  const computeAfterPrice = useCallback((basePrice, mode, flatValue, percentValue, rateKind = kind) => {
    if (!basePrice || basePrice === '—') return '—';
    
    const base = parseFloat(basePrice);
    if (isNaN(base)) return '—';
    
    let afterPrice = base;
    if (mode === 'flat') {
      afterPrice = parseFloat(flatValue) || 0;
    } else if (mode === 'percent') {
      let percent = parseFloat(percentValue) || 0;
      // Auto-apply correct sign based on rate type
      if (rateKind === 'offer') {
        percent = -Math.abs(percent); // Always negative for offers
      } else {
        percent = Math.abs(percent); // Always positive for peak
      }
      afterPrice = base * (1 + percent / 100);
    }
    
    return Math.round(afterPrice);
  }, [kind]);

  const generateDateRange = (startDate, endDate) => {
    const dates = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(new Date(d));
    }
    
    return dates;
  };

  // Initialize room type settings when switching to room-specific pricing
  useEffect(() => {
    if (!isGlobalPricing && roomTypeSettings.length === 0) {
      const roomTypes = getRoomTypesFromData(availabilityData?.calendar);

      console.log("roomTypes",roomTypes)
      const initialSettings = roomTypes.map(roomType => ({
        roomType,
        propertyRoomTypeId: roomType.propertyRoomTypeId, // You might need to map this properly
        isActive: true,
        pricingMode: 'flat',
        flatPrice: '',
        percentAdj: ''
      }));
      setRoomTypeSettings(initialSettings);
    }
  }, [isGlobalPricing, availabilityData, roomTypeSettings.length]);

  // Update room type setting
  const updateRoomTypeSetting = (index, field, value) => {
    setRoomTypeSettings(prev => prev.map((setting, i) => 
      i === index ? { ...setting, [field]: value } : setting
    ));
  };

  const buildPreview = useCallback(() => {
    if (!dateFrom || !dateTo || !availabilityData?.calendar) {
      setPreviewData([]);
      return;
    }

    const dates = generateDateRange(dateFrom, dateTo);
    const preview = [];
    
    dates.forEach(date => {
      const dateKey = date.toISOString().split('T')[0];
      const dayData = availabilityData.calendar[dateKey];
      
      if (!dayData) return;
      
      if (isGlobalPricing) {
        // Global pricing for all room types
        const roomTypes = getRoomTypesFromData(availabilityData.calendar);
        roomTypes.forEach(roomType => {
          const roomData = dayData[roomType];
          if (!roomData) return;
          
          const basePrice = roomData.basePrice;
          const afterPrice = computeAfterPrice(basePrice, globalPricingMode, globalFlatPrice, globalPercentAdj, kind);
          const hasConflict = roomData.overridePrice || roomData.ratePrice;
          
          preview.push({
            date: dateKey,
            dateDisplay: date.toLocaleDateString(),
            roomType,
            before: basePrice || '—',
            after: afterPrice,
            conflict: hasConflict,
            delta: basePrice && afterPrice !== '—' ? afterPrice - parseFloat(basePrice) : 0,
            pricingType: 'Global'
          });
        });
      } else {
        // Room-specific pricing
        roomTypeSettings.filter(setting => setting.isActive).forEach(setting => {
          const roomData = dayData[setting.roomType];
          if (!roomData) return;
          
          const basePrice = roomData.basePrice;
          const afterPrice = computeAfterPrice(
            basePrice, 
            setting.pricingMode, 
            setting.flatPrice, 
            setting.percentAdj,
            kind
          );
          const hasConflict = roomData.overridePrice || roomData.ratePrice;
          
          preview.push({
            date: dateKey,
            dateDisplay: date.toLocaleDateString(),
            roomType: setting.roomType,
            before: basePrice || '—',
            after: afterPrice,
            conflict: hasConflict,
            delta: basePrice && afterPrice !== '—' ? afterPrice - parseFloat(basePrice) : 0,
            pricingType: `${setting.pricingMode} (${setting.pricingMode === 'flat' ? `₹${setting.flatPrice}` : `${setting.percentAdj}%`})`
          });
        });
      }
    });
    
    setPreviewData(preview);
  }, [dateFrom, dateTo, isGlobalPricing, globalPricingMode, globalFlatPrice, globalPercentAdj, roomTypeSettings, availabilityData, computeAfterPrice, kind]);

  const resetForm = useCallback(() => {
    setName('');
    setDescription('');
    setKind('offer');
    setDateFrom('');
    setDateTo('');
    setIsGlobalPricing(true);
    setGlobalPricingMode('flat');
    setGlobalFlatPrice('');
    setGlobalPercentAdj('');
    setRoomTypeSettings([]);
    setConflictPolicy('override');
    setShowPreview(false);
    setPreviewData([]);
    setSubmitError('');
    setSubmitSuccess(false);
  }, []);

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    setSubmitError('');
    
    try {
      let payload = {
        name,
        description,
        kind,
        propertyId,
        dateFrom,
        dateTo,
        conflictPolicy
      };

      if (isGlobalPricing) {
        // Global pricing
        let percentValue = null;
        if (globalPricingMode === 'percent') {
          let percent = parseFloat(globalPercentAdj) || 0;
          // Auto-apply correct sign based on rate type
          percentValue = kind === 'offer' ? -Math.abs(percent) : Math.abs(percent);
        }
        
        payload = {
          ...payload,
          pricingMode: globalPricingMode,
          flatPrice: globalPricingMode === 'flat' ? parseFloat(globalFlatPrice) : null,
          percentAdj: percentValue
        };
      } else {
        // Room-specific pricing - send only active room types with individual pricing
        const activeRoomTypes = roomTypeSettings.filter(setting => setting.isActive);

        console.log("activeRoomTypes",activeRoomTypes)
        payload = {
          ...payload,
          roomTypeLinks: activeRoomTypes.map(setting => {
            let percentValue = null;
            if (setting.pricingMode === 'percent') {
              let percent = parseFloat(setting.percentAdj) || 0;
              // Auto-apply correct sign based on rate type
              percentValue = kind === 'offer' ? -Math.abs(percent) : Math.abs(percent);
            }
            
            return {
              propertyRoomTypeId: setting.propertyRoomTypeId,
              pricingMode: setting.pricingMode,
              flatPrice: setting.pricingMode === 'flat' ? parseFloat(setting.flatPrice) : null,
              percentAdj: percentValue,
              isActive: true
            };
          })
        };
      }

      const response = await specialRateService.createSpecialRate(propertyId, payload);    
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setSubmitSuccess(true);
        setTimeout(() => {
          onApplied();
          onClose();
          resetForm();
        }, 1500);
      } else {
        throw new Error(result.message || 'Failed to apply special rates');
      }
    } catch (error) {
      setSubmitError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }, [name, description, kind, propertyId, dateFrom, dateTo, conflictPolicy, isGlobalPricing, globalPricingMode, globalFlatPrice, globalPercentAdj, roomTypeSettings, onApplied, onClose, resetForm]);


 

   useEffect(()=>{
    handleGetroomtypes()
   },[])
  // Initialize default values when modal opens
  useEffect(() => {
    if (isOpen) {
      const today = new Date();
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);
      setDateFrom(today.toISOString().split('T')[0]);
      setDateTo(nextWeek.toISOString().split('T')[0]);
    }
  }, [isOpen]);

  // Update preview when relevant fields change
  useEffect(() => {
    if (showPreview) {
      buildPreview();
    }
  }, [showPreview, buildPreview]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-7xl w-full h-[95vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-white rounded-t-2xl flex-shrink-0">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-violet-100 rounded-lg">
                <Target className="h-6 w-6 text-violet-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Special Rate Management</h2>
                <p className="text-sm text-gray-500">Create offers and peak pricing for your property</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column - Controls */}
              <div className="space-y-6">
                {/* Basic Info Section */}
                <BasicInfoSection 
                  name={name}
                  setName={setName}
                  description={description}
                  setDescription={setDescription}
                  kind={kind}
                  setKind={setKind}
                />

                {/* Dates Section */}
                <DatesSection 
                  dateFrom={dateFrom}
                  setDateFrom={setDateFrom}
                  dateTo={dateTo}
                  setDateTo={setDateTo}
                />

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
                  />
                )}

                {/* Room-Specific Pricing Section */}
                {!isGlobalPricing && (
                  <RoomSpecificPricingSection 
                    roomTypeSettings={roomTypeSettings}
                    updateRoomTypeSetting={updateRoomTypeSetting}
                    kind={kind}
                  />
                )}
              </div>

              {/* Right Column - Preview */}
              <PreviewSection 
                showPreview={showPreview}
                setShowPreview={setShowPreview}
                buildPreview={buildPreview}
                previewData={previewData}
                conflictPolicy={conflictPolicy}
                setConflictPolicy={setConflictPolicy}
                kind={kind}
              />
            </div>
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="flex-shrink-0 rounded-b-2xl">
          <StickyFooter 
            showPreview={showPreview}
            previewData={previewData}
            isSubmitting={isSubmitting}
            submitError={submitError}
            submitSuccess={submitSuccess}
            onSubmit={handleSubmit}
            onClose={onClose}
          />
        </div>
      </div>
    </div>
  );
};

// Basic Info Section Component
const BasicInfoSection = ({ name, setName, description, setDescription, kind, setKind }) => (
  <div className="space-y-4">
    <div className="flex items-center space-x-2">
      <Target className="h-5 w-5 text-violet-600" />
      <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
    </div>
    
    <div className="space-y-4">
      {/* Rate Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Rate Type</label>
        <div className="flex space-x-4">
          <label className="flex items-center">
            <input
              type="radio"
              value="offer"
              checked={kind === 'offer'}
              onChange={(e) => setKind(e.target.value)}
              className="mr-2 text-green-600 focus:ring-green-500"
            />
            <span className="text-sm flex items-center">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              Offer (Discount)
            </span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value="peak"
              checked={kind === 'peak'}
              onChange={(e) => setKind(e.target.value)}
              className="mr-2 text-red-600 focus:ring-red-500"
            />
            <span className="text-sm flex items-center">
              <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
              Peak (Premium)
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
          onChange={(e) => setName(e.target.value)}
          placeholder={kind === 'offer' ? "e.g., Diwali Special, Early Bird" : "e.g., Weekend Premium, Festival Rush"}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
          required
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={kind === 'offer' ? "Describe your offer details..." : "Describe peak pricing reason..."}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 resize-none"
        />
      </div>
    </div>
  </div>
);

// Dates Section Component
const DatesSection = ({ dateFrom, setDateFrom, dateTo, setDateTo }) => (
  <div className="space-y-4">
    <div className="flex items-center space-x-2">
      <CalendarDays className="h-5 w-5 text-green-600" />
      <h3 className="text-lg font-medium text-gray-900">Date Range</h3>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">From Date *</label>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">To Date *</label>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
          required
        />
      </div>
    </div>
  </div>
);

// Pricing Strategy Section
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
            <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              isGlobalPricing ? 'bg-violet-600' : 'bg-gray-300'
            }`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isGlobalPricing ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </div>
            <span className="ml-3 text-sm font-medium text-gray-900">
              {isGlobalPricing ? 'Global Pricing' : 'Room-Specific Pricing'}
            </span>
          </label>
        </div>
      </div>
      <p className="mt-2 text-xs text-gray-600">
        {isGlobalPricing 
          ? 'Apply the same pricing to all room types' 
          : 'Set different pricing for each room type'
        }
      </p>
    </div>
  </div>
);

// Global Pricing Section
const GlobalPricingSection = ({ pricingMode, setPricingMode, flatPrice, setFlatPrice, percentAdj, setPercentAdj, kind }) => (
  <div className="space-y-4">
    <div className="flex items-center space-x-2">
      <IndianRupee className="h-5 w-5 text-orange-600" />
      <h3 className="text-lg font-medium text-gray-900">Global Pricing</h3>
    </div>
    
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Pricing Mode</label>
        <div className="flex space-x-4">
          <label className="flex items-center">
            <input
              type="radio"
              value="flat"
              checked={pricingMode === 'flat'}
              onChange={(e) => setPricingMode(e.target.value)}
              className="mr-2 text-violet-600 focus:ring-violet-500"
            />
            <span className="text-sm">Set Fixed Price</span>
          </label>
          <label className="flex items-center">
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
            onChange={(e) => setFlatPrice(e.target.value)}
            placeholder="e.g., 5999"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
            min="0"
            required
          />
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
              onChange={(e) => setPercentAdj(e.target.value)}
              placeholder={kind === 'offer' ? "e.g., 15 for 15% discount" : "e.g., 25 for 25% premium"}
              className={`w-full px-3 py-2 pr-12 border rounded-lg focus:outline-none focus:ring-2 ${
                kind === 'offer' 
                  ? 'border-green-300 focus:ring-green-500 focus:border-green-500' 
                  : 'border-red-300 focus:ring-red-500 focus:border-red-500'
              }`}
              min="0"
              max="100"
              required
            />
            <div className={`absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-sm font-medium ${
              kind === 'offer' ? 'text-green-600' : 'text-red-600'
            }`}>
              {kind === 'offer' ? '-' : '+'}%
            </div>
          </div>
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

// Room-Specific Pricing Section
const RoomSpecificPricingSection = ({ roomTypeSettings, updateRoomTypeSetting, kind }) => (
  <div className="space-y-4">
    <div className="flex items-center space-x-2">
      <Home className="h-5 w-5 text-blue-600" />
      <h3 className="text-lg font-medium text-gray-900">Room-Specific Pricing</h3>
    </div>
    
    <div className="space-y-4">
      {roomTypeSettings.map((setting, index) => (
        <div key={index} className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900">{setting.roomType}</h4>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={setting.isActive}
                onChange={(e) => updateRoomTypeSetting(index, 'isActive', e.target.checked)}
                className="mr-2 text-violet-600 focus:ring-violet-500"
              />
              <span className="text-sm text-gray-700">Active</span>
            </label>
          </div>
          
          {setting.isActive && (
            <div className="space-y-3">
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="flat"
                    checked={setting.pricingMode === 'flat'}
                    onChange={(e) => updateRoomTypeSetting(index, 'pricingMode', e.target.value)}
                    className="mr-2 text-violet-600 focus:ring-violet-500"
                  />
                  <span className="text-sm">Fixed Price</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="percent"
                    checked={setting.pricingMode === 'percent'}
                    onChange={(e) => updateRoomTypeSetting(index, 'pricingMode', e.target.value)}
                    className="mr-2 text-violet-600 focus:ring-violet-500"
                  />
                  <span className="text-sm">Percentage</span>
                </label>
              </div>
              
              {setting.pricingMode === 'flat' ? (
                <input
                  type="number"
                  value={setting.flatPrice}
                  onChange={(e) => updateRoomTypeSetting(index, 'flatPrice', e.target.value)}
                  placeholder="Fixed price (₹)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                  min="0"
                />
              ) : (
                <input
                  type="number"
                  value={setting.percentAdj}
                  onChange={(e) => updateRoomTypeSetting(index, 'percentAdj', e.target.value)}
                  placeholder={kind === 'offer' ? "e.g., 20 for 20% off" : "e.g., 30 for 30% premium"}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                  min="0"
                  max="100"
                />
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  </div>
);

// Preview Section (Enhanced)
const PreviewSection = ({ showPreview, setShowPreview, buildPreview, previewData, conflictPolicy, setConflictPolicy, kind }) => {
  const conflictCount = previewData.filter(row => row.conflict).length;
  const totalRows = previewData.length;
  const avgDelta = totalRows > 0 ? previewData.reduce((sum, row) => sum + (row.delta || 0), 0) / totalRows : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Eye className="h-5 w-5 text-orange-600" />
          <h3 className="text-lg font-medium text-gray-900">Preview</h3>
        </div>
        <button
          onClick={() => {
            setShowPreview(!showPreview);
            if (!showPreview) buildPreview();
          }}
          className="px-4 py-2 text-sm font-medium text-orange-700 bg-orange-100 rounded-lg hover:bg-orange-200 transition-colors"
        >
          {showPreview ? 'Hide Preview' : 'Show Preview'}
        </button>
      </div>

      {showPreview && (
        <div className="space-y-4">
          {/* Enhanced Summary Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="text-sm text-blue-600 font-medium">Total Changes</div>
              <div className="text-lg font-semibold text-blue-900">{totalRows}</div>
            </div>
            <div className="bg-orange-50 p-3 rounded-lg">
              <div className="text-sm text-orange-600 font-medium">Conflicts</div>
              <div className="text-lg font-semibold text-orange-900">{conflictCount}</div>
            </div>
            <div className={`p-3 rounded-lg ${avgDelta >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
              <div className={`text-sm font-medium ${avgDelta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                Avg {kind === 'offer' ? 'Savings' : 'Premium'}
              </div>
              <div className={`text-lg font-semibold ${avgDelta >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                ₹{Math.abs(avgDelta).toFixed(0)}
              </div>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg">
              <div className="text-sm text-purple-600 font-medium">Type</div>
              <div className="text-lg font-semibold text-purple-900 capitalize">{kind}</div>
            </div>
          </div>

          {/* Conflict Policy */}
          {conflictCount > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-800">Conflicts Detected</span>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Conflict Policy</label>
                <select
                  value={conflictPolicy}
                  onChange={(e) => setConflictPolicy(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                >
                  <option value="override">Override existing rates</option>
                  <option value="skip">Skip conflicting dates</option>
                  <option value="keepHigher">Keep higher rate</option>
                </select>
              </div>
            </div>
          )}

          {/* Enhanced Preview Table */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Date</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Room Type</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-700">Current Price</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-700">New Price</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-700">Change</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-700">Pricing</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {previewData.slice(0, 50).map((row, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-900 text-sm">{row.dateDisplay}</td>
                      <td className="px-3 py-2 text-gray-700 text-sm font-medium">{row.roomType}</td>
                      <td className="px-3 py-2 text-right text-gray-900 font-medium">
                        {row.before !== '—' ? `₹${Number(row.before).toLocaleString()}` : '—'}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-gray-900">
                        {row.after !== '—' ? `₹${Number(row.after).toLocaleString()}` : '—'}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {row.delta !== 0 && row.delta ? (
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            row.delta > 0 
                              ? (kind === 'peak' ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800')
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {row.delta > 0 ? '+' : ''}₹{Math.round(row.delta)}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">No change</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className="text-xs text-gray-600">{row.pricingType}</span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        {row.conflict ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Conflict
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            OK
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {previewData.length > 50 && (
                <div className="p-3 text-center text-sm text-gray-500 bg-gray-50">
                  Showing first 50 of {previewData.length} rows
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Enhanced Sticky Footer
const StickyFooter = ({ showPreview, previewData, isSubmitting, submitError, submitSuccess, onSubmit, onClose }) => (
  <div className="px-6 py-4 border-t border-gray-200 bg-white">
    {submitError && (
      <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <span className="text-sm text-red-800">{submitError}</span>
        </div>
      </div>
    )}

    {submitSuccess && (
      <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center space-x-2">
          <Check className="h-4 w-4 text-green-600" />
          <span className="text-sm text-green-800">Special rates applied successfully!</span>
        </div>
      </div>
    )}

    <div className="flex justify-between items-center">
      <div className="text-sm text-gray-500">
        {showPreview && previewData.length > 0 && (
          <div className="flex items-center space-x-4">
            <span>Ready to apply rates to {previewData.length} date/room combinations</span>
            {previewData.some(row => row.delta !== 0) && (
              <span className="flex items-center">
                <Zap className="h-4 w-4 mr-1 text-yellow-500" />
                Changes detected
              </span>
            )}
          </div>
        )}
      </div>
      <div className="flex space-x-3">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 transition-colors"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          onClick={onSubmit}
          disabled={!showPreview || previewData.length === 0 || isSubmitting}
          className="px-4 py-2 text-sm font-medium text-white bg-violet-600 border border-transparent rounded-lg hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Applying...</span>
            </>
          ) : (
            <>
              <Target className="h-4 w-4" />
              <span>Apply Special Rates</span>
            </>
          )}
        </button>
      </div>
    </div>
    <div className="mt-2 text-xs text-gray-400 text-center">
      Press Esc to close • Ctrl+Enter to apply
    </div>
  </div>
);

export default SpecialRateModal;