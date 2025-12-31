import React from "react";
import Modal from "./Modal";
import ActionModal from "./ActionModal";
import BookingDetailsModal from "./BookingDetailsModal";
import BookingForm from "./BookingForm";
import NonAvailableModal from "./NonAvailableModal";
import RoomStatusModal from "./RoomStatusModal";
import { ROOM_STATUS_ACCENT, ROOM_STATUS_ACTION_LABELS } from "../constants";
import frontdeskCommon from "../../../../services/property/frontdesk/frontdeskcommon";
import { formatQueryDate, addMonths } from "../utils/dateUtils";
import { formatDateTime } from "../utils/formatUtils";

const ContextModalManager = ({
  activeContext,
  propertyId,
  booking,
  paymentLink,
  cashPayment,
  roomStatus,
  onClose,
  onRefresh,
}) => {
  if (!activeContext) return null;

  const closeModal = () => {
    onClose();
  };

  if (activeContext.type === "booking") {
    const { slot, date, room, roomType } = activeContext;
    return (
      <Modal title="Booking details" accentColour="bg-emerald-500" onClose={closeModal}>
        <BookingDetailsModal slot={slot} date={date} room={room} roomType={roomType} onClose={closeModal} />
      </Modal>
    );
  }

  if (activeContext.type === "nonAvailable") {
    const { slot, date, room, roomType } = activeContext;
    const getModalTitle = () => {
      if (slot.type === "maintenance") return "Maintenance";
      if (slot.type === "out_of_service") return "Out of service";
      return "Blocked";
    };
    const getAccentColour = () => {
      if (slot.type === "maintenance") return "bg-rose-500";
      if (slot.type === "out_of_service") return "bg-gray-600";
      return "bg-amber-500";
    };
    return (
      <Modal title={getModalTitle()} accentColour={getAccentColour()} onClose={closeModal}>
        <NonAvailableModal
          slot={slot}
          date={date}
          room={room}
          roomType={roomType}
          onRelease={() => {
            if (slot.availabilityId) {
              if (slot.type === "blocked") {
                frontdeskCommon.releaseBlock({ propertyId, availabilityId: slot.availabilityId });
              } else if (slot.type === "maintenance") {
                frontdeskCommon.releaseMaintenance({ propertyId, availabilityId: slot.availabilityId });
              } else if (slot.type === "out_of_service") {
                frontdeskCommon.releaseOutOfService({ propertyId, availabilityId: slot.availabilityId });
              }
              onRefresh();
              closeModal();
            }
          }}
          onClose={closeModal}
        />
      </Modal>
    );
  }

  if (activeContext.type === "roomStatus") {
    const { statusType, mode } = activeContext;
    return (
      <Modal
        title={mode === "release" ? ROOM_STATUS_ACTION_LABELS[statusType]?.release : ROOM_STATUS_ACTION_LABELS[statusType]?.create}
        accentColour={ROOM_STATUS_ACCENT[statusType] || "bg-blue-500"}
        onClose={closeModal}
      >
        <RoomStatusModal
          statusType={statusType}
          mode={mode}
          date={activeContext.date}
          room={activeContext.room}
          roomType={activeContext.roomType}
          roomStatusForm={roomStatus.roomStatusForm}
          roomStatusRequest={roomStatus.roomStatusRequest}
          onFormChange={roomStatus.handleRoomStatusFormChange}
          onSubmit={roomStatus.handleSubmitRoomStatus}
          onClose={closeModal}
        />
      </Modal>
    );
  }

  if (activeContext.type === "action") {
    const { date, room, roomType } = activeContext;
    return (
      <Modal title="Create new reservation" accentColour="bg-blue-500" onClose={closeModal}>
        <ActionModal
          date={date}
          room={room}
          roomType={roomType}
          onBook={booking.handleStartBooking}
          onBlock={() =>
            roomStatus.openRoomStatusModal({
              statusType: "blocked",
              mode: "create",
              context: { date, room, roomType },
            })
          }
          onMaintenance={() =>
            roomStatus.openRoomStatusModal({
              statusType: "maintenance",
              mode: "create",
              context: { date, room, roomType },
            })
          }
          onOutOfService={() =>
            roomStatus.openRoomStatusModal({
              statusType: "out_of_service",
              mode: "create",
              context: { date, room, roomType },
            })
          }
        />
      </Modal>
    );
  }

  if (activeContext.type === "createBooking") {
    const { roomType } = activeContext;
    const roomsAvailableForSelection =
      booking.bookingContext && booking.bookingContext.roomType
        ? booking.availableRooms
        : roomType?.rooms || [];
    const mealPlans = booking.bookingContext?.mealPlans || [];
    const propertyRoomTypeId =
      booking.bookingContext?.roomType?.propertyRoomTypeId || roomType?.id || null;

    let content = null;

    if (booking.bookingContextLoading) {
      content = (
        <div className="py-6 text-sm text-gray-600">
          Loading booking context. Please wait…
        </div>
      );
    } else if (booking.bookingContextError) {
      const retryFrom = booking.bookingDraft?.from || formatQueryDate(activeContext.date);
      const retryTo = booking.bookingDraft?.to || formatQueryDate(activeContext.date);
      content = (
        <div className="space-y-4 text-sm text-gray-600">
          <p className="text-red-600">
            {booking.bookingContextError?.response?.data?.message ||
              booking.bookingContextError.message ||
              "Failed to load booking context."}
          </p>
          <button
            type="button"
            onClick={() =>
              propertyRoomTypeId &&
              booking.loadBookingContext({
                propertyRoomTypeId,
                from: retryFrom,
                to: retryTo,
                roomsRequested: Math.max(booking.bookingDraft?.selectedRoomIds?.length || 1, 1),
                preserveSelection: true,
              })
            }
            className="inline-flex items-center rounded-md border border-emerald-500 px-3 py-1.5 text-xs font-semibold text-emerald-600 transition hover:bg-emerald-50"
          >
            Retry loading
          </button>
        </div>
      );
    } else {
      content = (
        <BookingForm
          bookingDraft={booking.bookingDraft}
          bookingContext={booking.bookingContext}
          bookingContextLoading={booking.bookingContextLoading}
          bookingContextError={booking.bookingContextError}
          bookingValidation={booking.bookingValidation}
          bookingError={booking.bookingError}
          holdState={booking.holdState}
          holdUntilLabel={booking.holdUntilLabel}
          heldRoomNames={booking.heldRoomNames}
          holdData={booking.holdData}
          pricingSummary={booking.pricingSummary}
          isDatePickerOpen={booking.isDatePickerOpen}
          dateSelection={booking.dateSelection}
          datePickerMonth={booking.datePickerMonth}
          stayDatesLabel={booking.stayDatesLabel}
          paymentLinkData={paymentLink.paymentLinkData}
          paymentLinkRequestError={paymentLink.paymentLinkRequest.status === "error" ? paymentLink.paymentLinkRequest.error : null}
          paymentLinkResult={paymentLink.paymentLinkRequest.status === "success" ? paymentLink.paymentLinkRequest.data : null}
          paymentLinkUrl={
            paymentLink.paymentLinkRequest.status === "success"
              ? paymentLink.paymentLinkRequest.data?.paymentLinkUrl ||
                paymentLink.paymentLinkRequest.data?.short_url ||
                paymentLink.paymentLinkRequest.data?.shortUrl ||
                paymentLink.paymentLinkRequest.data?.url ||
                null
              : null
          }
          paymentLinkExpiryLabel={
            paymentLink.paymentLinkRequest.status === "success" && paymentLink.paymentLinkRequest.data?.expiresAt
              ? formatDateTime(paymentLink.paymentLinkRequest.data.expiresAt)
              : paymentLink.paymentLinkRequest.status === "success" && paymentLink.paymentLinkRequest.data?.expireBy
              ? formatDateTime(paymentLink.paymentLinkRequest.data.expireBy)
              : null
          }
          showPaymentLinkForm={paymentLink.showPaymentLinkForm}
          paymentLinkForm={paymentLink.paymentLinkForm}
          paymentLinkError={paymentLink.paymentLinkError}
          paymentLinkLoading={paymentLink.paymentLinkRequest.status === "loading"}
          cashPaymentForm={cashPayment.cashPaymentForm}
          showCashPaymentForm={cashPayment.showCashPaymentForm}
          cashPaymentError={cashPayment.cashPaymentError}
          cashPaymentLoading={cashPayment.cashPaymentRequest.status === "loading"}
          cashPaymentResult={cashPayment.cashPaymentRequest.status === "success" ? cashPayment.cashPaymentRequest.data : null}
          availableRooms={roomsAvailableForSelection}
          mealPlans={mealPlans}
          propertyRoomTypeId={propertyRoomTypeId}
          onDatePickerOpen={booking.openDatePicker}
          onDatePickerMonthChange={(delta) => booking.setDatePickerMonth((prev) => addMonths(prev, delta))}
          onCalendarDayClick={booking.handleCalendarDayClick}
          onClearDateSelection={booking.handleClearDateSelection}
          onApplyDateSelection={booking.handleApplyDateSelection}
          onDatePickerCancel={() => booking.setIsDatePickerOpen(false)}
          onUpdateBookingDraft={booking.updateBookingDraft}
          onToggleRoomSelection={booking.toggleRoomSelection}
          onBookingSubmit={booking.handleBookingSubmit}
          onRetryBookingContext={booking.loadBookingContext}
          onOpenPaymentLinkForm={paymentLink.handleOpenPaymentLinkForm}
          onPaymentLinkFieldChange={paymentLink.handlePaymentLinkFieldChange}
          onSavePaymentLinkRecipient={paymentLink.handleSavePaymentLinkRecipient}
          onCancelPaymentLinkForm={paymentLink.handleCancelPaymentLinkForm}
          onSendPaymentLink={paymentLink.handleSendPaymentLink}
          onOpenCashPaymentForm={cashPayment.handleOpenCashPaymentForm}
          onCashPaymentFieldChange={cashPayment.handleCashPaymentFieldChange}
          onCancelCashPaymentForm={cashPayment.handleCancelCashPaymentForm}
          onRecordCashPayment={cashPayment.handleRecordCashPayment}
          onClose={closeModal}
        />
      );
    }

    return (
      <Modal title="Create reservation" accentColour="bg-emerald-500" onClose={closeModal}>
        {content}
      </Modal>
    );
  }

  return null;
};

export default ContextModalManager;

