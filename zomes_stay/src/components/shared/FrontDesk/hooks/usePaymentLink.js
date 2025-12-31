import { useState, useCallback } from "react";
import paymentService from "../../../../services/property/frontdesk/paymentService";

/**
 * Custom hook to manage payment link state and operations
 */
export const usePaymentLink = ({
  propertyId,
  propertyName,
  bookingDraft,
  bookingContext,
  activeContext,
  holdState,
  pricingSummary,
  totalGuests,
  frontdeskActor,
  onReset,
}) => {
  const [showPaymentLinkForm, setShowPaymentLinkForm] = useState(false);
  const [paymentLinkForm, setPaymentLinkForm] = useState({
    fullName: "",
    email: "",
    phone: "",
  });
  const [paymentLinkData, setPaymentLinkData] = useState(null);
  const [paymentLinkError, setPaymentLinkError] = useState(null);
  const [paymentLinkRequest, setPaymentLinkRequest] = useState({
    status: "idle",
    data: null,
    error: null,
  });

  const resetPaymentLinkState = useCallback(() => {
    setShowPaymentLinkForm(false);
    setPaymentLinkForm({
      fullName: "",
      email: "",
      phone: "",
    });
    setPaymentLinkData(null);
    setPaymentLinkError(null);
    setPaymentLinkRequest({
      status: "idle",
      data: null,
      error: null,
    });
  }, []);

  const handleOpenPaymentLinkForm = useCallback(() => {
    setPaymentLinkError(null);
    setShowPaymentLinkForm(true);
    setPaymentLinkForm((prev) => ({
      fullName: paymentLinkData?.fullName ?? prev.fullName ?? "",
      email: paymentLinkData?.email ?? prev.email ?? "",
      phone: paymentLinkData?.phone ?? prev.phone ?? "",
    }));
  }, [paymentLinkData]);

  const handlePaymentLinkFieldChange = useCallback(
    (field) => (event) => {
      const value = event?.target?.value ?? "";
      setPaymentLinkForm((prev) => ({
        ...prev,
        [field]: value,
      }));
    },
    []
  );

  const handleSavePaymentLinkRecipient = useCallback(() => {
    const fullName = (paymentLinkForm.fullName || "").trim();
    const email = (paymentLinkForm.email || "").trim();
    const phone = (paymentLinkForm.phone || "").trim();

    if (!phone) {
      setPaymentLinkError("Please enter the guest's mobile number.");
      return;
    }

    if (!/^\d{10}$/.test(phone)) {
      setPaymentLinkError("Enter a 10-digit mobile number without country code.");
      return;
    }

    setPaymentLinkData({
      fullName,
      email,
      phone,
    });
    setPaymentLinkError(null);
    setPaymentLinkRequest({
      status: "idle",
      data: null,
      error: null,
    });
    setShowPaymentLinkForm(false);
  }, [paymentLinkForm]);

  const handleCancelPaymentLinkForm = useCallback(() => {
    setPaymentLinkError(null);
    if (!paymentLinkData) {
      setPaymentLinkForm({
        fullName: "",
        email: "",
        phone: "",
      });
    }
    setShowPaymentLinkForm(false);
  }, [paymentLinkData]);

  const handleCreatePaymentLink = useCallback(async () => {
    if (paymentLinkRequest.status === "loading") {
      return;
    }

    if (!paymentLinkData) {
      setPaymentLinkError("Please enter the guest's mobile number to send a payment link.");
      setShowPaymentLinkForm(true);
      return;
    }

    if (!holdState.data || holdState.status !== "success") {
      setPaymentLinkRequest({
        status: "error",
        data: null,
        error: "Create a hold before sending a payment link.",
      });
      return;
    }

    if (!bookingDraft) {
      setPaymentLinkRequest({
        status: "error",
        data: null,
        error: "Booking details are missing. Please restart the reservation flow.",
      });
      return;
    }

    if (!pricingSummary || !Number.isFinite(pricingSummary.total) || pricingSummary.total <= 0) {
      setPaymentLinkRequest({
        status: "error",
        data: null,
        error: "Pricing information is unavailable. Refresh the booking details and try again.",
      });
      return;
    }

    const propertyRoomTypeId =
      bookingContext?.roomType?.propertyRoomTypeId || activeContext?.roomType?.id || null;

    if (!propertyRoomTypeId) {
      setPaymentLinkRequest({
        status: "error",
        data: null,
        error:
          "Room type information is missing. Please reopen the booking modal to refresh room details.",
      });
      return;
    }

    const uniqueRoomIds = Array.from(new Set(bookingDraft.selectedRoomIds || []));
    if (uniqueRoomIds.length === 0) {
      setPaymentLinkRequest({
        status: "error",
        data: null,
        error: "Select at least one room before sending a payment link.",
      });
      return;
    }

    const holdRecords = Array.isArray(holdState.data?.records)
      ? holdState.data.records.map((record) => record.id)
      : [];

    if (holdRecords.length === 0) {
      setPaymentLinkRequest({
        status: "error",
        data: null,
        error:
          "Unable to find hold references for the selected rooms. Please place the hold again and retry.",
      });
      return;
    }

    const payload = {
      propertyRoomTypeId,
      booking: {
        from: bookingDraft.from,
        to: bookingDraft.to,
        adults: bookingDraft.adults ?? 0,
        children: bookingDraft.children ?? 0,
        infants: bookingDraft.infants ?? 0,
        totalGuests,
        notes: bookingDraft.notes || "",
        mealPlanId: bookingDraft.mealPlanId || null,
        selectedRoomIds: uniqueRoomIds,
      },
      pricing: {
        total: pricingSummary.total,
        nights: pricingSummary.nights,
        basePerNightTotal: pricingSummary.basePerNightTotal,
        extrasPerNight: pricingSummary.extrasPerNight,
        totalPerNight: pricingSummary.totalPerNight,
        perRoomBreakdown: pricingSummary.perRoomBreakdown,
      },
      hold: {
        recordIds: holdRecords,
        holdUntil: holdState.data?.holdUntil || null,
      },
      paymentRecipient: paymentLinkData,
      createdBy: {
        type: frontdeskActor?.role || null,
        id: frontdeskActor?.id || null,
        label: frontdeskActor?.label || null,
      },
      metadata: {
        propertyName,
        roomTypeName:
          bookingContext?.roomType?.name || activeContext?.roomType?.name || "Room selection",
      },
    };

    setPaymentLinkRequest({
      status: "loading",
      data: null,
      error: null,
    });

    try {
      const response = await paymentService.createPaymentLink({
        propertyId,
        payload,
      });
      const responseData = response?.data?.data || response?.data || null;

      setPaymentLinkRequest({
        status: "success",
        data: responseData,
        error: null,
      });
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to create payment link. Please try again.";
      setPaymentLinkRequest({
        status: "error",
        data: null,
        error: message,
      });
    }
  }, [
    paymentLinkRequest.status,
    paymentLinkData,
    holdState.data,
    holdState.status,
    bookingDraft,
    pricingSummary,
    bookingContext?.roomType?.propertyRoomTypeId,
    bookingContext?.roomType?.name,
    activeContext?.roomType?.id,
    activeContext?.roomType?.name,
    totalGuests,
    frontdeskActor?.role,
    frontdeskActor?.id,
    frontdeskActor?.label,
    propertyName,
    propertyId,
  ]);

  const handleSendPaymentLink = useCallback(() => {
    if (!paymentLinkData) {
      setPaymentLinkError(null);
      setShowPaymentLinkForm(true);
      return;
    }

    handleCreatePaymentLink();
  }, [paymentLinkData, handleCreatePaymentLink]);

  return {
    // State
    showPaymentLinkForm,
    paymentLinkForm,
    paymentLinkData,
    paymentLinkError,
    paymentLinkRequest,
    // Handlers
    resetPaymentLinkState,
    handleOpenPaymentLinkForm,
    handlePaymentLinkFieldChange,
    handleSavePaymentLinkRecipient,
    handleCancelPaymentLinkForm,
    handleCreatePaymentLink,
    handleSendPaymentLink,
  };
};

