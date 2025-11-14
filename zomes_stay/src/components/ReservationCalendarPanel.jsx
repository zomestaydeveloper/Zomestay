import React, { useState, useRef, useEffect } from "react";

// ---- Local helpers ----
const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

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

function formatINR(n) {
  if (n == null) return "—";
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
  } catch {
    return `₹${n}`;
  }
}

// ---- Component (JSX) ----
export default function ReservationCalendarPanel({
  // calendarData: { 'YYYY-MM-DD': { minRate: number|null, isAvailable: boolean, specialRate: { amount:number, label?:string } | null } }
  calendarData = {},
  // Optional legacy list of Date objects that are unavailable
  unavailableDates = [],
  onBookNow,
}) {
  const today = getToday();
  const [baseMonth, setBaseMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [monthsShown, setMonthsShown] = useState(2);
  const [range, setRange] = useState({ start: null, end: null });
  const [hovered, setHovered] = useState(null);
  const [inquiry, setInquiry] = useState(false);

  // Merge legacy unavailableDates into a set of YYYY-MM-DD strings
  const unavailableSet = useRef(new Set(unavailableDates.map((d) => d.toISOString().slice(0, 10))));

  // Keyboard navigation across all months
  useEffect(() => {
    const handleKeyDown = (e) => {
      const focus = document.activeElement;
      const day = focus?.dataset?.date;
      if (!day) return;
      let d = new Date(day);
      let next;
      if (e.key === "ArrowRight") next = new Date(d.setDate(d.getDate() + 1));
      if (e.key === "ArrowLeft") next = new Date(d.setDate(d.getDate() - 1));
      if (e.key === "ArrowDown") next = new Date(d.setDate(d.getDate() + 7));
      if (e.key === "ArrowUp") next = new Date(d.setDate(d.getDate() - 7));
      if (next) {
        const btn = document.querySelector(
          `[data-date='${next.toISOString().slice(0, 10)}']`
        );
        if (btn) btn.focus();
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function onDateClick(day) {
    const key = day?.toISOString().slice(0, 10);
    const cal = key ? calendarData[key] : null;
    const notAvailable = cal ? cal.isAvailable === false : false;
    if (!day || isBeforeDay(day, today) || unavailableSet.current.has(key) || notAvailable) return;

    if (!range.start || (range.start && range.end)) {
      setRange({ start: day, end: null });
    } else if (range.start && !range.end) {
      if (isBeforeDay(day, range.start)) {
        setRange({ start: day, end: range.start });
      } else {
        setRange({ start: range.start, end: day });
      }
    }
  }

  function renderMonth(monthDate, idx) {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const matrix = getMonthMatrix(year, month);

    return (
      <div key={idx} className="mb-4">
        {/* Month header with navigation */}
        <div className="flex items-center justify-center gap-2 mb-2">
          <button
            aria-label="Previous month"
            className="p-1 rounded-full hover:bg-gray-100 disabled:opacity-40"
            onClick={() => idx === 0 && setBaseMonth(addMonths(baseMonth, -1))}
            disabled={idx !== 0 || (year === today.getFullYear() && month === today.getMonth())}
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7"/></svg>
          </button>
          <span className="px-4 py-1 rounded-full bg-[#0070eb] text-white font-semibold text-sm">
            {MONTHS[month]} {year}
          </span>
          <button
            aria-label="Next month"
            className="p-1 rounded-full hover:bg-gray-100"
            onClick={() => idx === monthsShown - 1 && setBaseMonth(addMonths(baseMonth, 1))}
            disabled={idx !== monthsShown - 1}
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>
          </button>
        </div>

        {/* Weekday row */}
        <div className="grid grid-cols-7 gap-y-1 text-xs text-center mb-1">
          {WEEKDAYS.map((d, i) => (
            <span key={i} className="text-gray-400 font-medium">{d}</span>
          ))}
        </div>

        {/* Date grid */}
        <div className="grid grid-cols-7 gap-1">
          {matrix.flat().map((day, cidx) => {
            if (!day) return <div key={cidx}></div>;
            const key = day.toISOString().slice(0, 10);
            const fromMap = calendarData[key];
            const isPast = isBeforeDay(day, today);
            const fromLegacyUnavailable = unavailableSet.current.has(key);
            const notAvailable = fromMap ? fromMap.isAvailable === false : false;
            const isUnavailable = fromLegacyUnavailable || notAvailable;
            const isDisabled = isPast || isUnavailable;
            const isSelected =
              (range.start && isSameDay(day, range.start)) ||
              (range.end && isSameDay(day, range.end));
            const isInSelectedRange = range.start && range.end && isInRange(day, range.start, range.end);
            const isToday = isSameDay(day, today);
            const isHoveredRange = range.start && !range.end && hovered && isInRange(day, range.start, hovered);

            const minRate = fromMap?.minRate ?? null;
            const special = fromMap?.specialRate ?? null;
            const hasDiscount = special && typeof special.amount === "number" && minRate && special.amount < minRate;

            return (
              <button
                key={cidx}
                type="button"
                tabIndex={isDisabled ? -1 : 0}
                data-date={key}
                disabled={isDisabled}
                onClick={() => onDateClick(day)}
                onMouseEnter={() => setHovered(day)}
                onMouseLeave={() => setHovered(null)}
                className={
                  "transition-all rounded-lg w-12 h-12 flex flex-col items-center justify-center select-none outline-none border text-[11px] " +
                  (isDisabled
                    ? "bg-gray-100 text-gray-300 border-transparent cursor-not-allowed "
                    : isSelected
                    ? "bg-[#0070eb] text-white border-[#0070eb] font-semibold "
                    : isInSelectedRange || isHoveredRange
                    ? "bg-blue-100 text-[#0070eb] border-blue-200 "
                    : "hover:bg-blue-50 cursor-pointer border-transparent ") +
                  (isToday && !isSelected ? " ring-2 ring-[#0070eb]/60 " : "")
                }
                aria-label={`${day.toDateString()} • ${
                  isUnavailable ? "Not available" : hasDiscount ? `${formatINR(special.amount)} (deal)` : formatINR(minRate)
                }`}
              >
                <span className="text-sm leading-none">{day.getDate()}</span>
                {/* Price row */}
                <span className="mt-1 leading-none">
                  {isUnavailable ? (
                    <span className="text-[10px] text-red-500 font-medium">Sold out</span>
                  ) : hasDiscount ? (
                    <>
                      <span className="text-[10px] line-through opacity-70 mr-1">{formatINR(minRate)}</span>
                      <span className="text-[11px] font-semibold">{formatINR(special.amount)}</span>
                    </>
                  ) : (
                    <span className="text-[11px]">{formatINR(minRate)}</span>
                  )}
                </span>
                {/* Special label */}
                {special && (
                  <span className="mt-0.5 text-[9px] text-[#0070eb] truncate max-w-[44px]" title={special.label || "Special rate"}>
                    {special.label || "Special"}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const visibleMonths = [];
  for (let i = 0; i < monthsShown; i++) {
    visibleMonths.push(renderMonth(addMonths(baseMonth, i), i));
  }

  return (
    <aside className="w-[360px] max-w-full bg-white shadow-xl rounded-2xl p-6 flex flex-col items-center">
      <div className="w-full flex flex-col items-center">
        <div className="text-center mb-4">
          <span className="text-[18px] font-semibold text-gray-700">Reservation</span>
        </div>

        {/* Calendar months */}
        <div className="w-full flex flex-col gap-2">{visibleMonths}</div>

        <button
          className="mt-1 mb-3 px-4 py-2 text-[#0070eb] rounded-lg border border-[#0070eb] bg-white hover:bg-blue-50 transition text-sm font-medium"
          onClick={() => setMonthsShown((m) => m + 1)}
        >
          Show More Months
        </button>

        <div className="text-xs text-gray-400 mb-4">Select check-in and check-out dates</div>

        <button
          className="w-full h-12 bg-gradient-to-r from-[#0070eb] to-[#0056b3] text-white rounded-full font-semibold text-base shadow-none transition-all hover:from-[#0056b3] hover:to-[#0070eb] disabled:opacity-60 outline-none border-none mb-3"
          disabled={!range.start || !range.end}
          onClick={() => {
            if (onBookNow && range.start && range.end) {
              onBookNow(range);
            }
          }}
        >
          Book Now
        </button>

        <label className="w-full flex items-center justify-center gap-2 border border-dashed border-[#0070eb] rounded-md py-2 px-2 text-sm text-gray-700 cursor-pointer">
           <button>
             <span className="inline-flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24">
              <path fill="#0070eb" d="M5 4v16h14V4H5zm2 2h10v12H7V6zm3 2v2h4V8h-4zm0 4v2h4v-2h-4z"/>
            </svg>
            Contact for Inquiry
          </span>
           </button>
         
        </label>
      </div>
    </aside>
  );
}
