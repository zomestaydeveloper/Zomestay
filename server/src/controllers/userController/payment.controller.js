const Razorpay = require('razorpay');
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

// Load Razorpay credentials from environment variables (PRODUCTION SECURITY)
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_RWnUwmZYbfokH5';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'uetuSHbRgVnaU598llWQKwx5';

if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
  console.error('⚠️ WARNING: Razorpay credentials not found in environment variables');
}

const razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET
});

// Validation helper functions
const validateEmail = (email) => {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePhone = (phone) => {
  if (!phone) return false;
  const phoneRegex = /^[0-9]{10}$/; // 10 digit phone number
  return phoneRegex.test(phone.replace(/\D/g, '')); // Remove non-digits
};

const createOrder = async (req, res) => {
  const requestId = `REQ-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    const { amount, currency = 'INR', bookingDetails, roomSelections } = req.body;

    // PRODUCTION: Structured logging with request ID
    console.log(`[${requestId}] Order creation request`, {
      amount,
      currency,
      propertyId: bookingDetails?.propertyId,
      roomSelectionsCount: roomSelections?.length
    });

    // Validate amount
    if (!amount || typeof amount !== 'number' || amount < 1) {
      return res.status(400).json({
        success: false,
        message: 'Invalid amount. Amount must be a positive number.',
        requestId
      });
    }

    // Validate currency
    if (!currency || typeof currency !== 'string' || currency.length !== 3) {
      return res.status(400).json({
        success: false,
        message: 'Invalid currency. Currency must be a 3-letter code (e.g., INR).',
        requestId
      });
    }

    // Validate booking details
    if (!bookingDetails || typeof bookingDetails !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking details',
        requestId
      });
    }

    const { propertyId, checkIn, checkOut, guests, children, guestName, guestEmail, guestPhone, guestId, role } = bookingDetails;

    if (!propertyId || typeof propertyId !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Property ID is required',
        requestId
      });
    }

    // Validate property exists
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { id: true, status: true }
    });

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found',
        requestId
      });
    }

    if (property.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Property is not available for booking',
        requestId
      });
    }

    // Validate dates
    if (!checkIn || !checkOut) {
      return res.status(400).json({
        success: false,
        message: 'Check-in and check-out dates are required',
        requestId
      });
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const maxBookingDate = new Date();
    maxBookingDate.setFullYear(maxBookingDate.getFullYear() + 1); // Max 1 year in advance
    
    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid check-in or check-out date format',
        requestId
      });
    }

    checkInDate.setHours(0, 0, 0, 0);
    checkOutDate.setHours(0, 0, 0, 0);

    if (checkInDate < today) {
      return res.status(400).json({
        success: false,
        message: 'Check-in date cannot be in the past',
        requestId
      });
    }

    if (checkInDate >= checkOutDate) {
      return res.status(400).json({
        success: false,
        message: 'Check-out date must be after check-in date',
        requestId
      });
    }

    if (checkInDate > maxBookingDate) {
      return res.status(400).json({
        success: false,
        message: 'Booking cannot be made more than 1 year in advance',
        requestId
      });
    }

    // Validate guest details
    if (!guestName || typeof guestName !== 'string' || guestName.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Guest name is required and must be at least 2 characters',
        requestId
      });
    }

    if (guestEmail && !validateEmail(guestEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format',
        requestId
      });
    }

    if (guestPhone && !validatePhone(guestPhone)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number. Please provide a valid 10-digit phone number.',
        requestId
      });
    }

    // Validate guest counts
    const totalGuests = (guests || 0) + (children || 0);
    if (totalGuests < 1) {
      return res.status(400).json({
        success: false,
        message: 'At least one guest is required',
        requestId
      });
    }

    // Validate room selections
    if (!roomSelections || !Array.isArray(roomSelections) || roomSelections.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one room selection is required',
        requestId
      });
    }

    // Validate room selection structure and calculate total
    let calculatedTotal = 0;
    const validatedRoomSelections = [];

    for (const selection of roomSelections) {
      if (!selection.roomTypeId || !selection.roomTypeName) {
        return res.status(400).json({
          success: false,
          message: 'Invalid room selection: room type information is missing',
          requestId
        });
      }

      if (!selection.roomIds || !Array.isArray(selection.roomIds) || selection.roomIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid room selection for ${selection.roomTypeName}: no rooms selected`,
          requestId
        });
      }

      if (!selection.rooms || selection.rooms < 1 || selection.rooms !== selection.roomIds.length) {
        return res.status(400).json({
          success: false,
          message: `Invalid room selection for ${selection.roomTypeName}: room count mismatch`,
          requestId
        });
      }

      if (!selection.guests || selection.guests < 1) {
        return res.status(400).json({
          success: false,
          message: `Invalid room selection for ${selection.roomTypeName}: at least one guest is required`,
          requestId
        });
      }

      if (!selection.datesToBlock || !Array.isArray(selection.datesToBlock) || selection.datesToBlock.length === 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid room selection for ${selection.roomTypeName}: dates are missing`,
          requestId
        });
      }

      // Validate pricing fields
      if (typeof selection.price !== 'number' || selection.price < 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid pricing for ${selection.roomTypeName}: price must be a positive number`,
          requestId
        });
      }

      if (typeof selection.tax !== 'number' || selection.tax < 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid pricing for ${selection.roomTypeName}: tax must be a positive number`,
          requestId
        });
      }

      if (typeof selection.totalPrice !== 'number' || selection.totalPrice < 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid pricing for ${selection.roomTypeName}: total price must be a positive number`,
          requestId
        });
      }

      // Verify total price matches price + tax (with small tolerance for rounding)
      const expectedTotal = selection.price + selection.tax;
      if (Math.abs(selection.totalPrice - expectedTotal) > 0.01) {
        return res.status(400).json({
          success: false,
          message: `Invalid pricing for ${selection.roomTypeName}: total price does not match price + tax`,
          requestId
        });
      }

      calculatedTotal += selection.totalPrice;
      validatedRoomSelections.push(selection);
    }

    // CRITICAL: Verify amount matches calculated total (prevent tampering)
    const amountDifference = Math.abs(amount - calculatedTotal);
    if (amountDifference > 0.01) { // Allow small rounding differences
      console.error(`[${requestId}] Amount mismatch`, {
        frontendAmount: amount,
        calculatedAmount: calculatedTotal,
        difference: amountDifference
      });
      return res.status(400).json({
        success: false,
        message: 'Amount mismatch. Please refresh and try again.',
        requestId
      });
    }

    // Use transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // 1. Verify room types exist and belong to property
      for (const selection of validatedRoomSelections) {
        const roomType = await tx.propertyRoomType.findFirst({
          where: {
            id: selection.roomTypeId,
            propertyId: propertyId
          },
          select: { id: true }
        });

        if (!roomType) {
          throw new Error(`Room type ${selection.roomTypeId} not found or does not belong to this property`);
        }

        // Verify meal plan exists if provided
        if (selection.mealPlanId) {
          const mealPlan = await tx.mealPlan.findUnique({
            where: { id: selection.mealPlanId },
            select: { id: true }
          });

          if (!mealPlan) {
            throw new Error(`Meal plan ${selection.mealPlanId} not found`);
          }
        }

        // Verify all room IDs exist and belong to room type
        for (const roomId of selection.roomIds) {
          const room = await tx.room.findFirst({
            where: {
              id: roomId,
              propertyRoomTypeId: selection.roomTypeId,
              status: 'active',
              isDeleted: false
            },
            select: { id: true }
          });

          if (!room) {
            throw new Error(`Room ${roomId} not found or not available for room type ${selection.roomTypeId}`);
          }
        }
      }

      // 2. Check room availability and block rooms IMMEDIATELY
      const blockedRooms = [];
      const holdExpiry = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now
      
      for (const roomSelection of validatedRoomSelections) {
        const { roomIds, datesToBlock, rooms } = roomSelection;
        
        // Skip if no rooms selected
        if (!rooms || rooms === 0 || !roomIds || roomIds.length === 0) {
          continue;
        }

        // Check if rooms are available for the selected dates
        for (const roomId of roomIds) {
          // Check existing availability for this room and dates
          const existingAvailability = await tx.availability.findMany({
            where: {
              roomId: roomId,
              date: {
                in: datesToBlock.map(date => new Date(date))
              },
              isDeleted: false
            }
          });

          // Check if any of the dates are already booked/blocked
          const conflictingDates = existingAvailability.filter(avail => 
            avail.status === 'booked' || avail.status === 'blocked'
          );

          if (conflictingDates.length > 0) {
            throw new Error(`Room ${roomId} is not available for the selected dates`);
          }

          // Block this room for all the dates
          for (const dateStr of datesToBlock) {
            await tx.availability.create({
              data: {
                roomId: roomId,
                date: new Date(dateStr),
                status: 'blocked',
                reason: 'Temporary hold for payment processing',
                blockedBy: 'temp-hold', // We'll update this with order ID
                createdAt: new Date(),
                updatedAt: new Date(),
                isDeleted: false
              }
            });
          }

          blockedRooms.push({
            roomId: roomId,
            dates: datesToBlock
          });
        }
      }

      // 3. Create Razorpay order (rooms are already blocked)
      // Generate receipt ID (Razorpay limit: max 40 characters)
      const receiptId = `RCP${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`.substring(0, 40);
      
      const options = {
        amount: Math.round(amount * 100), // Convert to paise
        currency: currency,
        receipt: receiptId,
        notes: {
          propertyId: propertyId,
          requestId: requestId
          // PRODUCTION: Don't store sensitive data in Razorpay notes (already in DB)
        }
      };
      
      let razorpayOrder;
      try {
        razorpayOrder = await razorpay.orders.create(options);
      } catch (razorpayError) {
        // If Razorpay fails, transaction will rollback and release rooms
        console.error(`[${requestId}] Razorpay order creation failed:`, razorpayError);
        throw new Error(`Payment gateway error: ${razorpayError.message || 'Failed to create payment order'}`);
      }
      
      // 4. Save order to database
      // Determine createdByType based on role from bookingDetails (use role from outer scope)
      const orderCreatedByType = role === 'agent' ? 'agent' : role === 'user' ? 'user' : null;
      
      const order = await tx.order.create({
        data: {
          razorpayOrderId: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          status: 'PENDING',
          receipt: razorpayOrder.receipt,
          propertyId: propertyId,
          checkIn: checkInDate,
          checkOut: checkOutDate,
          guests: guests || 0,
          children: children || 0,
          rooms: validatedRoomSelections.reduce((sum, sel) => sum + sel.rooms, 0),
          guestName: guestName || null,
          guestEmail: guestEmail || null,
          guestPhone: guestPhone || null,
          guestId: guestId || null, // Guest ID (user or agent)
          createdByType: orderCreatedByType, // 'agent', 'user', or null (frontdesk)
          createdById: guestId || null, // User or Agent ID
          expiresAt: holdExpiry,
          // Create room selections
          roomSelections: {
            create: validatedRoomSelections.map(selection => ({
              roomTypeId: selection.roomTypeId,
              roomTypeName: selection.roomTypeName,
              roomIds: selection.roomIds, // JSON array
              rooms: selection.rooms,
              guests: selection.guests,
              children: selection.children || 0,
              mealPlanId: selection.mealPlanId || null,
              price: Math.round(selection.price * 100), // Convert to paise
              tax: Math.round(selection.tax * 100), // Convert to paise
              totalPrice: Math.round(selection.totalPrice * 100), // Convert to paise
              checkIn: new Date(selection.checkIn),
              checkOut: new Date(selection.checkOut),
              datesToBlock: selection.datesToBlock // JSON array
            }))
          }
        },
        include: {
          roomSelections: true
        }
      });

      // 5. Update the blocks with the order ID (link blocks to order)
      for (const blockedRoom of blockedRooms) {
        await tx.availability.updateMany({
          where: {
            roomId: blockedRoom.roomId,
            date: {
              in: blockedRoom.dates.map(date => new Date(date))
            },
            status: 'blocked',
            reason: 'Temporary hold for payment processing',
            blockedBy: 'temp-hold'
          },
          data: {
            blockedBy: order.id,
            reason: `Hold for order ${order.id}`
          }
        });
      }

      return {
        order,
        razorpayOrder,
        blockedRooms: blockedRooms.length
      };
    });
    
    // PRODUCTION: Success logging
    console.log(`[${requestId}] Order created successfully`, {
      orderId: result.order.id,
      razorpayOrderId: result.razorpayOrder.id,
      blockedRooms: result.blockedRooms
    });
    
    res.json({
      success: true,
      data: {
        orderId: result.razorpayOrder.id,
        amount: result.razorpayOrder.amount,
        currency: result.razorpayOrder.currency,
        key: RAZORPAY_KEY_ID, // Use environment variable
        dbOrderId: result.order.id,
        blockedRooms: result.blockedRooms,
        expiresAt: result.order.expiresAt,
        requestId // Return request ID for tracking
      }
    });
  } catch (error) {
    // PRODUCTION: Error logging with context
    console.error(`[${requestId}] Order creation error:`, {
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
    
    // Don't expose internal error details in production
    const errorMessage = process.env.NODE_ENV === 'production' 
      ? 'Failed to create payment order. Please try again or contact support.'
      : error.message;
    
    res.status(500).json({ 
      success: false, 
      message: errorMessage,
      requestId
    });
  }
};

// Helper function to release room holds
const releaseOrderHolds = async (orderId, tx = prisma) => {
  await tx.availability.updateMany({
    where: {
      blockedBy: orderId,
      status: 'blocked',
      isDeleted: false
    },
    data: {
      isDeleted: true,
      reason: 'Hold released due to payment failure or expiry'
    }
  });
};

const verifyPayment = async (req, res) => {
  // PRODUCTION: Structured logging with request ID
  const requestId = `VERIFY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
    
    console.log(`[${requestId}] Payment verification started`, {
      razorpay_order_id,
      razorpay_payment_id
    });
    
    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      console.warn(`[${requestId}] Missing payment details`);
      return res.status(400).json({
        success: false,
        message: 'Missing payment details'
      });
    }
    
    // PRODUCTION: Idempotency check - Check if payment already processed
    const existingPayment = await prisma.payment.findUnique({
      where: { transactionID: razorpay_payment_id },
      include: {
        booking: {
          include: {
            bookingRoomSelections: true
          }
        }
      }
    });

    if (existingPayment && existingPayment.booking) {
      console.log(`[${requestId}] Payment already verified (idempotent)`, {
        paymentId: razorpay_payment_id,
        bookingId: existingPayment.booking.id,
        bookingNumber: existingPayment.booking.bookingNumber
      });
      
      return res.json({
        success: true,
        message: 'Payment already verified',
        data: {
          paymentId: razorpay_payment_id,
          orderId: razorpay_order_id,
          bookingId: existingPayment.booking.id,
          bookingNumber: existingPayment.booking.bookingNumber,
          roomsBooked: existingPayment.booking.rooms
        }
      });
    }
    
    // Find the order in database with blocked rooms and room selections
    const order = await prisma.order.findUnique({
      where: { razorpayOrderId: razorpay_order_id },
      include: { 
        property: true,
        roomSelections: true // Include room selections
      }
    });

    if (!order) {
      console.warn(`[${requestId}] Order not found`, { razorpay_order_id });
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // PRODUCTION: Guest information validation
    if (!validateEmail(order.guestEmail)) {
      console.error(`[${requestId}] Invalid guest email`, { email: order.guestEmail });
      return res.status(400).json({
        success: false,
        message: 'Invalid guest email address'
      });
    }

    if (!validatePhone(order.guestPhone)) {
      console.error(`[${requestId}] Invalid guest phone`, { phone: order.guestPhone });
      return res.status(400).json({
        success: false,
        message: 'Invalid guest phone number'
      });
    }
    
    // Get guest/agent/user ID from order
    const guestId = order.guestId || order.createdById;
    const createdByType = order.createdByType; // 'agent', 'user', or null (frontdesk)

    // Check if order is expired
    if (order.expiresAt < new Date()) {
      console.warn(`[${requestId}] Order expired`, { orderId: order.id, expiresAt: order.expiresAt });
      // Release any held rooms
      await releaseOrderHolds(order.id);
      
      return res.status(400).json({
        success: false,
        message: 'Order expired - rooms have been released'
      });
    }
    
    // Verify payment signature (PRODUCTION: Use environment variable)
    const hmac = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET);
    hmac.update(razorpay_order_id + '|' + razorpay_payment_id);
    const generated_signature = hmac.digest('hex');
    
    if (generated_signature === razorpay_signature) {
      console.log(`[${requestId}] Payment signature verified`);
      
      // PRODUCTION: Payment verified successfully - Convert blocked rooms to confirmed booking
      // PRODUCTION: Move order status check INSIDE transaction to prevent race condition
      const result = await prisma.$transaction(async (tx) => {
        // PRODUCTION: Re-check order status INSIDE transaction (race condition fix)
        const currentOrder = await tx.order.findUnique({
          where: { id: order.id },
          select: { id: true, status: true }
        });

        if (!currentOrder) {
          throw new Error('Order not found');
        }

        // PRODUCTION: Check if order already processed (inside transaction - prevents race condition)
        if (currentOrder.status === 'SUCCESS') {
          // Order already processed - fetch existing booking
          const existingBooking = await tx.booking.findUnique({
            where: { orderId: order.id },
            include: {
              bookingRoomSelections: true
            }
          });

          if (existingBooking) {
            console.log(`[${requestId}] Order already processed (race condition prevented)`, {
              orderId: order.id,
              bookingId: existingBooking.id
            });
            
            return {
              booking: existingBooking,
              bookingNumber: existingBooking.bookingNumber,
              blockedRooms: existingBooking.rooms,
              alreadyProcessed: true
            };
          }
          
          throw new Error('Order already processed but no booking found');
        }
        
        // PRODUCTION: Double-check idempotency inside transaction
        const existingPaymentInTx = await tx.payment.findUnique({
          where: { transactionID: razorpay_payment_id }
        });

        if (existingPaymentInTx) {
          // Payment already exists - fetch booking
          const existingBooking = await tx.booking.findUnique({
            where: { id: existingPaymentInTx.bookingId },
            include: {
              bookingRoomSelections: true
            }
          });

          if (existingBooking) {
            console.log(`[${requestId}] Payment already exists (idempotency check inside transaction)`, {
              paymentId: razorpay_payment_id,
              bookingId: existingBooking.id
            });
            
            return {
              booking: existingBooking,
              bookingNumber: existingBooking.bookingNumber,
              blockedRooms: existingBooking.rooms,
              alreadyProcessed: true
            };
          }
        }
        // 1. Update order status
        await tx.order.update({
          where: { id: order.id },
          data: {
            status: 'SUCCESS',
            razorpayPaymentId: razorpay_payment_id,
            razorpaySignature: razorpay_signature,
            paymentMethod: 'razorpay'
          }
        });

        // 2. Get the blocked rooms from availability table
        const blockedRooms = await tx.availability.findMany({
          where: {
            blockedBy: order.id,
            status: 'blocked',
            isDeleted: false
          },
          include: {
            room: {
              include: {
                propertyRoomType: true
              }
            }
          }
        });

        if (blockedRooms.length === 0) {
          throw new Error('No blocked rooms found for this order');
        }

        // 3. Generate unique booking number
        const bookingNumber = 'BK' + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase();

        // 4. Calculate nights
        const nights = Math.ceil((order.checkOut - order.checkIn) / (1000 * 60 * 60 * 24));

        // 5. Use saved room selections from Order (production-ready)
        // This ensures we have exact meal plan, pricing, and configuration per room type
        if (!order.roomSelections || order.roomSelections.length === 0) {
          throw new Error('No room selections found for this order');
        }

        // Get blocked rooms grouped by roomId for mapping
        const blockedRoomsMap = {};
        blockedRooms.forEach(block => {
          if (!blockedRoomsMap[block.roomId]) {
            blockedRoomsMap[block.roomId] = block.room;
          }
        });

        const propertyWithPolicy = await tx.property.findUnique({
          where: { id: order.propertyId },
          include: {
            cancellationPolicy: {
              include: {
                rules: {
                  orderBy: { sortOrder: 'asc' },
                },
              },
            },
          },
        });

        const cancellationPolicySnapshot = propertyWithPolicy?.cancellationPolicy
          ? {
              id: propertyWithPolicy.cancellationPolicy.id,
              name: propertyWithPolicy.cancellationPolicy.name,
              description: propertyWithPolicy.cancellationPolicy.description,
              rules: (propertyWithPolicy.cancellationPolicy.rules || []).map((rule) => ({
                id: rule.id,
                daysBefore: rule.daysBefore,
                refundPercentage: rule.refundPercentage,
                sortOrder: rule.sortOrder,
              })),
            }
          : null;

        // 6. Create ONE booking for the entire order (all room selections combined)
        // PRODUCTION STANDARD: One Order = One Payment = One Booking
        // Room selections are stored in BookingRoomSelection model (relational approach)
        
        // Aggregate totals and determine primary values
        let totalRooms = 0;
        let totalAdults = 0;
        let totalChildren = 0;
        let primaryRoomTypeId = null;
        let primaryRoomId = null;
        let primaryMealPlanId = null;
        const bookingRoomSelectionsData = [];

        // Prepare data for BookingRoomSelection records
        for (const roomSelection of order.roomSelections) {
          // Get actual room objects from blocked rooms
          const roomIds = Array.isArray(roomSelection.roomIds) 
            ? roomSelection.roomIds 
            : JSON.parse(roomSelection.roomIds || '[]');
          
          const selectedRooms = roomIds
            .map(roomId => blockedRoomsMap[roomId])
            .filter(room => room !== undefined);

          if (selectedRooms.length === 0) {
            console.warn(`No rooms found for room selection ${roomSelection.id}`);
            continue;
          }

          // Set primary room type, room, and meal plan (from first room selection)
          if (!primaryRoomTypeId) {
            primaryRoomTypeId = roomSelection.roomTypeId;
            primaryRoomId = selectedRooms[0].id;
            primaryMealPlanId = roomSelection.mealPlanId || null;
          }

          // Prepare BookingRoomSelection data
          bookingRoomSelectionsData.push({
            roomTypeId: roomSelection.roomTypeId,
            roomTypeName: roomSelection.roomTypeName,
            roomIds: roomIds, // JSON array of room IDs
            rooms: selectedRooms.length,
            guests: roomSelection.guests,
            children: roomSelection.children,
            mealPlanId: roomSelection.mealPlanId || null, // Meal plan for this room type selection
            basePrice: roomSelection.price / 100, // Convert from paise to rupees
            tax: roomSelection.tax / 100, // Convert from paise to rupees
            totalPrice: roomSelection.totalPrice / 100, // Convert from paise to rupees
            checkIn: roomSelection.checkIn,
            checkOut: roomSelection.checkOut,
            datesReserved: roomSelection.datesToBlock // JSON array of date strings
          });

          // Aggregate totals
          totalRooms += selectedRooms.length;
          totalAdults += roomSelection.guests;
          totalChildren += roomSelection.children;
        }

        if (bookingRoomSelectionsData.length === 0) {
          throw new Error('No valid room selections found for booking');
        }

        // Create ONE booking with BookingRoomSelection records
        const booking = await tx.booking.create({
          data: {
            bookingNumber: bookingNumber,
            orderId: order.id, // One-to-one: One order = One booking
            propertyId: order.propertyId,
            propertyRoomTypeId: primaryRoomTypeId, // Primary room type (first one)
            roomId: primaryRoomId, // Primary room (first one)
            mealPlanId: primaryMealPlanId, // Primary meal plan (first one, may be null)
            
            // Guest Information
            userId: createdByType === 'user' ? guestId : null,
            agentId: createdByType === 'agent' ? guestId : null,
            guestName: order.guestName || 'Guest',
            guestEmail: order.guestEmail || 'guest@example.com',
            guestPhone: order.guestPhone || '0000000000',
            
            // Creator Information (for frontdesk bookings)
            createdByType: order.createdByType || null,
            createdById: order.createdById || null,
            
            // Booking Dates
            startDate: order.checkIn,
            endDate: order.checkOut,
            nights: nights,
            
            // Guest Count (aggregated across all room selections)
            adults: totalAdults,
            children: totalChildren,
            totalGuests: totalAdults + totalChildren,
            
            // Room Information
            rooms: totalRooms, // Total number of rooms across all selections
            
            // PRODUCTION: Create BookingRoomSelection records (relational approach)
            // This allows querying by room type, meal plan, etc.
            bookingRoomSelections: {
              create: bookingRoomSelectionsData.map(rsData => ({
                roomTypeId: rsData.roomTypeId,
                roomTypeName: rsData.roomTypeName,
                roomIds: rsData.roomIds, // JSON array
                rooms: rsData.rooms,
                guests: rsData.guests,
                children: rsData.children,
                mealPlanId: rsData.mealPlanId,
                basePrice: rsData.basePrice,
                tax: rsData.tax,
                totalPrice: rsData.totalPrice,
                checkIn: rsData.checkIn,
                checkOut: rsData.checkOut,
                datesReserved: rsData.datesReserved // JSON array
              }))
            },
            
            // Pricing (total across all room selections - from order amount)
            totalAmount: order.amount / 100, // Total order amount in rupees
            
            // Payment Information
            paymentStatus: 'PAID',
            paymentMethod: 'razorpay',
            paymentReference: razorpay_payment_id,
            cancellationPolicyId: propertyWithPolicy?.cancellationPolicy?.id || null,
            cancellationPolicySnapshot: cancellationPolicySnapshot,
            
            // Booking Status
            status: 'confirmed',
            confirmationDate: new Date(),
            
            // Rate Snapshot - comprehensive pricing information at booking time
            rateSnapshot: {
              roomSelections: bookingRoomSelectionsData.length, // Number of room type selections
              totalRooms: totalRooms,
              totalAdults: totalAdults,
              totalChildren: totalChildren,
              orderAmount: order.amount / 100, // Total order amount in rupees
              currency: order.currency || 'INR',
              createdAt: order.createdAt,
              breakdown: bookingRoomSelectionsData.map(rs => ({
                roomTypeId: rs.roomTypeId,
                roomTypeName: rs.roomTypeName,
                mealPlanId: rs.mealPlanId,
                rooms: rs.rooms,
                basePrice: rs.basePrice,
                tax: rs.tax,
                totalPrice: rs.totalPrice
              }))
            }
          },
          include: {
            bookingRoomSelections: true // Include the created room selections
          }
        });

        // 7. Convert blocked rooms to confirmed bookings
        await tx.availability.updateMany({
          where: {
            blockedBy: order.id,
            status: 'blocked',
            isDeleted: false
          },
          data: {
            status: 'booked',
            reason: `Confirmed booking ${bookingNumber}`,
            blockedBy: booking.id, // Link to booking
            holdExpiresAt: null
          }
        });

        // 8. Create payment record
        // Determine payment fields based on createdByType:
        // - If 'agent' → fill agentId
        // - If 'user' → fill customerId
        // - If null (frontdesk) → fill guestName, guestEmail, guestPhone
        const paymentData = {
          transactionID: razorpay_payment_id,
          propertyId: order.propertyId,
          amount: order.amount / 100, // Convert from paise to rupees
          paymentMethod: 'razorpay',
          status: 'PAID',
          bookingId: booking.id, // Link to single booking
          customerId: null,
          agentId: null,
          guestName: null,
          guestEmail: null,
          guestPhone: null
        };

        if (createdByType === 'agent') {
          // Agent booking - fill agentId
          paymentData.agentId = guestId;
        } else if (createdByType === 'user') {
          // User booking - fill customerId
          paymentData.customerId = guestId;
        } else {
          // Frontdesk/guest booking - fill guest fields
          paymentData.guestName = order.guestName || null;
          paymentData.guestEmail = order.guestEmail || null;
          paymentData.guestPhone = order.guestPhone || null;
        }

        await tx.payment.create({
          data: paymentData
        });

        return {
          booking, // Single booking
          bookingNumber,
          blockedRooms: blockedRooms.length,
          alreadyProcessed: false
        };
      });

      // PRODUCTION: Check if already processed (idempotent response)
      if (result.alreadyProcessed) {
        console.log(`[${requestId}] Returning existing booking (idempotent)`);
        return res.json({
          success: true,
          message: 'Payment already verified',
          data: {
            paymentId: razorpay_payment_id,
            orderId: razorpay_order_id,
            bookingId: result.booking.id,
            bookingNumber: result.bookingNumber,
            roomsBooked: result.blockedRooms
          }
        });
      }

      // PRODUCTION: Log successful payment verification
      console.log(`[${requestId}] Payment verified successfully`, {
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        bookingId: result.booking.id,
        bookingNumber: result.bookingNumber,
        roomsBooked: result.blockedRooms
      });

      res.json({
        success: true,
        message: 'Payment verified successfully',
        data: {
          paymentId: razorpay_payment_id,
          orderId: razorpay_order_id,
          bookingId: result.booking.id,
          bookingNumber: result.bookingNumber,
          roomsBooked: result.blockedRooms
        }
      });
    } else {
      // PRODUCTION: Payment signature verification failed
      console.error(`[${requestId}] Payment signature verification failed`, {
        razorpay_order_id,
        razorpay_payment_id,
        expected: generated_signature,
        received: razorpay_signature
      });
      
      // Payment verification failed - Release blocked rooms and update order status
      await prisma.$transaction(async (tx) => {
        // Release blocked rooms
        await releaseOrderHolds(order.id, tx);
        
        // Update order status
        await tx.order.update({
          where: { id: order.id },
          data: { status: 'FAILED' }
        });
      });

      console.warn(`[${requestId}] Payment verification failed - rooms released`, {
        orderId: order.id
      });

      res.status(400).json({
        success: false,
        message: 'Payment verification failed - rooms have been released'
      });
    }
  } catch (error) {
    // PRODUCTION: Structured error logging
    console.error(`[${requestId}] Payment verification error:`, {
      error: error.message,
      stack: error.stack,
      razorpay_order_id: req.body?.razorpay_order_id,
      razorpay_payment_id: req.body?.razorpay_payment_id
    });
    
    res.status(500).json({ 
      success: false, 
      message: 'Payment verification failed',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
    });
  }
};

module.exports = {
  createOrder,
  verifyPayment
};

