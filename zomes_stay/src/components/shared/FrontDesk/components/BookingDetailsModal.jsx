import React from "react";
import { formatDate } from "../utils/formatUtils";

const BookingDetailsModal = ({ slot, date, room, roomType, onClose }) => {
  return (
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
};

export default BookingDetailsModal;

