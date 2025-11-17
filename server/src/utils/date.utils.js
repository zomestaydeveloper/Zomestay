/**
 * Date utility functions for front-desk operations
 * All dates are handled in UTC to avoid timezone issues
 */

/**
 * Converts a date value to a date-only UTC date object (sets time to 00:00:00 UTC)
 * @param {Date|string|number} value - Date value to convert
 * @returns {Date|null} UTC date object with time set to midnight, or null if invalid
 */
const toDateOnly = (value) => {
  if (!value) return null;
  
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
};

/**
 * Adds a specified number of days to a date
 * @param {Date} date - Base date
 * @param {number} amount - Number of days to add (can be negative)
 * @returns {Date} New date with days added
 */
const addDays = (date, amount) => {
  if (!date || !(date instanceof Date)) {
    throw new Error('Invalid date provided to addDays');
  }
  
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + amount);
  return result;
};

/**
 * Formats a date as ISO string (YYYY-MM-DD)
 * @param {Date} date - Date to format
 * @returns {string} ISO date string (YYYY-MM-DD)
 */
const formatISODate = (date) => {
  if (!date || !(date instanceof Date)) {
    throw new Error('Invalid date provided to formatISODate');
  }
  
  return date.toISOString().slice(0, 10);
};

/**
 * Gets the start of the ISO week (Monday) for a given date
 * @param {Date} date - Date to get week start for
 * @returns {Date} Start of the week (Monday) in UTC
 */
const startOfISOWeek = (date) => {
  if (!date || !(date instanceof Date)) {
    throw new Error('Invalid date provided to startOfISOWeek');
  }
  
  const day = date.getUTCDay() || 7; // Sunday -> 7
  if (day === 1) return date;
  return addDays(date, 1 - day);
};

/**
 * Clamps a date range to a maximum span
 * @param {Date} from - Start date
 * @param {Date} to - End date
 * @param {number} maxSpanDays - Maximum number of days in the range (default: 31)
 * @returns {Date} Clamped end date
 */
const clampRange = (from, to, maxSpanDays = 31) => {
  if (!from || !to || !(from instanceof Date) || !(to instanceof Date)) {
    throw new Error('Invalid dates provided to clampRange');
  }
  
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const diff = Math.round((to.getTime() - from.getTime()) / MS_PER_DAY);
  
  if (diff > maxSpanDays - 1) {
    return addDays(from, maxSpanDays - 1);
  }
  
  return to;
};

/**
 * Builds an array of dates between from and to (inclusive)
 * @param {Date} from - Start date
 * @param {Date} to - End date
 * @returns {Date[]} Array of dates
 */
const buildDateRange = (from, to) => {
  if (!from || !to || !(from instanceof Date) || !(to instanceof Date)) {
    throw new Error('Invalid dates provided to buildDateRange');
  }
  
  const days = [];
  for (let cursor = new Date(from.getTime()); cursor <= to; cursor = addDays(cursor, 1)) {
    days.push(new Date(cursor.getTime()));
  }
  return days;
};

/**
 * Calculates the number of nights between two dates
 * @param {Date} from - Check-in date
 * @param {Date} to - Check-out date
 * @returns {number} Number of nights
 */
const calculateNights = (from, to) => {
  if (!from || !to || !(from instanceof Date) || !(to instanceof Date)) {
    return 0;
  }
  
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const diff = Math.round((to.getTime() - from.getTime()) / MS_PER_DAY);
  return Math.max(diff, 0);
};

/**
 * Checks if a date is today (in UTC)
 * @param {Date} date - Date to check
 * @returns {boolean} True if date is today
 */
const isToday = (date) => {
  if (!date || !(date instanceof Date)) {
    return false;
  }
  
  const today = toDateOnly(new Date());
  const checkDate = toDateOnly(date);
  
  return today && checkDate && today.getTime() === checkDate.getTime();
};

/**
 * Checks if a date is in the past (before today)
 * @param {Date} date - Date to check
 * @returns {boolean} True if date is in the past
 */
const isPast = (date) => {
  if (!date || !(date instanceof Date)) {
    return false;
  }
  
  const today = toDateOnly(new Date());
  const checkDate = toDateOnly(date);
  
  return today && checkDate && checkDate.getTime() < today.getTime();
};

/**
 * Checks if a date is in the future (after today)
 * @param {Date} date - Date to check
 * @returns {boolean} True if date is in the future
 */
const isFuture = (date) => {
  if (!date || !(date instanceof Date)) {
    return false;
  }
  
  const today = toDateOnly(new Date());
  const checkDate = toDateOnly(date);
  
  return today && checkDate && checkDate.getTime() > today.getTime();
};

module.exports = {
  toDateOnly,
  addDays,
  formatISODate,
  startOfISOWeek,
  clampRange,
  buildDateRange,
  calculateNights,
  isToday,
  isPast,
  isFuture,
};

