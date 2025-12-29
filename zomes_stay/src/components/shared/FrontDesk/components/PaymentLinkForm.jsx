import React from "react";

const PaymentLinkForm = ({
  paymentLinkForm,
  paymentLinkError,
  onFieldChange,
  onSave,
  onCancel,
}) => {
  return (
    <div className="space-y-3 rounded-md border border-gray-200 bg-white px-3 py-3 text-gray-700 shadow-sm">
      <div className="text-sm font-semibold text-gray-900">Guest contact details</div>
      {paymentLinkError && (
        <div className="rounded border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-600">
          {paymentLinkError}
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            Full name (optional)
          </span>
          <input
            value={paymentLinkForm.fullName}
            onChange={onFieldChange("fullName")}
            type="text"
            placeholder="Guest name"
            className="rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            Email (optional)
          </span>
          <input
            value={paymentLinkForm.email}
            onChange={onFieldChange("email")}
            type="email"
            placeholder="guest@email.com"
            className="rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </label>
      </div>
      <label className="flex flex-col gap-1 sm:w-1/2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
          Mobile number*
        </span>
        <div className="flex items-center rounded-md border border-gray-200 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
          <span className="px-3 text-sm text-gray-500">+91</span>
          <input
            value={paymentLinkForm.phone}
            onChange={onFieldChange("phone")}
            type="tel"
            inputMode="numeric"
            maxLength={10}
            placeholder="10 digit number"
            className="flex-1 rounded-r-md border-l border-gray-200 px-3 py-2 text-sm text-gray-700 focus:outline-none"
          />
        </div>
      </label>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:border-gray-300 hover:text-gray-800"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSave}
          className="rounded-md bg-blue-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-600"
        >
          Save details
        </button>
      </div>
    </div>
  );
};

export default PaymentLinkForm;

