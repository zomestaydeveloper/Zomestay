import React, { useState } from 'react';
import { X, Calendar, Users, Home, ChevronDown, ChevronUp, Minus, Plus } from 'lucide-react';
import DateRangePicker from './DateRangePicker';
import { useSearch } from '../context/SearchContext';

const MobileSearchModal = ({ 
  isOpen, 
  onClose, 
  searchParams,
  onUpdateSearchParams 
}) => {
  const { handleSearch: contextHandleSearch } = useSearch();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showGuestControls, setShowGuestControls] = useState(false);
  const [showRoomControls, setShowRoomControls] = useState(false);

  const handleDateSelect = ({ checkIn, checkOut }) => {
    onUpdateSearchParams({
      checkIn: checkIn ? checkIn.toISOString().split('T')[0] : "",
      checkOut: checkOut ? checkOut.toISOString().split('T')[0] : ""
    });
  };

  const handleDatePickerClose = () => {
    setShowDatePicker(false);
  };

  const handleGuestChange = (type, delta) => {
    const current = searchParams[type] || (type === 'adults' ? 2 : 0);
    const newValue = Math.max(type === 'adults' ? 1 : 0, current + delta);
    onUpdateSearchParams({ [type]: newValue });
  };

  const handleRoomChange = (delta) => {
    const current = searchParams.rooms || 1;
    const newValue = Math.max(1, current + delta);
    onUpdateSearchParams({ rooms: newValue });
  };

  const handleSearch = () => {
    // Same validation as desktop search
    if (!searchParams.checkIn || !searchParams.checkOut) {
      // You can add error handling here if needed
      return;
    }
    
    // Use the same search context as desktop
    contextHandleSearch(searchParams);
    
    // Scroll to results section (same as desktop)
    const resultsSection = document.getElementById('search-results');
    if (resultsSection) {
      resultsSection.scrollIntoView({ behavior: 'smooth' });
    }
    
    // Close modal
    onClose();
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Add date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatGuests = () => {
    const adults = searchParams.adults || 2;
    const children = searchParams.children || 0;
    return `${adults} Adults, ${children} Children`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-xl shadow-lg max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Search Properties</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} className="text-gray-600" />
          </button>
        </div>

        {/* Booking Form */}
        <div className="p-4 space-y-4">
          
          {/* Date Fields Row */}
          <div className="grid grid-cols-2 gap-3">
            {/* Check-in */}
            <div className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 transition-colors"
                 onClick={() => setShowDatePicker(true)}>
              <Calendar size={20} className="text-gray-500 mr-2" />
              <div>
                <p className="text-xs text-gray-500">Check-in</p>
                <p className="font-medium text-gray-800">
                  {formatDate(searchParams.checkIn)}
                </p>
              </div>
            </div>

            {/* Check-out */}
            <div className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 transition-colors"
                 onClick={() => setShowDatePicker(true)}>
              <Calendar size={20} className="text-gray-500 mr-2" />
              <div>
                <p className="text-xs text-gray-500">Check-out</p>
                <p className="font-medium text-gray-800">
                  {formatDate(searchParams.checkOut)}
                </p>
              </div>
            </div>
          </div>

          {/* Guests Field */}
          <div className="flex items-center justify-between p-3 border border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 transition-colors"
               onClick={() => setShowGuestControls(!showGuestControls)}>
            <div className="flex items-center">
              <Users size={20} className="text-gray-500 mr-2" />
              <div>
                <p className="text-xs text-gray-500">Guests</p>
                <p className="font-medium text-gray-800">{formatGuests()}</p>
              </div>
            </div>
            {showGuestControls ? <ChevronUp size={20} className="text-gray-500" /> : <ChevronDown size={20} className="text-gray-500" />}
          </div>

          {/* Guest Controls (Inline) */}
          {showGuestControls && (
            <div className="p-4 border border-gray-200 rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Adults</p>
                  <p className="text-sm text-gray-500">Age 13 years and more</p>
                </div>
                <div className="flex items-center space-x-3">
                  <button onClick={() => handleGuestChange('adults', -1)} 
                          className="w-8 h-8 rounded-full text-gray-600 border border-gray-300 flex items-center justify-center hover:bg-gray-100">
                    <Minus size={16} />
                  </button>
                  <span className="w-6 text-center font-medium">{searchParams.adults || 2}</span>
                  <button onClick={() => handleGuestChange('adults', 1)} 
                          className="w-8 h-8 rounded-full text-gray-600 border border-gray-300 flex items-center justify-center hover:bg-gray-100">
                    <Plus size={16} />
                  </button>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Children</p>
                  <p className="text-sm text-gray-500">Age 3-12 years</p>
                </div>
                <div className="flex items-center space-x-3">
                  <button onClick={() => handleGuestChange('children', -1)} 
                          className="w-8 h-8 rounded-full text-gray-600 border border-gray-300 flex items-center justify-center hover:bg-gray-100">
                    <Minus size={16} />
                  </button>
                  <span className="w-6 text-center font-medium">{searchParams.children || 0}</span>
                  <button onClick={() => handleGuestChange('children', 1)} 
                          className="w-8 h-8 rounded-full text-gray-600 border border-gray-300 flex items-center justify-center hover:bg-gray-100">
                    <Plus size={16} />
                  </button>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Infants</p>
                  <p className="text-sm text-gray-500">Age 0-2 years</p>
                </div>
                <div className="flex items-center space-x-3">
                  <button onClick={() => handleGuestChange('infants', -1)} 
                          className="w-8 h-8 rounded-full border text-gray-600 border-gray-300 flex items-center justify-center hover:bg-gray-100">
                    <Minus size={16} />
                  </button>
                  <span className="w-6 text-center font-medium">{searchParams.infants || 0}</span>
                  <button onClick={() => handleGuestChange('infants', 1)} 
                          className="w-8 h-8 rounded-full border text-gray-600 border-gray-300 flex items-center justify-center hover:bg-gray-100">
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Rooms Field */}
          <div className="flex items-center justify-between p-3 border border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 transition-colors"
               onClick={() => setShowRoomControls(!showRoomControls)}>
            <div className="flex items-center">
              <Home size={20} className="text-gray-500 mr-2" />
              <div>
                <p className="text-xs text-gray-500">No. of Rooms</p>
                <p className="font-medium text-gray-800">{searchParams.rooms || 1} Room{(searchParams.rooms || 1) > 1 ? 's' : ''}</p>
              </div>
            </div>
            {showRoomControls ? <ChevronUp size={20} className="text-gray-500" /> : <ChevronDown size={20} className="text-gray-500" />}
          </div>

          {/* Room Controls (Inline) */}
          {showRoomControls && (
            <div className="p-4 border border-gray-200 rounded-lg flex items-center justify-between">
              <p className="font-medium">Rooms</p>
              <div className="flex items-center space-x-3">
                <button onClick={() => handleRoomChange(-1)} 
                        className="w-8 h-8 rounded-full text-gray-600 border border-gray-300 flex items-center justify-center hover:bg-gray-100">
                  <Minus size={16} />
                </button>
                <span className="w-6 text-center font-medium">{searchParams.rooms || 1}</span>
                <button onClick={() => handleRoomChange(1)} 
                        className="w-8 h-8 rounded-full text-gray-600 border border-gray-300 flex items-center justify-center hover:bg-gray-100">
                  <Plus size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Book Now Button */}
          <button
            onClick={handleSearch}
            disabled={!searchParams.checkIn || !searchParams.checkOut}
            className="w-full bg-[#004AAD] text-white py-4 rounded-lg font-semibold text-lg hover:bg-[#003080] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Book Now
          </button>
          
          <button
            onClick={() => {/* Handle contact us */}}
            className="w-full mt-2 text-center text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            CONTACT US
          </button>
        </div>
      </div>

      {/* Date Range Picker Modal */}
      <DateRangePicker
        isOpen={showDatePicker}
        onClose={handleDatePickerClose}
        onDateSelect={handleDateSelect}
        selectedDates={{
          checkIn: searchParams.checkIn ? new Date(searchParams.checkIn) : null,
          checkOut: searchParams.checkOut ? new Date(searchParams.checkOut) : null
        }}
      />
    </div>
  );
};

export default MobileSearchModal;
