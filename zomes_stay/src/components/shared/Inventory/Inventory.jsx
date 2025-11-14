import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Home, Target, Calendar, X } from 'lucide-react';
import SpecialRateModal from '../../../components/SpecialRateModal';
import AddRoomModal from '../../../components/AddRoomModal';
import NotificationModal from '../../../components/NotificationModal';
import {propertyService,propertyRoomTypeService,roomtypeMealPlanService,dailyRateService} from '../../../services';
import { useSelector } from 'react-redux';


const PMSInventory = ({ isAdmin = false, adminProperty = null, propertyId = null }) => {
  const navigate = useNavigate();

  // Dynamic route generation based on context
  const getRoutes = () => {
    if (isAdmin) {
      return {
        addRatePlan: '/admin/base/add-rate-plan',
        inventory: '/admin/base/inventory_management',
        back: '/admin/base/properties'
      };
    } else {
      return {
        addRatePlan: '/host/base/add-rate-plan',
        inventory: '/host/base/inventory_management',
        back: '/host/base/dashboard'
      };
    }
  };

  
  const routes = getRoutes();
  const [showSpecialRateModal, setShowSpecialRateModal] = useState(false);
  const [showAddRoomModal, setShowAddRoomModal] = useState(false);
  const [addRoomModalMode, setAddRoomModalMode] = useState('create'); // 'create' or 'edit'
  const [roomConfigurations, setRoomConfigurations] = useState([]);
  const [roomTypesMap, setRoomTypesMap] = useState([]);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [ratePlans, setRatePlans] = useState([]);
  const [appliedRatePlans, setAppliedRatePlans] = useState({});
  const [selectedDates, setSelectedDates] = useState([]);
  const [showRatePlanTooltip, setShowRatePlanTooltip] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [dateRange, setDateRange] = useState({ start: null, end: null });
  const [isSelectingRange, setIsSelectingRange] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  
  // Notification modal state
  const [notification, setNotification] = useState({
    isOpen: false,
    type: 'success',
    title: '',
    message: ''
  });
  
  // Use admin property ID if in admin mode, otherwise use Redux state
  const { property } = useSelector((state) => state.property);
  const finalPropertyId = isAdmin ? propertyId : property?.id;

  // Debug logging
  console.log("adminProperty",adminProperty)
  console.log("propertyId",propertyId)
  console.log("finalPropertyId",finalPropertyId)
  console.log("isAdmin",isAdmin)

  // Date helper functions to avoid timezone issues
  // Format date as YYYY-MM-DD without timezone conversion
  const formatDateToString = (date) => {
    if (!date) return null;
    
    // If it's already a string in YYYY-MM-DD format, return it
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return date;
    }
    
    // If it's a Date object, format it without timezone conversion
    const d = new Date(date);
    if (isNaN(d.getTime())) return null;
    
    // Use UTC methods to avoid timezone conversion
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  };

  // Create date string from year, month, day (1-indexed) without timezone issues
  const createDateString = (year, month, day) => {
    const y = String(year).padStart(4, '0');
    const m = String(month).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Parse date string (YYYY-MM-DD) to Date object at midnight UTC
  const parseDateString = (dateString) => {
    if (!dateString || typeof dateString !== 'string') return null;
    
    // If already in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      // Create date at midnight UTC to avoid timezone issues
      const [year, month, day] = dateString.split('-').map(Number);
      return new Date(Date.UTC(year, month - 1, day));
    }
    
    // Try to parse as-is
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
  };

  // Get date string from Date object (handles both local and UTC dates)
  const getDateStringFromDate = (date) => {
    if (!date) return null;
    
    // If it's a string, try to parse it
    if (typeof date === 'string') {
      return formatDateToString(parseDateString(date));
    }
    
    // If it's a Date object, check if it's already in UTC
    // We'll use the date's UTC methods to ensure consistency
    const d = new Date(date);
    if (isNaN(d.getTime())) return null;
    
    // Extract UTC components to avoid timezone conversion
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  };

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
      const response = await roomtypeMealPlanService.getPropertyRatePlans(finalPropertyId);
      
      if (response.data && response.data.data) {
        setRatePlans(response.data.data);
      } else {
        setRatePlans([]);
      }
    } catch (error) {
      console.error('Error fetching rate plans:', error);
      showNotification('error', 'Error', 'Failed to load rate plans');
      setRatePlans([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch applied rate plans for the current year
  const fetchAppliedRatePlans = async () => {
    try {
      const startDate = `${currentYear}-01-01`;
      const endDate = `${currentYear}-12-31`;
      
      const response = await dailyRateService.getRatePlanDates(finalPropertyId, startDate, endDate);
      
      if (response.data.success) {
        const ratePlanMap = {};
        response.data.data.forEach(item => {
          // Use helper function to avoid timezone conversion issues
          const dateKey = formatDateToString(item.date);
          if (dateKey) {
            ratePlanMap[dateKey] = item.ratePlan;
          }
        });
        setAppliedRatePlans(ratePlanMap);
      }
    } catch (error) {
      console.error('Error fetching applied rate plans:', error);
    }
  };

  // Apply rate plan to single date
  const applyRatePlanToDate = async (date, ratePlan) => {
    try {
      const ratePlanId = ratePlan.id || ratePlan;
      
      const response = await dailyRateService.applyRatePlanToDate({
        propertyId: finalPropertyId,
        ratePlanId,
        date
      });

      if (response.data.success) {
        showNotification('success', 'Success', 'Rate plan applied successfully');
        await fetchAppliedRatePlans(); // Refresh applied rate plans
      }
    } catch (error) {
      console.error('Error applying rate plan:', error);
      showNotification('error', 'Error', 'Failed to apply rate plan');
    }
  };

  // Apply rate plan to date range
  const applyRatePlanToDateRange = async (startDate, endDate, ratePlan) => {
    try {
      const ratePlanId = ratePlan.id || ratePlan;
      
      const response = await dailyRateService.applyRatePlanToDateRange({
        propertyId: finalPropertyId,
        ratePlanId,
        startDate,
        endDate
      });

      if (response.data.success) {
        showNotification('success', 'Success', `Rate plan applied to ${response.data.data.totalDates} dates successfully`);
        await fetchAppliedRatePlans(); // Refresh applied rate plans
      }
    } catch (error) {
      console.error('Error applying rate plan to range:', error);
      showNotification('error', 'Error', 'Failed to apply rate plan to date range');
    }
  };

  // Remove rate plan from date
  const removeRatePlanFromDate = async (date) => {
    try {
      const response = await dailyRateService.removeRatePlanFromDate({
        propertyId: finalPropertyId,
        date
      });

      if (response.data.success) {
        showNotification('success', 'Success', 'Rate plan removed successfully');
        await fetchAppliedRatePlans(); // Refresh applied rate plans
      }
    } catch (error) {
      console.error('Error removing rate plan:', error);
      showNotification('error', 'Error', 'Failed to remove rate plan');
    }
  };

  // Handle date click with range selection
  const handleDateClick = (day) => {
    if (day.isPast) return; // Don't allow past dates
    
    // Use helper function to get date string without timezone conversion
    const dateString = getDateStringFromDate(day.date);
    if (!dateString) return;
    
    // Start range selection (works for both fresh dates and dates with applied rate plans)
    // When clicking a date with an applied rate plan, directly show rate plan selection modal
    if (!dateRange.start) {
      // First date selection - start new selection
      setDateRange({ start: dateString, end: null });
      setIsSelectingRange(true);
      setSelectedDates([dateString]);
      
      // Show rate plan selection tooltip immediately (same as fresh rate application)
      setTimeout(() => {
        setShowRatePlanTooltip(true);
      }, 100);
    } else if (!dateRange.end) {
      // Second date selection - complete the range
      // Compare date strings directly (YYYY-MM-DD format is lexicographically sortable)
      let finalStart, finalEnd;
      if (dateRange.start <= dateString) {
        finalStart = dateRange.start;
        finalEnd = dateString;
      } else {
        finalStart = dateString;
        finalEnd = dateRange.start;
      }
      
      setDateRange({ start: finalStart, end: finalEnd });
      
      // Generate all dates in range immediately with the new dates
      generateDateRangeFromDates(finalStart, finalEnd);
      setIsSelectingRange(false);
      
      // Automatically show tooltip after date range selection
      setTimeout(() => {
        setShowRatePlanTooltip(true);
      }, 100);
    } else {
      // Reset and start new selection
      setDateRange({ start: dateString, end: null });
      setSelectedDates([dateString]);
      setIsSelectingRange(true);
      
      // Show rate plan selection tooltip
      setTimeout(() => {
        setShowRatePlanTooltip(true);
      }, 100);
    }
  };

  // Generate all dates in the selected range
  const generateDateRange = () => {
    if (!dateRange.start || !dateRange.end) return;
    generateDateRangeFromDates(dateRange.start, dateRange.end);
  };

  // Generate dates from specific start and end dates (YYYY-MM-DD format)
  const generateDateRangeFromDates = (startDate, endDate) => {
    const dates = [];
    
    // Parse date strings (YYYY-MM-DD format)
    const start = parseDateString(startDate);
    const end = parseDateString(endDate);
    
    // Ensure we have valid dates
    if (!start || !end) return;
    
    // Generate dates from start to end (inclusive) using UTC
    const current = new Date(start);
    const endDateObj = new Date(end);
    
    while (current <= endDateObj) {
      // Format date as YYYY-MM-DD using UTC methods
      const dateString = formatDateToString(current);
      if (dateString) {
        dates.push(dateString);
      }
      
      // Move to next day in UTC
      current.setUTCDate(current.getUTCDate() + 1);
    }
    
    setSelectedDates(dates);
  };

  // Check if date is in range
  const isDateInRange = (dateString) => {
    if (!dateRange.start || !dateRange.end) return false;
    return selectedDates.includes(dateString);
  };

  // Check if date is range start/end
  const isRangeBoundary = (dateString) => {
    return dateString === dateRange.start || dateString === dateRange.end;
  };

  // Handle range selection
  const handleRangeSelection = (startDate, endDate) => {
    if (startDate && endDate) {
      const dates = [];
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        dates.push(d.toISOString().split('T')[0]);
      }
      
      setSelectedDates(dates);
    }
  };

  // Handle rate plan selection
  const handleRatePlanSelect = async (ratePlan) => {
    try {
      if (selectedDate) {
        // Single date selection
        await applyRatePlanToDate(selectedDate, ratePlan);
      } else if (selectedDates.length > 0) {
        // Range selection
        if (selectedDates.length === 1) {
          await applyRatePlanToDate(selectedDates[0], ratePlan);
        } else {
          await applyRatePlanToDateRange(dateRange.start, dateRange.end, ratePlan);
        }
      }
      
      // Reset all states after applying rate plan
      setShowRatePlanTooltip(false);
      setSelectedDate(null);
      setSelectedDates([]);
      setDateRange({ start: null, end: null });
      setIsSelectingRange(false);
      
      // Refresh applied rate plans
      await fetchAppliedRatePlans();
    } catch (error) {
      console.error('Error applying rate plan:', error);
    }
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedDates([]);
    setDateRange({ start: null, end: null });
    setIsSelectingRange(false);
    setSelectedDate(null);
    setShowRatePlanTooltip(false);
  };

  const fetchRoomTypesMap = useCallback(async () => {
    try {
      const response = await propertyRoomTypeService.getPropertyRoomTypes(finalPropertyId);
      const data = response.data;
      if (data) {
        setRoomTypesMap(data);
      } else {
        showNotification('error', 'Error', 'Failed to load room types map');
      }
    } catch (error) {
      console.error('Error fetching room types map:', error);
      showNotification('error', 'Error', 'Failed to load room types map');
    }
  }, [finalPropertyId]);

  // Fetch room configurations to determine button state
  const fetchRoomConfigurations = useCallback(async () => {
    try {
      const response = await propertyService.getRoomConfigurations(finalPropertyId);
      if (response.data.success) {
        setRoomConfigurations(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching room configurations:', error);
    }
  }, [finalPropertyId]);

  useEffect(() => {
    if (finalPropertyId) {
      fetchRoomTypesMap();
      fetchRoomConfigurations();
      fetchBestRates();
      fetchAppliedRatePlans();
    }
  }, [fetchRoomTypesMap, fetchRoomConfigurations, currentYear, finalPropertyId]);

  // Smart button logic
  const hasExistingRooms = roomConfigurations.some(config => config.hasRooms);
  const totalExistingRooms = roomConfigurations.reduce((sum, config) => sum + (config.roomCount || 0), 0);
  const roomTypesWithRooms = roomConfigurations.filter(config => config.hasRooms).length;
  
  const smartButtonText = hasExistingRooms ? 'Update Rooms' : 'Add Room';
  const smartButtonIcon = hasExistingRooms ? Edit : Plus;
  const smartButtonMode = hasExistingRooms ? 'edit' : 'create';

  const handleSmartRoomButton = () => {
    setAddRoomModalMode(smartButtonMode);
    setShowAddRoomModal(true);
  };

  // Public holidays data (you can expand this list)
  const publicHolidays = [
    '01-01', // New Year's Day
    '01-26', // Republic Day
    '03-08', // Holi
    '04-14', // Good Friday
    '04-17', // Easter
    '05-01', // Labour Day
    '08-15', // Independence Day
    '08-19', // Raksha Bandhan
    '08-26', // Janmashtami
    '09-17', // Ganesh Chaturthi
    '10-02', // Gandhi Jayanti
    '10-12', // Dussehra
    '10-31', // Diwali
    '11-01', // Diwali
    '11-14', // Children's Day
    '12-25', // Christmas
  ];

  // Generate calendar data for the current year
  const generateYearCalendar = (year) => {
    const months = [];
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    for (let month = 0; month < 12; month++) {
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const daysInMonth = lastDay.getDate();
      const startingDayOfWeek = firstDay.getDay();

      const monthData = {
        name: monthNames[month],
        year: year,
        month: month,
        days: []
      };

      // Adjust starting day for Monday start (Sunday = 0, Monday = 1, etc.)
      const mondayStart = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1;
      
      // Add empty cells for days before the first day of the month
      for (let i = 0; i < mondayStart; i++) {
        monthData.days.push(null);
      }

      // Add days of the month
      for (let day = 1; day <= daysInMonth; day++) {
        // Create date string in YYYY-MM-DD format (consistent format)
        const dateString = createDateString(year, month + 1, day);
        // Create Date object at midnight UTC to avoid timezone issues
        const date = parseDateString(dateString);
        // Holiday check uses MM-DD format
        const holidayKey = `${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isHoliday = publicHolidays.includes(holidayKey);
        
        // Check if today (compare date strings)
        const todayDateString = formatDateToString(new Date());
        const isToday = dateString === todayDateString;
        
        // Check if weekend (0 = Sunday, 6 = Saturday)
        const dayOfWeek = date ? date.getUTCDay() : 0;
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        
        // Check if past date (compare date strings)
        const isPast = dateString < todayDateString;

        monthData.days.push({
          day,
          date,
          dateString, // Now in YYYY-MM-DD format
          holidayKey, // Keep MM-DD format for holiday checking
          isHoliday,
          isToday,
          isWeekend,
          isPast
        });
      }

      months.push(monthData);
    }

    return months;
  };

  const navigateYear = (direction) => {
    setCurrentYear(prev => prev + direction);
  };

  const yearCalendar = generateYearCalendar(currentYear);

  return (
    <div className={`${isAdmin ? 'min-h-0' : 'min-h-screen'} bg-gray-50`}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Home className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                {isAdmin ? (
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Inventory Management</h2>
                    <p className="text-sm text-gray-500">Managing: {adminProperty?.name}</p>
                  </div>
                ) : (
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Inventory Management</h2>
                    <p className="text-sm text-gray-500">Manage your property's inventory and rates</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Clear selection button - show when dates are selected */}
            {selectedDates.length > 0 && (
              <button 
                onClick={clearSelection}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-lg shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
              >
                <X className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Clear Selection</span>
              </button>
            )}
            <button 
              onClick={() => navigate(routes.addRatePlan, { 
                state: { 
                  roomTypesMap, 
                  propertyId: finalPropertyId,
                  adminProperty: isAdmin ? adminProperty : null
                } 
              })}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-violet-600 hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 transition-colors"
            >
            <Plus size={20} />
          <span className="hidden sm:inline">Add Rate</span>
            </button>
            <button 
              onClick={() => setShowSpecialRateModal(true)}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-violet-600 hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 transition-colors"
            >
              <Target className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Special Rate</span>
            </button>
            <button 
              onClick={handleSmartRoomButton}
              className={`inline-flex items-center px-4 py-2 border text-sm font-medium rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors ${
                hasExistingRooms 
                  ? 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                  : 'border-transparent text-white bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {React.createElement(smartButtonIcon, { className: "h-4 w-4 mr-2" })}
              <span className="hidden sm:inline">
                {smartButtonText}
                {hasExistingRooms && (
                  <span className="ml-1 text-xs opacity-75">
                    ({totalExistingRooms} rooms in {roomTypesWithRooms} type{roomTypesWithRooms !== 1 ? 's' : ''})
                  </span>
                )}
              </span>
            </button>
          </div>
        </div>

              </div>
              
      {/* Year Calendar */}
      <div className="px-4 sm:px-6 py-6">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          {/* Calendar Header */}
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Calendar {currentYear}</h2>
                <div className="flex items-center space-x-2">
                      <button
                onClick={() => navigateYear(-1)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                      </button>
                      <button
                onClick={() => setCurrentYear(new Date().getFullYear())}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                Today
                      </button>
                  <button
                onClick={() => navigateYear(1)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                      </button>
                    </div>
                  </div>

          {/* Calendar Grid */}
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {yearCalendar.map((month, monthIndex) => (
                <div key={monthIndex} className="border border-gray-200 rounded-lg p-3">
                  {/* Month Header */}
                  <div className="text-center mb-3">
                    <h3 className="text-sm font-semibold text-gray-900">{month.name}</h3>
              </div>

              {/* Week Headers */}
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => (
                      <div key={index} className="text-center text-xs font-medium text-gray-500 py-1">
                        {day}
                  </div>
                ))}
              </div>

                  {/* Days Grid */}
                  <div className="grid grid-cols-7 gap-1">
                    {month.days.map((day, dayIndex) => {
                      if (!day) {
                        return <div key={dayIndex} className="h-8"></div>;
                      }

                  // Check if this date has an applied rate plan
                  // day.dateString is already in YYYY-MM-DD format (from calendar generation)
                  const dateString = day.dateString || getDateStringFromDate(day.date);
                  if (!dateString) return null;
                  
                  const appliedRatePlan = appliedRatePlans[dateString];
                  const isInRange = isDateInRange(dateString);
                  const isRangeStart = dateString === dateRange.start;
                  const isRangeEnd = dateString === dateRange.end;
                  const isSelecting = isSelectingRange && dateString === dateRange.start;
                  
                  return (
                    <div
                          key={dayIndex}
                          onClick={() => handleDateClick(day)}
                          className={`
                            h-8 flex items-center justify-center text-xs rounded-lg transition-colors cursor-pointer border border-gray-200 relative
                            ${day.isPast 
                              ? 'text-gray-400 bg-gray-50 cursor-not-allowed' 
                              : isRangeStart || isRangeEnd
                                ? 'bg-purple-500 text-white font-semibold border-purple-600 hover:bg-purple-600'
                                : isInRange
                                  ? 'bg-purple-100 border-purple-300 hover:bg-purple-200'
                                  : isSelecting
                                    ? 'ring-2 ring-purple-400 bg-purple-200 hover:bg-purple-300'
                                    : appliedRatePlan
                                      ? 'ring-2 ring-offset-1 text-white font-semibold hover:opacity-90'
                                      : day.isToday 
                                        ? 'bg-blue-100 text-blue-700 font-semibold border-2 border-blue-500 hover:bg-blue-200' 
                                        : day.isHoliday 
                                          ? 'bg-white text-red-600 font-semibold hover:bg-red-50' 
                                          : day.isWeekend 
                                            ? 'text-red-600 bg-white hover:bg-red-50' 
                                            : 'text-gray-900 hover:bg-gray-100'
                            }
                          `}
                          style={{
                            backgroundColor: appliedRatePlan ? appliedRatePlan.color : undefined,
                            borderColor: appliedRatePlan ? appliedRatePlan.color : undefined,
                            // Purple theme colors
                            ...(isInRange && !isRangeStart && !isRangeEnd && {
                              backgroundColor: '#E6E6FA', // Light purple
                              borderColor: '#D8BFD8' // Medium purple
                            })
                          }}
                          title={
                            isSelecting
                              ? 'Click another date to complete range selection'
                              : isInRange
                                ? 'Selected date range'
                                : appliedRatePlan 
                                  ? `${appliedRatePlan.name} applied - Click to edit` 
                                  : 'Click to start date selection'
                          }
                        >
                          {day.day}
                          {appliedRatePlan && (
                            <div 
                              className="absolute top-0 right-0 w-2 h-2 rounded-full"
                              style={{ backgroundColor: appliedRatePlan.color }}
                            />
                          )}
                          {(isRangeStart || isRangeEnd) && (
                            <div className="absolute top-0 left-0 w-2 h-2 bg-white rounded-full" />
                      )}
                    </div>
                  );
                })}
              </div>
                        </div>
              ))}
        </div>
      </div>

          {/* Legend */}
          <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 rounded-b-lg">
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-100 rounded"></div>
                <span className="text-gray-600">Today</span>
                </div>
                <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-white border border-gray-200 rounded flex items-center justify-center">
                  <span className="text-red-600 text-xs font-semibold">H</span>
                    </div>
                <span className="text-gray-600">Public Holiday</span>
                </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-white border border-gray-200 rounded flex items-center justify-center">
                  <span className="text-red-600 text-xs font-semibold">W</span>
              </div>
                <span className="text-gray-600">Weekend</span>
            </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-gray-50 rounded"></div>
                <span className="text-gray-400">Past Days</span>
                      </div>
                    </div>
                      </div>
                      </div>
                    </div>

      {/* Special Rate Modal */}
      <SpecialRateModal 
        isOpen={showSpecialRateModal}
        onClose={() => setShowSpecialRateModal(false)}
        propertyId={finalPropertyId}
        onApplied={async () => {
          try {
            showNotification('success', 'Success', 'Special rate applied successfully!');
          } catch (error) {
            showNotification('error', 'Error', 'Failed to apply special rate');
            console.error('Error applying special rate:', error);
          }
        }}
      />

      {/* Add Room Modal */}
      <AddRoomModal
        isOpen={showAddRoomModal}
        onClose={() => setShowAddRoomModal(false)}
        mode={addRoomModalMode}
        propertyId={finalPropertyId}
        onSave={async (roomData) => {
          try {
            let response;
            
            if (addRoomModalMode === 'edit') {
              // Call the API to update rooms
              response = await propertyService.updateRooms(propertyId, roomData);
            } else {
              // Call the API to create rooms
              response = await propertyService.createRoom(propertyId, roomData);
            }
            
            if (response.data.success) {
              showNotification('success', 'Success', `Room${addRoomModalMode === 'edit' ? 's updated' : ' created'} successfully!`);
              
              // Refresh room configurations
              await fetchRoomConfigurations();
            } else {
              throw new Error(response.data.message || `Failed to ${addRoomModalMode === 'edit' ? 'update' : 'create'} room${addRoomModalMode === 'edit' ? 's' : ''}`);
            }
          } catch (error) {
            console.error(`Error ${addRoomModalMode === 'edit' ? 'updating' : 'creating'} room:`, error);
            
            // Handle specific error cases
            if (error.response?.status === 409) {
              // Conflict - rooms already exist
              const errorData = error.response?.data;
              showNotification('warning', 'Conflict', errorData?.message || 'Rooms already exist for this room type. Please use "Edit Rooms" to modify existing rooms.');
              
              // Optionally switch to edit mode automatically
              if (addRoomModalMode === 'create') {
                setTimeout(() => {
                  setAddRoomModalMode('edit');
                  setShowAddRoomModal(true);
                }, 2000);
              }
            } else {
              showNotification('error', 'Error', error.response?.data?.message || `Failed to ${addRoomModalMode === 'edit' ? 'update' : 'create'} room${addRoomModalMode === 'edit' ? 's' : ''}. Please try again.`);
            }
          }
        }}
      />

      {/* Rate Plan Selection Tooltip */}
      {showRatePlanTooltip && (
        <div className="fixed top-4 right-4 bg-white rounded-lg shadow-xl border border-gray-200 w-80 max-w-sm z-50">
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-blue-50 rounded-lg">
                  <Calendar className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Apply Rate Plan</h3>
                  <p className="text-xs text-gray-600">
                    {selectedDate 
                      ? (() => {
                          const date = parseDateString(selectedDate);
                          return date ? date.toLocaleDateString() : selectedDate;
                        })()
                      : selectedDates.length > 0
                        ? `${selectedDates.length} date${selectedDates.length > 1 ? 's' : ''} selected`
                        : 'Select date or range'
                    }
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowRatePlanTooltip(false);
                  clearSelection();
                }}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-4 py-3">
            {selectedDates.length > 0 && (
              <div className="mb-3 p-2 bg-purple-50 border border-purple-200 rounded-lg">
                <p className="text-xs text-purple-700">
                  {selectedDates.length === 1 
                    ? (() => {
                        const date = parseDateString(selectedDates[0]);
                        return `Selected: ${date ? date.toLocaleDateString() : selectedDates[0]}`;
                      })()
                    : dateRange.start && dateRange.end
                      ? (() => {
                          const startDate = parseDateString(dateRange.start);
                          const endDate = parseDateString(dateRange.end);
                          const startStr = startDate ? startDate.toLocaleDateString() : dateRange.start;
                          const endStr = endDate ? endDate.toLocaleDateString() : dateRange.end;
                          return `Selected: ${startStr} - ${endStr} (${selectedDates.length} days)`;
                        })()
                      : `${selectedDates.length} date${selectedDates.length > 1 ? 's' : ''} selected`
                  }
                </p>
              </div>
            )}
            
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {ratePlans.length === 0 ? (
                <div className="text-center py-4">
                  <Calendar className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No rate plans available</p>
                  <p className="text-xs text-gray-400">Create a rate plan first</p>
                </div>
              ) : (
                ratePlans.map((ratePlan) => (
                  <button
                    key={ratePlan.id}
                    onClick={() => handleRatePlanSelect(ratePlan)}
                    className="w-full p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: ratePlan.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 truncate">{ratePlan.name}</h4>
                        <p className="text-xs text-gray-500">
                          {ratePlan.roomTypeMealPlanPricing?.length || 0} combinations
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}


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

export default PMSInventory;
