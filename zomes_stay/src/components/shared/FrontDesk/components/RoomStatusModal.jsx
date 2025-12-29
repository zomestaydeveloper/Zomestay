import React from "react";
import { formatDate } from "../utils/formatUtils";
import { ROOM_STATUS_ACCENT, ROOM_STATUS_ACTION_LABELS } from "../constants";

const RoomStatusModal = ({
  statusType,
  mode,
  date,
  room,
  roomType,
  roomStatusForm,
  roomStatusRequest,
  onFormChange,
  onSubmit,
  onClose,
}) => {
  const actionLabels = ROOM_STATUS_ACTION_LABELS[statusType] || {
    create: "Update status",
    release: "Release status",
  };
  const modalTitle = mode === "release" ? actionLabels.release : actionLabels.create;
  const accentColour = ROOM_STATUS_ACCENT[statusType] || "bg-blue-500";
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

  return (
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
              onChange={onFormChange("reason")}
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
                onChange={onFormChange("releaseAfterHours")}
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
          onClick={onClose}
          className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:border-gray-300 hover:text-gray-800"
          disabled={isLoading}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSubmit}
          className={`rounded-md px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60 ${accentColour}`}
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
};

export default RoomStatusModal;

