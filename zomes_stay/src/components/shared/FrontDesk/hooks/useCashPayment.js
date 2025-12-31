import { useState, useCallback } from "react";
import paymentService from "../../../../services/property/frontdesk/paymentService";

/**
 * Custom hook to manage cash payment state and operations
 */
export const useCashPayment = ({
  propertyId,
  bookingDraft,
  bookingContext,
  activeContext,
  holdState,
  pricingSummary,
  frontdeskActor,
  onRefresh,
  onResetHold,
  onResetCashPayment,
  onCloseModal,
}) => {
  const [showCashPaymentForm, setShowCashPaymentForm] = useState(false);
  const [cashPaymentForm, setCashPaymentForm] = useState({
    guest: {
      fullName: "",
      email: "",
      phone: "",
      address: "",
    },
    payment: {
      receivedBy: "",
      receiptNumber: "",
      paymentDate: new Date().toISOString().slice(0, 16),
    },
  });
  const [cashPaymentError, setCashPaymentError] = useState(null);
  const [cashPaymentRequest, setCashPaymentRequest] = useState({
    status: "idle",
    data: null,
    error: null,
  });

  const resetCashPaymentState = useCallback(() => {
    setShowCashPaymentForm(false);
    setCashPaymentForm({
      guest: {
        fullName: "",
        email: "",
        phone: "",
        address: "",
      },
      payment: {
        receivedBy: "",
        receiptNumber: "",
        paymentDate: new Date().toISOString().slice(0, 16),
      },
    });
    setCashPaymentError(null);
    setCashPaymentRequest({
      status: "idle",
      data: null,
      error: null,
    });
  }, []);

  const handleOpenCashPaymentForm = useCallback(() => {
    setCashPaymentError(null);
    setShowCashPaymentForm(true);
    setCashPaymentForm((prev) => ({
      ...prev,
      payment: {
        ...prev.payment,
        receivedBy: frontdeskActor?.label || frontdeskActor?.name || "Front desk",
      },
    }));
  }, [frontdeskActor]);

  const handleCashPaymentFieldChange = useCallback(
    (section, field) => (event) => {
      const value = event?.target?.value ?? "";
      setCashPaymentForm((prev) => ({
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value,
        },
      }));
    },
    []
  );

  const handleCancelCashPaymentForm = useCallback(() => {
    setCashPaymentError(null);
    setShowCashPaymentForm(false);
  }, []);

  const handleRecordCashPayment = useCallback(async () => {
    if (!propertyId || !bookingDraft || holdState.status !== "success") {
      setCashPaymentError("Please complete the booking hold first.");
      return;
    }

    const guest = cashPaymentForm.guest;
    const payment = cashPaymentForm.payment;

    // Validation
    if (!guest.fullName || guest.fullName.trim().length < 2) {
      setCashPaymentError("Guest full name is required (minimum 2 characters).");
      return;
    }

    if (!guest.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guest.email)) {
      setCashPaymentError("Valid guest email is required.");
      return;
    }

    if (!guest.phone || !/^\d{10}$/.test(guest.phone)) {
      setCashPaymentError("Valid guest phone number is required (10 digits).");
      return;
    }

    if (!payment.receivedBy || payment.receivedBy.trim().length < 2) {
      setCashPaymentError("Payment received by information is required.");
      return;
    }

    if (!payment.paymentDate) {
      setCashPaymentError("Payment date is required.");
      return;
    }

    const paymentDate = new Date(payment.paymentDate);
    if (paymentDate > new Date()) {
      setCashPaymentError("Payment date cannot be in the future.");
      return;
    }

    if (!pricingSummary || pricingSummary.total <= 0) {
      setCashPaymentError("Invalid pricing. Please recalculate the booking.");
      return;
    }

    setCashPaymentRequest({ status: "loading", data: null, error: null });
    setCashPaymentError(null);

    try {
      const propertyRoomTypeId =
        bookingContext?.roomType?.propertyRoomTypeId || activeContext?.roomType?.id;

      if (!propertyRoomTypeId) {
        throw new Error("Property room type identifier is missing.");
      }

      const payload = {
        propertyRoomTypeId,
        booking: {
          from: bookingDraft.from,
          to: bookingDraft.to,
          adults: bookingDraft.adults || 0,
          children: bookingDraft.children || 0,
          infants: bookingDraft.infants || 0,
          totalGuests:
            (bookingDraft.adults || 0) +
            (bookingDraft.children || 0) +
            (bookingDraft.infants || 0),
          selectedRoomIds: bookingDraft.selectedRoomIds || [],
          notes: bookingDraft.notes || "",
          mealPlanId: bookingDraft.mealPlanId || null,
        },
        pricing: {
          total: pricingSummary.total,
          nights: pricingSummary.nights,
          basePerNightTotal: pricingSummary.totalBasePrice || 0,
          extrasPerNight: 0,
          totalPerNight: pricingSummary.total / (pricingSummary.nights || 1),
          perRoomBreakdown: pricingSummary.perRoomBreakdown || [],
        },
        hold: {
          recordIds: (holdState.status === "success" && holdState.data?.records?.map((r) => r.id)) || [],
          holdUntil: (holdState.status === "success" && holdState.data?.holdUntil) || null,
        },
        guest: {
          fullName: guest.fullName.trim(),
          email: guest.email.trim().toLowerCase(),
          phone: guest.phone.trim(),
          address: guest.address?.trim() || null,
        },
        payment: {
          amount: pricingSummary.total,
          receivedBy: payment.receivedBy.trim(),
          paymentDate: paymentDate.toISOString(),
          receiptNumber: payment.receiptNumber?.trim() || null,
        },
        createdBy: {
          type: frontdeskActor?.role || "admin",
          id: frontdeskActor?.id || null,
          label: frontdeskActor?.label || payment.receivedBy.trim(),
        },
      };

      const response = await paymentService.createCashBooking({
        propertyId,
        payload,
      });

      if (response?.data?.success && response?.data?.data) {
        const result = response.data.data;
        setCashPaymentRequest({
          status: "success",
          data: {
            bookingNumber: result.booking?.bookingNumber,
            transactionID: result.payment?.transactionID,
            amount: result.payment?.amount,
          },
          error: null,
        });

        // Refresh the front desk board
        setTimeout(() => {
          onRefresh();
          onResetHold();
          resetCashPaymentState();
          onCloseModal();
        }, 2000);
      } else {
        throw new Error(response?.data?.message || "Failed to create cash booking");
      }
    } catch (error) {
      console.error("Error creating cash booking:", error);
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to create booking with cash payment. Please try again.";
      setCashPaymentError(errorMessage);
      setCashPaymentRequest({
        status: "error",
        data: null,
        error: errorMessage,
      });
    }
  }, [
    propertyId,
    bookingDraft,
    holdState,
    cashPaymentForm,
    pricingSummary,
    bookingContext,
    activeContext,
    frontdeskActor,
    onRefresh,
    onResetHold,
    resetCashPaymentState,
    onCloseModal,
  ]);

  return {
    // State
    showCashPaymentForm,
    cashPaymentForm,
    cashPaymentError,
    cashPaymentRequest,
    // Handlers
    resetCashPaymentState,
    handleOpenCashPaymentForm,
    handleCashPaymentFieldChange,
    handleCancelCashPaymentForm,
    handleRecordCashPayment,
  };
};

