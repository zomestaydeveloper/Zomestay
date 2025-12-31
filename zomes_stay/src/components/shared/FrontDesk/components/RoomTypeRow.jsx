import React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { formatDate } from "../utils/formatUtils";
import RoomCell from "./RoomCell";

const RoomTypeRow = ({ roomType, displayDays, isExpanded, onToggle, onCellClick }) => {
  return (
    <div className="bg-white">
      <button
        type="button"
        onClick={() => onToggle(roomType.id)}
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
                return (
                  <RoomCell
                    key={`${room.id}-${slot.dateKey || date?.toISOString?.() || index}`}
                    slot={slot}
                    date={date}
                    room={room}
                    roomType={roomType}
                    onCellClick={onCellClick}
                    index={index}
                  />
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RoomTypeRow;


