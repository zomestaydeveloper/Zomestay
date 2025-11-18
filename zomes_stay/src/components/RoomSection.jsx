import React, { useState, useEffect, useMemo } from "react";
import { Plus, Minus, Users, BedDouble, Check, ChevronDown, ChevronUp } from "lucide-react";
import { bookingDataService } from "../services";
import paymentService from "../services/paymentService";
import { useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";

const RoomSection = ({ propertyId, range, party }) => {


 

  const navigate = useNavigate();
  const { pathname } = useLocation();
  
  // Get Redux state based on current URL context
  const userAuth = useSelector((state) => state.userAuth);
  const agentAuth = useSelector((state) => state.agentAuth);
  
  // Determine if we're in agent context based on URL
  const isAgentContext = pathname?.startsWith('/app/agent') ?? false;
  
  // Get guest information based on current route context
  const getGuestInfo = () => {
    if (isAgentContext) {
      // Agent route - get from agentAuth
      const firstName = agentAuth?.first_name || '';
      const lastName = agentAuth?.last_name || '';
      const fullName = `${firstName} ${lastName}`.trim() || 'Agent';
      
      return {
        id: agentAuth?.id || '',
        name: fullName,
        email: agentAuth?.email || '',
        phone: agentAuth?.phone || ''
      };
    } else {
      // User route - get from userAuth
      const firstName = userAuth?.first_name || '';
      const lastName = userAuth?.last_name || '';
      const fullName = `${firstName} ${lastName}`.trim() || 'User';
      
      return {
        id: userAuth?.id || '',
        name: fullName,
        email: userAuth?.email || '',
        phone: userAuth?.phone || ''
      };
    }
  };
  
  const guestInfo = getGuestInfo();
  const [roomData, setRoomData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [bookings, setBookings] = useState({});

  console.log(bookings);
  const [showCalc, setShowCalc] = useState({});
  const [requestedGuests, setRequestedGuests] = useState(0);
  const [requestedRooms, setRequestedRooms] = useState(0);
  const [requestedChildren, setRequestedChildren] = useState(0);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [agentRates, setAgentRates] = useState(null); // Store agent discount info
  
  // Track which room type cards are selected by user
  const [selectedCards, setSelectedCards] = useState(new Set());
  
  // Track which room types are expanded (accordion state)
  const [expandedRooms, setExpandedRooms] = useState(new Set());
  
  // Modal state for notifications
  const [modal, setModal] = useState({
    show: false,
    type: 'error', // 'error', 'success', 'warning'
    title: '',
    message: ''
  });

  const createMapdata = (data) => {
    if (!data || !Array.isArray(data)) {
      return [];
    }
    
    const filteredData = data.map(item => {
      // Filter out dates that only contain `date`
      const filteredRatePlans = item.ratePlanDates?.filter(ratePlan =>
        Object.keys(ratePlan).some(key => key !== 'date')
      ) || [];
  
      // Return updated room object with filtered ratePlanDates
      return {
        ...item,
        ratePlanDates: filteredRatePlans
      };
    });
  
    return filteredData;
  };

  const getCommonMealPlans = (ratePlanDates) => {
    if (!ratePlanDates || ratePlanDates.length === 0) return [];
    
    const firstDate = ratePlanDates[0];
    const mealPlans = Object.keys(firstDate).filter(key => key !== 'date');
    
    return mealPlans.filter(plan => 
      ratePlanDates.every(date => date[plan] && date[plan].price)
    );
  };

  const getMealPlanInfo = (ratePlanDates, planKind) => {
    if (!ratePlanDates || ratePlanDates.length === 0) return null;
    
    // Get meal plan info from the first available date
    const firstDate = ratePlanDates.find(date => date[planKind]);
    if (firstDate && firstDate[planKind]) {
      const plan = firstDate[planKind];
      return {
        name: plan.name,
        description: plan.description,
        price: plan.price || plan.doubleOccupancyPrice || plan.singleOccupancyPrice || 0
      };
    }
    return null;
  };

  const availableRoomTypes = useMemo(() => {
   
    if (!roomData) return [];
    return roomData.filter(room => {
      const commonPlans = getCommonMealPlans(room.ratePlanDates);
      return commonPlans.length > 0;
    });
  }, [roomData]);

// console.log(availableRoomTypes);
  

  // Initialize bookings when room data is loaded
  useEffect(() => {
    if (availableRoomTypes.length > 0 && requestedGuests > 0) {
      const initialBookings = {};
      availableRoomTypes.forEach((room, index) => {
        initialBookings[room.roomTypeId] = initializeBooking(room.roomTypeId, index);
      });
      setBookings(initialBookings);
      
      // Auto-select the first card
      if (availableRoomTypes.length > 0) {
        setSelectedCards(new Set([availableRoomTypes[0].roomTypeId]));
      }
    }
  }, [availableRoomTypes, requestedGuests, requestedRooms]);

  const initializeBooking = (roomTypeId, roomIndex = 0) => {
    const room = availableRoomTypes.find(r => r.roomTypeId === roomTypeId);
    const commonPlans = getCommonMealPlans(room.ratePlanDates);
    
    // Only the first room type gets pre-filled with booking data
    // All other room types start with 0 rooms (unselected)
    if (roomIndex === 0) {
      // Calculate rooms needed for requested guests
      const maxGuestsPerRoom = room.maxOccupancy;
      const roomsNeeded = Math.ceil(requestedGuests / maxGuestsPerRoom);
      const finalRooms = Math.min(roomsNeeded, room.availableRooms, requestedRooms);
      
      // Calculate guests for this room type
      const guestsForThisRoom = Math.min(requestedGuests, finalRooms * maxGuestsPerRoom);
      const finalGuests = Math.max(room.minOccupancy, guestsForThisRoom);
      
      return {
        mealPlan: commonPlans[0],
        guests: finalGuests,
        children: requestedChildren,
        rooms: finalRooms,
        extraGuests: []
      };
    } else {
      // All other room types start unselected (0 rooms)
      return {
        mealPlan: commonPlans[0],
        guests: room.occupancy,
        children: 0,
        rooms: 0,
        extraGuests: []
      };
    }
  };

  const getBooking = (roomTypeId) => {
    if (!bookings[roomTypeId]) {
      // Find the index of this room type to determine if it should get default values
      const roomIndex = availableRoomTypes.findIndex(room => room.roomTypeId === roomTypeId);
      return initializeBooking(roomTypeId, roomIndex);
    }
    return bookings[roomTypeId];
  };

  const updateBooking = (roomTypeId, updates) => {
    setBookings(prev => ({
      ...prev,
      [roomTypeId]: {
        ...getBooking(roomTypeId),
        ...updates
      }
    }));
  };

  // Toggle card selection - click to select/deselect room type cards
  const toggleCardSelection = (roomTypeId) => {
    setSelectedCards(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(roomTypeId)) {
        // If already selected, deselect it (set rooms to 0)
        newSelected.delete(roomTypeId);
        updateBooking(roomTypeId, { rooms: 0, guests: 0, children: 0, extraGuests: [] });
        // Collapse accordion when deselected
        setExpandedRooms(prev => {
          const newExpanded = new Set(prev);
          newExpanded.delete(roomTypeId);
          return newExpanded;
        });
      } else {
        // If not selected, select it (set to minimum values)
        newSelected.add(roomTypeId);
        const room = availableRoomTypes.find(r => r.roomTypeId === roomTypeId);
        updateBooking(roomTypeId, { 
          rooms: 1, 
          guests: room.minOccupancy, 
          children: 0, 
          extraGuests: [] 
        });
        // Auto-expand accordion when selected
        setExpandedRooms(prev => new Set(prev).add(roomTypeId));
      }
      return newSelected;
    });
  };

  // Toggle accordion expansion
  const toggleRoomExpansion = (roomTypeId, e) => {
    e?.stopPropagation(); // Prevent card selection when clicking expand button
    setExpandedRooms(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(roomTypeId)) {
        newExpanded.delete(roomTypeId);
      } else {
        newExpanded.add(roomTypeId);
      }
      return newExpanded;
    });
  };

  // Show notification modal
  const showModal = (type, title, message) => {
    setModal({
      show: true,
      type,
      title,
      message
    });
    
    // Auto-close after 3 seconds
    setTimeout(() => {
      setModal(prev => ({ ...prev, show: false }));
    }, 3000);
  };

  // Check if user is trying to exceed room capacity limits
  const checkCapacityLimits = (room, newGuests, newChildren, newRooms) => {
    const totalGuests = newGuests + newChildren;
    const maxCapacity = newRooms * room.maxOccupancy;
    
    // Don't allow more guests than room capacity
    if (totalGuests > maxCapacity) {
      return {
        allowed: false,
        message: `Maximum ${maxCapacity} guests allowed for ${newRooms} room(s)`
      };
    }
    
    // Don't allow more rooms than available
    if (newRooms > room.availableRooms) {
      return {
        allowed: false,
        message: `Only ${room.availableRooms} room(s) available`
      };
    }
    
    return { allowed: true };
  };

  const calculatePriceDetails = (room, booking) => {
    const details = [];
    let totalPrice = 0;

    room.ratePlanDates.forEach(dateData => {
      const planData = dateData[booking.mealPlan];
      if (!planData) return;

      // Calculate total price for all rooms using your logic
      let totalPriceForDate = 0;
      const breakdown = [];

      // Step 1: Calculate total occupancy
      const totalOccupancy = booking.guests + booking.children;
      
      // Step 2: Calculate required rooms
      const requiredRooms = Math.ceil(totalOccupancy / room.maxOccupancy);
      

      // Step 3: Calculate extra persons
      const baseOccupancy = room.occupancy * booking.rooms;
      const extraPersons = Math.max(0, totalOccupancy - baseOccupancy);
      
      // Base price for all rooms (each room gets base double occupancy)
      const basePriceForAllRooms = planData.doubleOccupancyPrice * booking.rooms;
      totalPriceForDate += basePriceForAllRooms;
      breakdown.push('Base Double Occupancy (' + booking.rooms + ' rooms): Rs.' + basePriceForAllRooms);
      
      // Step 4: Calculate extra bed charges with optimization
      // Calculate total people and how many exceed base occupancy
      const totalPeople = booking.guests + booking.children;
      const totalExtraPersons = Math.max(0, totalPeople - baseOccupancy);
      
      // Calculate how many extra adults and children are needed
      let extraAdults = Math.max(0, booking.guests - baseOccupancy);
      let extraChildren = Math.max(0, booking.children - Math.max(0, baseOccupancy - booking.guests));
      
      
      // Calculate extra bed charges for adults and children separately
      if (extraAdults > 0) {
        const adultExtraPrice = planData.extraBedPriceAdult * extraAdults;
        totalPriceForDate += adultExtraPrice;
        breakdown.push('Extra Bed (Adult): Rs.' + adultExtraPrice);
      }
      
      if (extraChildren > 0) {
        const childExtraPrice = planData.extraBedPriceChild * extraChildren;
        totalPriceForDate += childExtraPrice;
        breakdown.push('Extra Bed (Child): Rs.' + childExtraPrice);
      }

      const dateTotal = totalPriceForDate;
      totalPrice += dateTotal;

      details.push({
        date: dateData.date,
        mealPlan: booking.mealPlan,
        guestsPerRoom: Math.ceil((booking.guests + booking.children) / booking.rooms),
        breakdown: breakdown,
        pricePerRoom: totalPriceForDate / booking.rooms,
        dateTotal: dateTotal
      });
    });

    return { details, totalPrice };
  };

  const calculatePrice = (room, booking) => {
    return calculatePriceDetails(room, booking).totalPrice;
  };

  // Calculate tax based on room rate per room
  // Tax rule: If room rate <= 7500, tax is 5%, if > 7500, tax is 18%
  const calculateTaxForRoom = (roomBaseRate) => {
    if (!roomBaseRate || roomBaseRate <= 0) return 0;
    
    const taxPercentage = roomBaseRate <= 7500 ? 5 : 18;
    return (roomBaseRate * taxPercentage) / 100;
  };

  // Calculate tax for a room type based on per-room base rate and number of rooms
  // This calculates tax for each room separately and sums them
  const calculateTaxForRoomType = (room, booking) => {
    if (!booking.rooms || booking.rooms <= 0) return { taxAmount: 0, taxDetails: [] };
    
    // Get the base rate per room per date (double occupancy price)
    const firstDateData = room.ratePlanDates?.[0];
    const planData = firstDateData?.[booking.mealPlan];
    if (!planData || !planData.doubleOccupancyPrice) return { taxAmount: 0, taxDetails: [] };
    
    const roomBaseRate = planData.doubleOccupancyPrice;
    const taxPerRoom = calculateTaxForRoom(roomBaseRate);
    
    // Calculate tax for all dates
    let totalTax = 0;
    const taxDetails = [];
    
    room.ratePlanDates.forEach(dateData => {
      const datePlanData = dateData[booking.mealPlan];
      if (!datePlanData) return;
      
      const dateRoomBaseRate = datePlanData.doubleOccupancyPrice || roomBaseRate;
      const dateTaxPerRoom = calculateTaxForRoom(dateRoomBaseRate);
      const dateTaxTotal = dateTaxPerRoom * booking.rooms;
      totalTax += dateTaxTotal;
      
      taxDetails.push({
        date: dateData.date,
        roomBaseRate: dateRoomBaseRate,
        taxPercentage: dateRoomBaseRate <= 7500 ? 5 : 18,
        taxPerRoom: dateTaxPerRoom,
        numberOfRooms: booking.rooms,
        taxAmount: dateTaxTotal
      });
    });
    
    return { taxAmount: totalTax, taxDetails };
  };

  // Calculate price with tax included
  const calculatePriceWithTax = (room, booking) => {
    const basePrice = calculatePrice(room, booking);
    const { taxAmount } = calculateTaxForRoomType(room, booking);
    return {
      basePrice,
      taxAmount,
      totalPrice: basePrice + taxAmount
    };
  };

  const handleGuestChange = (room, currentBooking, delta) => {
    const newGuests = Math.max(room.minOccupancy, currentBooking.guests + delta);
    const maxPossibleGuests = currentBooking.rooms * room.maxOccupancy;
    
    // Check capacity limits before making changes
    const capacityCheck = checkCapacityLimits(room, newGuests, currentBooking.children, currentBooking.rooms);
    if (!capacityCheck.allowed) {
      showModal('warning', 'Capacity Limit Exceeded', capacityCheck.message);
      return;
    }
    
    if (newGuests > maxPossibleGuests) {
      const roomsNeeded = Math.ceil(newGuests / room.maxOccupancy);
      if (roomsNeeded <= room.availableRooms) {
        updateBooking(room.roomTypeId, {
          guests: newGuests,
          rooms: roomsNeeded,
          extraGuests: calculateExtraGuests(room, newGuests, roomsNeeded, currentBooking.children)
        });
      } else {
        showModal('warning', 'Room Limit Exceeded', `Only ${room.availableRooms} room(s) available`);
      }
    } else {
      updateBooking(room.roomTypeId, {
        guests: newGuests,
        extraGuests: calculateExtraGuests(room, newGuests, currentBooking.rooms, currentBooking.children)
      });
    }
  };

  const handleChildrenChange = (room, currentBooking, delta) => {
    const newChildren = Math.max(0, currentBooking.children + delta);
    const totalGuests = currentBooking.guests + newChildren;
    const maxPossibleGuests = currentBooking.rooms * room.maxOccupancy;
    
    // Check capacity limits before making changes
    const capacityCheck = checkCapacityLimits(room, currentBooking.guests, newChildren, currentBooking.rooms);
    if (!capacityCheck.allowed) {
      showModal('warning', 'Limit Exceeded',capacityCheck.message);
      return;
    }
    
    if (totalGuests > maxPossibleGuests) {
      const roomsNeeded = Math.ceil(totalGuests / room.maxOccupancy);
      if (roomsNeeded <= room.availableRooms) {
        updateBooking(room.roomTypeId, {
          children: newChildren,
          rooms: roomsNeeded,
          extraGuests: calculateExtraGuests(room, currentBooking.guests, roomsNeeded, newChildren)
        });
      } else {
        showModal('warning', 'Room Limit Exceeded', `Only ${room.availableRooms} room(s) available`);
      }
    } else {
      updateBooking(room.roomTypeId, {
        children: newChildren,
        extraGuests: calculateExtraGuests(room, currentBooking.guests, currentBooking.rooms, newChildren)
      });
    }
  };

  // Payment handler function
  const handlePayment = async () => {
    setPaymentLoading(true);
    
    try {
      // Calculate total price with tax for selected cards
      const calculatedTotals = Array.from(selectedCards).reduce((acc, roomTypeId) => {
        const room = availableRoomTypes.find(r => r.roomTypeId === roomTypeId);
        const booking = bookings[roomTypeId];
        if (room && booking) {
          const basePrice = calculatePrice(room, booking);
          const { taxAmount } = calculateTaxForRoomType(room, booking);
          return {
            baseTotal: acc.baseTotal + basePrice,
            taxTotal: acc.taxTotal + taxAmount,
            total: acc.total + basePrice + taxAmount
          };
        }
        return acc;
      }, { baseTotal: 0, taxTotal: 0, total: 0 });

      // Apply agent discount if applicable (only to base price, not tax)
      let finalSubtotal = calculatedTotals.baseTotal;
      if (agentRates) {
        if (agentRates.type === 'percentage') {
          finalSubtotal = calculatedTotals.baseTotal * (1 - agentRates.discount / 100);
        } else {
          finalSubtotal = Math.max(0, calculatedTotals.baseTotal - agentRates.discount);
        }
      }
      
      const totalPrice = finalSubtotal + calculatedTotals.taxTotal;
      
      if (totalPrice <= 0) {
        showModal('warning', 'Limit Exceeded','Please select at least one room to proceed with payment.');
        setPaymentLoading(false);
        return;
      }

      // Calculate totals from selected bookings only
      const selectedBookings = Array.from(selectedCards)
        .map(roomTypeId => bookings[roomTypeId])
        .filter(booking => booking && booking.rooms > 0);
      
      const totalGuests = selectedBookings.reduce((sum, booking) => sum + (booking.guests || 0), 0);
      const totalChildren = selectedBookings.reduce((sum, booking) => sum + (booking.children || 0), 0);
      const totalRooms = selectedBookings.reduce((sum, booking) => sum + (booking.rooms || 0), 0);
       
      // Prepare room selections for the order - Only include selected room types with rooms > 0
      const roomSelections = Array.from(selectedCards)
        .filter(roomTypeId => {
          const booking = bookings[roomTypeId];
          return booking && booking.rooms > 0;
        })
        .map(roomTypeId => {
          const room = availableRoomTypes.find(r => r.roomTypeId === roomTypeId);
          const booking = bookings[roomTypeId];
          if (room && booking) {
          // Get actual room IDs from availableRoomsForEntireStay
          const selectedRoomIds = room.availableRoomsForEntireStay
            .slice(0, booking.rooms) // Take only the number of rooms needed
            .map(room => room.id);
          
          // Get meal plan ID from ratePlanDates
          const mealPlanId = room.ratePlanDates?.[0]?.[booking.mealPlan]?.mealPlanId || booking.mealPlan;
          
          // Calculate dates for blocking - use date strings to avoid timezone issues
          const checkInStr = range?.start ? range.start.toLocaleDateString('en-CA') : new Date().toLocaleDateString('en-CA');
          const checkOutStr = range?.end ? range.end.toLocaleDateString('en-CA') : new Date(Date.now() + 24*60*60*1000).toLocaleDateString('en-CA');

          // Build UTC-midnight Date objects to avoid timezone drift when converting to strings
          const checkInDateUTC = new Date(`${checkInStr}T00:00:00Z`);
          const checkOutDateUTC = new Date(`${checkOutStr}T00:00:00Z`);

          console.log("checkInStr", checkInStr, "checkOutStr", checkOutStr);
          console.log("checkInDateUTC", checkInDateUTC);
          console.log("checkOutDateUTC", checkOutDateUTC);

          // Generate array of dates to block (including check-in day, excluding check-out day)
          const datesToBlock = [];
          const currentDateUTC = new Date(checkInDateUTC);
          while (currentDateUTC < checkOutDateUTC) {
            datesToBlock.push(currentDateUTC.toISOString().split('T')[0]);
            currentDateUTC.setUTCDate(currentDateUTC.getUTCDate() + 1);
          }

          console.log("datesToBlock", datesToBlock);

          const roomBasePrice = calculatePrice(room, booking);
          const { taxAmount: roomTax } = calculateTaxForRoomType(room, booking);
          
          return {
            roomTypeId: room.roomTypeId,
            roomTypeName: room.roomTypeName,
            roomIds: selectedRoomIds, // Array of actual room IDs
            rooms: booking.rooms,
            guests: booking.guests,
            children: booking.children,
            mealPlan: booking.mealPlan,
            mealPlanId: mealPlanId, // Actual meal plan ID
            price: roomBasePrice,
            tax: roomTax,
            totalPrice: roomBasePrice + roomTax,
            // ✅ NEW: Add dates for blocking
            checkIn: checkInStr, // YYYY-MM-DD format
            checkOut: checkOutStr, // YYYY-MM-DD format
            datesToBlock
          };
        }
        return null;
      }).filter(Boolean);

   //   console.log("Sending roomSelections to createOrder:", roomSelections);

      // Determine role based on context
      const role = isAgentContext ? 'agent' : 'user';
      
      // Create Razorpay order with calculated totals
      const orderResponse = await paymentService.createOrder({
        amount: totalPrice,
        currency: 'INR',
        bookingDetails: {
          propertyId,
          checkIn: range?.start ? range.start.toLocaleDateString('en-CA') : new Date().toLocaleDateString('en-CA'),
          checkOut: range?.end ? range.end.toLocaleDateString('en-CA') : new Date(Date.now() + 24*60*60*1000).toLocaleDateString('en-CA'),
          guests: totalGuests,
          children: totalChildren,
          rooms: totalRooms,
          // Guest details from Redux store (based on current URL context)
          guestId: guestInfo.id,
          guestName: guestInfo.name,
          guestEmail: guestInfo.email,
          guestPhone: guestInfo.phone,
          // Role information for payment creation
          role: role // 'agent' or 'user'
        },
        roomSelections: roomSelections
      });

      if (!orderResponse.success) {
        throw new Error(orderResponse.message || 'Failed to create payment order');
      }

      // Load Razorpay script
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => {
        const options = {
          key: orderResponse.data.key,
          amount: orderResponse.data.amount,
          currency: orderResponse.data.currency,
          order_id: orderResponse.data.orderId,
          name: 'Zomes Stay',
          description: 'Hotel Booking Payment',
          handler: async function (response) {
            try {
              // PRODUCTION: Payment success - now poll booking status via webhook
              // Webhook will process payment automatically, we just need to wait for booking
              
              console.log('Payment successful, waiting for webhook to process booking...', {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
              });

              // Show processing message
              showModal('info', 'Processing Payment', 'Payment received! We are processing your booking. Please wait...');

              // Poll booking status until booking is confirmed or timeout
              // PRODUCTION: Poll every 2 seconds for up to 60 seconds (30 attempts)
              const pollingResult = await paymentService.pollBookingStatus(
                response.razorpay_order_id,
                30, // maxAttempts: 30 attempts
                2000 // intervalMs: 2 seconds = 60 seconds total
              );

              if (pollingResult.success && pollingResult.data?.booking) {
                // Booking confirmed - redirect to success page
                console.log('Booking confirmed via webhook', {
                  bookingId: pollingResult.data.booking.id,
                  bookingNumber: pollingResult.data.booking.bookingNumber,
                  attempts: pollingResult.attempts,
                });

                navigate('/app/booking-success', {
                  state: {
                    paymentId: response.razorpay_payment_id,
                    orderId: response.razorpay_order_id,
                    bookingId: pollingResult.data.booking.id,
                    bookingNumber: pollingResult.data.booking.bookingNumber,
                    propertyId,
                    bookingDetails: bookings,
                    totalPrice
                  }
                });
              } else {
                // Booking not confirmed yet or order failed
                const errorMessage = pollingResult.error || 'Booking is taking longer than expected. Please check your bookings or contact support.';
                
                console.error('Booking not confirmed', {
                  orderId: response.razorpay_order_id,
                  error: pollingResult.error,
                  attempts: pollingResult.attempts,
                  orderStatus: pollingResult.data?.orderStatus,
                });

                // Check if order failed/expired/cancelled
                if (pollingResult.data?.orderStatus && 
                    ['FAILED', 'EXPIRED', 'CANCELLED'].includes(pollingResult.data.orderStatus)) {
                  navigate('/app/booking-failure', {
                    state: {
                      message: `Order ${pollingResult.data.orderStatus.toLowerCase()}`,
                      error: errorMessage,
                      propertyId,
                      orderId: response.razorpay_order_id,
                    }
                  });
                } else {
                  // Still pending - show message and redirect to home with message
                  // PRODUCTION: Booking is being processed by webhook, user will be notified
                  showModal('info', 'Payment Received', 'Your payment has been received. Your booking is being processed. We will notify you once confirmed. You can check your bookings for updates.');
                  
                  // Redirect to home after a short delay
                  setTimeout(() => {
                    navigate('/app/home', {
                      state: {
                        message: 'Payment received. Booking is being processed.',
                        orderId: response.razorpay_order_id,
                      }
                    });
                  }, 2000);
                }
              }
            } catch (error) {
              console.error('Payment processing error:', error);
              
              // Show error message
              showModal('error', 'Payment Processing Error', 'An error occurred while processing your booking. Please contact support if the payment was deducted.');
              
              navigate('/app/booking-failure', {
                state: {
                  message: 'Payment processing error',
                  error: error.message || 'An unexpected error occurred',
                  propertyId,
                  orderId: response?.razorpay_order_id,
                }
              });
            } finally {
              setPaymentLoading(false);
            }
          },
          prefill: {
            name: guestInfo?.name || 'Guest Name',
            email: guestInfo?.email || 'guest@example.com',
            contact: guestInfo?.phone || '9999999999'
          },
          notes: {
            address: 'Zomes Stay Booking'
          },
          theme: {
            color: '#3399cc'
          },
          modal: {
            ondismiss: function() {
              setPaymentLoading(false);
            //  console.log('Payment modal dismissed');
            }
          }
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      };
      
      script.onerror = () => {
        setPaymentLoading(false);
        showModal('warning', 'Limit Exceeded','Failed to load Razorpay SDK. Please check your internet connection.');
      };
      
      document.body.appendChild(script);

    } catch (error) {
      console.error('Payment error:', error);
      setPaymentLoading(false);
      navigate('/app/booking-failure', {
        state: {
          message: error.message || 'Payment failed',
          error: error.message,
          propertyId
        }
      });
    }
  };

  const handleRoomChange = (room, currentBooking, delta) => {
    const newRooms = Math.max(0, Math.min(room.availableRooms, currentBooking.rooms + delta));
    
    let newGuests;
    if (newRooms === 0) {
      // If no rooms, set guests to 0
      newGuests = 0;
    } else {
      // If rooms > 0, adjust guests based on room capacity
      const maxGuestsAllowed = newRooms * room.maxOccupancy;
      newGuests = Math.min(currentBooking.guests, maxGuestsAllowed);
      // Ensure minimum occupancy if we have rooms
      newGuests = Math.max(room.minOccupancy, newGuests);
    }
    
    // Check capacity limits before making changes
    const capacityCheck = checkCapacityLimits(room, newGuests, currentBooking.children, newRooms);
    if (!capacityCheck.allowed) {
      showModal('warning', 'Limit Exceeded',capacityCheck.message);
      return;
    }
    
    updateBooking(room.roomTypeId, {
      rooms: newRooms,
      guests: newGuests,
      extraGuests: calculateExtraGuests(room, newGuests, newRooms, currentBooking.children)
    });
  };

  const calculateExtraGuests = (room, totalGuests, numRooms, children = 0) => {
    const baseCapacity = room.occupancy * numRooms;
    const totalPeople = totalGuests + children;
    const extraCount = Math.max(0, totalPeople - baseCapacity);
    
    const extras = [];
    
    if (extraCount === 0) {
      // No extra guests needed - all fit within normal occupancy
      return extras;
    }
    
    // Calculate how many extra beds are needed
    // Priority: Adults first, then children
    let remainingExtra = extraCount;
    let extraAdults = Math.min(remainingExtra, Math.max(0, totalGuests - baseCapacity));
    let extraChildren = Math.min(remainingExtra - extraAdults, children);
    
    // Create extra beds for adults first
    for (let i = 0; i < extraAdults; i++) {
      extras.push({ type: 'adult' });
    }
    
    // Then create extra beds for children (only the excess)
    for (let i = 0; i < extraChildren; i++) {
      extras.push({ type: 'child' });
    }
    
    return extras;
  };

  const toggleExtraGuestType = (roomTypeId, index) => {
    const booking = getBooking(roomTypeId);
    const newExtras = [...booking.extraGuests];
    newExtras[index] = { 
      type: newExtras[index].type === 'adult' ? 'child' : 'adult' 
    };
    updateBooking(roomTypeId, { extraGuests: newExtras });
  };

  const toggleCalculation = (roomTypeId) => {
    setShowCalc(prev => ({
      ...prev,
      [roomTypeId]: !prev[roomTypeId]
    }));
  };

  // Fetch room data when component mounts
  useEffect(() => {
    const fetchRoomData = async () => {

     // console.log("fetching room data 1")
      if (!propertyId || !range?.start || !range?.end) return;
      
    //  console.log("fetching room data 2")

      setLoading(true);
      setError("");
      
      try {
        // Fix timezone issue by using local date strings
        const checkIn = range.start.toLocaleDateString('en-CA'); // YYYY-MM-DD format
        const checkOut = range.end.toLocaleDateString('en-CA'); // YYYY-MM-DD format
        const totalGuests = (party?.adults || 0) + (party?.children || 0);
        const totalChildren = party?.children || 0;
        const totalAdults = party?.adults || 0;
        const requestedRooms = Math.ceil(totalGuests / 2);
        
        const response = await bookingDataService.getBookingData(propertyId, {
          checkIn,
          checkOut,
          guests: totalGuests,
          rooms: requestedRooms,
          children: totalChildren || 0,
          adults: totalAdults || 0
        });
      //  console.log("response booking data")
        if (response?.data?.success) {
      //  console.log("response comes ")
          const mappedData = createMapdata(response.data.data);
          setRoomData(mappedData);
          setRequestedGuests(response.data.requestedGuests || 0);
          setRequestedRooms(response.data.requestedRooms || 0);
          setRequestedChildren(response.data.requestedChildren || 0);
          setAgentRates(response.data.agentRates || null); // Store agent discount info
        }
      } catch (err) {
        setError("Failed to load room data");
        console.error("Error fetching room data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRoomData();
  }, [propertyId, range, party]);


  if (loading) {
    return (
      <section className="p-6 bg-white rounded-lg shadow-sm border">
        <div className="text-center py-16">
          <div className="text-4xl mb-4">⏳</div>
          <div className="text-xl font-bold text-gray-900 mb-2">Loading Rooms...</div>
          <div className="text-gray-600">Please wait while we fetch available rooms</div>
                      </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="p-6 bg-white rounded-lg shadow-sm border">
        <div className="text-center py-16">
          <div className="text-4xl mb-4">❌</div>
          <div className="text-xl font-bold text-red-600 mb-2">Error Loading Rooms</div>
          <div className="text-gray-600">{error}</div>
                      </div>
      </section>
    );
  }

  if (!availableRoomTypes || availableRoomTypes.length === 0) {
    return (
      <section className="p-6 bg-white rounded-lg shadow-sm border">
        <div className="text-center py-16">
          <div className="text-4xl mb-4">🏨</div>
          <div className="text-xl font-bold text-gray-900 mb-2">No Rooms Available</div>
          <div className="text-gray-600">No rooms are available for the selected dates</div>
                        </div>
      </section>
    );
  }

  const nights = range ? Math.ceil((range.end - range.start) / (1000 * 60 * 60 * 24)) : 0;

  // Calculate original total price (base price without tax) for selected rooms
  const originalTotalPrice = Array.from(selectedCards).reduce((sum, roomId) => {
    const room = availableRoomTypes.find(r => r.roomTypeId === roomId);
    const booking = bookings[roomId];
    if (room && booking) {
      return sum + calculatePrice(room, booking);
    }
    return sum;
  }, 0);

  // Calculate total tax for all selected rooms (per room basis)
  const totalTaxAmount = Array.from(selectedCards).reduce((sum, roomId) => {
    const room = availableRoomTypes.find(r => r.roomTypeId === roomId);
    const booking = bookings[roomId];
    if (room && booking) {
      const { taxAmount } = calculateTaxForRoomType(room, booking);
      return sum + taxAmount;
    }
    return sum;
  }, 0);

  // Calculate discounted price if agent has discount (discount applies to base price only, not tax)
  const calculateDiscountedPrice = (originalPrice, agentRates) => {
    if (!agentRates || !originalPrice) return null;
    
    if (agentRates.type === 'percentage') {
      // Percentage discount: discountedPrice = originalPrice * (1 - discount/100)
      return originalPrice * (1 - agentRates.discount / 100);
    } else {
      // Flat discount: discountedPrice = originalPrice - discount
      return Math.max(0, originalPrice - agentRates.discount);
    }
  };

  const discountedPrice = calculateDiscountedPrice(originalTotalPrice, agentRates);
  const subtotal = discountedPrice !== null ? discountedPrice : originalTotalPrice;
  
  // Final total = subtotal (after discount) + tax
  const totalPrice = subtotal + totalTaxAmount;

  return (
    <section className="p-4 md:p-6 bg-white rounded-lg shadow-sm border border-gray-200">
      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-2">Select Your Rooms</h2>
        <p className="text-sm md:text-base text-gray-600">
          Check-in: {range?.start?.toLocaleDateString()} | Check-out: {range?.end?.toLocaleDateString()} ({nights} nights)
        </p>
                      </div>

      {/* Desktop Table View */}
      <div className="bg-white rounded-2xl shadow-xl border-none overflow-hidden">
        <div className="space-y-3 md:space-y-4">
          {availableRoomTypes.map((room) => {
            const booking = getBooking(room.roomTypeId);
            const commonPlans = getCommonMealPlans(room.ratePlanDates);
            const { details, totalPrice: roomBasePrice } = calculatePriceDetails(room, booking);
            const { taxAmount: roomTax, taxDetails: roomTaxDetails } = calculateTaxForRoomType(room, booking);
            const roomTotalPrice = roomBasePrice + roomTax;
            const baseCapacity = room.occupancy * booking.rooms;
            const hasExtraBeds = booking.guests > baseCapacity;
            const isSelected = selectedCards.has(room.roomTypeId);
            const isExpanded = expandedRooms.has(room.roomTypeId);

            return (
              <div key={room.roomTypeId} className={`border border-gray-200  rounded-xl overflow-hidden transition-all ${isSelected ? 'border-indigo-500 shadow-md' : 'shadow-sm'}`}>
                {/* Accordion Header - Clickable */}
                <div className="p-4 md:p-5 ">
                  <div className="flex items-start justify-between gap-3  ">
                    <div className="flex-1 flex items-start gap-3">
                      <BedDouble className="text-indigo-600 flex-shrink-0 mt-0.5" size={20} />
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base md:text-lg font-semibold text-gray-800 mb-1">{room.roomTypeName}</h3>
                        <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
                          <span>Max {room.maxOccupancy} guests</span>
                          <span>•</span>
                          <span>{room.availableRooms} rooms available</span>
                        </div>
                        {/* Quick price preview when selected but collapsed */}
                        {isSelected && !isExpanded && booking.rooms > 0 && (
                          <div className="mt-2 flex items-center gap-2">
                            <span className="text-sm font-semibold text-indigo-600">
                              ₹{roomTotalPrice.toLocaleString('en-IN')}
                            </span>
                            <span className="text-xs text-gray-500">
                              (Base: ₹{roomBasePrice.toLocaleString('en-IN')} + Tax: ₹{roomTax.toLocaleString('en-IN')})
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Selection Toggle */}
                      <label 
                        className="flex items-center gap-2 text-sm cursor-pointer select-none"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span
                          className={`flex h-5 w-5 items-center justify-center rounded-sm border transition-all ${
                            isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-gray-300 text-transparent'
                          }`}
                        >
                          <Check size={14} />
                        </span>
                        <span className={`hidden md:inline ${isSelected ? 'text-gray-800 font-medium' : 'text-gray-500'}`}>Include</span>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleCardSelection(room.roomTypeId)}
                          className="hidden"
                        />
                      </label>

                      {/* Expand/Collapse Button */}
                      {isSelected && (
                        <button
                          onClick={(e) => toggleRoomExpansion(room.roomTypeId, e)}
                          className="p-2 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
                          aria-label={isExpanded ? 'Collapse' : 'Expand'}
                        >
                          {isExpanded ? (
                            <ChevronUp size={20} className="text-gray-600" />
                          ) : (
                            <ChevronDown size={20} className="text-gray-600" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Accordion Content - Expandable */}
                {isSelected && isExpanded && (
                  <div className="px-4 md:px-5 pb-4 md:pb-5 border-t border-gray-200 pt-4 space-y-4 animate-in slide-in-from-top-2">
                    <div>
                      <h4 className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Meal plan</h4>
                      <div className="space-y-2">
                        {commonPlans.map(plan => {
                          const mealPlanInfo = getMealPlanInfo(room.ratePlanDates, plan);
                          const isChecked = booking.mealPlan === plan;
                          return (
                            <button
                              key={plan}
                              type="button"
                              onClick={() => updateBooking(room.roomTypeId, { mealPlan: plan })}
                              className={`w-full flex items-start gap-2 rounded-lg border px-3 py-2 text-left transition ${
                                isChecked
                                  ? 'border-indigo-500 bg-indigo-50'
                                  : 'border-gray-200 hover:border-indigo-300'
                              }`}
                            >
                              <span
                                className={`mt-0.5 inline-flex h-4.5 w-4.5 items-center justify-center rounded-sm border ${
                                  isChecked ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-gray-300 text-transparent'
                                }`}
                              >
                                <Check size={11} />
                              </span>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-800">
                                  {mealPlanInfo?.description || mealPlanInfo?.name || plan}
                                </p>
                                {mealPlanInfo && mealPlanInfo.price !== undefined && mealPlanInfo.price !== null ? (
                                  <p className="text-xs text-gray-500 mt-1">
                                    From ₹{Number(mealPlanInfo.price).toLocaleString('en-IN')}
                                  </p>
                                ) : null}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <div className="flex-1 p-3 border border-gray-200 rounded-lg">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-medium text-gray-600">Adults</span>
                            <Users size={14} className="text-indigo-600" />
                          </div>
                          <div className="flex items-center justify-between">
                            <button
                              onClick={() => handleGuestChange(room, booking, -1)}
                              disabled={booking.guests <= room.minOccupancy}
                              className="w-7 h-7 flex items-center justify-center rounded-md bg-gray-200 hover:bg-gray-300 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <Minus size={12} />
                            </button>
                            <span className="text-base font-semibold text-gray-800">{booking.guests}</span>
                            <button
                              onClick={() => handleGuestChange(room, booking, 1)}
                              className="w-7 h-7 flex items-center justify-center rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                        </div>

                        <div className="flex-1 p-3 border border-gray-200 rounded-lg">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-medium text-gray-600">Children</span>
                            <Users size={14} className="text-amber-600" />
                          </div>
                          <div className="flex items-center justify-between">
                            <button
                              onClick={() => handleChildrenChange(room, booking, -1)}
                              disabled={booking.children <= 0}
                              className="w-7 h-7 flex items-center justify-center rounded-md bg-gray-200 hover:bg-gray-300 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <Minus size={12} />
                            </button>
                            <span className="text-base font-semibold text-gray-800">{booking.children}</span>
                            <button
                              onClick={() => handleChildrenChange(room, booking, 1)}
                              className="w-7 h-7 flex items-center justify-center rounded-md bg-amber-600 text-white hover:bg-amber-700"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="p-3 border border-gray-200 rounded-lg">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-medium text-gray-600">Rooms</span>
                          <BedDouble size={14} className="text-indigo-600" />
                        </div>
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => handleRoomChange(room, booking, -1)}
                            disabled={booking.rooms <= 0}
                            className="w-7 h-7 flex items-center justify-center rounded-md bg-gray-200 hover:bg-gray-300 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="text-base font-semibold text-gray-800">{booking.rooms}</span>
                          <button
                            onClick={() => handleRoomChange(room, booking, 1)}
                            disabled={booking.rooms >= room.availableRooms}
                            className="w-7 h-7 flex items-center justify-center rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-1">Available: {room.availableRooms}</p>
                      </div>
                    </div>

                  {hasExtraBeds && booking.extraGuests.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium text-gray-600">Extra beds:</span>
                      {booking.extraGuests.map((guest, i) => (
                        <button
                          key={i}
                          onClick={() => toggleExtraGuestType(room.roomTypeId, i)}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition ${
                            guest.type === 'adult'
                              ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                              : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                          }`}
                        >
                          {guest.type === 'adult' ? 'Adult' : 'Child'}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-200 pt-3">
                    <div>
                      <p className="text-[11px] text-gray-500">Estimated total for this room type</p>
                      <div className="flex items-baseline gap-2">
                        <p className="text-lg font-semibold text-indigo-600">₹{roomTotalPrice.toLocaleString('en-IN')}</p>
                        {roomTax > 0 && (
                          <p className="text-xs text-gray-500">
                            (Base: ₹{roomBasePrice.toLocaleString('en-IN')} + Tax: ₹{roomTax.toLocaleString('en-IN')})
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => toggleCalculation(room.roomTypeId)}
                      className="text-xs font-medium text-indigo-600 hover:text-indigo-800 underline"
                    >
                      {showCalc[room.roomTypeId] ? 'Hide breakdown' : 'View breakdown'}
                    </button>
                  </div>

                  {showCalc[room.roomTypeId] && (
                    <div className="bg-blue-50 border border-indigo-100 rounded-lg p-3 space-y-2">
                      {details.map((detail, dateIdx) => {
                        const taxDetail = roomTaxDetails.find(t => t.date === detail.date);
                        return (
                          <div key={dateIdx} className="border-b border-indigo-100 pb-2 last:border-0 last:pb-0">
                            <div className="text-xs font-semibold text-indigo-700">
                              {detail.date} • {detail.mealPlan}
                            </div>
                            <div className="mt-1 text-[11px] text-gray-600 space-y-1">
                              <div>Configuration: {booking.guests} guests / {booking.rooms} room(s) ≈ {detail.guestsPerRoom} per room</div>
                              {detail.breakdown.map((line, i) => (
                                <div key={i}>• {line}</div>
                              ))}
                              {taxDetail && (
                                <>
                                  <div className="mt-1 pt-1 border-t border-indigo-200">
                                    <div className="font-semibold text-indigo-700">Tax Calculation:</div>
                                    <div>• Room rate: ₹{taxDetail.roomBaseRate.toLocaleString('en-IN')} per room</div>
                                    <div>• Tax rate: {taxDetail.taxPercentage}% (₹{taxDetail.taxPerRoom.toLocaleString('en-IN')} per room)</div>
                                    <div>• Number of rooms: {taxDetail.numberOfRooms}</div>
                                    <div>• Tax for this date: ₹{taxDetail.taxAmount.toLocaleString('en-IN')}</div>
                                  </div>
                                </>
                              )}
                            </div>
                            <div className="mt-1 flex items-center justify-between">
                              <div>
                                <div className="text-[11px] text-gray-500">Base: ₹{detail.dateTotal.toLocaleString('en-IN')}</div>
                                {taxDetail && (
                                  <div className="text-[11px] text-gray-500">Tax: ₹{taxDetail.taxAmount.toLocaleString('en-IN')}</div>
                                )}
                              </div>
                              <div className="text-sm font-semibold text-gray-800">
                                Total: ₹{((detail.dateTotal || 0) + (taxDetail?.taxAmount || 0)).toLocaleString('en-IN')}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Grand Total Summary - Show when there are bookings or when default values are set */}
      {(Object.keys(bookings).length > 0 || totalPrice > 0) && (
        <div className="mt-6 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-2xl shadow-xl p-5">
          <div className="space-y-3">
            <div className="flex justify-between items-start gap-3">
              <div>
                <h2 className="text-lg font-semibold">Grand Total</h2>
                <p className="text-xs text-indigo-100">Including all selected room types</p>
                {agentRates && (
                  <p className="text-xs text-indigo-200 mt-1">
                    Agent discount: {agentRates.type === 'percentage' ? `${agentRates.discount}%` : `₹${agentRates.discount}`}
                  </p>
                )}
              </div>
              <div className="text-right">
                {agentRates && originalTotalPrice !== subtotal && (
                  <div className="text-xs text-indigo-200 line-through">₹{originalTotalPrice.toLocaleString('en-IN')}</div>
                )}
                <div className="text-2xl font-bold">₹{Math.round(totalPrice).toLocaleString('en-IN')}</div>
              </div>
            </div>
            
            {/* Price Breakdown */}
            <div className="border-t border-indigo-400/30 pt-3 space-y-1">
              <div className="flex justify-between text-xs text-indigo-100">
                <span>Subtotal (Base price)</span>
                <span>₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
              {totalTaxAmount > 0 && (
                <div className="flex justify-between text-xs text-indigo-100">
                  <span>Tax (calculated per room)</span>
                  <span>₹{totalTaxAmount.toLocaleString('en-IN')}</span>
                </div>
              )}
              {agentRates && originalTotalPrice !== subtotal && (
                <div className="flex justify-between text-xs text-indigo-200">
                  <span>Discount</span>
                  <span>-₹{(originalTotalPrice - subtotal).toLocaleString('en-IN')}</span>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={handlePayment}
            disabled={paymentLoading}
            className="w-full mt-4 bg-white text-indigo-600 py-3 rounded-xl font-semibold text-sm hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {paymentLoading ? 'Processing payment…' : 'Proceed to book'}
          </button>
        </div>
      )}

      {/* Notification Modal */}
      {modal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 bg-opacity-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all duration-300 ease-out">
            {/* Modal Header */}
            <div className={`px-6 py-4 rounded-t-2xl ${
              modal.type === 'error' ? 'bg-red-500' :
              modal.type === 'warning' ? 'bg-amber-500' :
              'bg-green-500'
            }`}>
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  {modal.type === 'error' && (
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  )}
                  {modal.type === 'warning' && (
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  )}
                  {modal.type === 'success' && (
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <h3 className="text-lg font-semibold text-white">
                  {modal.title}
                </h3>
              </div>
            </div>
            
            {/* Modal Body */}
            <div className="px-6 py-4">
              <p className="text-gray-700 text-sm leading-relaxed">
                {modal.message}
              </p>
            </div>
            
            {/* Modal Footer */}
            <div className="px-6 py-3 bg-gray-50 rounded-b-2xl">
              <div className="flex justify-end">
                <button
                  onClick={() => setModal(prev => ({ ...prev, show: false }))}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default RoomSection;