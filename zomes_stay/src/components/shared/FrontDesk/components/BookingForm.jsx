import React from "react";
import { Calendar } from "lucide-react";
import { formatDate, formatTimeLabel, numberFrom } from "../utils/formatUtils";
import { parseDateOnly } from "../utils/dateUtils";
import { getOccupancyValue, getExtraCapacityValue, getMinOccupancyValue } from "../utils/occupancyUtils";
import { calculateNights } from "../utils/dateUtils";
import DatePicker from "./DatePicker";
import PricingSummary from "./PricingSummary";

const BookingForm = ({
  bookingDraft,
  bookingContext,
  bookingContextLoading,
  bookingContextError,
  bookingValidation,
  bookingError,
  holdState,
  holdUntilLabel,
  heldRoomNames,
  holdData,
  pricingSummary,
  isDatePickerOpen,
  dateSelection,
  datePickerMonth,
  stayDatesLabel,
  paymentLinkData,
  paymentLinkRequestError,
  paymentLinkResult,
  paymentLinkUrl,
  paymentLinkExpiryLabel,
  showPaymentLinkForm,
  paymentLinkForm,
  paymentLinkError,
  paymentLinkLoading,
  cashPaymentForm,
  showCashPaymentForm,
  cashPaymentError,
  cashPaymentLoading,
  cashPaymentResult,
  availableRooms,
  mealPlans,
  propertyRoomTypeId,
  onDatePickerOpen,
  onDatePickerMonthChange,
  onCalendarDayClick,
  onClearDateSelection,
  onApplyDateSelection,
  onDatePickerCancel,
  onUpdateBookingDraft,
  onToggleRoomSelection,
  onBookingSubmit,
  onRetryBookingContext,
  onOpenPaymentLinkForm,
  onPaymentLinkFieldChange,
  onSavePaymentLinkRecipient,
  onCancelPaymentLinkForm,
  onSendPaymentLink,
  onOpenCashPaymentForm,
  onCashPaymentFieldChange,
  onCancelCashPaymentForm,
  onRecordCashPayment,
  onClose,
}) => {
  if (bookingContextLoading) {
    return (
      <div className="py-6 text-sm text-gray-600">
        Loading booking context. Please wait…
      </div>
    );
  }

  if (bookingContextError) {
    const retryFrom = bookingDraft?.from || "";
    const retryTo = bookingDraft?.to || "";
    return (
      <div className="space-y-4 text-sm text-gray-600">
        <p className="text-red-600">
          {bookingContextError?.response?.data?.message ||
            bookingContextError.message ||
            "Failed to load booking context."}
        </p>
        <button
          type="button"
          onClick={() =>
            propertyRoomTypeId &&
            onRetryBookingContext({
              propertyRoomTypeId,
              from: retryFrom,
              to: retryTo,
              roomsRequested: Math.max(bookingDraft?.selectedRoomIds?.length || 1, 1),
              preserveSelection: true,
            })
          }
          className="inline-flex items-center rounded-md border border-emerald-500 px-3 py-1.5 text-xs font-semibold text-emerald-600 transition hover:bg-emerald-50"
        >
          Retry loading
        </button>
      </div>
    );
  }

  const checkInDateObj = bookingDraft?.from ? parseDateOnly(bookingDraft.from) : null;
  const checkOutDateObj = bookingDraft?.to ? parseDateOnly(bookingDraft.to) : null;
  const nightsCount =
    checkInDateObj && checkOutDateObj
      ? bookingContext?.stay?.nights ?? calculateNights(bookingDraft?.from, bookingDraft?.to)
      : 0;
  const checkInTimeLabel = formatTimeLabel(
    bookingContext?.stay?.checkInTime || bookingContext?.property?.checkInTime
  );
  const checkOutTimeLabel = formatTimeLabel(
    bookingContext?.stay?.checkOutTime || bookingContext?.property?.checkOutTime
  );
  const occupancyValue = getOccupancyValue(bookingContext);
  const extraCapacityValue = getExtraCapacityValue(bookingContext);
  const roomsCount = bookingDraft?.selectedRoomIds?.length || 0;
  const totalGuests =
    (bookingDraft?.adults ?? 0) +
    (bookingDraft?.children ?? 0) +
    (bookingDraft?.infants ?? 0);
  const maxGuestsAllowed = roomsCount * (occupancyValue + extraCapacityValue);
  const holdLoading = holdState.status === "loading";

  return (
    <form className="space-y-5 text-sm text-gray-700" onSubmit={onBookingSubmit}>
      <div className="relative">
        <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400">
          Stay dates
        </label>
        <button
          type="button"
          onClick={onDatePickerOpen}
          className="mt-1 flex w-full items-center justify-between rounded-md border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <span>{stayDatesLabel}</span>
          <Calendar className="h-4 w-4 text-gray-400" />
        </button>

        {isDatePickerOpen && (
          <DatePicker
            isOpen={isDatePickerOpen}
            dateSelection={dateSelection}
            datePickerMonth={datePickerMonth}
            stayDatesLabel={stayDatesLabel}
            onMonthChange={(delta) => onDatePickerMonthChange(delta)}
            onDayClick={onCalendarDayClick}
            onClear={onClearDateSelection}
            onCancel={onDatePickerCancel}
            onApply={onApplyDateSelection}
          />
        )}
      </div>

      {bookingContext && (
        <div className="space-y-1 rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700">
          {checkInDateObj && (
            <div>
              Check-in: <span className="font-semibold">{formatDate(checkInDateObj, { dateStyle: "medium" })}</span>
              {checkInTimeLabel ? ` at ${checkInTimeLabel}` : ""}
            </div>
          )}
          {checkOutDateObj && (
            <div>
              Check-out: <span className="font-semibold">{formatDate(checkOutDateObj, { dateStyle: "medium" })}</span>
              {checkOutTimeLabel ? ` at ${checkOutTimeLabel}` : ""}
            </div>
          )}
          <div>
            Stay length: <span className="font-semibold">{nightsCount || 0}</span> night
            {nightsCount === 1 ? "" : "s"}
          </div>
          <div>
            Default occupancy per room: <span className="font-semibold">{occupancyValue}</span>
          </div>
          <div>
            Extra bed capacity per room:{" "}
            <span className="font-semibold">{extraCapacityValue}</span>
          </div>
          <div>
            Selected rooms: <span className="font-semibold">{roomsCount}</span> • Guests:{" "}
            <span className="font-semibold">{totalGuests}</span> • Maximum allowed:{" "}
            <span className="font-semibold">{maxGuestsAllowed || 0}</span>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400">
            Adults
          </label>
          <input
            type="number"
            min={0}
            value={bookingDraft?.adults ?? 0}
            onChange={(event) =>
              onUpdateBookingDraft("adults", Math.max(0, Number(event.target.value)))
            }
            className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400">
            Children
          </label>
          <input
            type="number"
            min={0}
            value={bookingDraft?.children ?? 0}
            onChange={(event) =>
              onUpdateBookingDraft("children", Math.max(0, Number(event.target.value)))
            }
            className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400">
            Infants
          </label>
          <input
            type="number"
            min={0}
            value={bookingDraft?.infants ?? 0}
            onChange={(event) =>
              onUpdateBookingDraft("infants", Math.max(0, Number(event.target.value)))
            }
            className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400">
          Meal plan
        </label>
        <select
          className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          value={bookingDraft?.mealPlanId || ""}
          onChange={(event) =>
            onUpdateBookingDraft("mealPlanId", event.target.value, { skipAdjust: true })
          }
          disabled={mealPlans.length === 0}
        >
          {mealPlans.length === 0 && <option value="">No meal plans available</option>}
          {mealPlans.map((plan) => {
            const labelParts = [
              plan.mealPlan?.name,
              plan.ratePlan?.name,
            ].filter(Boolean);
            const basePrice =
              numberFrom(plan.pricing?.doubleOccupancy) ||
              numberFrom(plan.pricing?.groupOccupancy) ||
              numberFrom(plan.pricing?.singleOccupancy);
            const mealPlanId = plan.mealPlan?.id || "";
            return (
              <option key={plan.id} value={mealPlanId}>
                {labelParts.join(" • ") || "Meal plan"}{" "}
                {basePrice ? `— ₹${basePrice.toLocaleString("en-IN")}/night` : ""}
              </option>
            );
          })}
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400">
          Select rooms
        </label>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {availableRooms.length === 0 && (
            <p className="rounded-md border border-dashed border-gray-300 px-3 py-2 text-xs text-gray-500">
              No rooms available for the selected dates.
            </p>
          )}
          {availableRooms.map((roomOption) => {
            const roomId = roomOption.id;
            const isSelected = bookingDraft?.selectedRoomIds?.includes(roomId);

            return (
              <label
                key={roomId}
                className={`flex cursor-pointer items-center justify-between rounded-md border px-3 py-2 text-xs transition ${
                  isSelected
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <span className="font-medium">
                  {roomOption.label || roomOption.name || roomOption.code || "Room"}
                </span>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggleRoomSelection(roomId)}
                  className="h-4 w-4 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500"
                />
              </label>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Selected rooms: {bookingDraft?.selectedRoomIds?.length ?? 0}
        </p>
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400">
          Notes (optional)
        </label>
        <textarea
          rows={3}
          value={bookingDraft?.notes || ""}
          onChange={(event) =>
            onUpdateBookingDraft("notes", event.target.value, { skipAdjust: true })
          }
          placeholder="Special requests, payment instructions, etc."
          className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <PricingSummary pricingSummary={pricingSummary} />

      {bookingValidation.warnings.length > 0 && (
        <div className="space-y-1 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          {bookingValidation.warnings.map((warning, idx) => (
            <div key={`booking-warning-${idx}`}>⚠️ {warning}</div>
          ))}
        </div>
      )}

      {(bookingError || bookingValidation.errors.length > 0) && (
        <div className="space-y-1 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
          {[bookingError, ...bookingValidation.errors]
            .filter(Boolean)
            .reduce((acc, message) => {
              if (!acc.includes(message)) acc.push(message);
              return acc;
            }, [])
            .map((message, index) => (
              <div key={`booking-error-${index}`}>• {message}</div>
            ))}
        </div>
      )}

      {holdState.status === "error" && holdState.message && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
          {holdState.message}
        </div>
      )}

      {holdState.status === "loading" && (
        <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-600">
          Creating hold... Please wait...
        </div>
      )}

      {holdState.status === "success" && (
        <div className="flex flex-col gap-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-3 text-xs text-emerald-700">
          <div className="space-y-1">
            <div>Rooms held successfully.</div>
            {holdUntilLabel && (
              <div>
                Hold expires: <span className="font-semibold">{holdUntilLabel}</span>
              </div>
            )}
            {heldRoomNames.length > 0 && (
              <div>
                Rooms: <span className="font-semibold">{heldRoomNames.join(", ")}</span>
              </div>
            )}
            <div>
              Hold references:{" "}
              <span className="font-semibold">{holdData?.records?.length ?? 0}</span>
            </div>
          </div>

          {paymentLinkData && (
            <div className="space-y-1 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-blue-700">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-blue-800">
                Payment link recipient
              </div>
              {paymentLinkData.fullName && <div>Name: {paymentLinkData.fullName}</div>}
              {paymentLinkData.email && <div>Email: {paymentLinkData.email}</div>}
              <div>Phone: {paymentLinkData.phone}</div>
            </div>
          )}

          {paymentLinkRequestError && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
              {paymentLinkRequestError}
            </div>
          )}

          {paymentLinkResult && (
            <div className="space-y-1 rounded-md border border-blue-200 bg-blue-50 px-3 py-3 text-xs text-blue-700">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-blue-800">
                Payment link created
              </div>
              {Number.isFinite(paymentLinkResult?.amount) && (
                <div className="space-y-1 border-t border-blue-200 pt-2">
                  {paymentLinkResult?.taxBreakdown && (
                    <>
                      <div className="flex items-center justify-between">
                        <span>Base Price:</span>
                        <span className="font-semibold">
                          ₹{((paymentLinkResult.taxBreakdown.totalBasePrice || 0) / 100).toLocaleString("en-IN")}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Tax:</span>
                        <span className="font-semibold">
                          ₹{((paymentLinkResult.taxBreakdown.totalTax || 0) / 100).toLocaleString("en-IN")}
                        </span>
                      </div>
                    </>
                  )}
                  <div className="flex items-center justify-between border-t border-blue-200 pt-1 font-semibold">
                    <span>Total Amount:</span>
                    <span>
                      ₹{(paymentLinkResult.amount / 100).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              )}
              {paymentLinkUrl && (
                <div className="break-all">
                  Link:{" "}
                  <a
                    href={paymentLinkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold underline"
                  >
                    {paymentLinkUrl}
                  </a>
                </div>
              )}
              {paymentLinkExpiryLabel && (
                <div>
                  Expires: <span className="font-semibold">{paymentLinkExpiryLabel}</span>
                </div>
              )}
              {paymentLinkResult.orderId && (
                <div>
                  Order reference:{" "}
                  <span className="font-semibold">{paymentLinkResult.orderId}</span>
                </div>
              )}
            </div>
          )}

          {showPaymentLinkForm && (
            <div className="space-y-3 rounded-md border border-gray-200 bg-white px-3 py-3 text-gray-700 shadow-sm">
              <div className="text-sm font-semibold text-gray-900">Guest contact details</div>
              {paymentLinkError && (
                <div className="rounded border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-600">
                  {paymentLinkError}
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    Full name (optional)
                  </span>
                  <input
                    value={paymentLinkForm.fullName}
                    onChange={onPaymentLinkFieldChange("fullName")}
                    type="text"
                    placeholder="Guest name"
                    className="rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    Email (optional)
                  </span>
                  <input
                    value={paymentLinkForm.email}
                    onChange={onPaymentLinkFieldChange("email")}
                    type="email"
                    placeholder="guest@email.com"
                    className="rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </label>
              </div>
              <label className="flex flex-col gap-1 sm:w-1/2">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  Mobile number*
                </span>
                <div className="flex items-center rounded-md border border-gray-200 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                  <span className="px-3 text-sm text-gray-500">+91</span>
                  <input
                    value={paymentLinkForm.phone}
                    onChange={onPaymentLinkFieldChange("phone")}
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="10 digit number"
                    className="flex-1 rounded-r-md border-l border-gray-200 px-3 py-2 text-sm text-gray-700 focus:outline-none"
                  />
                </div>
              </label>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onCancelPaymentLinkForm}
                  className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:border-gray-300 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onSavePaymentLinkRecipient}
                  className="rounded-md bg-blue-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-600"
                >
                  Save details
                </button>
              </div>
            </div>
          )}

          {showCashPaymentForm && (
            <div className="space-y-3 rounded-md border border-gray-200 bg-white px-3 py-3 text-gray-700 shadow-sm">
              <div className="text-sm font-semibold text-gray-900">Cash Payment Details</div>
              {cashPaymentError && (
                <div className="rounded border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-600">
                  {cashPaymentError}
                </div>
              )}
              {cashPaymentResult && (
                <div className="space-y-1 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-800">
                    Booking Created Successfully
                  </div>
                  <div>Booking Number: <span className="font-semibold">{cashPaymentResult.bookingNumber}</span></div>
                  <div>Transaction ID: <span className="font-semibold">{cashPaymentResult.transactionID}</span></div>
                  <div>Amount: <span className="font-semibold">₹{cashPaymentResult.amount?.toLocaleString("en-IN")}</span></div>
                  <div className="mt-2 pt-2 border-t border-emerald-200">
                    <div className="text-[10px] text-emerald-600">The booking has been confirmed. Rooms are now marked as booked.</div>
                  </div>
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    Guest Full Name*
                  </span>
                  <input
                    value={cashPaymentForm?.guest?.fullName || ""}
                    onChange={onCashPaymentFieldChange("guest", "fullName")}
                    type="text"
                    placeholder="Guest name"
                    className="rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    Guest Email*
                  </span>
                  <input
                    value={cashPaymentForm?.guest?.email || ""}
                    onChange={onCashPaymentFieldChange("guest", "email")}
                    type="email"
                    placeholder="guest@email.com"
                    className="rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </label>
              </div>
              <label className="flex flex-col gap-1 sm:w-1/2">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  Mobile Number*
                </span>
                <div className="flex items-center rounded-md border border-gray-200 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                  <span className="px-3 text-sm text-gray-500">+91</span>
                  <input
                    value={cashPaymentForm?.guest?.phone || ""}
                    onChange={onCashPaymentFieldChange("guest", "phone")}
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="10 digit number"
                    className="flex-1 rounded-r-md border-l border-gray-200 px-3 py-2 text-sm text-gray-700 focus:outline-none"
                    required
                  />
                </div>
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    Payment Received By*
                  </span>
                  <input
                    value={cashPaymentForm?.payment?.receivedBy || ""}
                    onChange={onCashPaymentFieldChange("payment", "receivedBy")}
                    type="text"
                    placeholder="Staff name"
                    className="rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    Receipt Number (optional)
                  </span>
                  <input
                    value={cashPaymentForm?.payment?.receiptNumber || ""}
                    onChange={onCashPaymentFieldChange("payment", "receiptNumber")}
                    type="text"
                    placeholder="Receipt number"
                    className="rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </label>
              </div>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  Payment Date*
                </span>
                <input
                  type="datetime-local"
                  value={cashPaymentForm?.payment?.paymentDate || ""}
                  onChange={onCashPaymentFieldChange("payment", "paymentDate")}
                  max={new Date().toISOString().slice(0, 16)}
                  className="rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
              </label>
              {pricingSummary && (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                  <div className="flex items-center justify-between font-semibold">
                    <span>Total Amount:</span>
                    <span>₹{pricingSummary.total.toLocaleString("en-IN")}</span>
                  </div>
                </div>
              )}
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onCancelCashPaymentForm}
                  className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:border-gray-300 hover:text-gray-800"
                  disabled={cashPaymentLoading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onRecordCashPayment}
                  className="rounded-md bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={
                    cashPaymentLoading ||
                    !cashPaymentForm?.guest?.fullName ||
                    !cashPaymentForm?.guest?.email ||
                    !cashPaymentForm?.guest?.phone ||
                    !cashPaymentForm?.payment?.receivedBy ||
                    !cashPaymentForm?.payment?.paymentDate ||
                    cashPaymentResult
                  }
                >
                  {cashPaymentLoading ? "Processing..." : cashPaymentResult ? "Booking Created" : "Record Cash Payment"}
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:border-gray-300 hover:text-gray-800"
            >
              Close
            </button>
            <button
              type="button"
              onClick={onOpenCashPaymentForm}
              className="rounded-md bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={cashPaymentLoading || cashPaymentResult || holdState.status !== "success"}
            >
              {cashPaymentResult ? "Booking Created" : "Record cash payment"}
            </button>
            <button
              type="button"
              onClick={onOpenPaymentLinkForm}
              className="rounded-md border border-blue-500 px-3 py-1.5 text-xs font-semibold text-blue-600 transition hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={paymentLinkLoading}
            >
              {paymentLinkData ? "Edit guest details" : "Add guest details"}
            </button>
            <button
              type="button"
              onClick={onSendPaymentLink}
              className="rounded-md bg-blue-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!paymentLinkData || paymentLinkLoading}
            >
              {paymentLinkLoading
                ? "Sending..."
                : paymentLinkResult
                ? "Resend payment link"
                : "Send payment link"}
            </button>
          </div>
        </div>
      )}

      {holdState.status !== "success" && (
        <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:border-gray-300 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={
              holdLoading ||
              bookingContextLoading ||
              bookingValidation.errors.length > 0 ||
              !pricingSummary ||
              pricingSummary.total <= 0
            }
            className="rounded-md bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {holdLoading ? "Placing hold…" : "Continue to booking"}
          </button>
        </div>
      )}
    </form>
  );
};

export default BookingForm;

