/**
 * Cash Booking Service
 * Creates bookings with cash payments for front-desk operations
 */

const { PrismaClient, OrderStatus, PaymentStatus, PaymentMethod } = require('@prisma/client');
const { buildDateRange, formatISODate, toDateOnly, addDays } = require('../../utils/date.utils');

const prisma = new PrismaClient();

/**
 * Generate unique transaction ID for cash payment
 */
const generateCashTransactionID = () => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `CASH-${timestamp}-${random}`;
};

/**
 * Generate unique Razorpay-like order ID for cash payments
 * Format: order_CASH{timestamp}{random}
 */
const generateCashOrderID = () => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  return `order_CASH${timestamp}${random}`;
};

/**
 * Create booking with cash payment
 * @param {Object} payload - Booking and payment data
 * @returns {Promise<{booking: Object, payment: Object, order: Object}>}
 */
const createCashBooking = async (payload) => {
  const {
    propertyId,
    propertyRoomTypeId,
    booking,
    pricing,
    hold,
    guest,
    payment,
    createdBy,
  } = payload;

  // Execute in transaction for atomicity
  return await prisma.$transaction(async (tx) => {
    // 1. Validate and fetch hold records
    const holdRecords = await tx.availability.findMany({
      where: {
        id: { in: hold.recordIds },
        isDeleted: false,
      },
      include: {
        room: {
          select: {
            id: true,
            propertyRoomTypeId: true,
          },
        },
      },
    });

    if (holdRecords.length === 0) {
      throw Object.assign(new Error('Hold records not found'), {
        code: 'HOLD_NOT_FOUND',
      });
    }

    // Validate hold records belong to correct property and rooms
    const holdRoomIds = new Set(holdRecords.map((r) => r.roomId));
    const requestedRoomIds = new Set(booking.selectedRoomIds);

    // Check if all requested rooms are in hold records
    for (const roomId of requestedRoomIds) {
      if (!holdRoomIds.has(roomId)) {
        throw Object.assign(
          new Error(`Room ${roomId} is not included in the hold records`),
          { code: 'HOLD_MISMATCH' }
        );
      }
    }

    // Check if hold is expired
    const now = new Date();
    for (const record of holdRecords) {
      if (record.holdExpiresAt && new Date(record.holdExpiresAt) < now) {
        throw Object.assign(new Error('Hold has expired'), {
          code: 'HOLD_EXPIRED',
        });
      }
    }

    // 2. Verify rooms are still available (double-check for race conditions)
    const dateRange = buildDateRange(booking.from, addDays(booking.to, -1));
    const conflictingBookings = await tx.booking.findMany({
      where: {
        propertyId,
        isDeleted: false,
        status: { in: ['pending', 'confirmed'] },
        startDate: { lt: booking.to },
        endDate: { gt: booking.from },
        bookingRoomSelections: {
          some: {
            roomTypeId: propertyRoomTypeId,
            roomIds: {
              array_contains: Array.from(requestedRoomIds),
            },
          },
        },
      },
      select: {
        id: true,
        bookingNumber: true,
      },
    });

    if (conflictingBookings.length > 0) {
      throw Object.assign(
        new Error('One or more rooms are already booked for the selected dates'),
        { code: 'ROOM_BOOKED' }
      );
    }

    // 3. Get property room type details
    const propertyRoomType = await tx.propertyRoomType.findFirst({
      where: {
        id: propertyRoomTypeId,
        propertyId,
        isDeleted: false,
        isActive: true,
      },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            cancellationPolicyId: true,
          },
        },
        roomType: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!propertyRoomType) {
      throw new Error('Property room type not found');
    }

    // 4. Create Order record (for consistency with payment gateway flow)
    // Order amount is stored in paise
    const totalAmountPaise = Math.round(pricing.total * 100);
    const cashOrderID = generateCashOrderID();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now (standard order expiry)
    
    const order = await tx.order.create({
      data: {
        razorpayOrderId: cashOrderID, // Unique order ID for cash payments
        propertyId,
        amount: totalAmountPaise,
        currency: 'INR',
        status: OrderStatus.SUCCESS, // Immediately SUCCESS for cash payments
        creatorType: createdBy.type === 'host' ? 'HOST' : 'ADMIN',
        creatorId: createdBy.id || null,
        guestName: guest.fullName,
        guestEmail: guest.email,
        guestPhone: guest.phone,
        checkIn: booking.from,
        checkOut: booking.to,
        guests: booking.totalGuests,
        children: booking.children,
        rooms: booking.selectedRoomIds.length,
        paymentMethod: 'CASH',
        expiresAt,
        metadata: {
          paymentMethod: 'CASH',
          receivedBy: payment.receivedBy,
          receiptNumber: payment.receiptNumber,
          frontdeskBooking: true,
        },
      },
    });

    // 5.1. Create OrderRoomSelection record (for consistency with payment link flow)
    // Calculate total base price and tax from all rooms (in paise)
    let totalBasePricePaise = 0;
    let totalTaxPaise = 0;
    
    for (const roomBreakdown of pricing.perRoomBreakdown || []) {
      const basePrice = (roomBreakdown.basePerNight || 0) * pricing.nights;
      const tax = roomBreakdown.tax || 0;
      totalBasePricePaise += Math.round(basePrice * 100);
      totalTaxPaise += Math.round(tax * 100);
    }
    
    // If no breakdown provided, estimate from total
    if (!pricing.perRoomBreakdown || pricing.perRoomBreakdown.length === 0) {
      const estimatedBase = pricing.total / 1.18; // Rough estimate assuming 18% tax
      totalBasePricePaise = Math.round(estimatedBase * 100);
      totalTaxPaise = Math.round((pricing.total - estimatedBase) * 100);
    }
    
    const totalPricePaise = totalBasePricePaise + totalTaxPaise;

    const orderRoomSelection = await tx.orderRoomSelection.create({
      data: {
        orderId: order.id,
        roomTypeId: propertyRoomTypeId,
        roomTypeName: propertyRoomType.roomType?.name || 'Room',
        roomIds: booking.selectedRoomIds, // Store as JSON array of all room IDs
        rooms: booking.selectedRoomIds.length,
        guests: booking.adults,
        children: booking.children,
        mealPlanId: booking.mealPlanId || null,
        price: totalBasePricePaise, // In paise
        tax: totalTaxPaise, // In paise
        totalPrice: totalPricePaise, // In paise
        checkIn: booking.from,
        checkOut: booking.to,
        datesToBlock: dateRange.map(formatISODate), // JSON array of date strings
      },
    });

    // 6. Generate unique booking number
    // Format: BK{timestamp}{randomString}
    const bookingNumber = `BK${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

    // 7. Create Booking record
    const bookingRecord = await tx.booking.create({
      data: {
        bookingNumber,
        orderId: order.id,
        propertyId,
        cancellationPolicyId: propertyRoomType.property.cancellationPolicyId,
        guestName: guest.fullName,
        guestEmail: guest.email,
        guestPhone: guest.phone,
        guestAddress: guest.address,
        startDate: booking.from,
        endDate: booking.to,
        nights: pricing.nights,
        adults: booking.adults,
        children: booking.children,
        infants: booking.infants,
        totalGuests: booking.totalGuests,
        rooms: booking.selectedRoomIds.length,
        totalAmount: pricing.total, // Store in rupees (Decimal field)
        status: 'confirmed', // Immediately confirmed for cash payments
        paymentStatus: 'PAID',
        paymentMethod: 'CASH',
        confirmationDate: new Date(),
        specialRequests: booking.notes || null,
        createdByType: createdBy.type === 'host' ? 'HOST' : 'ADMIN',
        createdById: createdBy.id || null,
      },
    });

    // 8. Create BookingRoomSelection records
    const roomSelections = [];
    for (let i = 0; i < booking.selectedRoomIds.length; i++) {
      const roomId = booking.selectedRoomIds[i];
      const roomBreakdown = pricing.perRoomBreakdown[i] || {};

      const selection = await tx.bookingRoomSelection.create({
        data: {
          bookingId: bookingRecord.id,
          roomTypeId: propertyRoomTypeId,
          roomTypeName: propertyRoomType.roomType?.name || 'Room',
          roomIds: [roomId], // Store as JSON array
          rooms: 1,
          guests: booking.adults + booking.children + booking.infants,
          children: booking.children,
          mealPlanId: booking.mealPlanId || null,
          basePrice: (roomBreakdown.basePerNight || 0) * pricing.nights, // In rupees (Decimal)
          tax: roomBreakdown.tax || 0, // In rupees (Decimal)
          totalPrice: (roomBreakdown.totalWithTax || roomBreakdown.total || 0), // In rupees (Decimal)
          checkIn: booking.from,
          checkOut: booking.to,
          datesReserved: dateRange.map(formatISODate), // JSON array of date strings
        },
      });
      roomSelections.push(selection);
    }

    // 9. Create Payment record
    const transactionID = generateCashTransactionID();
    const paymentRecord = await tx.payment.create({
      data: {
        transactionID,
        propertyId,
        bookingId: bookingRecord.id,
        amount: pricing.total, // In rupees (Decimal)
        paymentMethod: 'CASH',
        status: PaymentStatus.PAID,
        date: payment.paymentDate,
        guestName: guest.fullName,
        guestEmail: guest.email,
        guestPhone: guest.phone,
        // Note: customerId and agentId are null for frontdesk cash payments
      },
    });

    // 10. Convert hold Availability records to booked status
    // Update hold records to booked status instead of deleting
    await tx.availability.updateMany({
      where: {
        id: { in: hold.recordIds },
      },
      data: {
        status: 'booked',
        reason: `Booked - ${bookingNumber}`,
        blockedBy: `Booking ${bookingNumber}`,
        holdExpiresAt: null, // Clear hold expiration
      },
    });

    // 11. Create additional Availability records for any dates not covered by holds
    // This ensures all dates in the booking range are marked as booked
    const holdDates = new Set(holdRecords.map((r) => formatISODate(toDateOnly(r.date))));
    const allDates = dateRange.map(formatISODate);

    for (const roomId of requestedRoomIds) {
      for (const dateStr of allDates) {
        if (!holdDates.has(dateStr)) {
          // Create booked availability record for dates not in hold
          await tx.availability.create({
            data: {
              roomId,
              date: toDateOnly(dateStr),
              status: 'booked',
              reason: `Booked - ${bookingNumber}`,
              blockedBy: `Booking ${bookingNumber}`,
            },
          });
        }
      }
    }

    return {
      booking: bookingRecord,
      payment: paymentRecord,
      order,
      roomSelections,
    };
  });
};

module.exports = {
  createCashBooking,
};

