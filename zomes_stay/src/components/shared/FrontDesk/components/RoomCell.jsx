import React from "react";
import { CELL_STYLES, STATUS_LABEL } from "../constants";
import { isPastDate } from "../utils/dateUtils";

const RoomCell = ({ slot, date, room, roomType, onCellClick, index }) => {
  const style = CELL_STYLES[slot.type] || CELL_STYLES.available;
  const label = STATUS_LABEL[slot.type] || STATUS_LABEL.available;
  const isPast = isPastDate(date);
  const isDisabled = isPast;

  if (slot.type === "booked") {
    return (
      <button
        key={`${room.id}-${slot.dateKey || date?.toISOString?.() || index}`}
        type="button"
        className={`flex h-16 flex-col justify-center border-r border-gray-100 px-3 text-left text-xs font-medium transition hover:brightness-95 ${style}`}
        onClick={() =>
          onCellClick({
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

  if (slot.type === "blocked" || slot.type === "maintenance" || slot.type === "out_of_service") {
    return (
      <button
        key={`${room.id}-${slot.dateKey || date?.toISOString?.() || index}`}
        type="button"
        className={`flex h-16 flex-col justify-center border-r border-gray-100 px-3 text-left text-xs font-medium transition hover:brightness-95 ${style}`}
        onClick={() =>
          onCellClick({
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
      className={`flex h-16 flex-col justify-center border-r border-gray-100 px-3 text-left text-xs font-medium transition ${
        isDisabled
          ? "cursor-not-allowed bg-gray-50 text-gray-300 opacity-60"
          : "bg-white text-gray-400 hover:bg-blue-50 hover:text-blue-600"
      }`}
      onClick={() => !isDisabled && onCellClick({
        date,
        room,
        roomType,
      })}
      disabled={isDisabled}
      title={isPast ? "Past dates cannot be modified" : "Tap to book / hold / block"}
    >
      <span className="text-[11px] font-semibold uppercase tracking-wide">
        {label}
      </span>
      <span className="text-[11px]">
        {isPast ? "Past date" : "Tap to book / hold / block"}
      </span>
    </button>
  );
};

export default RoomCell;


