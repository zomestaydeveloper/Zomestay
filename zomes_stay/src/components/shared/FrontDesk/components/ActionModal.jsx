import React from "react";
import { formatDate } from "../utils/formatUtils";

const ActionModal = ({ date, room, roomType, onBook, onBlock, onMaintenance, onOutOfService }) => {
  return (
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
          onClick={onBook}
        >
          Book Now
        </button>
        <button
          type="button"
          className="rounded-md bg-amber-400 px-3 py-1.5 text-xs font-semibold text-gray-900 shadow-sm hover:bg-amber-500"
          onClick={onBlock}
        >
          Block
        </button>
        <button
          type="button"
          className="rounded-md bg-rose-400 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-rose-500"
          onClick={onMaintenance}
        >
          Maintenance
        </button>
        <button
          type="button"
          className="rounded-md bg-gray-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-gray-700"
          onClick={onOutOfService}
        >
          Out of service
        </button>
      </div>
    </>
  );
};

export default ActionModal;

