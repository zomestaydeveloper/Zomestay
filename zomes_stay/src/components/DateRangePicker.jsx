import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function getToday() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

function getMonthMatrix(year, month) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const matrix = [];
  let week = [];
  for (let i = 0; i < first.getDay(); i++) week.push(null);
  for (let d = 1; d <= last.getDate(); d++) {
    week.push(new Date(year, month, d));
    if (week.length === 7) {
      matrix.push(week);
      week = [];
    }
  }
  if (week.length) {
    while (week.length < 7) week.push(null);
    matrix.push(week);
  }
  return matrix;
}

function isSameDay(a, b) {
  return (
    a &&
    b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isInRange(day, start, end) {
  if (!start || !end) return false;
  return day > start && day < end;
}

function isBeforeDay(a, b) {
  return a && b && a.getTime() < b.getTime();
}

function addMonths(date, n) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}

const DateRangePicker = ({ 
  isOpen, 
  onClose, 
  onDateSelect, 
  selectedDates = { checkIn: null, checkOut: null }
}) => {
  const [startDate, setStartDate] = useState(selectedDates.checkIn);
  const [endDate, setEndDate] = useState(selectedDates.checkOut);
  const [baseMonth, setBaseMonth] = useState(new Date());
  const today = getToday();

  function onDateClick(day) {
    if (!day || isBeforeDay(day, today)) return;

    if (!startDate || (startDate && endDate)) {
      setStartDate(day);
      setEndDate(null);
    } else if (startDate && !endDate) {
      if (isBeforeDay(day, startDate)) {
        setStartDate(day);
        setEndDate(startDate);
      } else {
        setStartDate(startDate);
        setEndDate(day);
      }
    }
  }

  // Handle close
  const handleClose = () => {
    onDateSelect({
      checkIn: startDate,
      checkOut: endDate
    });
    onClose();
  };

  function renderMonth(monthDate) {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const matrix = getMonthMatrix(year, month);

    return (
      <div className="flex-1 min-w-[280px]">
        <div className="text-center mb-3">
          <span className="text-lg font-semibold text-gray-900">{MONTHS[month]} {year}</span>
        </div>

        {/* Weekday row */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {WEEKDAYS.map((d, i) => (
            <div key={i} className="text-center text-xs font-medium text-gray-800 py-1">{d}</div>
          ))}
        </div>

        {/* Date grid */}
        <div className="grid grid-cols-7 gap-1">
          {matrix.flat().map((day, cidx) => {
            if (!day) return <div key={cidx} className="h-12"></div>;
            
            const isPast = isBeforeDay(day, today);
            const isSelected =
              (startDate && isSameDay(day, startDate)) ||
              (endDate && isSameDay(day, endDate));
            const isInSelectedRange = startDate && endDate && isInRange(day, startDate, endDate);
            const isToday = isSameDay(day, today);

            return (
              <button
                key={cidx}
                type="button"
                disabled={isPast}
                onClick={() => onDateClick(day)}
                className={
                  "h-12 flex items-center justify-center rounded-lg text-sm transition-all border " +
                  (isPast
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200 "
                    : isSelected
                    ? "bg-[#003580] text-white font-semibold border-[#003580] "
                    : isInSelectedRange
                    ? "bg-blue-100 text-[#003580] border-blue-200 "
                    : "hover:bg-blue-50 cursor-pointer border-gray-300 text-gray-800 ") +
                  (isToday && !isSelected ? "ring-2 ring-[#003580] ring-opacity-60 border-[#003580] " : "")
                }
              >
                <span className="font-medium">{day.getDate()}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (!isOpen) return null;

  const monthsToShow = 2;
  const visibleMonths = [];
  for (let i = 0; i < monthsToShow; i++) {
    visibleMonths.push(renderMonth(addMonths(baseMonth, i)));
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={handleClose}>
      <div 
        className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-gray-300 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Select dates</h2>
          <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-full transition">
            <X size={24} className="text-gray-600" />
          </button>
        </div>

        <div className="p-6">
          {/* Navigation */}
          <div className="flex items-center justify-center mb-6 gap-4">
            <button
              onClick={() => setBaseMonth(addMonths(baseMonth, -1))}
              disabled={baseMonth.getMonth() === today.getMonth() && baseMonth.getFullYear() === today.getFullYear()}
              className="p-2 rounded-full bg-blue-500  hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={24} />
            </button>
            <h3 className="text-lg font-semibold text-gray-900">
              {MONTHS[baseMonth.getMonth()]} {baseMonth.getFullYear()}
            </h3>
            <button
              onClick={() => setBaseMonth(addMonths(baseMonth, 1))}
              className="p-2 bg-blue-500 rounded-full hover:bg-gray-100"
            >
              <ChevronRight size={24} />
            </button>
          </div>

          {/* Calendar months - Vertical stack */}
          <div className="flex flex-col gap-8">
            {visibleMonths}
          </div>

          {/* Bottom Action Section */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={() => {
                  setStartDate(null);
                  setEndDate(null);
                }}
                className="px-6 py-3 text-gray-700 hover:text-gray-900 transition-colors font-medium border border-gray-300 rounded-lg hover:bg-gray-100"
              >
                Clear
              </button>
              <button
                onClick={handleClose}
                disabled={!startDate || !endDate}
                className="flex-1 py-3 bg-[#003580] text-white rounded-lg hover:bg-[#00224d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg border border-[#003580]"
              >
                Book Now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DateRangePicker;
