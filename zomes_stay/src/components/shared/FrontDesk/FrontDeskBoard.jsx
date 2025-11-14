import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  ChevronDown,
  ChevronRight,
  RotateCcw,
} from "lucide-react";
import frontdeskCommon from "../../../services/property/frontdesk/frontdeskcommon";
import paymentService from "../../../services/property/frontdesk/paymentService";

const addDays = (date, amount) => {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + amount);
  return result;
};

const startOfMonth = (date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));

const addMonths = (date, amount) => {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + amount;
  return new Date(Date.UTC(year, month, 1));
};

const isSameDay = (a, b) => !!a && !!b && a.getTime() === b.getTime();

const isDateBefore = (a, b) => !!a && !!b && a.getTime() < b.getTime();

const isWithinRange = (date, start, end) => {
  if (!start || !end) return false;
  const time = date.getTime();
  return time >= start.getTime() && time <= end.getTime();
};

const buildCalendarGrid = (monthDate) => {
  const monthStart = startOfMonth(monthDate);
  const gridStart = startOfWeek(monthStart);

  return Array.from({ length: 42 }, (_, index) => {
    const current = addDays(gridStart, index);
    return {
      date: current,
      inMonth: current.getUTCMonth() === monthStart.getUTCMonth(),
    };
  });
};

const formatMonthLabel = (date) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  }).format(date);

const weekdayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const numberFrom = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const calculateNights = (from, to) => {
  if (!from || !to) return 0;
  const start = from instanceof Date ? from : parseDateOnly(from);
  const end = to instanceof Date ? to : parseDateOnly(to);
  if (!start || !end) return 0;
  const diff = Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
  return Math.max(diff, 0);
};

const formatTimeLabel = (value) => {
  if (!value || typeof value !== "string") return null;
  const [hoursStr, minutesStr = "00"] = value.split(":");
  const hours = Number(hoursStr);
  const minutes = Number(minutesStr);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return value;
  }
  const normalizedHours = String(Math.max(0, Math.min(23, hours))).padStart(2, "0");
  const normalizedMinutes = String(Math.max(0, Math.min(59, minutes))).padStart(2, "0");
  return `${normalizedHours}:${normalizedMinutes}`;
};

const formatDateTime = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const getOccupancyValue = (context) =>
  context?.roomType?.Occupancy ?? context?.roomType?.occupancy ?? 0;

const getMinOccupancyValue = (context) => context?.roomType?.minOccupancy ?? 1;

const getExtraCapacityValue = (context) => context?.roomType?.extraBedCapacity ?? 0;

const adjustDraftForOccupancy = (draft, context) => {
  if (!draft) return draft;

  const selectedRoomIds = Array.isArray(draft.selectedRoomIds) ? draft.selectedRoomIds : [];
  const roomsCount = selectedRoomIds.length;
  const occupancy = getOccupancyValue(context);
  const extraCapacity = getExtraCapacityValue(context);
  const minOccupancy = getMinOccupancyValue(context);

  const normalizedAdults = Math.max(0, draft.adults ?? 0);
  const normalizedChildren = Math.max(0, draft.children ?? 0);
  const normalizedInfants = Math.max(0, draft.infants ?? 0);

  let adults = normalizedAdults;
  let children = normalizedChildren;
  let infants = normalizedInfants;

  if (!context) {
    if (
      adults === (draft.adults ?? 0) &&
      children === (draft.children ?? 0) &&
      infants === (draft.infants ?? 0)
    ) {
      return draft;
    }

    return {
      ...draft,
      adults,
      children,
      infants,
      selectedRoomIds,
    };
  }

  if (roomsCount === 0) {
    const minimum = Math.max(minOccupancy, 1);
    if (adults + children + infants === 0) {
      adults = minimum;
    }

    if (
      adults === normalizedAdults &&
      children === normalizedChildren &&
      infants === normalizedInfants
    ) {
      return draft;
    }

    return {
      ...draft,
      adults,
      children,
      infants,
      selectedRoomIds,
    };
  }

  const maxGuests = roomsCount * (occupancy + extraCapacity);
  const minGuests = roomsCount * minOccupancy;

  let totalGuests = adults + children + infants;

  if (totalGuests > maxGuests) {
    let overflow = totalGuests - maxGuests;

    const reduce = (type) => {
      while (overflow > 0) {
        if (type === "infant" && infants > 0) {
          infants -= 1;
          overflow -= 1;
        } else if (type === "child" && children > 0) {
          children -= 1;
          overflow -= 1;
        } else if (type === "adult" && adults > 0) {
          adults -= 1;
          overflow -= 1;
        } else {
          break;
        }
      }
    };

    reduce("infant");
    reduce("child");
    reduce("adult");
  }

  totalGuests = adults + children + infants;

  if (totalGuests < minGuests) {
    const deficit = minGuests - totalGuests;
    const potentialTotal = totalGuests + deficit;
    if (potentialTotal <= maxGuests) {
      adults += deficit;
    }
  }

  if (
    adults === normalizedAdults &&
    children === normalizedChildren &&
    infants === normalizedInfants
  ) {
    return draft;
  }

  return {
    ...draft,
    adults,
    children,
    infants,
    selectedRoomIds,
  };
};

const startOfWeek = (date) => {
  const base = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = base.getUTCDay();
  const diff = (day + 6) % 7; // Monday as first day
  base.setUTCDate(base.getUTCDate() - diff);
  return base;
};

const formatDate = (date, options = {}) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", ...options }).format(date);

const parseDateOnly = (value) => {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if ([year, month, day].some((part) => Number.isNaN(part))) {
    return null;
  }
  return new Date(Date.UTC(year, month - 1, day));
};

const formatQueryDate = (date) => {
  if (!(date instanceof Date)) return "";
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const normalizeSlotType = (statusRaw) => {
  const status = (statusRaw || "").toLowerCase();
  if (status === "booked") return "booked";
  if (status === "maintenance") return "maintenance";
  if (status === "out_of_service") return "out_of_service";
  if (status === "blocked" || status === "hold") return "blocked";
  return "available";
};

const mapSlotStatus = (dayKey, slot) => {
  const date = parseDateOnly(dayKey);
  if (!slot) {
    return {
      date,
      dateKey: dayKey,
      type: "available",
      status: "available",
    };
  }

  const type = normalizeSlotType(slot.status);

  if (type === "booked") {
    return {
      date,
      dateKey: dayKey,
      type,
      status: "booked",
      guest: slot.guest || slot.guestName || "Guest",
      ref: slot.reference || slot.bookingId || "N/A",
      bookingId: slot.bookingId || null,
      stay: slot.stay || null,
    };
  }

  if (type === "blocked") {
    return {
      date,
      dateKey: dayKey,
      type,
      status: "blocked",
      owner: slot.blockedBy || null,
      notes: slot.reason || null,
      availabilityId: slot.availabilityId || null,
    };
  }

  if (type === "out_of_service") {
    return {
      date,
      dateKey: dayKey,
      type,
      status: "out_of_service",
      owner: slot.blockedBy || "Front desk",
      notes: slot.reason || null,
      availabilityId: slot.availabilityId || null,
    };
  }

  if (type === "maintenance") {
    return {
      date,
      dateKey: dayKey,
      type,
      status: "maintenance",
      owner: slot.blockedBy || "Maintenance",
      notes: slot.reason || null,
      availabilityId: slot.availabilityId || null,
    };
  }

  return {
    date,
    dateKey: dayKey,
    type: "available",
    status: slot.status || "available",
  };
};

const mapSnapshotToBoard = (snapshot) => {
  if (!snapshot) {
    return null;
  }

  const dayEntries = snapshot.range?.days || [];
  const dayKeys = dayEntries.map((item) => item.date);
  const dayDates = dayKeys.map((dateKey) => parseDateOnly(dateKey));

  const summaryMap = new Map(
    (snapshot.summary || []).map((item) => [item.date, item])
  );

  const summary = dayKeys.map((dayKey, index) => {
    const entry = summaryMap.get(dayKey) || {};
    const date = dayDates[index] || parseDateOnly(entry.date);
    return {
      date,
      dateKey: dayKey,
      weekday: entry.weekday || dayEntries[index]?.weekday || "",
      totalRooms: entry.totalRooms ?? snapshot.property?.totalRooms ?? 0,
      booked: entry.booked ?? 0,
      blocked: entry.blocked ?? 0,
      maintenance: entry.maintenance ?? 0,
      available: entry.available ?? 0,
    };
  });

  const roomTypes = (snapshot.roomTypes || []).map((roomType) => {
    const availabilityMap = new Map(
      (roomType.availability || []).map((item) => [item.date, item])
    );

    const rooms = (roomType.rooms || []).map((room) => {
      const slotMap = new Map(
        (room.slots || []).map((slot) => [slot.date, slot])
      );

      const slots = dayKeys.map((dayKey) =>
        mapSlotStatus(dayKey, slotMap.get(dayKey))
      );

      return {
        id: room.id,
        label: room.label || room.name || room.code || "Room",
        slots,
      };
    });

    return {
      id: roomType.id,
      name: roomType.name,
      available: dayKeys.map(
        (dayKey) => availabilityMap.get(dayKey)?.available ?? 0
      ),
      rooms,
    };
  });

  return {
    property: {
      id: snapshot.property?.id || null,
      name: snapshot.property?.name || "",
      totalRooms:
        snapshot.property?.totalRooms ?? summary[0]?.totalRooms ?? 0,
    },
    range: snapshot.range || null,
    days: dayDates,
    dayKeys,
    summary,
    roomTypes,
  };
};

const cellStyles = {
  booked: "bg-emerald-500 text-white",
  blocked: "bg-amber-400 text-gray-900",
  maintenance: "bg-rose-400 text-white",
  out_of_service: "bg-gray-600 text-white",
  available: "bg-white text-gray-700",
};

const statusLabel = {
  booked: "Booked",
  blocked: "Blocked",
  maintenance: "Maintenance",
  out_of_service: "Out of service",
  available: "Available",
};

const roomStatusAccent = {
  blocked: "bg-amber-500",
  maintenance: "bg-rose-500",
  out_of_service: "bg-gray-600",
};

const roomStatusActionLabels = {
  blocked: {
    create: "Block room",
    release: "Release block",
  },
  maintenance: {
    create: "Mark maintenance",
    release: "Release maintenance",
  },
  out_of_service: {
    create: "Mark out of service",
    release: "Bring back in service",
  },
};

const DEFAULT_BLOCK_RELEASE_HOURS = 2;

const FrontDeskBoard = ({ mode = "admin", propertyId, propertyName: propertyNameProp }) => {
  const location = useLocation();
  const adminAuth = useSelector((state) => state.adminAuth);
  const hostAuth = useSelector((state) => state.hostAuth);
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date()));
  const [expandedRoomTypes, setExpandedRoomTypes] = useState(() => new Set());
  const [activeContext, setActiveContext] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [snapshot, setSnapshot] = useState(null);
  const [refreshCounter, setRefreshCounter] = useState(0);
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
  const [roomStatusForm, setRoomStatusForm] = useState({
    reason: "",
    releaseAfterHours: String(DEFAULT_BLOCK_RELEASE_HOURS),
  });
  const [roomStatusRequest, setRoomStatusRequest] = useState({
    status: "idle",
    error: null,
    message: null,
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
  const resetHoldState = useCallback(() => {
    setHoldState({ status: "idle", data: null, message: null });
    resetPaymentLinkState();
  }, [resetPaymentLinkState]);

  const resetRoomStatusState = useCallback(() => {
    setRoomStatusForm({
      reason: "",
      releaseAfterHours: String(DEFAULT_BLOCK_RELEASE_HOURS),
    });
    setRoomStatusRequest({
      status: "idle",
      error: null,
      message: null,
    });
  }, []);

  const openRoomStatusModal = useCallback(
    ({ statusType, mode = "create", context = {} }) => {
      const initialReason =
        mode === "create" ? "" : context?.slot?.notes || "";
      setRoomStatusForm({
        reason: initialReason,
        releaseAfterHours: String(
          statusType === "blocked"
            ? Number(context?.initialHours) || DEFAULT_BLOCK_RELEASE_HOURS
            : DEFAULT_BLOCK_RELEASE_HOURS
        ),
      });
      setRoomStatusRequest({
        status: "idle",
        error: null,
        message: null,
      });
      setActiveContext({
        type: "roomStatus",
        status: statusType,
        mode,
        date: context?.date || null,
        room: context?.room || null,
        roomType: context?.roomType || null,
        availabilityId: context?.availabilityId || null,
        slot: context?.slot || null,
      });
    },
    [setActiveContext]
  );

  const handleRoomStatusFormChange = useCallback(
    (field) => (event) => {
      const value = event?.target?.value ?? "";
      setRoomStatusForm((prev) => ({
        ...prev,
        [field]: value,
      }));
    },
    []
  );

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

  const frontdeskActor = useMemo(() => {
    const buildActor = (auth, roleLabel) => {
      if (!auth) return null;
      const identifier = auth.id || auth.email || auth.phone;
      if (!identifier) return null;
      const nameParts = [auth.first_name, auth.last_name].filter(Boolean);
      const name =
        nameParts.join(" ").trim() ||
        auth.email ||
        auth.phone ||
        auth.id ||
        roleLabel;
      const contact = auth.email || auth.phone || "";
      const label =
        contact && contact !== name
          ? `${roleLabel}: ${name} (${contact})`
          : `${roleLabel}: ${name}`;
      return {
        role: roleLabel.toLowerCase(),
        id: identifier,
        name,
        contact,
        label,
        reason: `${roleLabel} hold`,
      };
    };

    const path = (location?.pathname || "").toLowerCase();

    if (path.startsWith("/host") || path.includes("/host/")) {
      return buildActor(hostAuth, "Host") || buildActor(adminAuth, "Admin") || null;
    }

    if (path.startsWith("/admin") || path.includes("/admin/")) {
      return buildActor(adminAuth, "Admin") || buildActor(hostAuth, "Host") || null;
    }

    return buildActor(adminAuth, "Admin") || buildActor(hostAuth, "Host") || null;
  }, [location?.pathname, adminAuth, hostAuth]);

  const handleSubmitRoomStatus = useCallback(async () => {
    if (!activeContext || activeContext.type !== "roomStatus") {
      return;
    }

    if (!propertyId) {
      setRoomStatusRequest({
        status: "error",
        error: "Select a property before updating room status.",
        message: null,
      });
      return;
    }

    const { status: statusType, mode, date, room, roomType, availabilityId } =
      activeContext;

    const resolvedDate =
      date instanceof Date
        ? date
        : date
        ? new Date(date)
        : null;

    if (!roomType?.id || !room?.id || !resolvedDate || Number.isNaN(resolvedDate?.getTime?.())) {
      setRoomStatusRequest({
        status: "error",
        error: "Room details are missing. Please try again.",
        message: null,
      });
      return;
    }

    const dateKey = formatQueryDate(resolvedDate);
    const blockedByLabel =
      frontdeskActor?.label ||
      frontdeskActor?.name ||
      frontdeskActor?.contact ||
      frontdeskActor?.role ||
      "Front desk";

    setRoomStatusRequest({
      status: "loading",
      error: null,
      message: null,
    });

    try {
      let response;
      let successMessage = "Room status updated.";

      if (mode === "create") {
        if (statusType === "blocked") {
          const hours = Number(roomStatusForm.releaseAfterHours);
          if (!Number.isFinite(hours) || hours <= 0) {
            setRoomStatusRequest({
              status: "error",
              error: "Enter a valid release duration in hours.",
              message: null,
            });
            return;
          }

          response = await frontdeskCommon.blockRoom({
            propertyId,
            propertyRoomTypeId: roomType.id,
            roomId: room.id,
            date: dateKey,
            releaseAfterHours: hours,
            reason: roomStatusForm.reason?.trim() || undefined,
            blockedBy: blockedByLabel,
          });
          successMessage = "Room blocked successfully.";
        } else if (statusType === "maintenance") {
          response = await frontdeskCommon.markMaintenance({
            propertyId,
            propertyRoomTypeId: roomType.id,
            roomId: room.id,
            date: dateKey,
            reason: roomStatusForm.reason?.trim() || undefined,
            blockedBy: blockedByLabel || "Maintenance",
          });
          successMessage = "Room marked under maintenance.";
        } else if (statusType === "out_of_service") {
          response = await frontdeskCommon.markOutOfService({
            propertyId,
            propertyRoomTypeId: roomType.id,
            roomId: room.id,
            date: dateKey,
            reason: roomStatusForm.reason?.trim() || undefined,
            blockedBy: blockedByLabel,
          });
          successMessage = "Room marked out of service.";
        } else {
          throw new Error("Unsupported room status.");
        }
      } else if (mode === "release") {
        if (!availabilityId) {
          throw new Error("Availability reference is missing for release.");
        }

        if (statusType === "blocked") {
          response = await frontdeskCommon.releaseBlock({
            propertyId,
            availabilityId,
          });
          successMessage = "Room block released.";
        } else if (statusType === "maintenance") {
          response = await frontdeskCommon.releaseMaintenance({
            propertyId,
            availabilityId,
          });
          successMessage = "Room removed from maintenance.";
        } else if (statusType === "out_of_service") {
          response = await frontdeskCommon.releaseOutOfService({
            propertyId,
            availabilityId,
          });
          successMessage = "Room returned to service.";
        } else {
          throw new Error("Unsupported room status release.");
        }
      } else {
        throw new Error("Unsupported room status mode.");
      }

      const apiMessage =
        response?.data?.message ||
        response?.data?.data?.message ||
        null;

      setRoomStatusRequest({
        status: "success",
        error: null,
        message: apiMessage || successMessage,
      });

      setRefreshCounter((prev) => prev + 1);

      setTimeout(() => {
        resetRoomStatusState();
        setActiveContext(null);
      }, 800);
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to update room status.";
      setRoomStatusRequest({
        status: "error",
        error: message,
        message: null,
      });
    }
  }, [
    activeContext,
    propertyId,
    frontdeskActor,
    roomStatusForm.releaseAfterHours,
    roomStatusForm.reason,
    setRefreshCounter,
    resetRoomStatusState,
    setActiveContext,
  ]);

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
            previousDraft?.mealPlanId && mealPlans.some((plan) => plan.id === previousDraft.mealPlanId)
              ? previousDraft.mealPlanId
              : mealPlans[0]?.id || "";

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
    if (!propertyId) {
      setSnapshot(null);
      setLoading(false);
      return;
    }

    let isMounted = true;
    const loadSnapshot = async () => {
      setLoading(true);
      setError(null);

      const from = formatQueryDate(weekStart);
      const to = formatQueryDate(addDays(weekStart, 6));

      try {
        const response = await frontdeskCommon.fetchSnapshot({
          propertyId,
          from,
          to,
        });

        const payload = response?.data?.data || response?.data || null;
        if (!isMounted) {
          return;
        }

        setSnapshot(payload);

      } catch (fetchError) {
        if (!isMounted) {
          return;
        }
        console.error("Failed to load front desk snapshot", fetchError);
        setError(fetchError);
        setSnapshot(null);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadSnapshot();

    return () => {
      isMounted = false;
    };
  }, [propertyId, weekStart, refreshCounter]);

  useEffect(() => {
    setExpandedRoomTypes(new Set());
    if (propertyId) {
      setWeekStart(startOfWeek(new Date()));
    }
  }, [propertyId]);

  useEffect(() => {
    if (!bookingContext) return;
    setBookingDraft((prev) => {
      if (!prev) return prev;
      return adjustDraftForOccupancy(prev, bookingContext);
    });
  }, [bookingContext]);

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
  const checkInDateObj = bookingDraft?.from ? parseDateOnly(bookingDraft.from) : null;
  const checkOutDateObj = bookingDraft?.to ? parseDateOnly(bookingDraft.to) : null;
  const rawNights =
    checkInDateObj && checkOutDateObj
      ? bookingContext?.stay?.nights ?? calculateNights(bookingDraft?.from, bookingDraft?.to)
      : 0;
  const nightsCount =
    rawNights > 0
      ? rawNights
      : checkInDateObj && checkOutDateObj
      ? 1
      : 0;
  const checkInTimeLabel = formatTimeLabel(
    bookingContext?.stay?.checkInTime || bookingContext?.property?.checkInTime
  );
  const checkOutTimeLabel = formatTimeLabel(
    bookingContext?.stay?.checkOutTime || bookingContext?.property?.checkOutTime
  );
  const holdLoading = holdState.status === "loading";
  const holdData = holdState.status === "success" ? holdState.data : null;
  const paymentLinkLoading = paymentLinkRequest.status === "loading";
  const paymentLinkResult =
    paymentLinkRequest.status === "success" ? paymentLinkRequest.data : null;
  const paymentLinkRequestError =
    paymentLinkRequest.status === "error" ? paymentLinkRequest.error : null;
  const paymentLinkUrl =
    paymentLinkResult?.paymentLinkUrl ||
    paymentLinkResult?.short_url ||
    paymentLinkResult?.shortUrl ||
    paymentLinkResult?.url ||
    null;
  const paymentLinkExpiryLabel = paymentLinkResult?.expiresAt
    ? formatDateTime(paymentLinkResult.expiresAt)
    : paymentLinkResult?.expireBy
    ? formatDateTime(paymentLinkResult.expireBy)
    : null;
  const pricingSummary = useMemo(() => {
    if (!bookingContext || !bookingDraft) return null;
    const mealPlan = (bookingContext.mealPlans || []).find(
      (plan) => plan.id === bookingDraft.mealPlanId
    );
    if (!mealPlan) return null;

    const roomsSelected = bookingDraft.selectedRoomIds?.length || 0;
    if (roomsSelected === 0) {
      return null;
    }

    const occupancy = getOccupancyValue(bookingContext);
    const extraCapacity = getExtraCapacityValue(bookingContext);

    const nights = Math.max(
      bookingContext?.stay?.nights ?? calculateNights(bookingDraft.from, bookingDraft.to),
      1
    );

    const singleRate = numberFrom(mealPlan.pricing?.singleOccupancy);
    const doubleRate = numberFrom(mealPlan.pricing?.doubleOccupancy);
    const groupRate = numberFrom(mealPlan.pricing?.groupOccupancy);
    const extraAdultRate = numberFrom(mealPlan.pricing?.extraBedAdult);
    const extraChildRate = numberFrom(mealPlan.pricing?.extraBedChild);
    const extraInfantRate = numberFrom(mealPlan.pricing?.extraBedInfant);

    const adults = Math.max(0, bookingDraft.adults ?? 0);
    const children = Math.max(0, bookingDraft.children ?? 0);
    const infants = Math.max(0, bookingDraft.infants ?? 0);

    if (occupancy <= 0) {
      return {
        error: "Room occupancy details are unavailable for pricing.",
        total: 0,
        perRoomBreakdown: [],
        nights,
      };
    }

    const baseCapacity = occupancy * roomsSelected;
    let remainingBase = baseCapacity;

    const baseAdults = Math.min(adults, remainingBase);
    remainingBase -= baseAdults;
    const remainingAdults = adults - baseAdults;

    const baseChildren = Math.min(children, remainingBase);
    remainingBase -= baseChildren;
    const remainingChildren = children - baseChildren;

    const baseInfants = Math.min(infants, remainingBase);
    remainingBase -= baseInfants;
    const remainingInfants = infants - baseInfants;

    const extrasAdults = remainingAdults;
    const extrasChildren = remainingChildren;
    const extrasInfants = remainingInfants;
    const totalExtrasCount = extrasAdults + extrasChildren + extrasInfants;

    const maxExtraCapacity = roomsSelected * extraCapacity;
    if (totalExtrasCount > maxExtraCapacity) {
      return {
        error: `Not enough extra bed capacity for ${totalExtrasCount} additional guest(s).`,
        total: 0,
        perRoomBreakdown: [],
        nights,
      };
    }

    let basePerRoomPerNight = 0;
    if (occupancy > 2 && groupRate > 0) {
      basePerRoomPerNight = groupRate;
    } else if (occupancy >= 2 && doubleRate > 0) {
      basePerRoomPerNight = doubleRate;
    } else {
      basePerRoomPerNight = singleRate || doubleRate || groupRate;
    }

    if (!basePerRoomPerNight) {
      return {
        error: "Base pricing information is unavailable for the selected meal plan.",
        total: 0,
        perRoomBreakdown: [],
        nights,
      };
    }

    const extrasPerNight =
      extrasAdults * extraAdultRate +
      extrasChildren * extraChildRate +
      extrasInfants * extraInfantRate;

    const basePerNightTotal = basePerRoomPerNight * roomsSelected;
    const totalPerNight = basePerNightTotal + extrasPerNight;
    const total = totalPerNight * nights;

    const extraBreakdown = [];
    if (extrasAdults > 0) {
      extraBreakdown.push({
        type: "adult",
        count: extrasAdults,
        perNight: extraAdultRate,
      });
    }
    if (extrasChildren > 0) {
      extraBreakdown.push({
        type: "child",
        count: extrasChildren,
        perNight: extraChildRate,
      });
    }
    if (extrasInfants > 0) {
      extraBreakdown.push({
        type: "infant",
        count: extrasInfants,
        perNight: extraInfantRate,
      });
    }

    const perRoomBreakdown = Array.from({ length: roomsSelected }, (_, index) => {
      const isFirstRoom = index === 0;
      const perNight =
        basePerRoomPerNight + (isFirstRoom ? extrasPerNight : 0);
      return {
        roomIndex: index + 1,
        baseGuests: occupancy,
        baseCount: occupancy,
        basePerNight: basePerRoomPerNight,
        extras: isFirstRoom ? extraBreakdown : [],
        perNight,
        total: perNight * nights,
      };
    });

    return {
      total,
      perRoomBreakdown,
      nights,
      extras: {
        adults: extrasAdults,
        children: extrasChildren,
        infants: extrasInfants,
      },
      basePerNightTotal,
      extrasPerNight,
      totalPerNight,
    };
  }, [bookingContext, bookingDraft]);

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
    setActiveContext({
      type: "action",
      date,
      room,
      roomType,
    });
    setBookingDraft(null);
    setBookingError(null);
  };

  const handleStartBooking = () => {
    if (!activeContext || activeContext.type !== "action") {
      return;
    }

    resetHoldState();

    const { date, room, roomType } = activeContext;
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
  };

  const toggleRoomSelection = (roomId) => {
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
  };

  const updateBookingDraft = (field, value, options = {}) => {
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
  };

  const handleBookingSubmit = async (event) => {
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
  };

  const openDatePicker = () => {
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
  };

  const handleCalendarDayClick = (day) => {
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
  };

  const handleApplyDateSelection = () => {
    if (!dateSelection.from) {
      setBookingError("Please select stay dates.");
      return;
    }

    const start = dateSelection.from;
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
  };

  const handleClearDateSelection = () => {
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
  };

  const renderCalendarMonth = (monthDate) => {
    const days = buildCalendarGrid(monthDate);
    const start = dateSelection.from;
    const end = dateSelection.to || dateSelection.from;

    return (
      <div key={monthDate.toISOString()} className="w-full min-w-[240px]">
        <div className="text-center text-sm font-semibold text-gray-700">
          {formatMonthLabel(monthDate)}
        </div>
        <div className="mt-2 grid grid-cols-7 gap-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
          {weekdayLabels.map((label) => (
            <div key={label} className="text-center">
              {label}
            </div>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {days.map(({ date, inMonth }) => {
            const key = formatQueryDate(date);
            const selectionEnd = end || start;
            const isStart = start && isSameDay(date, start);
            const isEnd = selectionEnd && isSameDay(date, selectionEnd);
            const inRange =
              start && selectionEnd && isWithinRange(date, start, selectionEnd);

            const classNames = [
              "flex h-9 items-center justify-center rounded-md text-xs font-semibold transition",
              "cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/40",
              inMonth ? "text-gray-700" : "text-gray-300",
              "hover:bg-emerald-200",
            ];

            if (inRange) {
              classNames.push("bg-emerald-100 text-emerald-700");
            }

            if (isStart || isEnd) {
              classNames.push("bg-emerald-500 text-white");
            }

            return (
              <button
                key={key}
                type="button"
                onClick={() => handleCalendarDayClick(date)}
                className={classNames.join(" ")}
              >
                {date.getUTCDate()}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderContextModal = () => {
    if (!activeContext) return null;

    const closeModal = () => {
      setActiveContext(null);
      setBookingDraft(null);
      setBookingError(null);
      setBookingContext(null);
      setBookingContextError(null);
      setBookingContextLoading(false);
      setIsDatePickerOpen(false);
      setDateSelection({ from: null, to: null });
      resetHoldState();
      resetRoomStatusState();
    };

    const stopPropagation = (event) => {
      event.stopPropagation();
    };

    let modalTitle = "";
    let accentColour = "bg-blue-500";
    let content = null;

    if (activeContext.type === "booking") {
      const { slot, date, room, roomType } = activeContext;
      modalTitle = "Booking details";
      accentColour = "bg-emerald-500";
      content = (
        <div className="grid grid-cols-1 gap-3 text-sm text-gray-600 sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400">Guest</p>
            <p className="font-medium text-gray-900">{slot.guest}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400">Reference</p>
            <p className="font-medium text-gray-900">{slot.ref}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400">Room</p>
            <p className="font-medium text-gray-900">
              {room.label} • {roomType.name}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400">Date</p>
            <p className="font-medium text-gray-900">{formatDate(date, { dateStyle: "medium" })}</p>
          </div>
        </div>
      );
    } else if (activeContext.type === "nonAvailable") {
      const { slot, date, room, roomType } = activeContext;
      if (slot.type === "maintenance") {
        modalTitle = "Maintenance";
        accentColour = "bg-rose-500";
      } else if (slot.type === "out_of_service") {
        modalTitle = "Out of service";
        accentColour = "bg-gray-600";
      } else {
        modalTitle = "Blocked";
        accentColour = "bg-amber-500";
      }
      content = (
        <div className="space-y-3 text-sm text-gray-600">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-400">Room</p>
              <p className="font-medium text-gray-900">
                {room.label} • {roomType.name}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-400">Date</p>
              <p className="font-medium text-gray-900">
                {formatDate(date, { dateStyle: "medium" })}
              </p>
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400">
              {slot.type === "maintenance"
                ? "Maintained by"
                : slot.type === "out_of_service"
                ? "Marked by"
                : "Blocked by"}
            </p>
            <p className="font-medium text-gray-900">{slot.owner || "Front desk"}</p>
          </div>
          {slot.notes && (
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-400">Remarks</p>
              <p className="font-medium text-gray-900">{slot.notes}</p>
            </div>
          )}
          {slot.availabilityId && (
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() =>
                  openRoomStatusModal({
                    statusType: slot.type,
                    mode: "release",
                    context: {
                      date,
                      room,
                      roomType,
                      availabilityId: slot.availabilityId,
                      slot,
                    },
                  })
                }
                className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:border-gray-400 hover:text-gray-800"
              >
                {slot.type === "blocked"
                  ? "Release block"
                  : slot.type === "maintenance"
                  ? "Release maintenance"
                  : "Bring back in service"}
              </button>
            </div>
          )}
        </div>
      );
    } else if (activeContext.type === "roomStatus") {
      const { status: statusType, mode = "create", date, room, roomType } = activeContext;
      const actionLabels = roomStatusActionLabels[statusType] || {
        create: "Update status",
        release: "Release status",
      };
      modalTitle =
        mode === "release" ? actionLabels.release : actionLabels.create;
      accentColour = roomStatusAccent[statusType] || "bg-blue-500";
      const isLoading = roomStatusRequest.status === "loading";
      const isSuccess = roomStatusRequest.status === "success";
      const isError = roomStatusRequest.status === "error";
      const roomName = room?.label || room?.name || room?.code || "Room";
      const roomTypeName = roomType?.name || "Room type";
      const resolvedDate =
        date instanceof Date
          ? date
          : date
          ? new Date(date)
          : null;

      content = (
        <div className="space-y-4 text-sm text-gray-600">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-400">Room</p>
              <p className="font-medium text-gray-900">
                {roomName} • {roomTypeName}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-400">Date</p>
              <p className="font-medium text-gray-900">
                {resolvedDate
                  ? formatDate(resolvedDate, { dateStyle: "medium" })
                  : "N/A"}
              </p>
            </div>
          </div>

          {mode === "create" ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Reason (optional)
                </label>
                <textarea
                  rows={3}
                  value={roomStatusForm.reason}
                  onChange={handleRoomStatusFormChange("reason")}
                  placeholder="Add internal notes or maintenance details"
                  className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {statusType === "blocked" && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Release after (hours)
                  </label>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={roomStatusForm.releaseAfterHours}
                    onChange={handleRoomStatusFormChange("releaseAfterHours")}
                    className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Block will auto-release after the selected duration.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              {statusType === "blocked"
                ? "This will release the block immediately and make the room available."
                : statusType === "maintenance"
                ? "This will mark the room as available again and clear the maintenance flag."
                : "This will bring the room back into service for new bookings."}
            </div>
          )}

          {isError && roomStatusRequest.error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
              {roomStatusRequest.error}
            </div>
          )}

          {isSuccess && roomStatusRequest.message && (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-600">
              {roomStatusRequest.message}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={closeModal}
              className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:border-gray-300 hover:text-gray-800"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmitRoomStatus}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60 ${roomStatusAccent[statusType] || "bg-blue-500"}`}
              disabled={isLoading}
            >
              {isLoading
                ? "Saving..."
                : mode === "release"
                ? actionLabels.release
                : actionLabels.create}
            </button>
          </div>
        </div>
      );
    } else if (activeContext.type === "action") {
      const { date, room, roomType } = activeContext;
      modalTitle = "Create new reservation";
      accentColour = "bg-blue-500";
      content = (
        <>
          <div className="grid gap-3 text-sm text-gray-600 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-400">Date</p>
              <p className="font-medium text-gray-900">{formatDate(date, { dateStyle: "full" })}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-400">Room</p>
              <p className="font-medium text-gray-900">
                {room.label} • {roomType.name}
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-md bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-600"
              onClick={handleStartBooking}
            >
              Book
            </button>
            <button
              type="button"
              className="rounded-md bg-amber-400 px-3 py-1.5 text-xs font-semibold text-gray-900 shadow-sm hover:bg-amber-500"
              onClick={() =>
                openRoomStatusModal({
                  statusType: "blocked",
                  mode: "create",
                  context: { date, room, roomType },
                })
              }
            >
              Block
            </button>
            <button
              type="button"
              className="rounded-md bg-rose-400 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-rose-500"
              onClick={() =>
                openRoomStatusModal({
                  statusType: "maintenance",
                  mode: "create",
                  context: { date, room, roomType },
                })
              }
            >
              Maintenance
            </button>
            <button
              type="button"
              className="rounded-md bg-gray-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-gray-700"
              onClick={() =>
                openRoomStatusModal({
                  statusType: "out_of_service",
                  mode: "create",
                  context: { date, room, roomType },
                })
              }
            >
              Out of service
            </button>
          </div>
        </>
      );
    } else if (activeContext.type === "createBooking") {
      const { roomType } = activeContext;
      const roomsAvailableForSelection =
        bookingContext && bookingContext.roomType
          ? availableRooms
          : roomType?.rooms || [];
      const mealPlans = bookingContext?.mealPlans || [];
      const propertyRoomTypeId =
        bookingContext?.roomType?.propertyRoomTypeId || roomType?.id || null;

      modalTitle = "Create reservation";
      accentColour = "bg-emerald-500";

      if (bookingContextLoading) {
        content = (
          <div className="py-6 text-sm text-gray-600">
            Loading booking context. Please wait…
          </div>
        );
      } else if (bookingContextError) {
        const retryFrom = bookingDraft?.from || formatQueryDate(activeContext.date);
        const retryTo = bookingDraft?.to || formatQueryDate(activeContext.date);
        content = (
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
                loadBookingContext({
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
      } else {
        content = (
          <form className="space-y-5 text-sm text-gray-700" onSubmit={handleBookingSubmit}>
            <div className="relative">
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400">
                Stay dates
              </label>
              <button
                type="button"
                onClick={openDatePicker}
                className="mt-1 flex w-full items-center justify-between rounded-md border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <span>{stayDatesLabel}</span>
                <Calendar className="h-4 w-4 text-gray-400" />
              </button>

              {isDatePickerOpen && (
                <div className="absolute left-0 right-0 z-20 mt-2 w-full rounded-lg border border-gray-200 bg-white p-4 shadow-lg sm:min-w-[520px]">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                    <button
                      type="button"
                      onClick={() =>
                        setDatePickerMonth((prev) => addMonths(prev, -1))
                      }
                      className="rounded-md p-1 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                    <span className="text-sm font-semibold text-gray-700">
                      {formatMonthLabel(datePickerMonth)} •{" "}
                      {formatMonthLabel(addMonths(datePickerMonth, 1))}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setDatePickerMonth((prev) => addMonths(prev, 1))
                      }
                      className="rounded-md p-1 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    {renderCalendarMonth(datePickerMonth)}
                    {renderCalendarMonth(addMonths(datePickerMonth, 1))}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={handleClearDateSelection}
                      className="text-xs font-semibold text-gray-500 transition hover:text-gray-700"
                    >
                      Clear selection
                    </button>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setIsDatePickerOpen(false)}
                        className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:border-gray-300 hover:text-gray-800"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleApplyDateSelection}
                        className="rounded-md bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-600"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </div>
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
                    updateBookingDraft("adults", Math.max(0, Number(event.target.value)))
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
                    updateBookingDraft("children", Math.max(0, Number(event.target.value)))
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
                    updateBookingDraft("infants", Math.max(0, Number(event.target.value)))
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
                  updateBookingDraft("mealPlanId", event.target.value, { skipAdjust: true })
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
                  return (
                    <option key={plan.id} value={plan.id}>
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
                {roomsAvailableForSelection.length === 0 && (
                  <p className="rounded-md border border-dashed border-gray-300 px-3 py-2 text-xs text-gray-500">
                    No rooms available for the selected dates.
                  </p>
                )}
                {roomsAvailableForSelection.map((roomOption) => {
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
                        onChange={() => toggleRoomSelection(roomId)}
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
                  updateBookingDraft("notes", event.target.value, { skipAdjust: true })
                }
                placeholder="Special requests, payment instructions, etc."
                className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {pricingSummary && !pricingSummary.error && (
              <div className="space-y-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-3 text-xs text-emerald-700">
                <div className="flex items-center justify-between text-sm font-semibold text-emerald-800">
                  <span>Total for {pricingSummary.nights} night(s)</span>
                  <span>₹{pricingSummary.total.toLocaleString("en-IN")}</span>
                </div>
                {pricingSummary.perRoomBreakdown.map((roomBreakdown) => (
                  <div
                    key={`room-breakdown-${roomBreakdown.roomIndex}`}
                    className="rounded border border-emerald-100 bg-white px-3 py-2 text-[11px] text-emerald-700"
                  >
                    <div className="font-semibold">
                      Room {roomBreakdown.roomIndex}: ₹
                      {roomBreakdown.total.toLocaleString("en-IN")}
                    </div>
                    <div>
                      Base guests per room: {roomBreakdown.baseGuests ?? roomBreakdown.baseCount} • Base per night: ₹
                      {roomBreakdown.basePerNight.toLocaleString("en-IN")}
                    </div>
                    {roomBreakdown.extras.length > 0 && (
                      <div className="mt-1 space-y-0.5">
                        {roomBreakdown.extras.map((extra, index) => (
                          <div key={`extra-${roomBreakdown.roomIndex}-${index}`}>
                            Extra ({extra.type}
                            {extra.count && extra.count > 1 ? ` × ${extra.count}` : ""}): ₹
                            {(extra.perNight * (extra.count || 1)).toLocaleString("en-IN")} per night
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

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
                      <div>
                        Amount:{" "}
                        <span className="font-semibold">
                          ₹{(paymentLinkResult.amount / 100).toLocaleString("en-IN")}
                        </span>
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
                          onChange={handlePaymentLinkFieldChange("fullName")}
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
                          onChange={handlePaymentLinkFieldChange("email")}
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
                          onChange={handlePaymentLinkFieldChange("phone")}
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
                        onClick={handleCancelPaymentLinkForm}
                        className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:border-gray-300 hover:text-gray-800"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSavePaymentLinkRecipient}
                        className="rounded-md bg-blue-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-600"
                      >
                        Save details
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:border-gray-300 hover:text-gray-800"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    className="rounded-md bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled
                  >
                    Record cash payment (coming soon)
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenPaymentLinkForm}
                    className="rounded-md border border-blue-500 px-3 py-1.5 text-xs font-semibold text-blue-600 transition hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={paymentLinkLoading}
                  >
                    {paymentLinkData ? "Edit guest details" : "Add guest details"}
                  </button>
                  <button
                    type="button"
                    onClick={handleSendPaymentLink}
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
                  onClick={closeModal}
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
      }
    }

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
        onClick={closeModal}
      >
        <div
          className="mx-4 flex w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-black/5 max-h-[85vh]"
          onClick={stopPropagation}
        >
          <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${accentColour}`} />
              <h3 className="text-sm font-semibold text-gray-800">{modalTitle}</h3>
            </div>
            <button
              type="button"
              onClick={closeModal}
              className="rounded-md p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4">{content}</div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="rounded-md border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 hover:border-gray-300 hover:text-gray-800"
            onClick={() => setWeekStart(startOfWeek(new Date()))}
            disabled={loading}
          >
            Today
          </button>
          <div className="flex rounded-md border border-gray-200">
            <button
              type="button"
              className="flex items-center justify-center border-r border-gray-200 p-2 text-gray-500 hover:text-gray-700"
              onClick={() => setWeekStart(addDays(weekStart, -7))}
              disabled={loading}
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="flex items-center justify-center p-2 text-gray-500 hover:text-gray-700"
              onClick={() => setWeekStart(addDays(weekStart, 7))}
              disabled={loading}
            >
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          <button
            type="button"
            className="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
            onClick={() => setRefreshCounter((prev) => prev + 1)}
            disabled={loading}
          >
            <RotateCcw className="h-4 w-4" />
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <div className="flex items-center gap-3 text-sm text-gray-500">
          <Calendar className="h-4 w-4 text-blue-500" />
          <span className="font-medium text-gray-700">Week at a glance</span>
          <span>
            {formatDate(rangeStart, { dateStyle: "medium" })} -{" "}
            {formatDate(rangeEnd, { dateStyle: "medium" })}
          </span>
        </div>
      </header>

      <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-gray-600">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400">Property</p>
            <p className="text-base font-semibold text-gray-900">
              {propertyName || "N/A"}
            </p>
          </div>
          <div className="flex items-center gap-6">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-400">Total rooms</p>
              <p className="text-base font-semibold text-gray-900">{totalRooms}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-400">Week start</p>
              <p className="text-base font-semibold text-gray-900">
                {formatDate(rangeStart, { dateStyle: "medium" })}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-400">Week end</p>
              <p className="text-base font-semibold text-gray-900">
                {formatDate(rangeEnd, { dateStyle: "medium" })}
              </p>
            </div>
          </div>
        </div>
      </section>

      {errorMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {errorMessage}
        </div>
      )}

      <section className="relative overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-sm text-sm font-medium text-gray-600">
            Loading front desk snapshot...
          </div>
        )}
        <div className="grid grid-cols-[220px_repeat(7,_minmax(120px,_1fr))] border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
          <div className="flex items-center gap-2 border-r border-gray-200 px-4 py-3">
            <Calendar className="h-4 w-4 text-gray-400" />
            Room types
          </div>
          {displayDays.map((day, index) => (
            <div
              key={day?.toISOString?.() || `day-${index}`}
              className="border-r border-gray-200 px-4 py-3 text-center"
            >
              <div className="text-gray-900">
                {formatDate(day, { weekday: "short" }).toUpperCase()}
              </div>
              <div>{formatDate(day, { day: "2-digit", month: "short" })}</div>
            </div>
          ))}
        </div>

        <div className="divide-y divide-gray-200 text-sm">
          <div className="grid grid-cols-[220px_repeat(7,_minmax(120px,_1fr))] bg-gray-50 text-gray-700">
            <div className="flex items-center gap-2 border-r border-gray-200 px-4 py-3 font-semibold text-gray-900">
              <span className="rounded bg-gray-200 px-2 py-0.5 text-xs font-semibold text-gray-700">
                Total
              </span>
              Availability
            </div>
            {summary.map((item, index) => (
              <div
                key={item.dateKey || item.date?.toISOString?.() || `summary-${index}`}
                className="flex items-center justify-center border-r border-gray-200 px-4 py-3 font-semibold text-emerald-600"
              >
                {item.available} <span className="ml-1 text-xs text-gray-400">AVL</span>
              </div>
            ))}
          </div>

          {roomTypes.map((roomType) => {
            const isExpanded = expandedRoomTypes.has(roomType.id);
            return (
              <div key={roomType.id} className="bg-white">
                <button
                  type="button"
                  onClick={() => toggleRoomType(roomType.id)}
                  className="grid w-full grid-cols-[220px_repeat(7,_minmax(120px,_1fr))] border-b border-gray-100 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3 border-r border-gray-200 px-4 py-3">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    )}
                    <span className="font-medium text-gray-900">{roomType.name}</span>
                  </div>
                  {displayDays.map((_, idx) => (
                    <div
                      key={`${roomType.id}-summary-${idx}`}
                      className="flex items-center justify-center border-r border-gray-100 px-4 py-3 text-gray-600"
                    >
                      {roomType.available?.[idx] ?? 0}{" "}
                      <span className="ml-1 text-xs text-gray-400">AVL</span>
                    </div>
                  ))}
                </button>

                  {isExpanded && (
                    <div className="border-t border-gray-100 bg-gray-50">
                      {roomType.rooms.map((room) => (
                        <div
                          key={room.id}
                          className="grid grid-cols-[220px_repeat(7,_minmax(120px,_1fr))] border-b border-gray-100 text-sm"
                        >
                          <div className="flex items-center gap-2 border-r border-gray-200 bg-gray-100 px-4 py-3 font-medium text-gray-700">
                            {room.label}
                          </div>
                          {room.slots.map((slot, index) => {
                            const date = slot.date || displayDays[index];
                            const style = cellStyles[slot.type] || cellStyles.available;
                            const label = statusLabel[slot.type] || statusLabel.available;

                            if (slot.type === "booked") {
                              return (
                                <button
                                  key={`${room.id}-${slot.dateKey || date?.toISOString?.() || index}`}
                                  type="button"
                                  className={`flex h-16 flex-col justify-center border-r border-gray-100 px-3 text-left text-xs font-medium transition hover:brightness-95 ${style}`}
                                  onClick={() =>
                                    handleCellClick({
                                      type: "booking",
                                      slot,
                                      date,
                                      room,
                                      roomType,
                                    })
                                  }
                                >
                                  <span className="truncate text-[11px] font-semibold uppercase tracking-wide">
                                    {slot.guest}
                                  </span>
                                  <span className="truncate text-[11px] opacity-85">{slot.ref}</span>
                                </button>
                              );
                            }

                            if (slot.type === "blocked") {
                              return (
                                <button
                                  key={`${room.id}-${slot.dateKey || date?.toISOString?.() || index}`}
                                  type="button"
                                  className={`flex h-16 flex-col justify-center border-r border-gray-100 px-3 text-left text-xs font-medium transition hover:brightness-95 ${style}`}
                                  onClick={() =>
                                    handleCellClick({
                                      type: "nonAvailable",
                                      slot,
                                      date,
                                      room,
                                      roomType,
                                    })
                                  }
                                >
                                  <span className="truncate text-[11px] font-semibold uppercase tracking-wide">
                                    {label}
                                  </span>
                                  {slot.owner && (
                                    <span className="truncate text-[11px] opacity-85">
                                      {slot.owner}
                                    </span>
                                  )}
                                </button>
                              );
                            }

                            if (slot.type === "out_of_service") {
                            return (
                              <button
                                  key={`${room.id}-${slot.dateKey || date?.toISOString?.() || index}`}
                                  type="button"
                                  className={`flex h-16 flex-col justify-center border-r border-gray-100 px-3 text-left text-xs font-medium transition hover:brightness-95 ${style}`}
                                  onClick={() =>
                                    handleCellClick({
                                      type: "nonAvailable",
                                      slot,
                                      date,
                                      room,
                                      roomType,
                                    })
                                  }
                                >
                                  <span className="truncate text-[11px] font-semibold uppercase tracking-wide">
                                    {label}
                                  </span>
                                  {slot.owner && (
                                    <span className="truncate text-[11px] opacity-85">
                                      {slot.owner}
                                    </span>
                                  )}
                                </button>
                              );
                            }

                            if (slot.type === "maintenance") {
                              return (
                                <button
                                  key={`${room.id}-${slot.dateKey || date?.toISOString?.() || index}`}
                                  type="button"
                                  className={`flex h-16 flex-col justify-center border-r border-gray-100 px-3 text-left text-xs font-medium transition hover:brightness-95 ${style}`}
                                  onClick={() =>
                                    handleCellClick({
                                      type: "nonAvailable",
                                      slot,
                                      date,
                                      room,
                                      roomType,
                                    })
                                  }
                                >
                                  <span className="truncate text-[11px] font-semibold uppercase tracking-wide">
                                    {label}
                                  </span>
                                  {slot.owner && (
                                    <span className="truncate text-[11px] opacity-85">
                                      {slot.owner}
                                    </span>
                                  )}
                                </button>
                              );
                            }

                            return (
                              <button
                                key={`${room.id}-${slot.dateKey || date?.toISOString?.() || index}`}
                                type="button"
                                className="flex h-16 flex-col justify-center border-r border-gray-100 bg-white px-3 text-left text-xs font-medium text-gray-400 transition hover:bg-blue-50 hover:text-blue-600"
                                onClick={() =>
                                  handleEmptyCell({
                                    date,
                                    room,
                                    roomType,
                                  })
                                }
                              >
                                <span className="text-[11px] font-semibold uppercase tracking-wide">
                                  {label}
                                </span>
                                <span className="text-[11px]">
                                  Tap to book / hold / block
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  )}
              </div>
            );
          })}
        </div>
      </section>

      {!loading && !error && !hasBoardData && (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500">
          No front desk data available for this range.
        </div>
      )}

      {renderContextModal()}
    </div>
  );
};

export default FrontDeskBoard;

