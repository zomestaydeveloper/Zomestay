import React, { useState } from "react";

const RoomCard = ({ room }) => {
  const [selectedPlan, setSelectedPlan] = useState(room.mealPlans[0].key);

  return (
    <div className="bg-white rounded-2xl shadow-lg flex flex-col md:flex-row overflow-hidden border border-gray-100">
      {/* Left: Room Info */}
      <div className="w-full md:w-1/3 p-5 flex flex-col gap-3 border-b md:border-b-0 border-gray-200">
        <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-1">{room.name}</h2>
        <img src={room.image} alt={room.name} className="rounded-lg w-full aspect-video object-cover" />
        <ul className="text-xs text-gray-500 mt-2 flex flex-col gap-1">
          {room.features.map((f, i) => (
            <li key={i}>• {f}</li>
          ))}
        </ul>
      </div>

      {/* Middle: Meal Plans */}
      <div className="w-full md:w-1/3 p-5 flex flex-col gap-3 border-b md:border-b-0 border-gray-200 justify-start">
        <h3 className="text-base md:text-lg font-bold text-gray-700 mb-2">Description</h3>
        <div className="flex flex-col gap-2">
          <p className="text-sm text-gray-600">Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum</p>
        </div>
      </div>

      {/* Right: Price Plan */}
      <div className="w-full md:w-1/3 p-5 flex flex-col gap-4 items-center justify-center bg-gray-50">
        <h3 className="text-base md:text-lg font-semibold text-gray-700 mb-2">Price Plan</h3>
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs text-gray-500">Per Night</span>
          <span className="text-2xl md:text-3xl font-bold text-[#004AAD]">₹ {room.pricing.currentPrice.toLocaleString()}/-</span>
          <span className="text-base text-gray-400 line-through">₹ {room.pricing.originalPrice.toLocaleString()}</span>
          <span className="text-xs text-gray-400 mt-1">+ ₹ {room.pricing.taxes.toLocaleString()} taxes & fees</span>
        </div>
        <button className="w-full rounded-full bg-[#004AAD] text-white font-semibold py-3 text-base shadow hover:bg-blue-700 transition">
          Book Now
        </button>
      </div>
    </div>
  );
};

export default RoomCard