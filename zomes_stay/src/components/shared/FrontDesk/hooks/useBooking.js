import { useState, useCallback, useEffect, useMemo } from "react";
import frontdeskCommon from "../../../../services/property/frontdesk/frontdeskcommon";
import { calculatePricingSummary } from "../utils/pricingUtils";
import {
  addDays,
  formatQueryDate,
  isPastDate,
  parseDateOnly,
  startOfMonth,
  isDateBefore,
  isSameDay,
} from "../utils/dateUtils";
import { formatDate, formatDateTime } from "../utils/formatUtils";
import {
  adjustDraftForOccupancy,
  getExtraCapacityValue,
  getMinOccupancyValue,
  getOccupancyValue,
} from "../utils/occupancyUtils";

/**
 * Custom hook to manage booking state and operations
 */
export const useBooking = ({
  propertyId,
  activeContext,
  setActiveContext,
  frontdeskActor,
  onResetPaymentLink,
  onResetCashPayment,
}) => {
  const [bookingDraft, setBookingDraft] = useState(null);
  const [bookingError, setBookingError] = useState(null);
  const [bookingContext, setBookingContext] = useState(null);
  const [bookingContextLoading, setBookingContextLoading] = useState(false);
  const [bookingContextError, setBookingContextError] = useState(null);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [datePickerMonth, setDatePickerMonth] = useState(() =>
    startOfMonth(new Date())
  );
  const [dateSelection, setDateSelection] = useState({
    from: null,
    to: null,
  });
  const [holdState, setHoldState] = useState({
    status: "idle",
    data: null,
    message: null,
  });

  const resetHoldState = useCallback(() => {
    setHoldState({ status: "idle", data: null, message: null });
    onResetPaymentLink();
    onResetCashPayment();
  }, [onResetPaymentLink, onResetCashPayment]);

  const loadBookingContext = useCallback(
    async ({ propertyRoomTypeId, from, to, roomsRequested = 1, preserveSelection = false }) => {
      if (!propertyId || !propertyRoomTypeId || !from || !to) {
        return;
      }

      setBookingContextLoading(true);
      setBookingContextError(null);

      try {
        const response = await frontdeskCommon.fetchBookingContext({
          propertyId,
          propertyRoomTypeId,
          from,
          to,
          roomsRequested,
        });

        const data = response?.data?.data || response?.data || null;
        setBookingContext(data);

        setBookingDraft((prevDraft) => {
          const previousDraft = preserveSelection && prevDraft ? prevDraft : null;
          const availableRooms = (data?.roomType?.rooms || []).filter(
            (room) => room.isAvailableForStay
          );

          let nextSelectedRoomIds =
            previousDraft?.selectedRoomIds?.filter((id) =>
              availableRooms.some((room) => room.id === id)
            ) || [];

          const desiredRoomCount =
            preserveSelection && previousDraft
              ? Math.max(nextSelectedRoomIds.length, previousDraft.selectedRoomIds?.length || 0, roomsRequested || 0)
              : roomsRequested || 0;

          if (nextSelectedRoomIds.length === 0 && availableRooms.length > 0) {
            const count = Math.min(
              desiredRoomCount > 0 ? desiredRoomCount : 1,
              availableRooms.length
            );
            nextSelectedRoomIds = availableRooms.slice(0, count).map((room) => room.id);
          }

          const mealPlans = data?.mealPlans || [];
          let nextMealPlanId =
            previousDraft?.mealPlanId && mealPlans.some((plan) => plan.mealPlan?.id === previousDraft.mealPlanId)
              ? previousDraft.mealPlanId
              : mealPlans[0]?.mealPlan?.id || "";

          const baseAdults =
            previousDraft?.adults ??
            Math.max(
              getMinOccupancyValue(data),
              getOccupancyValue(data) || getMinOccupancyValue(data)
            );

          const nextDraft = {
            ...previousDraft,
            from: data?.stay?.from || from,
            to: data?.stay?.to || to,
            adults: baseAdults,
            children: previousDraft?.children ?? 0,
            infants: previousDraft?.infants ?? 0,
            mealPlanId: nextMealPlanId,
            selectedRoomIds: nextSelectedRoomIds,
            notes: previousDraft?.notes ?? "",
          };

          return adjustDraftForOccupancy(nextDraft, data);
        });
      } catch (error) {
        console.error("Failed to fetch front desk booking context", error);
        setBookingContext(null);
        setBookingContextError(error);
      } finally {
        setBookingContextLoading(false);
      }
    },
    [propertyId]
  );

  useEffect(() => {
    if (!bookingContext) return;
    setBookingDraft((prev) => {
      if (!prev) return prev;
      return adjustDraftForOccupancy(prev, bookingContext);
    });
  }, [bookingContext]);

  const pricingSummary = useMemo(() => {
    return calculatePricingSummary(bookingContext, bookingDraft);
  }, [bookingContext, bookingDraft]);

  const availableRooms = useMemo(
    () =>
      (bookingContext?.roomType?.rooms || []).filter((room) => room.isAvailableForStay),
    [bookingContext]
  );

  const selectedRoomIds = bookingDraft?.selectedRoomIds || [];
  const roomsCount = selectedRoomIds.length;
  const occupancyValue = getOccupancyValue(bookingContext);
  const extraCapacityValue = getExtraCapacityValue(bookingContext);
  const minOccupancyValue = getMinOccupancyValue(bookingContext);
  const totalGuests =
    (bookingDraft?.adults ?? 0) +
    (bookingDraft?.children ?? 0) +
    (bookingDraft?.infants ?? 0);
  const baseCapacity = roomsCount * occupancyValue;
  const maxGuestsAllowed = roomsCount * (occupancyValue + extraCapacityValue);
  const minGuestsRequired = roomsCount * minOccupancyValue;

  const bookingValidation = useMemo(() => {
    const errors = [];
    const warnings = [];

    if (bookingContextError) {
      errors.push(
        bookingContextError?.response?.data?.message ||
          bookingContextError.message ||
          "Failed to load booking context."
      );
    }

    if (!bookingDraft) {
      errors.push("Booking details are not ready.");
      return { errors, warnings };
    }

    if (!bookingContext && !bookingContextLoading) {
      errors.push("Room availability data is not ready yet. Please try again.");
    }

    if (roomsCount === 0) {
      errors.push("Select at least one available room.");
    }

    if (totalGuests <= 0) {
      errors.push("Add at least one guest.");
    }

    if (
      roomsCount > 0 &&
      availableRooms.length > 0 &&
      roomsCount > availableRooms.length
    ) {
      errors.push("Selected rooms are no longer available. Please refresh and try again.");
    }

    if (roomsCount > 0) {
      if (totalGuests > maxGuestsAllowed) {
        errors.push(
          `Maximum capacity exceeded. You can accommodate up to ${maxGuestsAllowed} guests in the selected rooms.`
        );
      }

      if (totalGuests < minGuestsRequired) {
        warnings.push(
          `Minimum occupancy requirement is ${minGuestsRequired} guest(s) for the selected rooms.`
        );
      }
    }

    if (
      bookingContext?.availabilitySummary &&
      bookingContext.availabilitySummary.canFulfilRequest === false
    ) {
      errors.push("There are not enough rooms available for the selected stay.");
    }

    if (!bookingDraft.mealPlanId && (bookingContext?.mealPlans?.length ?? 0) > 0) {
      errors.push("Select a meal plan to continue.");
    }

    if (pricingSummary?.error) {
      errors.push(pricingSummary.error);
    }

    return { errors, warnings };
  }, [
    availableRooms.length,
    bookingContext,
    bookingContextError,
    bookingContextLoading,
    bookingDraft,
    maxGuestsAllowed,
    minGuestsRequired,
    pricingSummary,
    roomsCount,
    totalGuests,
  ]);

  const stayDatesLabel = useMemo(() => {
    const fromDate = bookingDraft?.from ? parseDateOnly(bookingDraft.from) : null;
    const toDate = bookingDraft?.to ? parseDateOnly(bookingDraft.to) : null;

    if (fromDate && toDate) {
      return `${formatDate(fromDate, { dateStyle: "medium" })} → ${formatDate(toDate, {
        dateStyle: "medium",
      })}`;
    }

    if (fromDate) {
      return `${formatDate(fromDate, { dateStyle: "medium" })} → Select checkout`;
    }

    return "Select stay dates";
  }, [bookingDraft?.from, bookingDraft?.to]);

  const holdData = holdState.status === "success" ? holdState.data : null;
  const holdUntilLabel = holdData?.holdUntil ? formatDateTime(holdData.holdUntil) : null;
  const heldRoomNames = useMemo(() => {
    if (!holdData?.roomIds) return [];
    const lookup = new Map(
      (bookingContext?.roomType?.rooms || []).map((room) => [
        room.id,
        room.label || room.name || room.code || room.id,
      ])
    );
    return holdData.roomIds.map((roomId) => lookup.get(roomId) || roomId);
  }, [holdData, bookingContext]);

  const handleStartBooking = useCallback(() => {
    if (!activeContext || activeContext.type !== "action") {
      return;
    }

    const { date, room, roomType } = activeContext;
    
    // Prevent creating bookings for past dates
    if (isPastDate(date)) {
      setBookingError("Cannot create bookings for past dates.");
      return;
    }

    resetHoldState();

    const propertyRoomTypeId = roomType?.id;
    const initialDateObj =
      (date instanceof Date && !Number.isNaN(date.getTime()) && date) ||
      new Date(date);
    const checkoutDateObj = addDays(initialDateObj, 1);
    const initialDate = formatQueryDate(initialDateObj);
    const checkoutDate = formatQueryDate(checkoutDateObj);

    setBookingDraft({
      from: initialDate,
      to: checkoutDate,
      adults: 2,
      children: 0,
      infants: 0,
      mealPlanId: "",
      selectedRoomIds: room ? [room.id] : [],
      notes: "",
    });

    setBookingError(null);
    setBookingContext(null);
    setBookingContextError(null);
    setDateSelection({
      from: initialDateObj,
      to: checkoutDateObj,
    });
    setDatePickerMonth(startOfMonth(initialDateObj));
    setIsDatePickerOpen(false);
    setActiveContext({
      type: "createBooking",
      date,
      room,
      roomType,
    });

    if (propertyRoomTypeId) {
      loadBookingContext({
        propertyRoomTypeId,
        from: initialDate,
        to: checkoutDate,
        roomsRequested: 1,
        preserveSelection: false,
      });
    }
  }, [activeContext, resetHoldState, setActiveContext, loadBookingContext]);

  const toggleRoomSelection = useCallback((roomId) => {
    if (!bookingContext) return;

    const availableRoomIds = new Set(
      (bookingContext.roomType?.rooms || [])
        .filter((room) => room.isAvailableForStay)
        .map((room) => room.id)
    );

    if (!availableRoomIds.has(roomId)) {
      return;
    }

    resetHoldState();

    setBookingDraft((prev) => {
      if (!prev) return prev;
      const current = new Set(prev.selectedRoomIds || []);
      if (current.has(roomId)) {
        current.delete(roomId);
      } else {
        current.add(roomId);
      }
      const nextDraft = {
        ...prev,
        selectedRoomIds: Array.from(current),
      };
      return adjustDraftForOccupancy(nextDraft, bookingContext);
    });
  }, [bookingContext, resetHoldState]);

  const updateBookingDraft = useCallback((field, value, options = {}) => {
    resetHoldState();

    setBookingDraft((prev) => {
      if (!prev) return prev;
      const next = {
        ...prev,
        [field]: value,
      };
      if (options.skipAdjust) {
        return next;
      }
      return adjustDraftForOccupancy(next, bookingContext);
    });
  }, [bookingContext, resetHoldState]);

  const handleBookingSubmit = useCallback(async (event) => {
    event.preventDefault();
    if (!bookingDraft || !activeContext || activeContext.type !== "createBooking") {
      return;
    }

    const propertyRoomTypeId = activeContext.roomType?.id;
    if (!propertyRoomTypeId) {
      setBookingError("Room type information is missing. Please reopen the booking modal.");
      return;
    }

    if (!bookingDraft.from || !bookingDraft.to) {
      setBookingError("Please select stay dates.");
      return;
    }

    // Prevent creating bookings for past dates
    const checkInDate = parseDateOnly(bookingDraft.from);
    if (isPastDate(checkInDate)) {
      setBookingError("Cannot create bookings for past dates. Please select today or a future date.");
      return;
    }

    if (bookingValidation.errors.length > 0) {
      setBookingError(bookingValidation.errors[0]);
      return;
    }

    if (!bookingDraft.selectedRoomIds || bookingDraft.selectedRoomIds.length === 0) {
      setBookingError("Please select at least one room.");
      return;
    }

    if (!pricingSummary || pricingSummary.error) {
      setBookingError(
        pricingSummary?.error || "Unable to calculate price. Please review the booking details."
      );
      return;
    }

    const holdBlockedBy = frontdeskActor?.label || "Front desk";
    const holdReason = frontdeskActor
      ? `${frontdeskActor.reason} by ${frontdeskActor.name}`
      : "Front desk hold";
    const holdUntilIso = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    setBookingError(null);
    setHoldState({ status: "loading", data: null, message: null });

    try {
      const response = await frontdeskCommon.createHold({
        propertyId,
        propertyRoomTypeId,
        roomIds: bookingDraft.selectedRoomIds,
        from: bookingDraft.from,
        to: bookingDraft.to,
        holdUntil: holdUntilIso,
        blockedBy: holdBlockedBy,
        reason: holdReason,
      });

      const holdData = response?.data?.data || response?.data || null;

      setHoldState({
        status: "success",
        data: holdData,
        message: holdData?.holdUntil
          ? `Rooms held until ${formatDateTime(holdData.holdUntil)}`
          : "Rooms held successfully.",
      });
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to place a hold on the selected rooms.";
      
      setHoldState({ status: "error", data: null, message });
      setBookingError(message);
    }
  }, [
    bookingDraft,
    activeContext,
    bookingValidation,
    pricingSummary,
    frontdeskActor,
    propertyId,
  ]);

  const openDatePicker = useCallback(() => {
    if (!bookingDraft) return;
    const fallbackDate =
      (activeContext?.date instanceof Date && !Number.isNaN(activeContext.date.getTime())
        ? activeContext.date
        : null) || new Date();
    const fromDate = bookingDraft.from ? parseDateOnly(bookingDraft.from) : null;
    const toDate = bookingDraft.to
      ? parseDateOnly(bookingDraft.to)
      : fromDate
      ? addDays(fromDate, 1)
      : null;
    const anchor = fromDate || toDate || fallbackDate;

    setDateSelection({
      from: fromDate || anchor,
      to: toDate || (fromDate ? addDays(fromDate, 1) : anchor),
    });
    setDatePickerMonth(startOfMonth(anchor));
    setIsDatePickerOpen(true);
  }, [bookingDraft, activeContext]);

  const handleCalendarDayClick = useCallback((day) => {
    // Prevent selecting past dates
    if (isPastDate(day)) {
      return;
    }
    
    setDateSelection((prev) => {
      if (!prev.from || (prev.from && prev.to)) {
        const formatted = formatQueryDate(day);
        setBookingDraft((draft) =>
          draft
            ? {
                ...draft,
                from: formatted,
                to: formatted,
              }
            : draft
        );

        return { from: day, to: null };
      }

      let nextFrom = prev.from;
      let nextTo = day;

      // Ensure selected dates are not in the past
      if (isPastDate(day)) {
        return prev; // Don't update if clicking past date
      }

      if (isDateBefore(day, prev.from)) {
        nextFrom = day;
        nextTo = prev.from;
      } else if (isSameDay(day, prev.from)) {
        nextTo = day;
      } else {
        nextTo = day;
      }

      const formattedFrom = formatQueryDate(nextFrom);
      const formattedTo = formatQueryDate(nextTo);

      setBookingDraft((draft) =>
        draft
          ? {
              ...draft,
              from: formattedFrom,
              to: formattedTo,
            }
          : draft
      );

      return {
        from: nextFrom,
        to: nextTo,
      };
    });
  }, []);

  const handleApplyDateSelection = useCallback(() => {
    if (!dateSelection.from) {
      setBookingError("Please select stay dates.");
      return;
    }

    const start = dateSelection.from;
    
    // Prevent selecting past dates
    if (isPastDate(start)) {
      setBookingError("Cannot select past dates. Please select today or a future date.");
      return;
    }
    
    const rawEnd = dateSelection.to;
    const normalizedEnd =
      rawEnd && rawEnd > start ? rawEnd : addDays(start, 1);

    resetHoldState();

    setBookingDraft((draft) =>
      draft
        ? {
            ...draft,
            from: formatQueryDate(start),
            to: formatQueryDate(normalizedEnd),
          }
        : draft
    );
    setDateSelection({ from: start, to: normalizedEnd });
    setBookingError(null);
    setIsDatePickerOpen(false);

    const propertyRoomTypeId = activeContext?.roomType?.id;
    const roomsRequested = Math.max(bookingDraft?.selectedRoomIds?.length || 1, 1);

    if (propertyRoomTypeId) {
      setBookingContext(null);
      setBookingContextError(null);
      loadBookingContext({
        propertyRoomTypeId,
        from: formatQueryDate(start),
        to: formatQueryDate(normalizedEnd),
        roomsRequested,
        preserveSelection: true,
      });
    }
  }, [dateSelection, bookingDraft, activeContext, resetHoldState, loadBookingContext]);

  const handleClearDateSelection = useCallback(() => {
    resetHoldState();

    setBookingDraft((draft) =>
      draft
        ? {
            ...draft,
            from: "",
            to: "",
          }
        : draft
    );
    setDateSelection({ from: null, to: null });
    setBookingError(null);
  }, [resetHoldState]);

  return {
    // State
    bookingDraft,
    bookingError,
    bookingContext,
    bookingContextLoading,
    bookingContextError,
    isDatePickerOpen,
    datePickerMonth,
    dateSelection,
    holdState,
    holdData,
    holdUntilLabel,
    heldRoomNames,
    pricingSummary,
    availableRooms,
    bookingValidation,
    stayDatesLabel,
    totalGuests,
    // Handlers
    resetHoldState,
    loadBookingContext,
    handleStartBooking,
    toggleRoomSelection,
    updateBookingDraft,
    handleBookingSubmit,
    openDatePicker,
    handleCalendarDayClick,
    handleApplyDateSelection,
    handleClearDateSelection,
    setDatePickerMonth,
    setIsDatePickerOpen,
    setBookingDraft,
    setBookingError,
    setBookingContext,
    setBookingContextError,
  };
};

