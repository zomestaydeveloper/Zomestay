import React, { useState, useMemo, useEffect, useRef } from "react";
import { useParams, useLocation } from "react-router-dom";
import { propertyDetailsService, mediaService } from "../services";
import { PropertyHeader, PropertyGallery, PropertyReviews, PropertyLocation, RoomSection, ReservationBookingWidget, PageLoader, WidgetLoader } from "../components/PropertyDetails";

const DetailsPage = () => {
  const { id } = useParams();
  const { state } = useLocation();

  const [range, setRange] = useState({ start: null, end: null });
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [error, setError] = useState("");
  const [requiredRooms, setRequiredRooms] = useState(1);
  const [retryCount, setRetryCount] = useState(0);
  const [lastDataFetch, setLastDataFetch] = useState(null);
  const [refreshInterval, setRefreshInterval] = useState(null);
  const [isAutoRefreshEnabled, setIsAutoRefreshEnabled] = useState(true);

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

  // Phase 1: Load basic property details (fast)
  const handleFetchBasicDetails = async (id) => {
    setLoading(true);
    setError("");
    try {
      const response = await propertyDetailsService.getPropertyDetails(id);
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

      // Add timeout for network requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await propertyDetailsService.getPropertyPricing(id, { startDate, endDate });
      clearTimeout(timeoutId);

      const pricingData = response?.data?.data;
      if (pricingData) {
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
      const response = await propertyDetailsService.getPropertyPricing(id, { month, year });
      const pricingData = response?.data?.data;
      if (pricingData) {
        // Merge the simplified pricing data with existing data
        setPropertyDetails(prev => {
          const mergedData = {
            ...(prev.pricingData || {}),
            ...pricingData // Merge new pricing data with existing
          };

          return {
            ...prev,
            pricingData: mergedData
          };
        });
      }
    } catch (error) {
      console.error(`❌ Error fetching month ${month}/${year}:`, error);
      setError(`Failed to load pricing for ${month}/${year}. Please try again.`);
    }
  };

  // Periodic refresh function
  const handlePeriodicRefresh = async () => {
    if (!id || !isAutoRefreshEnabled) return;

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
    }, 300000); // Refresh every 5 minutes

    setRefreshInterval(interval);
  };

  // Stop periodic refresh
  const stopPeriodicRefresh = () => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
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
    setShowRoomSelection(true);
    if (payload) {
      const { guests, nights, rooms } = payload;

      // Calculate required rooms based on party size
      // Assuming 2 adults per room as standard, but this can be adjusted
      const totalGuests = (guests?.adults ?? 0) + (guests?.children ?? 0);
      const calculatedRooms = Math.ceil(totalGuests / 2); // 2 guests per room
      const requestedRooms = rooms || calculatedRooms;

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
    if (!id) {
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

    // Load missing months
    if (!hasStartMonthData) {
      handleFetchAdditionalMonth(id, startMonth, startYear);
    }

    if (!hasEndMonthData) {
      handleFetchAdditionalMonth(id, endMonth, endYear);
    }
  };

  // Load pricing data when date range changes (progressive loading)
  const handleDateRangeChange = (newRange) => {
    setRange(newRange);

    // Validate the new range
    if (newRange.start && newRange.end) {
      const validation = validateDateRange(newRange.start, newRange.end, requiredRooms);

      if (!validation.isValid) {
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

  // Helper function to create icon component from URL
  const createIconFromUrl = (iconUrl) => {
    if (!iconUrl) return null;
    const iconSrc = mediaService.getMedia(iconUrl);
    return (
      <img
        src={iconSrc}
        alt=""
        className="object-contain"
        onError={(e) => {
          e.target.style.display = 'none';
        }}
      />
    );
  };

  // Dynamic amenities from API response
  const amenities = useMemo(() => {
    if (!propertyDetails?.amenities) return [];
    return propertyDetails.amenities
      .filter((amenity) => amenity.isActive) // Only show active amenities
      .map((amenity) => ({
        title: amenity.name || "Amenity",
        icon: createIconFromUrl(amenity.icon),
      }))
      .filter((item) => item.icon !== null); // Filter out items without icons
  }, [propertyDetails?.amenities]);

  // Dynamic safety and hygiene from API response (using safeties field)
  const safetyAndHygiene = useMemo(() => {
    if (!propertyDetails?.safeties) return [];
    return propertyDetails.safeties
      .filter((safety) => safety.isActive) // Only show active safety features
      .map((safety) => ({
        title: safety.name || "Safety Feature",
        icon: createIconFromUrl(safety.icon),
      }))
      .filter((item) => item.icon !== null); // Filter out items without icons
  }, [propertyDetails?.safeties]);

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
        handleFetchAdditionalMonth(id, nextMonth, nextYear);
      }

      if (!hasMonthAfterNextData) {
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

  const title = propertyDetails?.title || "Property";
  const description = propertyDetails?.description || "";


  return (
    <>
      <PropertyGallery media={media} />

      <div className="flex flex-col p-1 gap-6 md:flex-row md:px-10 py-2 md:gap-0">
        <PropertyHeader
          title={title}
          description={description}
          checkIn={displayCheckInTime}
          checkOut={displayCheckOutTime}
          amenities={amenities}
          safetyAndHygiene={safetyAndHygiene}
          error={error}
          requiredRooms={requiredRooms}
        />

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

      <div ref={roomSectionRef}>
        {showRoomSelection && (
          <RoomSection
            propertyId={id}
            range={range}
            party={party}
          />
        )}
      </div>

      <PropertyLocation
        locationDisplay={locationDisplay}
        mapQuery={mapQuery}
      />

      <PropertyReviews
        reviews={reviews}
        avgRating={avgRating}
      />
    </>
  );
};

export default DetailsPage;
