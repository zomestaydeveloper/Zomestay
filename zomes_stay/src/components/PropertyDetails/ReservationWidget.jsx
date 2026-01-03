import React, { useState, useRef, useEffect } from "react";
import { Calendar, Users, Home, X, ChevronLeft, ChevronRight } from "lucide-react";
import { useSelector } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import { WidgetLoader } from "../Loader";
import { validateAuth, detectRoleFromRoute } from "../../utils/authUtils";
import { saveBookingState, saveReturnUrl } from "../../utils/bookingStateUtils";

// ---- Local helpers ----
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function getToday() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

function getMonthMatrix(year, month) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const matrix = [];
  let week = [];
  for (let i = 0; i < first.getDay(); i++) week.push(null);
  for (let d = 1; d <= last.getDate(); d++) {
    week.push(new Date(year, month, d));
    if (week.length === 7) {
      matrix.push(week);
      week = [];
    }
  }
  if (week.length) {
    while (week.length < 7) week.push(null);
    matrix.push(week);
  }
  return matrix;
}

function isSameDay(a, b) {
  return (
    a &&
    b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isInRange(day, start, end) {
  if (!start || !end) return false;
  return day > start && day < end;
}

function isBeforeDay(a, b) {
  return a && b && a.getTime() < b.getTime();
}

function addMonths(date, n) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}

function formatINR(n) {
  if (n == null) return "—";
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
  } catch {
    return `₹${n}`;
  }
}

function formatDate(date) {
  if (!date) return "";
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]}`;
}

function formatDateShort(date) {
  if (!date) return "";
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

// Consistent YYYY-MM-DD key formatting using local calendar date (no timezone drift)
function getDateKey(date) {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeDateKey(input) {
  if (!input) return "";
  if (input instanceof Date) {
    return getDateKey(input);
  }
  if (typeof input === "string") {
    const match = input.match(/^\d{4}-\d{2}-\d{2}/);
    if (match) {
      return match[0];
    }
  }
  const parsed = new Date(input);
  if (!Number.isNaN(parsed.getTime())) {
    return getDateKey(parsed);
  }
  return "";
}

// ---- Calendar Popup Component ----
function CalendarPopup({ calendarData = {}, unavailableDates = [], range, setRange, onClose, onMonthNavigation }) {
  const today = getToday();
  const [baseMonth, setBaseMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [hovered, setHovered] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  const unavailableSet = useRef(new Set(unavailableDates.map((d) => normalizeDateKey(d)).filter(Boolean)));

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Auto-close when both dates selected
  // useEffect(() => {
  //   if (range.start && range.end) {
  //     setTimeout(() => onClose(), 300);
  //   }
  // }, [range.start, range.end, onClose]);

  function onDateClick(day) {
    const key = day ? getDateKey(day) : "";
    const cal = key ? calendarData[key] : null;
    const notAvailable = cal ? cal.isAvailable === false : false;
    // Check if date has 0 rooms (can still be check-out, but not check-in)
    const hasZeroRooms = cal ? (cal.totalAvailableRooms === 0) : false;
    const isUnavailable = unavailableSet.current.has(key) || notAvailable;
    
    // Prevent clicking past dates
    if (!day || isBeforeDay(day, today)) return;
    
    // If selecting check-in date (no start or resetting), unavailable dates are not allowed
    if (!range.start || (range.start && range.end)) {
      // Cannot select unavailable date as check-in (including dates with 0 rooms)
      if (isUnavailable || hasZeroRooms) return;
      setRange({ start: day, end: null });
    } else if (range.start && !range.end) {
      // Selecting check-out date - dates with 0 rooms ARE allowed (guest is leaving, doesn't need room)
      // But dates from unavailableSet (legacy unavailable) are still not allowed
      if (isBeforeDay(day, range.start)) {
        // If selecting before check-in, treat as new check-in (unavailable not allowed)
        if (isUnavailable || hasZeroRooms) return;
        setRange({ start: day, end: range.start });
      } else {
        // Selecting check-out date - allow dates with 0 rooms, but not legacy unavailable dates
        // Only block if it's in the legacy unavailable set (not just 0 rooms)
        if (unavailableSet.current.has(key)) return; // Legacy unavailable dates still blocked
        // Allow dates with 0 rooms as check-out
        setRange({ start: range.start, end: day });
      }
    }
  }

  function renderMonth(monthDate) {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const matrix = getMonthMatrix(year, month);

    return (
      <div className="flex-1 min-w-[280px]">
        <div className="text-center mb-3">
          <span className="text-lg font-semibold">{MONTHS[month]} {year}</span>
        </div>

        {/* Weekday row */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {WEEKDAYS.map((d, i) => (
            <div key={i} className="text-center text-xs font-medium text-gray-500 py-1">{d}</div>
          ))}
        </div>

        {/* Date grid */}
        <div className="grid grid-cols-7 gap-1">
          {matrix.flat().map((day, cidx) => {
            if (!day) return <div key={cidx} className="h-12"></div>;
            
            const key = getDateKey(day);
            const fromMap = calendarData[key];
            const isPast = isBeforeDay(day, today);
            const fromLegacyUnavailable = unavailableSet.current.has(key);
            const notAvailable = fromMap ? fromMap.isAvailable === false : false;
            const hasZeroRooms = fromMap ? (fromMap.totalAvailableRooms === 0) : false;
            const isUnavailable = fromLegacyUnavailable || notAvailable;
            // Allow dates with 0 rooms when selecting check-out (range.start exists but range.end is null)
            // Dates with 0 rooms are disabled only when selecting check-in or when date is in the past
            // Legacy unavailable dates are always disabled
            const isSelectingCheckOut = range.start && !range.end && !isBeforeDay(day, range.start);
            // Disable if: past date OR legacy unavailable OR (unavailable/zero rooms AND not selecting check-out)
            const isDisabled = isPast || fromLegacyUnavailable || ((hasZeroRooms || notAvailable) && !isSelectingCheckOut);
            const isSelected =
              (range.start && isSameDay(day, range.start)) ||
              (range.end && isSameDay(day, range.end));
            const isInSelectedRange = range.start && range.end && isInRange(day, range.start, range.end);
            const isToday = isSameDay(day, today);
            const isHoveredRange = range.start && !range.end && hovered && isInRange(day, range.start, hovered);

            const minRate = fromMap?.minRate ?? null;
            const finalPrice = fromMap?.finalPrice ?? null;
            const type = fromMap?.type ?? null;

            return (
              <button
                key={cidx}
                type="button"
                disabled={isDisabled}
                onClick={() => onDateClick(day)}
                onMouseEnter={() => setHovered(day)}
                onMouseLeave={() => setHovered(null)}
                className={
                  "h-12 flex flex-col items-center justify-center rounded-lg text-sm transition-all " +
                  (isDisabled
                    ? "bg-gray-50 text-gray-300 cursor-not-allowed "
                    : isSelected
                    ? "bg-[#003580] text-white font-semibold "
                    : isInSelectedRange || isHoveredRange
                    ? "bg-blue-100 text-[#003580] "
                    : (hasZeroRooms || (isUnavailable && !fromLegacyUnavailable)) && isSelectingCheckOut
                    ? "bg-yellow-50 text-gray-600 border border-yellow-300 hover:bg-yellow-100 cursor-pointer "
                    : "hover:bg-blue-50 cursor-pointer ") +
                  (isToday && !isSelected ? "ring-2 ring-[#003580] ring-opacity-40 " : "")
                }
              >
                <span className="font-medium">{day.getDate()}</span>
                {/* Price logic - show prices for available dates or dates with 0 rooms when selecting check-out */}
                {(!isUnavailable || (hasZeroRooms && isSelectingCheckOut)) && (
                  <span className="text-[10px] text-gray-500">
                    {finalPrice != null ? (
                      type === 'offer' ? (
                        <>
                          <span className="font-semibold text-green-500">{formatINR(finalPrice)}</span>
                        </>
                      ) : (
                        <span className="font-semibold">{formatINR(finalPrice)}</span>
                      )
                    ) : (
                      minRate ? <span>{formatINR(minRate)}</span> : null
                    )}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const monthsToShow = isMobile ? 2 : 2;
  const visibleMonths = [];
  for (let i = 0; i < monthsToShow; i++) {
    visibleMonths.push(renderMonth(addMonths(baseMonth, i)));
  }

  return (
    <div className="fixed inset-0 bg-black/10 bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Select dates</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition">
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          {/* Navigation */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => {
                const newMonth = addMonths(baseMonth, -1);
                setBaseMonth(newMonth);
                // Trigger month navigation for previous month
                if (onMonthNavigation) {
                  onMonthNavigation(newMonth.getMonth() + 1, newMonth.getFullYear());
                }
              }}
              disabled={baseMonth.getMonth() === today.getMonth() && baseMonth.getFullYear() === today.getFullYear()}
              className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={24} />
            </button>
            <button
              onClick={() => {
                const newMonth = addMonths(baseMonth, 1);
                setBaseMonth(newMonth);
                // Trigger month navigation for next month
                if (onMonthNavigation) {
                  onMonthNavigation(newMonth.getMonth() + 1, newMonth.getFullYear());
                }
              }}
              className="p-2 rounded-full hover:bg-gray-100"
            >
              <ChevronRight size={24} />
            </button>
          </div>

          {/* Calendar months */}
          <div className={`flex ${isMobile ? 'flex-col' : 'flex-row'} gap-8`}>
            {visibleMonths}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Main Booking Widget Component ----
export default function ReservationBookingWidget({
  calendarData = {},
  unavailableDates = [],
  onBookNow,
  propertyDetails,
  range: controlledRange,
  onRangeChange,
  onMonthNavigation,
  onAuthRequired, // Optional callback when auth is required
  initialGuests, // Optional initial guests state
  initialRooms // Optional initial rooms state
}) {
  const [internalRange, setInternalRange] = useState({ start: null, end: null });
  const range = controlledRange ?? internalRange;
  const updateRange = (next) => (onRangeChange ? onRangeChange(next) : setInternalRange(next));

  const [guests, setGuests] = useState(initialGuests || { adults: 1, children: 0 });
  const [rooms, setRooms] = useState(initialRooms || 1);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showGuestDropdown, setShowGuestDropdown] = useState(false);
  const [showRoomDropdown, setShowRoomDropdown] = useState(false);

  const guestDropdownRef = useRef(null);
  const roomDropdownRef = useRef(null);

  // Update guests and rooms when initial values are provided (e.g., after login restore)
  useEffect(() => {
    if (initialGuests) {
      setGuests(initialGuests);
    }
  }, [initialGuests]);

  useEffect(() => {
    if (initialRooms) {
      setRooms(initialRooms);
    }
  }, [initialRooms]);

  // Detect role from current route
  const currentRole = detectRoleFromRoute();
  
  // Check authentication status (Best Practice: Validate with expiration check)
  const userAuth = useSelector((state) => state.userAuth);
  const agentAuth = useSelector((state) => state.agentAuth);
  
  // Select auth based on current role
  let selectedAuth = null;
  if (currentRole === 'user') {
    selectedAuth = userAuth;
  } else if (currentRole === 'agent') {
    selectedAuth = agentAuth;
  }
  
  const authStatus = validateAuth(
    currentRole === 'user' ? userAuth : null,
    currentRole === 'agent' ? agentAuth : null
  );
  console.log(authStatus);
  const isLoggedIn = authStatus.isAuthenticated;

  const navigate = useNavigate();
  const location = useLocation();


  console.log(calendarData)
  const formatPropertyTime = (timeString) => {
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

  const propertyCheckInTime = propertyDetails?.checkInTime || "14:00";
  const propertyCheckOutTime = propertyDetails?.checkOutTime || "11:00";
  const displayCheckInTime = formatPropertyTime(propertyCheckInTime);
  const displayCheckOutTime = formatPropertyTime(propertyCheckOutTime);



  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (guestDropdownRef.current && !guestDropdownRef.current.contains(event.target)) {
        setShowGuestDropdown(false);
      }
      if (roomDropdownRef.current && !roomDropdownRef.current.contains(event.target)) {
        setShowRoomDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const calculateNights = () => {
    if (!range.start || !range.end) return 0;
    const diffTime = Math.abs(range.end - range.start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Calculate minimum price from calendar data
  const getMinimumPrice = () => {
    if (!calendarData || Object.keys(calendarData).length === 0) {
      return propertyDetails?.roomTypes?.[0]?.basePrice || 0;
    }
    
    const prices = Object.values(calendarData)
      .map(dateData => dateData?.minimumPrice || dateData?.finalPrice || dateData?.basePrice)
      .filter(price => price && price > 0);
    
    return prices.length > 0 ? Math.min(...prices) : (propertyDetails?.roomTypes?.[0]?.basePrice || 0);
  };

  const basePrice = getMinimumPrice();

  const calculateTotal = () => {
    const nights = calculateNights();
    return basePrice * rooms * nights;
  };

  const maxRooms = propertyDetails?.roomTypes?.reduce((sum, rt) => sum + (rt.rooms?.length || 0), 0) || 10;

  return (
    <>
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        {/* Price header */}
        <div className="bg-gradient-to-r from-orange-50 to-yellow-50 px-6 py-4 border-b">
          <div className="flex flex-col gap-1">
            <div className="flex items-baseline gap-2">
              <span className="text-sm text-gray-600">Price starts from</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-gray-900">₹{basePrice.toLocaleString('en-IN')}</span>
              <span className="text-sm text-gray-600">per night + taxes</span>
            </div>
          </div>
        </div>

        {/* Booking form */}
        <div className="p-6 space-y-4">
          {(displayCheckInTime || displayCheckOutTime) && (
            <div className="flex items-center justify-between text-xs text-gray-500">
              {displayCheckInTime && <span>Check-in: {displayCheckInTime}</span>}
              {displayCheckOutTime && <span>Check-out: {displayCheckOutTime}</span>}
            </div>
          )}
          {/* Check-in / Check-out */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setShowCalendar(true)}
              className="flex flex-col p-3 border border-gray-300 rounded-lg hover:border-[#003580] transition text-left"
            >
              <span className="text-xs text-gray-600 mb-1">Check-in</span>
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-gray-400" />
                <span className="text-sm font-medium">
                  {range.start ? formatDateShort(range.start) : "Add date"}
                </span>
              </div>
              {displayCheckInTime && (
                <span className="text-xs text-gray-500 mt-1">
                  Standard: {displayCheckInTime}
                </span>
              )}
            </button>

            <button
              onClick={() => setShowCalendar(true)}
              className="flex flex-col p-3 border border-gray-300 rounded-lg hover:border-[#003580] transition text-left"
            >
              <span className="text-xs text-gray-600 mb-1">Check-out</span>
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-gray-400" />
                <span className="text-sm font-medium">
                  {range.end ? formatDateShort(range.end) : "Add date"}
                </span>
              </div>
              {displayCheckOutTime && (
                <span className="text-xs text-gray-500 mt-1">
                  Standard: {displayCheckOutTime}
                </span>
              )}
            </button>
          </div>

          {/* Guests dropdown */}
          <div className="relative" ref={guestDropdownRef}>
            <button
              onClick={() => setShowGuestDropdown(!showGuestDropdown)}
              className="w-full flex items-center justify-between p-3 border border-gray-300 rounded-lg hover:border-[#003580] transition"
            >
              <div className="flex items-center gap-2">
                <Users size={16} className="text-gray-400" />
                <div className="text-left">
                  <div className="text-xs text-gray-600">Guests</div>
                  <div className="text-sm font-medium">
                    {guests.adults} Adult{guests.adults > 1 ? 's' : ''}, {guests.children} Child{guests.children !== 1 ? 'ren' : ''}
                  </div>
                </div>
              </div>
              <svg className={`w-5 h-5 transition-transform ${showGuestDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showGuestDropdown && (
              <div className="absolute top-full mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-10 p-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Adults</span>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setGuests({...guests, adults: Math.max(1, guests.adults - 1)})}
                        className="w-8 h-8 rounded-full border border-gray-300 hover:border-[#003580] flex items-center justify-center"
                      >
                        -
                      </button>
                      <span className="w-8 text-center font-medium">{guests.adults}</span>
                      <button
                        onClick={() => setGuests({...guests, adults: guests.adults + 1})}
                        className="w-8 h-8 rounded-full border border-gray-300 hover:border-[#003580] flex items-center justify-center"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Children</span>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setGuests({...guests, children: Math.max(0, guests.children - 1)})}
                        className="w-8 h-8 rounded-full border border-gray-300 hover:border-[#003580] flex items-center justify-center"
                      >
                        -
                      </button>
                      <span className="w-8 text-center font-medium">{guests.children}</span>
                      <button
                        onClick={() => setGuests({...guests, children: guests.children + 1})}
                        className="w-8 h-8 rounded-full border border-gray-300 hover:border-[#003580] flex items-center justify-center"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Rooms dropdown */}
          <div className="relative" ref={roomDropdownRef}>
            <button
              onClick={() => setShowRoomDropdown(!showRoomDropdown)}
              className="w-full flex items-center justify-between p-3 border border-gray-300 rounded-lg hover:border-[#003580] transition"
            >
              <div className="flex items-center gap-2">
                <Home size={16} className="text-gray-400" />
                <div className="text-left">
                  <div className="text-xs text-gray-600">No. of Rooms</div>
                  <div className="text-sm font-medium">{rooms} Room{rooms > 1 ? 's' : ''}</div>
                </div>
              </div>
              <svg className={`w-5 h-5 transition-transform ${showRoomDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showRoomDropdown && (
              <div className="absolute top-full mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-10 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Rooms</span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setRooms(Math.max(1, rooms - 1))}
                      className="w-8 h-8 rounded-full border border-gray-300 hover:border-[#003580] flex items-center justify-center"
                    >
                      -
                    </button>
                    <span className="w-8 text-center font-medium">{rooms}</span>
                    <button
                      onClick={() => setRooms(Math.min(maxRooms, rooms + 1))}
                      className="w-8 h-8 rounded-full border border-gray-300 hover:border-[#003580] flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

        

          {/* Apply button */}
          <button
            disabled={!range.start || !range.end}
            onClick={() => {
              // Best Practice: Validate authentication before proceeding
              if (!isLoggedIn) {
                // Save booking state before redirecting to login
                const propertyId = propertyDetails?.id || location.pathname.split('/').pop();
                saveBookingState({
                  checkIn: range.start,
                  checkOut: range.end,
                  guests,
                  rooms,
                  propertyId
                });
                
                // Save return URL (current page)
                saveReturnUrl(location.pathname + location.search);

                // Handle expired token case
                if (authStatus.needsRefresh) {
                  if (onAuthRequired) {
                    onAuthRequired({ reason: 'token_expired' });
                  } else {
                    // Navigate to login page
                    navigate('/login');
                  }
                } else {
                  // No token - user needs to login
                  if (onAuthRequired) {
                    onAuthRequired({ reason: 'not_authenticated' });
                  } else {
                    // Navigate to login page
                    navigate('/login');
                  }
                }
                return;
              }

              // User is authenticated and token is valid, proceed with booking
              // Note: Backend will still validate the token on API calls
              if (onBookNow) {
                onBookNow({
                  checkIn: range.start,
                  checkOut: range.end,
                  guests,
                  rooms,
                  nights: calculateNights()
                });
              }
            }}
            className="w-full bg-[#003580] hover:bg-[#00224d] disabled:bg-gray-300 text-white py-3 rounded-lg font-semibold text-base transition-colors disabled:cursor-not-allowed"
          >
            {isLoggedIn ? "Apply Now" : "Please login and continue"}
          </button>


          <button>
            <span className="text-xs text-gray-500">CONTACT US</span>
          </button>
        </div>
      </div>

      {/* Calendar Popup */}
      {showCalendar && (
        <CalendarPopup
          calendarData={calendarData}
          unavailableDates={unavailableDates}
          range={range}
          setRange={updateRange}
          onClose={() => setShowCalendar(false)}
          onMonthNavigation={onMonthNavigation}
        />
      )}
    </>
  );
}