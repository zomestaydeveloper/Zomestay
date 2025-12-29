import React from "react";
import { ArrowLeft, ArrowRight, Calendar } from "lucide-react";
import { addMonths, buildCalendarGrid, formatMonthLabel, formatQueryDate, isSameDay, isWithinRange, isPastDate } from "../utils/dateUtils";
import { formatDate } from "../utils/formatUtils";

const DatePicker = ({
  isOpen,
  dateSelection,
  datePickerMonth,
  stayDatesLabel,
  onMonthChange,
  onDayClick,
  onClear,
  onCancel,
  onApply,
}) => {
  if (!isOpen) return null;

  const renderCalendarMonth = (monthDate) => {
    const days = buildCalendarGrid(monthDate);
    const start = dateSelection.from;
    const end = dateSelection.to || dateSelection.from;

    return (
      <div key={monthDate.toISOString()} className="w-full min-w-[240px]">
        <div className="text-center text-sm font-semibold text-gray-700">
          {formatMonthLabel(monthDate)}
        </div>
        <div className="mt-2 grid grid-cols-7 gap-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label) => (
            <div key={label} className="text-center">
              {label}
            </div>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {days.map(({ date, inMonth }) => {
            const key = formatQueryDate(date);
            const selectionEnd = end || start;
            const isStart = start && isSameDay(date, start);
            const isEnd = selectionEnd && isSameDay(date, selectionEnd);
            const inRange =
              start && selectionEnd && isWithinRange(date, start, selectionEnd);

            const classNames = [
              "flex h-9 items-center justify-center rounded-md text-xs font-semibold transition",
              "cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/40",
              inMonth ? "text-gray-700" : "text-gray-300",
              "hover:bg-emerald-200",
            ];

            if (inRange) {
              classNames.push("bg-emerald-100 text-emerald-700");
            }

            if (isStart || isEnd) {
              classNames.push("bg-emerald-500 text-white");
            }

            const isPast = isPastDate(date);
            const isDisabled = isPast;

            if (isDisabled) {
              classNames.push("cursor-not-allowed opacity-40");
            }

            return (
              <button
                key={key}
                type="button"
                onClick={() => !isDisabled && onDayClick(date)}
                disabled={isDisabled}
                className={classNames.join(" ")}
                title={isPast ? "Past dates cannot be selected" : ""}
              >
                {date.getUTCDate()}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="relative">
      <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400">
        Stay dates
      </label>
      <button
        type="button"
        onClick={() => {}}
        className="mt-1 flex w-full items-center justify-between rounded-md border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        <span>{stayDatesLabel}</span>
        <Calendar className="h-4 w-4 text-gray-400" />
      </button>

      <div className="absolute left-0 right-0 z-20 mt-2 w-full rounded-lg border border-gray-200 bg-white p-4 shadow-lg sm:min-w-[520px]">
        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
          <button
            type="button"
            onClick={() => onMonthChange(-1)}
            className="rounded-md p-1 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-semibold text-gray-700">
            {formatMonthLabel(datePickerMonth)} •{" "}
            {formatMonthLabel(addMonths(datePickerMonth, 1))}
          </span>
          <button
            type="button"
            onClick={() => onMonthChange(1)}
            className="rounded-md p-1 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          {renderCalendarMonth(datePickerMonth)}
          {renderCalendarMonth(addMonths(datePickerMonth, 1))}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClear}
            className="text-xs font-semibold text-gray-500 transition hover:text-gray-700"
          >
            Clear selection
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:border-gray-300 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onApply}
              className="rounded-md bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-600"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DatePicker;

