/**
 * Payment Link Controller
 * Handles creation of Razorpay payment links for front-desk bookings
 */

const Razorpay = require('razorpay');
const { PrismaClient, OrderCreatorType } = require('@prisma/client');
const { ensurePropertyAccess } = require('./access.utils');
const { toDateOnly, buildDateRange, formatISODate, addDays } = require('../../utils/date.utils');
const { sendSuccess, sendError } = require('../../utils/response.utils');
const { normalizePhone, isValidUuid } = require('../../utils/frontdesk.utils');

const prisma = new PrismaClient();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_RWnUwmZYbfokH5',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'uetuSHbRgVnaU598llWQKwx5',
});

const MIN_PAYMENTLINK_TTL_SECONDS = 15 * 60;
const PAYMENTLINK_TTL_BUFFER_SECONDS = 60;

/**
 * Create payment link for front-desk booking
 */
const createPaymentLink = async (req, res) => {
  const { propertyId } = req.params;

  console.log("req.body", req.body);
  console.log("propertyId", propertyId);
  const {
    propertyRoomTypeId,
    booking = {},
    pricing = {},
    hold = {},
    paymentRecipient = {},
    createdBy = {},
    metadata = {},
  } = req.body || {};
  console.log("req.body", req.body);

  if (!propertyId) {
    return sendError(res, 'Property identifier is required.', 400);
  }

  // Security: Verify user has access to this property (admin can access all, host only their own)
  try {
    const accessResult = await ensurePropertyAccess({
      prisma,
      propertyId,
      user: req.user,
    });

    if (!accessResult.ok) {
      return res.status(accessResult.status).json(accessResult.body);
    }
  } catch (error) {
    console.error('Error verifying property access:', error);
    return sendError(res, 'Failed to verify property access.', 500);
  }

  const holdRecordIds = Array.isArray(hold.recordIds)
    ? hold.recordIds.filter((id) => typeof id === 'string' && id.trim().length > 0)
    : [];

  if (holdRecordIds.length === 0) {
    return sendError(res, 'TimeOut plese select the rooms again', 400);
  }

  const {
    from,
    to,
    adults = 0,
    children = 0,
    infants = 0,
    totalGuests: totalGuestsFromPayload,
    selectedRoomIds = [],
    notes = '',
    mealPlanId = null,
    guestId = null,
  } = booking;

  if (!from || !to) {
    return sendError(res, 'Check-in and check-out dates are required.', 400);
  }

  const checkInDate = toDateOnly(from);
  const checkOutDate = toDateOnly(to);

  if (!checkInDate || !checkOutDate) {
    return sendError(res, 'Invalid stay dates provided.', 400);
  }

  if (checkInDate >= checkOutDate) {
    return sendError(res, 'Check-out date must be after check-in date.', 400);
  }

  const uniqueRoomIds = Array.from(
    new Set(
      Array.isArray(selectedRoomIds)
        ? selectedRoomIds.filter((id) => typeof id === 'string' && id.trim().length > 0)
        : []
    )
  );

  if (uniqueRoomIds.length === 0) {
    return sendError(res, 'Select at least one room before sending a payment link.', 400);
  }

  const totalGuests =
    typeof totalGuestsFromPayload === 'number'
      ? totalGuestsFromPayload
      : Math.max(0, adults) + Math.max(0, children) + Math.max(0, infants);

  if (totalGuests <= 0) {
    return sendError(res, 'Guest count must be greater than zero.', 400);
  }

  const normalizedPhone = normalizePhone(paymentRecipient.phone);
  if (normalizedPhone.length !== 10) {
    return sendError(res, 'A valid 10-digit guest mobile number is required.', 400);
  }

  const amount = Number(pricing.total);
  if (!Number.isFinite(amount) || amount <= 0) {
    return sendError(res, 'A valid amount is required to create a payment link.', 400);
  }

  const amountInPaise = Math.round(amount * 100);

  const rawHoldExpiry = hold?.holdUntil ? new Date(hold.holdUntil) : null;
  const holdExpiry =
    rawHoldExpiry && !Number.isNaN(rawHoldExpiry.getTime())
      ? rawHoldExpiry
      : new Date(Date.now() + 15 * 60 * 1000);
  const nowSeconds = Math.floor(Date.now() / 1000);
  const earliestAllowedExpiry = nowSeconds + MIN_PAYMENTLINK_TTL_SECONDS + PAYMENTLINK_TTL_BUFFER_SECONDS;
  const holdExpirySeconds = Math.floor(holdExpiry.getTime() / 1000);
  const expireByUnix = Math.max(earliestAllowedExpiry, holdExpirySeconds);

  const creatorType = createdBy?.type ? String(createdBy.type).toLowerCase() : null;
  let creatorId =
    createdBy?.id && typeof createdBy.id === 'string' && createdBy.id.trim().length > 0
      ? createdBy.id.trim()
      : null;

  if (creatorType && !Object.values(OrderCreatorType).includes(creatorType)) {
    return sendError(res, `Invalid creator type "${creatorType}".`, 400);
  }

  if (creatorId && !isValidUuid(creatorId)) {
    // If the identifier is not a valid UUID, store null to avoid invalid references.
    creatorId = null;
  }

  try {
    const availabilityRecords = await prisma.availability.findMany({
      where: {
        id: { in: holdRecordIds },
        isDeleted: false,
      },
      include: {
        room: {
          select: {
            id: true,
            propertyRoomTypeId: true,
            propertyRoomType: {
              select: {
                propertyId: true,
              },
            },
          },
        },
      },
    });

    if (availabilityRecords.length !== holdRecordIds.length) {
      return sendError(
        res,
        'Some hold references were not found or have already been released. Please recreate the hold and try again.',
        400
      );
    }

    // Check if any hold is expired (cleanup deletes them, but there's a 60-second window)
    // Also, expired holds tied to active orders won't be deleted by cleanup
    const now = new Date();
    const expiredHold = availabilityRecords.find(
      (record) => record.holdExpiresAt && new Date(record.holdExpiresAt) <= now
    );
    if (expiredHold) {
      return sendError(
        res,
        'One or more hold records have expired. Please recreate the hold and try again.',
        409
      );
    }

    // Check if any hold is already converted (status is not 'blocked')
    const nonBlockedRecord = availabilityRecords.find((record) => record.status !== 'blocked');
    if (nonBlockedRecord) {
      return sendError(
        res,
        `One or more hold records are no longer blocked (status: ${nonBlockedRecord.status}). Please recreate the hold and try again.`,
        409
      );
    }

    const propertyMismatch = availabilityRecords.find(
      (record) => record.room?.propertyRoomType?.propertyId !== propertyId
    );
    if (propertyMismatch) {
      return sendError(res, 'Hold records do not belong to the selected property.', 400);
    }

    if (propertyRoomTypeId) {
      const roomTypeMismatch = availabilityRecords.find(
        (record) => record.room?.propertyRoomTypeId !== propertyRoomTypeId
      );
      if (roomTypeMismatch) {
        return sendError(res, 'Hold records do not match the selected room type.', 400);
      }
    }

    const holdRoomIds = new Set(availabilityRecords.map((record) => record.roomId));
    const missingRooms = uniqueRoomIds.filter((roomId) => !holdRoomIds.has(roomId));
    if (missingRooms.length > 0) {
      return sendError(res, 'Hold records do not cover all selected rooms. Please place the hold again.', 400);
    }

    // Validation: Check for conflicting statuses on rooms/dates
    // If any room already has booked/maintenance/out_of_service on these dates, reject
    const holdRoomIdsArray = Array.from(holdRoomIds);
    const holdDates = availabilityRecords.map((record) => record.date);
    const uniqueDates = [...new Set(holdDates.map((d) => d.toISOString().split('T')[0]))];
    const dateObjects = uniqueDates.map((dateStr) => new Date(dateStr + 'T00:00:00.000Z'));

    const conflictingRecords = await prisma.availability.findMany({
      where: {
        roomId: { in: holdRoomIdsArray },
        date: { in: dateObjects },
        isDeleted: false,
        status: {
          in: ['booked', 'maintenance', 'out_of_service'], // Conflicting statuses
        },
        // Exclude the hold records we're trying to use
        id: { notIn: holdRecordIds },
      },
      select: {
        id: true,
        roomId: true,
        date: true,
        status: true,
      },
    });

    if (conflictingRecords.length > 0) {
      const conflictingRoomIds = [...new Set(conflictingRecords.map((r) => r.roomId))];
      return sendError(
        res,
        `One or more rooms already have a conflicting status (booked/maintenance/out_of_service) on the selected dates. Please select different rooms or dates.`,
        409,
        {
          conflictingRooms: conflictingRoomIds,
          conflictingDates: uniqueDates,
          statuses: [...new Set(conflictingRecords.map((r) => r.status))],
        }
      );
    }

    // Validation: Check for duplicate orders for the same hold set
    // Get order IDs from hold records (blockedBy field)
    const orderIdsFromHolds = availabilityRecords
      .map((record) => record.blockedBy)
      .filter((orderId) => orderId && isValidUuid(orderId));

    if (orderIdsFromHolds.length > 0) {
      // Check if any of these orders are still active (PENDING or SUCCESS)
      const existingOrders = await prisma.order.findMany({
        where: {
          id: { in: orderIdsFromHolds },
          status: {
            in: ['PENDING', 'SUCCESS'], // Active order statuses
          },
          isDeleted: false,
        },
        select: {
          id: true,
          status: true,
          razorpayOrderId: true,
          createdAt: true,
        },
      });

      if (existingOrders.length > 0) {
        const activeOrderIds = existingOrders.map((order) => order.id);
        return sendError(
          res,
          'A payment link already exists for these hold records. Please wait for the existing payment to complete or expire before creating a new one.',
          409,
          {
            existingOrderIds: activeOrderIds,
            orderStatuses: existingOrders.map((order) => order.status),
            note: 'If the previous payment failed, the hold records should be released first.',
          }
        );
      }

      // Previous order failed/expired/cancelled - this is okay, we can create new payment link
      if (orderIdsFromHolds.length > 0) {
        console.log(
          `ℹ️ Previous order(s) for these holds: ${orderIdsFromHolds.join(', ')}. Creating new payment link.`
        );
      }
    }

    const paymentLinkPayload = {
      amount: amountInPaise,
      currency: 'INR',
      expire_by: expireByUnix,
      reference_id: `FD-${Date.now()}`,
      description: `Payment link for property ${metadata?.propertyName || propertyId}`,
      customer: {
        name: paymentRecipient.fullName || 'Guest',
        contact: `+91${normalizedPhone}`,
      },
      notify: {
        sms: true,
        email: Boolean(paymentRecipient.email),
      },
      reminder_enable: true,
      notes: {
        propertyId,
        propertyName: metadata?.propertyName || '',
        roomTypeName: metadata?.roomTypeName || '',
        createdBy: createdBy?.label || creatorType || 'frontdesk',
      },
    };

    if (paymentRecipient.email) {
      paymentLinkPayload.customer.email = paymentRecipient.email;
    }

    const paymentLink = await razorpay.paymentLink.create(paymentLinkPayload);
    console.log("paymentLink", paymentLink);

    // CRITICAL: Extract order_id from Razorpay payment link response
    // Razorpay payment links have an associated order_id that is used in webhooks
    // Payment link response: { id: 'plink_...', order_id: 'order_...', ... }
    // Webhook sends: payment_link.entity.order_id which is the Razorpay order ID (order_...)
    // So we MUST store the order_id, NOT the payment link ID (plink_...)
    let razorpayOrderId = paymentLink?.order_id || 
                          paymentLink?.entity?.order_id || 
                          null;

    // If order_id is not immediately available in response, fetch from Razorpay API
    if (!razorpayOrderId && paymentLink?.id) {
      console.log('[PaymentLink] Order ID not in initial response, fetching from Razorpay API...');
      try {
        const fetchedPaymentLink = await razorpay.paymentLink.fetch(paymentLink.id);
        razorpayOrderId = fetchedPaymentLink?.order_id || 
                         fetchedPaymentLink?.entity?.order_id || 
                         null;
        
        if (razorpayOrderId) {
          console.log('[PaymentLink] ✅ Found order_id from fetched payment link:', razorpayOrderId);
        }
      } catch (fetchError) {
        console.error('[PaymentLink] Failed to fetch order_id from Razorpay:', fetchError);
        // Continue with null - will be handled in validation below
      }
    }

    // Validate we have an order_id (must start with "order_")
    if (!razorpayOrderId) {
      throw new Error('Failed to obtain Razorpay order_id for payment link. Order ID is required for webhook matching.');
    }

    // Validate format - must be an order ID, not a payment link ID
    if (!razorpayOrderId.startsWith('order_')) {
      console.error('[PaymentLink] ❌ Invalid razorpayOrderId format:', razorpayOrderId);
      console.error('[PaymentLink] Expected order_id starting with "order_", but got:', razorpayOrderId);
      console.error('[PaymentLink] Payment link ID:', paymentLink?.id);
      throw new Error(`Invalid Razorpay order ID format. Expected order_id starting with "order_", but got: ${razorpayOrderId}. Please check Razorpay payment link response structure.`);
    }

    console.log('[PaymentLink] ✅ Using razorpayOrderId:', razorpayOrderId);

    // Fetch property room type details for OrderRoomSelection
    const propertyRoomType = await prisma.propertyRoomType.findFirst({
      where: {
        id: propertyRoomTypeId,
        propertyId,
        isDeleted: false,
      },
      select: {
        id: true,
        roomType: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!propertyRoomType) {
      return sendError(res, 'Property room type not found.', 404);
    }

    const roomTypeName = propertyRoomType.roomType?.name || metadata?.roomTypeName || 'Room Type';

    // Build datesToBlock array (all dates from checkIn to checkOut, excluding checkOut)
    const rangeEndExclusive = addDays(checkOutDate, -1);
    const daysToBlock = buildDateRange(checkInDate, rangeEndExclusive);
    const datesToBlock = daysToBlock.map(formatISODate);

    // Calculate pricing from perRoomBreakdown (convert to paise)
    const perRoomBreakdown = Array.isArray(pricing?.perRoomBreakdown) ? pricing.perRoomBreakdown : [];
    
    // Calculate total base price and tax from all rooms
    let totalBasePrice = 0;
    let totalTax = 0;
    
    for (const roomBreakdown of perRoomBreakdown) {
      const basePrice = Number(roomBreakdown?.basePerNight || 0) * Number(pricing?.nights || 1);
      const extrasTotal = Array.isArray(roomBreakdown?.extras) 
        ? roomBreakdown.extras.reduce((sum, extra) => {
            const extraPrice = Number(extra?.perNight || 0) * Number(extra?.count || 0) * Number(pricing?.nights || 1);
            return sum + extraPrice;
          }, 0)
        : 0;
      const roomBasePrice = basePrice + extrasTotal;
      
      // Calculate tax for this room (assuming 5% for <= 7500, 18% for > 7500)
      const roomRate = roomBasePrice;
      const roomTax = roomRate <= 7500 ? roomRate * 0.05 : roomRate * 0.18;
      
      totalBasePrice += roomBasePrice;
      totalTax += roomTax;
    }

    // If no breakdown provided, use total price and estimate tax
    if (perRoomBreakdown.length === 0) {
      totalBasePrice = amount;
      // Estimate tax based on total
      totalTax = amount <= 7500 ? amount * 0.05 : amount * 0.18;
    }

    // Convert to paise
    const priceInPaise = Math.round(totalBasePrice * 100);
    const taxInPaise = Math.round(totalTax * 100);
    const totalPriceInPaise = priceInPaise + taxInPaise;

    let order;
    try {
      order = await prisma.$transaction(async (tx) => {
        const createdOrder = await tx.order.create({
          data: {
            razorpayOrderId,
            amount: amountInPaise,
            currency: paymentLink.currency || 'INR',
            status: 'PENDING',
            receipt: paymentLink.id,
            propertyId,
            checkIn: checkInDate,
            checkOut: checkOutDate,
            guests: Math.max(0, adults) + Math.max(0, infants),
            children: Math.max(0, children),
            rooms: uniqueRoomIds.length,
            guestName: paymentRecipient.fullName || null,
            guestEmail: paymentRecipient.email || null,
            guestPhone: normalizedPhone,
            guestId: guestId && isValidUuid(guestId) ? guestId : null,
            createdByType: creatorType || null,
            createdById: creatorId,
            expiresAt: new Date(expireByUnix * 1000),
            paymentMethod: 'payment_link',
            roomSelections: {
              create: {
                roomTypeId: propertyRoomTypeId,
                roomTypeName: roomTypeName,
                roomIds: uniqueRoomIds, // JSON array of room IDs
                rooms: uniqueRoomIds.length,
                guests: Math.max(0, adults),
                children: Math.max(0, children),
                mealPlanId: mealPlanId && isValidUuid(mealPlanId) ? mealPlanId : null,
                price: priceInPaise,
                tax: taxInPaise,
                totalPrice: totalPriceInPaise,
                checkIn: checkInDate,
                checkOut: checkOutDate,
                datesToBlock: datesToBlock, // JSON array of date strings
              },
            },
          },
        });

        await tx.availability.updateMany({
          where: {
            id: { in: holdRecordIds },
          },
          data: {
            blockedBy: createdOrder.id,
            holdExpiresAt: new Date(expireByUnix * 1000),
            reason: `Front desk order ${createdOrder.id}`,
          },
        });

        return createdOrder;
      });
    } catch (transactionError) {
      if (paymentLink?.id) {
        try {
          await razorpay.paymentLink.cancel(paymentLink.id);
        } catch (cancelError) {
          console.error('Failed to cancel Razorpay payment link after transaction error:', cancelError);
        }
      }
      throw transactionError;
    }

    return sendSuccess(
      res,
      {
        orderId: order.id,
        razorpayOrderId: order.razorpayOrderId,
        amount: order.amount,
        currency: order.currency,
        paymentLinkId: paymentLink.id,
        paymentLinkUrl: paymentLink.short_url || paymentLink.payment_url || null,
        expiresAt: new Date(expireByUnix * 1000).toISOString(),
        recipient: {
          name: paymentRecipient.fullName || null,
          email: paymentRecipient.email || null,
          phone: `+91${normalizedPhone}`,
        },
        // Include tax breakdown for UI display
        taxBreakdown: {
          totalBasePrice: priceInPaise,
          totalTax: taxInPaise,
          totalPrice: totalPriceInPaise,
        },
      },
      'Payment link created successfully.',
      201
    );
  } catch (error) {
    console.error('Failed to create front desk payment link:', error);
    return sendError(res, error?.message || 'Failed to create payment link.', 500);
  }
};

const PaymentLinkController = {
  createPaymentLink,
};

module.exports = PaymentLinkController;

