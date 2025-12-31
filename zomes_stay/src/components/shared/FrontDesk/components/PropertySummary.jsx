import React from "react";
import { formatDate } from "../utils/formatUtils";

const PropertySummary = ({ propertyName, totalRooms, rangeStart, rangeEnd }) => {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-gray-600">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-400">Property</p>
          <p className="text-base font-semibold text-gray-900">
            {propertyName || "N/A"}
          </p>
        </div>
        <div className="flex items-center gap-6">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400">Total rooms</p>
            <p className="text-base font-semibold text-gray-900">{totalRooms}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400">Week start</p>
            <p className="text-base font-semibold text-gray-900">
              {formatDate(rangeStart, { dateStyle: "medium" })}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400">Week end</p>
            <p className="text-base font-semibold text-gray-900">
              {formatDate(rangeEnd, { dateStyle: "medium" })}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PropertySummary;

