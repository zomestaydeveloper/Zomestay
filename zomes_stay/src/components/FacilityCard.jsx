import React from "react";

export default function FacilityCard({ title, image }) {
  return (
    <div className="w-44 sm:w-52 rounded-2xl bg-gray-100 p-3 flex flex-col items-center gap-2 shadow-sm">
      <div className="w-full h-28 sm:h-32 overflow-hidden rounded-xl">
        <img src={image} alt={title} className="w-full h-full object-cover" />
      </div>
      <p className="text-sm sm:text-base font-medium text-gray-700 text-center">
        {title}
      </p>
    </div>
  );
}
