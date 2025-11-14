import React, { useState, useMemo, useEffect, useRef } from "react";
import AmenitiesList from "../components/AmenitiesList";
import SafetyHygieneList from "../components/SafetyHygieneList";
import ReservationBookingWidget from "../components/ReservationWidget";
import RoomSection from "../components/RoomSection";
import { PageLoader, WidgetLoader } from "../components/Loader";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";
import { useParams, useLocation } from "react-router-dom";
import { propertyDetailsService, mediaService } from "../services";
import {
  Wifi,
  Waves,
  Snowflake,
  Utensils,
  Dumbbell,
  Car,
  Tv,
  Coffee,
  ShowerHead,
  Fan,
  BedDouble,
  Key,
  Clock,
} from "lucide-react";
import {
  ShieldCheck,
  SprayCan,
  Thermometer,
  AlertTriangle,
  HandPlatter,
  Hand,
  Shield,
  FireExtinguisher,
  Camera,
  Users,
  Droplets,
  Eye,
} from "lucide-react";

const DetailsPage = () => {
  const { id } = useParams();
  const { state } = useLocation();

  const [modal, setModal] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [range, setRange] = useState({ start: null, end: null });
  const [media, setMedia] = useState([]);
  const mainImage = media[0];
  const sideImages = media.slice(1, 5);
  const [loading, setLoading] = useState(false);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [error, setError] = useState("");
  const [requiredRooms, setRequiredRooms] = useState(1); // Track how many rooms user needs
  const [retryCount, setRetryCount] = useState(0);
  const [lastDataFetch, setLastDataFetch] = useState(null);
  const [refreshInterval, setRefreshInterval] = useState(null);
  const [isAutoRefreshEnabled, setIsAutoRefreshEnabled] = useState(true);
  const remaining = Math.max(0, media.length - 5);

  const [reviews] = useState([
    {
      id: 1,
      name: "John Doe",
      rating: 5,
      review: "Amazing place! Highly recommend.",
      avatar: "https://randomuser.me/api/portraits/men/1.jpg",
    },
    {
      id: 2,
      name: "Jane Smith",
      rating: 4,
      review: "Very good, but room for improvement.",
      avatar: "https://randomuser.me/api/portraits/women/2.jpg",
    },
    {
      id: 3,
      name: "Alice Johnson",
      rating: 5,
      review: "Loved it! Will come again.",
      avatar: "https://randomuser.me/api/portraits/women/3.jpg",
    },
    {
      id: 4,
      name: "Bob Brown",
      rating: 3,
      review: "It's okay, not great.",
      avatar: "https://randomuser.me/api/portraits/men/4.jpg",
    },
    {
      id: 5,
      name: "Charlie Green",
      rating: 4,
      review: "Nice place, friendly staff.",
      avatar: "https://randomuser.me/api/portraits/men/5.jpg",
    },
  ]);

  const [propertyDetails, setPropertyDetails] = useState(null);
  const [showRoomSelection, setShowRoomSelection] = useState(false);
  const roomSectionRef = useRef(null);
  const [mobileImageIndex, setMobileImageIndex] = useState(0);

  // Add touch handling for swipe gestures
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  // Party and nights derived from Reservation widget on Book Now
  const [party, setParty] = useState({
    adults: 0,
    children: 0,
    infants: 0,
  });
  const [bookingNights, setBookingNights] = useState(0);

  const avgRating = useMemo(() => {
    const total = reviews.reduce((acc, r) => acc + r.rating, 0);
    return (total / reviews.length).toFixed(1);
  }, [reviews]);

  const renderStars = (count) => {
    return (
      <div className="flex">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            size={18}
            className={i < count ? "text-yellow-500 fill-yellow-500" : "text-gray-300"}
          />
        ))}
      </div>
    );
  };

  const formatTimeString = (timeString) => {
    if (!timeString || typeof timeString !== "string") return "";
    const [hoursStr, minutesStr = "00"] = timeString.split(":");
    const hours = Number(hoursStr);
    const minutes = Number(minutesStr);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) {
      return timeString;
    }
    const date = new Date();
    date.setHours(hours);
    date.setMinutes(minutes);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const defaultCheckInTime = propertyDetails?.checkInTime || "14:00";
  const defaultCheckOutTime = propertyDetails?.checkOutTime || "11:00";
  const displayCheckInTime = formatTimeString(defaultCheckInTime);
  const displayCheckOutTime = formatTimeString(defaultCheckOutTime);

  const goPrev = () => {
    setCurrentIndex((i) => (i - 1 + media.length) % media.length);
  };

  const goNext = () => {
    setCurrentIndex((i) => (i + 1) % media.length);
  };

  // Phase 1: Load basic property details (fast)
  const handleFetchBasicDetails = async (id) => {
    setLoading(true);
    setError("");
    try {
      const response = await propertyDetailsService.getPropertyDetails(id);
      console.log('Basic details response:', response);
      
      const raw = response?.data?.data || null;
      if (raw) {
        // Set basic property details
        setPropertyDetails(raw);
        setMedia((raw?.media || []).map((item) => item.url) || []);
      }
    } catch (error) {
      console.error("Error fetching basic property details:", error);
      setError("Failed to load property details. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Phase 2: Load initial pricing data (2-month sliding window)
  const handleFetchInitialPricingData = async (id) => {
    setPricingLoading(true);
    try {
      const now = new Date();
      // Load current month + next month (2-month window)
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const nextMonthEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0); // Last day of next month
      
      const startDate = currentMonthStart.toISOString().split('T')[0];
      const endDate = nextMonthEnd.toISOString().split('T')[0];
      
      console.log('🔄 Loading initial 2-month window:', { startDate, endDate });
      console.log(`📅 Window: ${now.getMonth() + 1}/${now.getFullYear()} to ${now.getMonth() + 2}/${now.getFullYear()}`);
      
      // Add timeout for network requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await propertyDetailsService.getPropertyPricing(id, { startDate, endDate });
      clearTimeout(timeoutId);
      
      console.log('📥 Initial pricing data response:', response);
      
      const pricingData = response?.data?.data;
      if (pricingData) {
        console.log(`📊 Loaded ${Object.keys(pricingData).length} dates for initial window`);
        // Store the simplified pricing data directly
        setPropertyDetails(prev => ({
          ...prev,
          pricingData: pricingData // Store the simplified { date: { totalAvailableRooms, minimumPrice } } format
        }));
        setLastDataFetch(new Date());
        setRetryCount(0); // Reset retry count on success
      }
    } catch (error) {
      console.error("❌ Error fetching initial pricing data:", error);
      
      // Handle different types of errors
      if (error.name === 'AbortError') {
        setError("Request timed out. Please check your connection and try again.");
      } else if (error.response?.status === 404) {
        setError("Property not found. Please try refreshing the page.");
      } else if (error.response?.status >= 500) {
        setError("Server error. Please try again later.");
      } else if (!navigator.onLine) {
        setError("No internet connection. Please check your network.");
      } else {
        setError("Failed to load pricing data. Please try again.");
      }
      
      // Implement retry mechanism
      if (retryCount < 3) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          handleFetchInitialPricingData(id);
        }, 2000 * (retryCount + 1)); // Exponential backoff
      }
    } finally {
      setPricingLoading(false);
    }
  };

  // Phase 3: Load additional month data (progressive loading)
  const handleFetchAdditionalMonth = async (id, month, year) => {
    try {
      console.log(`🔄 Loading additional month: ${month}/${year}`);
      console.log(`📊 Current pricingData keys:`, Object.keys(propertyDetails?.pricingData || {}));
      
      const response = await propertyDetailsService.getPropertyPricing(id, { month, year });
      console.log(`📥 Additional month data for ${month}/${year}:`, response);
      
      const pricingData = response?.data?.data;
      if (pricingData) {
        console.log(`📈 New pricing data keys:`, Object.keys(pricingData));
        
        // Merge the simplified pricing data with existing data
        setPropertyDetails(prev => {
          const mergedData = {
            ...(prev.pricingData || {}),
            ...pricingData // Merge new pricing data with existing
          };
          
          console.log(`🔗 Merged pricing data keys:`, Object.keys(mergedData));
          console.log(`📊 Total dates now available:`, Object.keys(mergedData).length);
          
          return {
            ...prev,
            pricingData: mergedData
          };
        });
      } else {
        console.warn(`⚠️ No pricing data received for ${month}/${year}`);
      }
    } catch (error) {
      console.error(`❌ Error fetching month ${month}/${year}:`, error);
      setError(`Failed to load pricing for ${month}/${year}. Please try again.`);
    }
  };

  // Periodic refresh function
  const handlePeriodicRefresh = async () => {
    if (!id || !isAutoRefreshEnabled) return;
    
    console.log('🔄 Periodic refresh triggered');
    try {
      // Refresh current 2-month window
      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const nextMonthEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0);
      
      const startDate = currentMonthStart.toISOString().split('T')[0];
      const endDate = nextMonthEnd.toISOString().split('T')[0];
      
      const response = await propertyDetailsService.getPropertyPricing(id, { startDate, endDate });
      const newPricingData = response?.data?.data;
      
      if (newPricingData) {
        console.log(`🔄 Periodic refresh: Updated ${Object.keys(newPricingData).length} dates`);
        setPropertyDetails(prev => ({
          ...prev,
          pricingData: {
            ...prev.pricingData,
            ...newPricingData
          }
        }));
        setLastDataFetch(new Date());
      }
    } catch (error) {
      console.error('❌ Periodic refresh failed:', error);
    }
  };

  // Start periodic refresh
  const startPeriodicRefresh = () => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
    }
    
    const interval = setInterval(() => {
      handlePeriodicRefresh();
    }, 300000); // Refresh every 30 seconds
    
    setRefreshInterval(interval);
    console.log('🔄 Periodic refresh started (30s interval)');
  };

  // Stop periodic refresh
  const stopPeriodicRefresh = () => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
      console.log('⏹️ Periodic refresh stopped');
    }
  };

  // Toggle auto refresh
  const toggleAutoRefresh = () => {
    setIsAutoRefreshEnabled(!isAutoRefreshEnabled);
    if (isAutoRefreshEnabled) {
      stopPeriodicRefresh();
    } else {
      startPeriodicRefresh();
    }
  };


  const handleBookNowClick = (payload) => {
    console.log('🎯 Book Now clicked with payload:', payload);
    setShowRoomSelection(true);
    if (payload) {
      const { guests, nights, rooms } = payload;
      
      // Calculate required rooms based on party size
      // Assuming 2 adults per room as standard, but this can be adjusted
      const totalGuests = (guests?.adults ?? 0) + (guests?.children ?? 0);
      const calculatedRooms = Math.ceil(totalGuests / 2); // 2 guests per room
      const requestedRooms = rooms || calculatedRooms;
      
      console.log('📊 Booking parameters:', { totalGuests, requestedRooms, nights });
      
      setRequiredRooms(requestedRooms);
      
      setParty({
        adults: guests?.adults ?? 0,
        children: guests?.children ?? 0,
        infants: 0,

      });
      setBookingNights(nights ?? 0);
      
      // Re-validate the current date range with the new room requirement
      if (range.start && range.end) {
        const validation = validateDateRange(range.start, range.end, requestedRooms);
        if (!validation.isValid) {
          setError(validation.errors.join(', '));
        } else {
          setError('');
        }
      }
    }
    setTimeout(() => {
      roomSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  // Validate date range for availability and edge cases
  const validateDateRange = (startDate, endDate, requiredRooms = 1) => {
    const validation = {
      isValid: true,
      errors: [],
      warnings: [],
      unavailableDates: [],
      availableDates: [],
      insufficientRooms: []
    };

    if (!startDate || !endDate) {
      return validation;
    }

    // Validate date format and create Date objects
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Check for invalid dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      validation.isValid = false;
      validation.errors.push("Invalid date format");
      return validation;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if end date is before start date
    if (end < start) {
      validation.isValid = false;
      validation.errors.push("End date cannot be before start date");
      return validation;
    }

    // Check if start date is in the past
    if (start < today) {
      validation.isValid = false;
      validation.errors.push("Start date cannot be in the past");
      return validation;
    }

    // Check for very long date ranges (more than 6 months)
    const maxNights = 180; // 6 months
    const nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    if (nights > maxNights) {
      validation.isValid = false;
      validation.errors.push(`Maximum stay is ${maxNights} nights`);
      return validation;
    }

    // Check for minimum nights (if property has this requirement)
    if (nights < 1) {
      validation.isValid = false;
      validation.errors.push("Minimum stay is 1 night");
      return validation;
    }

    // Check for maximum rooms per booking
    const maxRoomsPerBooking = 10; // Configurable limit
    if (requiredRooms > maxRoomsPerBooking) {
      validation.isValid = false;
      validation.errors.push(`Maximum ${maxRoomsPerBooking} rooms per booking`);
      return validation;
    }

    // Check availability for each date in the range
    let currentDate = new Date(start);
    let consecutiveUnavailableDays = 0;
    let maxConsecutiveUnavailable = 0;
    
    while (currentDate <= end) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dateData = propertyDetails?.pricingData?.[dateStr];
      
      if (dateData) {
        if (dateData.totalAvailableRooms === 0) {
          consecutiveUnavailableDays++;
          maxConsecutiveUnavailable = Math.max(maxConsecutiveUnavailable, consecutiveUnavailableDays);
          validation.unavailableDates.push({
            date: dateStr,
            reason: "No rooms available"
          });
        } else if (dateData.totalAvailableRooms < requiredRooms) {
          consecutiveUnavailableDays++;
          maxConsecutiveUnavailable = Math.max(maxConsecutiveUnavailable, consecutiveUnavailableDays);
          // Not enough rooms for the requirement
          validation.insufficientRooms.push({
            date: dateStr,
            available: dateData.totalAvailableRooms,
            required: requiredRooms,
            shortfall: requiredRooms - dateData.totalAvailableRooms
          });
        } else {
          consecutiveUnavailableDays = 0; // Reset counter
          validation.availableDates.push({
            date: dateStr,
            rooms: dateData.totalAvailableRooms,
            price: dateData.minimumPrice
          });
        }
      } else {
        consecutiveUnavailableDays++;
        maxConsecutiveUnavailable = Math.max(maxConsecutiveUnavailable, consecutiveUnavailableDays);
        // Date not in pricing data - might need to load more data
        validation.warnings.push(`Pricing data not available for ${dateStr}`);
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Check if any dates in range are unavailable
    if (validation.unavailableDates.length > 0) {
      validation.isValid = false;
      validation.errors.push(`Selected dates include unavailable dates: ${validation.unavailableDates.map(d => d.date).join(', ')}`);
    }

    // Check if any dates have insufficient rooms
    if (validation.insufficientRooms.length > 0) {
      validation.isValid = false;
      const insufficientDates = validation.insufficientRooms.map(d => 
        `${d.date} (only ${d.available} available, need ${d.required})`
      ).join(', ');
      validation.errors.push(`Insufficient rooms on: ${insufficientDates}`);
    }

    // Check for too many consecutive unavailable days
    if (maxConsecutiveUnavailable > 3) {
      validation.warnings.push(`Warning: ${maxConsecutiveUnavailable} consecutive days are unavailable`);
    }

    return validation;
  };

  // Suggest alternative dates when range has unavailable dates
  const suggestAlternativeDates = (unavailableDates) => {
    if (!unavailableDates || unavailableDates.length === 0) return null;

    const suggestions = [];
    
    // Find the first available date after the last unavailable date
    const lastUnavailableDate = new Date(Math.max(...unavailableDates.map(d => new Date(d.date))));
    const nextAvailableDate = new Date(lastUnavailableDate);
    nextAvailableDate.setDate(nextAvailableDate.getDate() + 1);
    
    // Check if this date is available
    const nextDateStr = nextAvailableDate.toISOString().split('T')[0];
    const nextDateData = propertyDetails?.pricingData?.[nextDateStr];
    
    if (nextDateData && nextDateData.totalAvailableRooms > 0) {
      suggestions.push({
        type: 'alternative_start',
        date: nextDateStr,
        message: `Try starting from ${nextDateStr} instead`
      });
    }

    // Find the last available date before the first unavailable date
    const firstUnavailableDate = new Date(Math.min(...unavailableDates.map(d => new Date(d.date))));
    const prevAvailableDate = new Date(firstUnavailableDate);
    prevAvailableDate.setDate(prevAvailableDate.getDate() - 1);
    
    const prevDateStr = prevAvailableDate.toISOString().split('T')[0];
    const prevDateData = propertyDetails?.pricingData?.[prevDateStr];
    
    if (prevDateData && prevDateData.totalAvailableRooms > 0) {
      suggestions.push({
        type: 'alternative_end',
        date: prevDateStr,
        message: `Try ending on ${prevDateStr} instead`
      });
    }

    return suggestions;
  };

  // Handle month navigation in calendar widget (2-month sliding window)
  const handleMonthNavigation = (month, year) => {
    console.log(`🗓️ Month navigation triggered: ${month}/${year}`);
    console.log(`📊 Current pricingData keys:`, Object.keys(propertyDetails?.pricingData || {}));
    
    if (!id) {
      console.error('❌ No property ID available');
      return;
    }
    
    // Calculate the 2-month window based on the navigation
    const currentDate = new Date(year, month - 1, 1);
    const nextMonth = new Date(currentDate);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    
    const startMonth = currentDate.getMonth() + 1;
    const startYear = currentDate.getFullYear();
    const endMonth = nextMonth.getMonth() + 1;
    const endYear = nextMonth.getFullYear();
    
    console.log(`📅 Loading 2-month window: ${startMonth}/${startYear} to ${endMonth}/${endYear}`);
    
    // Check if we have data for both months in the window
    const hasStartMonthData = propertyDetails?.pricingData && 
      Object.keys(propertyDetails.pricingData).some(dateStr => {
        const date = new Date(dateStr);
        return date.getMonth() + 1 === startMonth && date.getFullYear() === startYear;
      });
    
    const hasEndMonthData = propertyDetails?.pricingData && 
      Object.keys(propertyDetails.pricingData).some(dateStr => {
        const date = new Date(dateStr);
        return date.getMonth() + 1 === endMonth && date.getFullYear() === endYear;
      });
    
    console.log(`🔍 Data check - Start month (${startMonth}/${startYear}):`, hasStartMonthData ? 'EXISTS' : 'MISSING');
    console.log(`🔍 Data check - End month (${endMonth}/${endYear}):`, hasEndMonthData ? 'EXISTS' : 'MISSING');
    
    // Load missing months
    if (!hasStartMonthData) {
      console.log(`🔄 Loading start month: ${startMonth}/${startYear}`);
      handleFetchAdditionalMonth(id, startMonth, startYear);
    }
    
    if (!hasEndMonthData) {
      console.log(`🔄 Loading end month: ${endMonth}/${endYear}`);
      handleFetchAdditionalMonth(id, endMonth, endYear);
    }
    
    if (hasStartMonthData && hasEndMonthData) {
      console.log(`✅ Both months already exist in the window`);
    }
  };

  // Load pricing data when date range changes (progressive loading)
  const handleDateRangeChange = (newRange) => {
    setRange(newRange);
    
    // Validate the new range
    if (newRange.start && newRange.end) {
      const validation = validateDateRange(newRange.start, newRange.end, requiredRooms);
      
      if (!validation.isValid) {
        console.warn('Date range validation failed:', validation.errors);
        // You can show these errors to the user
        setError(validation.errors.join(', '));
        return;
      } else {
        setError(''); // Clear any previous errors
      }
    }
    
    // If we have both start and end dates, check if we need to load additional months
    if (newRange.start && newRange.end && id) {
      const startDate = new Date(newRange.start);
      const endDate = new Date(newRange.end);
      
      // Calculate which months we need to load
      const monthsToLoad = [];
      let current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
      const endMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
      
      while (current <= endMonth) {
        monthsToLoad.push({
          month: current.getMonth() + 1,
          year: current.getFullYear()
        });
        current.setMonth(current.getMonth() + 1);
      }
      
      // Load each month that we don't already have
      monthsToLoad.forEach(({ month, year }) => {
        // Check if we already have this month's data in pricingData
        const hasData = propertyDetails?.pricingData && 
          Object.keys(propertyDetails.pricingData).some(dateStr => {
            const date = new Date(dateStr);
            return date.getMonth() + 1 === month && date.getFullYear() === year;
          });
        
        if (!hasData) {
          handleFetchAdditionalMonth(id, month, year);
        }
      });
    }
  };

  // Calculate number of nights
  const calculateNights = () => {
    if (!range.start || !range.end) return 0;
    const diffTime = Math.abs(range.end - range.start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };


  // Process calendar data with the new simplified pricing format
  const calendarData = useMemo(() => {
    if (!propertyDetails?.pricingData) {
      return {};
    }
    
    // Convert the simplified pricing data to the format expected by ReservationBookingWidget
    const processedData = {};
    
    // Process each date from the simplified pricing data
    Object.entries(propertyDetails.pricingData).forEach(([date, data]) => {
      const isAvailable = data.totalAvailableRooms > 0;
      const hasEnoughRooms = data.totalAvailableRooms >= requiredRooms;
      
      let roomStatus;
      if (data.totalAvailableRooms === 0) {
        roomStatus = "No rooms available";
      } else if (data.totalAvailableRooms < requiredRooms) {
        roomStatus = `Only ${data.totalAvailableRooms} available (need ${requiredRooms})`;
      } else if (data.totalAvailableRooms === 1) {
        roomStatus = "1 room left";
      } else {
        roomStatus = `${data.totalAvailableRooms} rooms available`;
      }
      
      // Check if date is in the past
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dateObj = new Date(date);
      const isPastDate = dateObj < today;
      
      processedData[date] = {
        minRate: data.minimumPrice || null,
        isAvailable: isAvailable && hasEnoughRooms && !isPastDate,
        specialRate: null, // We'll handle special rates separately if needed
        finalPrice: data.minimumPrice || null,
        type: null,
        basePrice: data.minimumPrice || null,
        totalAvailableRooms: data.totalAvailableRooms,
        roomStatus: isPastDate ? "Past date" : roomStatus,
        isDisabled: !isAvailable || !hasEnoughRooms || isPastDate, // Disable if not enough rooms
        isPastDate: isPastDate,
        hasEnoughRooms: hasEnoughRooms
      };
    });
    
    return processedData;
  }, [propertyDetails, requiredRooms]);

  // Amenities and safety (static placeholders)
  const amenities = [
    { title: "Free Wi-Fi", icon: <Wifi /> },
    { title: "Swimming Pool", icon: <Waves /> },
    { title: "Air Conditioning", icon: <Snowflake /> },
    { title: "Restaurant", icon: <Utensils /> },
    { title: "Gym / Fitness Center", icon: <Dumbbell /> },
    { title: "Parking Facility", icon: <Car /> },
    { title: "Television", icon: <Tv /> },
    { title: "Coffee Maker", icon: <Coffee /> },
    { title: "Hot Shower", icon: <ShowerHead /> },
    { title: "Ceiling Fan", icon: <Fan /> },
    { title: "King Bed", icon: <BedDouble /> },
    { title: "Room Key Access", icon: <Key /> },
  ];

  const safetyAndHygiene = [
    { title: "Sanitized Rooms", icon: <SprayCan /> },
    { title: "Temperature Checks", icon: <Thermometer /> },
    { title: "Emergency Exit", icon: <AlertTriangle /> },
    { title: "First Aid Kit", icon: <HandPlatter /> },
    { title: "Hand Sanitizers", icon: <Hand /> },
    { title: "24/7 Security", icon: <Shield /> },
    { title: "Fire Extinguishers", icon: <FireExtinguisher /> },
    { title: "CCTV Surveillance", icon: <Camera /> },
    { title: "Trained Staff", icon: <Users /> },
    { title: "Disinfection Protocol", icon: <Droplets /> },
    { title: "Safety Inspected", icon: <ShieldCheck /> },
    { title: "Smoke Detector", icon: <Eye /> },
  ];

  // Location display (handle nested address object and fallbacks)
  const locationDisplay = useMemo(() => {
    const loc = propertyDetails?.location;
    if (!loc) return "Location not available";
    if (typeof loc === "string") return loc;
    const addr = loc.address || loc;
    const parts = [addr.street, addr.city, addr.state, addr.country, addr.zipCode].filter(Boolean);
    return parts.length ? parts.join(", ") : "Location not available";
  }, [propertyDetails]);

  // Map query from coordinates or address
  const mapQuery = useMemo(() => {
    const coords = propertyDetails?.location?.coordinates;
    if (
      coords &&
      typeof coords.latitude === "number" &&
      typeof coords.longitude === "number"
    ) {
      return `${coords.latitude},${coords.longitude}`;
    }
    const loc = propertyDetails?.location;
    if (!loc) return locationDisplay;
    if (typeof loc === "string") return loc;
    const addr = loc.address || loc;
    const parts = [addr.street, addr.city, addr.state, addr.country].filter(Boolean);
    return parts.join(", ");
  }, [propertyDetails, locationDisplay]);

  useEffect(() => {
    if (id) {
      handleFetchBasicDetails(id);
      // Load initial pricing data (current + next month) after basic details
      setTimeout(() => {
        handleFetchInitialPricingData(id);
      }, 500); // Small delay to ensure basic details are loaded first
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Load pricing data when propertyDetails is available but pricingData is not
  useEffect(() => {
    if (propertyDetails && !propertyDetails.pricingData && id) {
      console.log('Loading pricing data for reservation widget...');
      handleFetchInitialPricingData(id);
    }
  }, [propertyDetails, id]);

  // Check for data staleness and refresh if needed
  useEffect(() => {
    if (lastDataFetch && propertyDetails?.pricingData) {
      const now = new Date();
      const timeSinceLastFetch = now - lastDataFetch;
      const maxDataAge = 5 * 60 * 1000; // 5 minutes
      
      if (timeSinceLastFetch > maxDataAge) {
        console.log('Pricing data is stale, refreshing...');
        handleFetchInitialPricingData(id);
      }
    }
  }, [lastDataFetch, propertyDetails, id]);

  // Auto-load next 2-month window when user navigates (fallback mechanism)
  useEffect(() => {
    if (propertyDetails?.pricingData && id) {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      
      // Check if we have the next 2-month window
      const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
      const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;
      const monthAfterNext = nextMonth === 12 ? 1 : nextMonth + 1;
      const yearAfterNext = nextMonth === 12 ? nextYear + 1 : nextYear;
      
      const hasNextMonthData = Object.keys(propertyDetails.pricingData).some(dateStr => {
        const date = new Date(dateStr);
        return date.getMonth() + 1 === nextMonth && date.getFullYear() === nextYear;
      });
      
      const hasMonthAfterNextData = Object.keys(propertyDetails.pricingData).some(dateStr => {
        const date = new Date(dateStr);
        return date.getMonth() + 1 === monthAfterNext && date.getFullYear() === yearAfterNext;
      });
      
      // Load missing months in the next 2-month window
      if (!hasNextMonthData) {
        console.log(`🔄 Auto-loading next month: ${nextMonth}/${nextYear}`);
        handleFetchAdditionalMonth(id, nextMonth, nextYear);
      }
      
      if (!hasMonthAfterNextData) {
        console.log(`🔄 Auto-loading month after next: ${monthAfterNext}/${yearAfterNext}`);
        handleFetchAdditionalMonth(id, monthAfterNext, yearAfterNext);
      }
    }
  }, [propertyDetails?.pricingData, id]);

  // Start periodic refresh when component mounts and pricing data is loaded
  useEffect(() => {
    if (propertyDetails?.pricingData && id && isAutoRefreshEnabled) {
      startPeriodicRefresh();
    }
    
    return () => {
      stopPeriodicRefresh();
    };
  }, [propertyDetails?.pricingData, id, isAutoRefreshEnabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPeriodicRefresh();
    };
  }, []);

  // Loading state skeleton
  if (loading) {
    return <PageLoader text="Loading property details..." />;
  }

  // Touch handling for swipe gestures
  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      setMobileImageIndex((prev) => (prev + 1) % (media.length || 1));
    } else if (isRightSwipe) {
      setMobileImageIndex((prev) => (prev - 1 + (media.length || 1)) % (media.length || 1));
    }
  };

  const title = propertyDetails?.title || "Property";
  const description = propertyDetails?.description || "";

  return (
    <>
      {/* Desktop View - Keep existing layout with guards */}
      <div className="hidden md:flex md:flex-row px-4 py-4 md:px-10 pb-4 gap-2">
        {/* Left: main image */}
        <div className="w-full md:w-1/2 h-[260px] md:h-[500px]">
          {mainImage ? (
            <img
              src={mediaService.getMedia(mainImage)}
              alt="Main"
              className="w-full h-full object-cover rounded-lg"
            />
          ) : (
            <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-sm">
              No image available
            </div>
          )}
        </div>

        {/* Right: 2x2 grid */}
        <div className="w-full md:w-1/2 grid grid-cols-1 md:grid-cols-2 gap-2">
          {sideImages.map((img, i) => (
            <div key={i} className="relative w-full h-[180px] md:h-[245px]">
              <img
                src={mediaService.getMedia(img)}
                alt={`Property ${i + 2}`}
                className="w-full h-full object-cover rounded-lg"
              />

              {i === sideImages.length - 1 && remaining > 0 && (
                <button
                  onClick={() => setModal(true)}
                  className="absolute inset-0 rounded-lg bg-black/50 flex items-center justify-center cursor-pointer"
                  aria-label="Open photo gallery"
                >
                  <span className="text-white text-lg font-semibold">+{remaining} Photos</span>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Mobile View - Carousel */}
      <div className="md:hidden px-4 py-2 ">
        {media.length > 0 ? (
          <div className="relative w-full h-[300px] rounded-lg overflow-hidden">
            {/* Main carousel image */}
            <img
              src={mediaService.getMedia(media[mobileImageIndex])}
              alt={`Property ${mobileImageIndex + 1}`}
              className="w-full h-full object-cover"
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
            />

            {/* Navigation arrows */}
            {media.length > 1 && (
              <>
                <button
                  onClick={() => setMobileImageIndex((prev) => (prev - 1 + media.length) % media.length)}
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                  aria-label="Previous image"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={() => setMobileImageIndex((prev) => (prev + 1) % media.length)}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                  aria-label="Next image"
                >
                  <ChevronRight size={20} />
                </button>
              </>
            )}

            {/* Image counter */}
            <div className="absolute top-3 right-3 bg-black/50 text-white px-2 py-1 rounded-full text-sm">
              {mobileImageIndex + 1} / {media.length}
            </div>

            {/* View all photos button */}
            {media.length > 1 && (
              <button
                onClick={() => setModal(true)}
                className="absolute bottom-3 right-3 bg-white text-gray-800 px-3 py-1 rounded-full text-sm font-medium hover:bg-gray-100 transition-colors"
              >
                View all photos
              </button>
            )}

            {/* Dots indicator */}
            {media.length > 1 && media.length <= 10 && (
              <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex space-x-2">
                {media.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setMobileImageIndex(index)}
                    className={`w-2 h-2 rounded-full transition-colors ${index === mobileImageIndex ? "bg-white" : "bg-white/50"}`}
                    aria-label={`Go to image ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="w-full h-[300px] rounded-lg bg-gray-100 flex items-center justify-center text-gray-500">
            No images available
          </div>
        )}

        {/* Mobile thumbnail strip */}
        {media.length > 1 && (
          <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
            {media.slice(0, 8).map((img, index) => (
              <button
                key={index}
                onClick={() => setMobileImageIndex(index)}
                className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                  index === mobileImageIndex ? "border-blue-500" : "border-gray-200"
                }`}
              >
                <img
                  src={mediaService.getMedia(img)}
                  alt={`Thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
            {media.length > 8 && (
              <button
                onClick={() => setModal(true)}
                className="flex-shrink-0 w-16 h-16 rounded-lg bg-gray-100 border-2 border-gray-200 flex items-center justify-center text-gray-600 text-xs font-medium"
              >
                +{media.length - 8}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="flex flex-col p-1 gap-6 md:flex-row md:px-10 py-2 md:gap-0">
        <div className="w-full border rounded-lg shadow-lg px-4 py-4 border-gray-200 md:w-[60%] md:border-none md:shadow-none flex flex-col gap-2">
          <h1 className="text-[18px] lg:text-[36px] font-bold text-[#484848]">{title}</h1>
          {description && (
            <p className="text-gray-600 text-[12px] md:text-[16px] leading-relaxed">{description}</p>
          )}
          <div className="flex flex-wrap gap-6 text-sm text-gray-600 mt-2">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-gray-500" />
              <span>
                Check-in: <span className="font-medium text-gray-800">{displayCheckInTime}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-gray-500" />
              <span>
                Check-out: <span className="font-medium text-gray-800">{displayCheckOutTime}</span>
              </span>
            </div>
          </div>
          <h2 className="text-[18px] lg:text-[22px] font-bold text-[#484848] mt-2">Amenities</h2>
          <AmenitiesList items={amenities} />
          <h2 className="text-[18px] lg:text-[22px] font-bold text-[#484848] mt-2">Safety and Hygiene</h2>
          <SafetyHygieneList items={safetyAndHygiene} />
          {error && (
            <div className="mt-2 p-3 rounded bg-red-50 text-red-700 text-sm border border-red-200">
              <div className="font-semibold mb-1">Booking Not Available</div>
              <div>{error}</div>
              {error.includes('unavailable dates') && (
                <div className="mt-2 text-xs text-red-600">
                  💡 Try selecting different dates or check availability for individual dates
                </div>
              )}
              {error.includes('Insufficient rooms') && (
                <div className="mt-2 text-xs text-red-600">
                  💡 Try selecting fewer rooms or different dates. You need {requiredRooms} room{requiredRooms > 1 ? 's' : ''} for your party.
                </div>
              )}
            </div>
          )}
                    
        </div>

        <div className="w-full md:w-[40%] flex justify-center">
          {pricingLoading ? (
            <WidgetLoader text="Loading pricing data..." />
          ) : (
            <ReservationBookingWidget
              calendarData={calendarData}
              range={range}
              onRangeChange={handleDateRangeChange}
              onMonthNavigation={handleMonthNavigation}
              onBookNow={handleBookNowClick}
              propertyDetails={propertyDetails}
            />
          )}
        </div>
      </div>

      {/* Room Selection Section */}
      <div ref={roomSectionRef}>
        {showRoomSelection && (
          <RoomSection
            propertyId={id}
            range={range}
            party={party}
          />
        )}
      </div>

      {/* Location Section */}
      <div className="p-[20px] md:p-[40px]">
        <h2 className="text-lg font-bold mb-3">Location</h2>
        <p className="text-gray-600 mb-4">{locationDisplay}</p>
        <div className="w-full h-[300px] rounded-xl overflow-hidden shadow">
          <iframe
            title="Property Location"
            width="100%"
            height="100%"
            frameBorder="0"
            style={{ border: 0 }}
            src={`https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed`}
            allowFullScreen
          ></iframe>
        </div>
      </div>

      {/* Reviews Section */}
      <div className="flex justify-end gap-2 px-8">
        <h1 className="text-sm md:text-lg font-bold">Write Your Review</h1>
      </div>

      <div className="p-[20px] md:p-[40px]">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-bold">Reviews & Ratings</h2>
          <div className="flex items-center gap-2">
            {renderStars(Math.round(avgRating))}
            <span className="text-sm font-medium text-gray-700">
              {avgRating} / 5 ({reviews.length} reviews)
            </span>
          </div>
        </div>

        <div className="space-y-4">
          {reviews.map((r) => (
            <div key={r.id} className="p-4 border border-gray-200 rounded-xl shadow-sm bg-white flex gap-4">
              <img src={r.avatar} alt={r.name} className="w-12 h-12 rounded-full object-cover" />
              <div>
                <h3 className="font-semibold">{r.name}</h3>
                {renderStars(r.rating)}
                <p className="text-gray-600 mt-2">{r.review}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Photo Gallery Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setModal(false)}>
          <div className="relative bg-white rounded-xl w-full max-w-5xl h-[95vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <button className="absolute right-3 top-3 rounded-md bg-black/80 text-white px-3 py-1 text-sm z-10" onClick={() => setModal(false)}>
              Close
            </button>

            <div className="flex flex-row items-center justify-between gap-1 p-2">
              <button className="rounded-full bg-gray-200 hover:bg-gray-300 text-gray-800 p-2" onClick={goPrev} aria-label="Previous image">
                ◀
              </button>

              <div className="flex items-center justify-center flex-1">
                <TransformWrapper>
                  <TransformComponent>
                    {media[currentIndex] ? (
                      <img
                        src={mediaService.getMedia(media[currentIndex])}
                        alt={`Gallery ${currentIndex + 1}`}
                        className="object-cover w-full h-[500px] rounded-lg"
                      />
                    ) : (
                      <div className="w-full h-[500px] rounded-lg bg-gray-100 flex items-center justify-center text-gray-500">
                        No image
                      </div>
                    )}
                  </TransformComponent>
                </TransformWrapper>
              </div>

              <button className="rounded-full bg-gray-200 hover:bg-gray-300 text-gray-800 p-2" onClick={goNext} aria-label="Next image">
                ▶
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DetailsPage;
