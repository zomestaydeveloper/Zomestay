import { useState, useCallback } from "react";
import frontdeskCommon from "../../../../services/property/frontdesk/frontdeskcommon";
import { DEFAULT_BLOCK_RELEASE_HOURS } from "../constants";
import { formatQueryDate, isPastDate } from "../utils/dateUtils";

/**
 * Custom hook to manage room status state and operations
 */
export const useRoomStatus = ({
  propertyId,
  activeContext,
  frontdeskActor,
  onRefresh,
  onResetRoomStatus,
  onCloseModal,
  setActiveContext,
}) => {
  const [roomStatusForm, setRoomStatusForm] = useState({
    reason: "",
    releaseAfterHours: String(DEFAULT_BLOCK_RELEASE_HOURS),
  });
  const [roomStatusRequest, setRoomStatusRequest] = useState({
    status: "idle",
    error: null,
    message: null,
  });

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

    // Prevent creating blocks/maintenance/out_of_service for past dates (release is allowed)
    if (mode === "create" && isPastDate(resolvedDate)) {
      setRoomStatusRequest({
        status: "error",
        error: "Cannot create room status changes for past dates.",
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

      onRefresh();

      setTimeout(() => {
        resetRoomStatusState();
        onCloseModal();
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
    onRefresh,
    resetRoomStatusState,
    onCloseModal,
  ]);

  return {
    // State
    roomStatusForm,
    roomStatusRequest,
    // Handlers
    resetRoomStatusState,
    openRoomStatusModal,
    handleRoomStatusFormChange,
    handleSubmitRoomStatus,
  };
};

