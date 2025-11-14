import React, { useRef, useEffect } from "react";

const GuestSelectorPopup = ({ adults, setAdults, children, setChildren, infants, setInfants, rooms, setRooms, onClose, onClear }) => {
  const popupRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={popupRef}
      className="absolute z-50 mt-2 right-0 bg-white text-gray-900 rounded-xl shadow-2xl border border-gray-200 w-[400px] max-w-full p-6"
      style={{ minWidth: 320 }}
    >
      <button
        className="absolute top-2 right-2 text-2xl text-gray-400 hover:text-gray-700 focus:outline-none"
        aria-label="Close"
        onClick={onClose}
        tabIndex={0}
      >
        ×
      </button>
      <div className="flex flex-col gap-5">
        {/* Adults */}
        <div className="flex justify-between items-center">
          <div>
            <div className="font-semibold">Adults</div>
            <div className="text-xs text-gray-500">Age 13 years and more</div>
          </div>
          <div className="flex items-center gap-2">
            <button className="border rounded w-10 h-10 flex items-center justify-center text-xl" onClick={() => setAdults(Math.max(1, adults - 1))}>-</button>
            <span className="w-8 text-center font-bold">{adults.toString().padStart(2, '0')}</span>
            <button className="border rounded w-10 h-10 flex items-center justify-center text-xl" onClick={() => setAdults(adults + 1)}>+</button>
          </div>
        </div>
        {/* Children */}
        <div className="flex justify-between items-center">
          <div>
            <div className="font-semibold">Children</div>
            <div className="text-xs text-gray-500">Age 3-12 years</div>
          </div>
          <div className="flex items-center gap-2">
            <button className="border border-gray-500 text-black rounded w-10 h-10 flex items-center justify-center text-xl" onClick={() => setChildren(Math.max(0, children - 1))}>-</button>
            <span className="w-8 text-center font-bold">{children.toString().padStart(2, '0')}</span>
            <button className="border rounded w-10 h-10 flex items-center justify-center text-xl" onClick={() => setChildren(children + 1)}>+</button>
          </div>
        </div>
        {/* Infants */}
        <div className="flex justify-between items-center">
          <div>
            <div className="font-semibold">Infants</div>
            <div className="text-xs text-gray-500">Age 0-2 years</div>
          </div>
          <div className="flex items-center gap-2">
            <button className="border rounded w-10 h-10 flex items-center justify-center text-xl" onClick={() => setInfants(Math.max(0, infants - 1))}>-</button>
            <span className="w-8 text-center font-bold">{infants.toString().padStart(2, '0')}</span>
            <button className="border rounded w-10 h-10 flex items-center justify-center text-xl" onClick={() => setInfants(infants + 1)}>+</button>
          </div>
        </div>
        {/* Rooms */}
        <div className="flex justify-between items-center">
          <div>
            <div className="font-semibold">Rooms</div>
          </div>
          <div className="flex items-center gap-2">
            <button className="border rounded w-10 h-10 flex items-center justify-center text-xl" onClick={() => setRooms(Math.max(1, rooms - 1))}>-</button>
            <span className="w-8 text-center font-bold">{rooms}+</span>
            <button className="border rounded w-10 h-10 flex items-center justify-center text-xl" onClick={() => setRooms(rooms + 1)}>+</button>
          </div>
        </div>
      </div>
      <div className="flex justify-between gap-2 mt-7">
        <button className="bg-black text-white px-6 py-2 rounded font-semibold flex-1" onClick={onClear}>CLEAR</button>
        <button className="bg-black text-white px-6 py-2 rounded font-semibold flex-1" onClick={onClose}>APPLY & SEARCH</button>
      </div>
    </div>
  );
};

export default GuestSelectorPopup;
