/**
 * Date utility functions for FrontDesk
 */

export const addDays = (date, amount) => {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + amount);
  return result;
};

export const startOfMonth = (date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));

export const addMonths = (date, amount) => {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + amount;
  return new Date(Date.UTC(year, month, 1));
};

export const startOfWeek = (date) => {
  const base = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = base.getUTCDay();
  const diff = (day + 6) % 7; // Monday as first day
  base.setUTCDate(base.getUTCDate() - diff);
  return base;
};

export const isSameDay = (a, b) => !!a && !!b && a.getTime() === b.getTime();

export const isDateBefore = (a, b) => !!a && !!b && a.getTime() < b.getTime();

export const isWithinRange = (date, start, end) => {
  if (!start || !end) return false;
  const time = date.getTime();
  return time >= start.getTime() && time <= end.getTime();
};

// Check if a date is in the past (before today at midnight UTC)
export const isPastDate = (date) => {
  if (!date) return false;
  const dateObj = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(dateObj.getTime())) return false;
  
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const checkDate = new Date(dateObj);
  checkDate.setUTCHours(0, 0, 0, 0);
  
  return checkDate.getTime() < today.getTime();
};

export const parseDateOnly = (value) => {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if ([year, month, day].some((part) => Number.isNaN(part))) {
    return null;
  }
  return new Date(Date.UTC(year, month - 1, day));
};

export const formatQueryDate = (date) => {
  if (!(date instanceof Date)) return "";
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const calculateNights = (from, to) => {
  if (!from || !to) return 0;
  const start = from instanceof Date ? from : parseDateOnly(from);
  const end = to instanceof Date ? to : parseDateOnly(to);
  if (!start || !end) return 0;
  const diff = Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
  return Math.max(diff, 0);
};

export const buildCalendarGrid = (monthDate) => {
  const monthStart = startOfMonth(monthDate);
  const gridStart = startOfWeek(monthStart);

  return Array.from({ length: 42 }, (_, index) => {
    const current = addDays(gridStart, index);
    return {
      date: current,
      inMonth: current.getUTCMonth() === monthStart.getUTCMonth(),
    };
  });
};


