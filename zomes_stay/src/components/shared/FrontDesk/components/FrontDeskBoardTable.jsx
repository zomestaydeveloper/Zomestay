import React from "react";
import { Calendar, ChevronDown, ChevronRight } from "lucide-react";
import { formatDate } from "../utils/formatUtils";
import RoomCell from "./RoomCell";

const FrontDeskBoardTable = ({
  loading,
  displayDays,
  summary,
  roomTypes,
  expandedRoomTypes,
  onToggleRoomType,
  onCellClick,
  onEmptyCellClick,
}) => {
  return (
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
                onClick={() => onToggleRoomType(roomType.id)}
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
                        const handleCellClick = (payload) => {
                          if (payload.type) {
                            // Booked or non-available slot
                            onCellClick(payload);
                          } else {
                            // Empty slot
                            onEmptyCellClick(payload);
                          }
                        };

                        return (
                          <RoomCell
                            key={`${room.id}-${slot.dateKey || date?.toISOString?.() || index}`}
                            slot={slot}
                            date={date}
                            room={room}
                            roomType={roomType}
                            onCellClick={handleCellClick}
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
        })}
      </div>
    </section>
  );
};

export default FrontDeskBoardTable;

