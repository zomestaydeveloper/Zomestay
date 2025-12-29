import React from "react";

const Modal = ({ title, accentColour = "bg-blue-500", onClose, children }) => {
  const stopPropagation = (event) => {
    event.stopPropagation();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="mx-4 flex w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-black/5 max-h-[85vh]"
        onClick={stopPropagation}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${accentColour}`} />
            <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>
      </div>
    </div>
  );
};

export default Modal;

