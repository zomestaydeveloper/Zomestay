import React, { useState } from "react";
import { X } from "lucide-react";

export default function SafetyHygieneList({ items }) {
  const [showModal, setShowModal] = useState(false);

  // Show only first 4 items on mobile
  const mobileItems = items.slice(0, 4);
  const hasMoreItems = items.length > 4;

  return (
    <>
      {/* Desktop view - 3 columns */}
      <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-3">
            {/* ✅ Proper responsive SVG size */}
            {React.cloneElement(item.icon, {
              className:
                "w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-gray-600 flex-shrink-0",
            })}
            <span className="text-gray-700 text-sm">{item.title}</span>
          </div>
        ))}
      </div>

      {/* Mobile view - 2 columns, first 4 items */}
      <div className="sm:hidden">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          {mobileItems.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              {React.cloneElement(item.icon, {
                className:
                  "w-4 h-4 sm:w-5 sm:h-5 text-gray-600 flex-shrink-0",
              })}
              <span className="text-gray-700 text-xs">{item.title}</span>
            </div>
          ))}
        </div>

        {/* Simple "See more" link in bottom right */}
        {hasMoreItems && (
          <div className="flex justify-end mt-3">
           
            <button
              onClick={() => setShowModal(true)}
              className="mt-3 w-full py-2.5 text-sm font-semibold text-blue-600 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-all"
            >
              View All Safety features
            </button>
          </div>
        )}
      </div>

      {/* Modal for mobile view */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white rounded-t-lg">
              <h3 className="text-lg font-semibold text-gray-900">
                Safety & Hygiene
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4">
              <div className="grid grid-cols-1 gap-y-3">
                {items.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    {React.cloneElement(item.icon, {
                      className:
                        "w-5 h-5 sm:w-6 sm:h-6 text-gray-600 flex-shrink-0",
                    })}
                    <span className="text-gray-700 text-sm">
                      {item.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
