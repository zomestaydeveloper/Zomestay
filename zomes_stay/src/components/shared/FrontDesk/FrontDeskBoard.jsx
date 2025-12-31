import React, { useEffect, useMemo, useState } from "react";
// Utils
import {
  addDays,
  formatQueryDate,
  isPastDate,
  startOfWeek,
} from "./utils/dateUtils";
import { mapSnapshotToBoard } from "./utils/snapshotUtils";
// Hooks
import { useFrontDeskActor } from "./hooks/useFrontDeskActor";
import { usePaymentLink } from "./hooks/usePaymentLink";
import { useCashPayment } from "./hooks/useCashPayment";
import { useRoomStatus } from "./hooks/useRoomStatus";
import { useBooking } from "./hooks/useBooking";
import { useFrontDeskSnapshot } from "./hooks/useFrontDeskSnapshot";
// Components
import FrontDeskHeader from "./components/FrontDeskHeader";
import FrontDeskBoardTable from "./components/FrontDeskBoardTable";
import PropertySummary from "./components/PropertySummary";
import ContextModalManager from "./components/ContextModalManager";

const FrontDeskBoard = ({ mode = "admin", propertyId, propertyName: propertyNameProp }) => {
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date()));
  const [expandedRoomTypes, setExpandedRoomTypes] = useState(() => new Set());
  const [activeContext, setActiveContext] = useState(null);
  const [refreshCounter, setRefreshCounter] = useState(0);

  // Custom hooks
  const frontdeskActor = useFrontDeskActor();
  const { loading, error, snapshot } = useFrontDeskSnapshot({
    propertyId,
    weekStart,
    refreshCounter,
  });

  // Initialize booking hook first (it's independent)
  const booking = useBooking({
    propertyId,
    activeContext,
    setActiveContext,
    frontdeskActor,
    onResetPaymentLink: () => {}, // Will be set after paymentLink hook
    onResetCashPayment: () => {}, // Will be set after cashPayment hook
  });

  // Initialize payment hooks with booking values
  const paymentLink = usePaymentLink({
    propertyId,
    propertyName: propertyNameProp,
    bookingDraft: booking.bookingDraft,
    bookingContext: booking.bookingContext,
    activeContext,
    holdState: booking.holdState,
    pricingSummary: booking.pricingSummary,
    totalGuests: booking.totalGuests,
    frontdeskActor,
    onReset: () => {},
  });

  const cashPayment = useCashPayment({
    propertyId,
    bookingDraft: booking.bookingDraft,
    bookingContext: booking.bookingContext,
    activeContext,
    holdState: booking.holdState,
    pricingSummary: booking.pricingSummary,
    frontdeskActor,
    onRefresh: () => setRefreshCounter((prev) => prev + 1),
    onResetHold: booking.resetHoldState,
    onResetCashPayment: () => {},
    onCloseModal: () => setActiveContext(null),
  });

  // Update booking's reset callbacks to include payment resets
  // Note: This creates a new resetHoldState that calls all resets
  const resetHoldState = () => {
    booking.resetHoldState();
    paymentLink.resetPaymentLinkState();
    cashPayment.resetCashPaymentState();
  };

  const roomStatus = useRoomStatus({
    propertyId,
    activeContext,
    frontdeskActor,
    onRefresh: () => setRefreshCounter((prev) => prev + 1),
    onResetRoomStatus: () => {},
    onCloseModal: () => setActiveContext(null),
    setActiveContext,
  });

  // All handlers are now in hooks - keeping only simple UI handlers

  // Simple UI handlers
  const toggleRoomType = (roomTypeId) => {
    setExpandedRoomTypes((prev) => {
      const next = new Set(prev);
      if (next.has(roomTypeId)) {
        next.delete(roomTypeId);
      } else {
        next.add(roomTypeId);
      }
      return next;
    });
  };

  const handleCellClick = (payload) => {
    setActiveContext(payload);
  };

  const handleEmptyCell = ({ date, room, roomType }) => {
    // Prevent actions on past dates
    if (isPastDate(date)) {
      return;
    }
    
    setActiveContext({
      type: "action",
      date,
      room,
      roomType,
    });
    booking.setBookingDraft(null);
    booking.setBookingError(null);
  };

  // Reset property when it changes
  useEffect(() => {
    setExpandedRoomTypes(new Set());
    if (propertyId) {
      setWeekStart(startOfWeek(new Date()));
    }
  }, [propertyId]);

  // Computed values for rendering
  const boardData = useMemo(() => mapSnapshotToBoard(snapshot), [snapshot]);
  const propertyName = propertyNameProp || boardData?.property?.name || "";
  const rangeStart = boardData?.days?.[0] || weekStart;
  const rangeEnd =
    (boardData?.days?.length ?? 0) > 0
      ? boardData.days[boardData.days.length - 1]
      : addDays(weekStart, 6);
  const days = boardData?.days ?? [];
  const summary = boardData?.summary ?? [];
  const roomTypes = boardData?.roomTypes ?? [];
  const totalRooms = boardData?.property?.totalRooms ?? 0;
  const hasBoardData = roomTypes.length > 0 || summary.length > 0;
  const errorMessage =
    error?.response?.data?.message || error?.message || null;
  const displayDays =
    days.length > 0
      ? days
      : Array.from({ length: 7 }, (_, idx) => addDays(rangeStart, idx));

  return (
    <div className="space-y-6">
      <FrontDeskHeader
        weekStart={weekStart}
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        loading={loading}
        onWeekStartChange={setWeekStart}
        onRefresh={() => setRefreshCounter((prev) => prev + 1)}
        onTodayClick={() => setWeekStart(startOfWeek(new Date()))}
      />

      <PropertySummary
        propertyName={propertyName}
        totalRooms={totalRooms}
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
      />

      {errorMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {errorMessage}
        </div>
      )}

      <FrontDeskBoardTable
        loading={loading}
        displayDays={displayDays}
        summary={summary}
        roomTypes={roomTypes}
        expandedRoomTypes={expandedRoomTypes}
        onToggleRoomType={toggleRoomType}
        onCellClick={handleCellClick}
        onEmptyCellClick={handleEmptyCell}
      />

      {!loading && !error && !hasBoardData && (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500">
          No front desk data available for this range.
        </div>
      )}

      <ContextModalManager
        activeContext={activeContext}
        propertyId={propertyId}
        booking={booking}
        paymentLink={paymentLink}
        cashPayment={cashPayment}
        roomStatus={roomStatus}
        onClose={() => {
          setActiveContext(null);
          booking.setBookingDraft(null);
          booking.setBookingError(null);
          booking.setBookingContext(null);
          booking.setBookingContextError(null);
          booking.setIsDatePickerOpen(false);
          resetHoldState();
          roomStatus.resetRoomStatusState();
        }}
        onRefresh={() => setRefreshCounter((prev) => prev + 1)}
      />
    </div>
  );
};

export default FrontDeskBoard;
