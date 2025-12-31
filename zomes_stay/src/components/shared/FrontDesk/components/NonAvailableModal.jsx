import React from "react";
import { formatDate } from "../utils/formatUtils";
import { ROOM_STATUS_ACTION_LABELS } from "../constants";

const NonAvailableModal = ({ slot, date, room, roomType, onRelease, onClose }) => {
  const getModalTitle = () => {
    if (slot.type === "maintenance") return "Maintenance";
    if (slot.type === "out_of_service") return "Out of service";
    return "Blocked";
  };

  const getOwnerLabel = () => {
    if (slot.type === "maintenance") return "Maintained by";
    if (slot.type === "out_of_service") return "Marked by";
    return "Blocked by";
  };

  const actionLabels = ROOM_STATUS_ACTION_LABELS[slot.type] || {
    create: "Update status",
    release: "Release status",
  };

  return (
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
          {getOwnerLabel()}
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
            onClick={onRelease}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:border-gray-400 hover:text-gray-800"
          >
            {slot.type === "blocked"
              ? actionLabels.release
              : slot.type === "maintenance"
              ? actionLabels.release
              : actionLabels.release}
          </button>
        </div>
      )}
    </div>
  );
};

export default NonAvailableModal;


