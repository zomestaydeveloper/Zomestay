/**
 * Formatting utility functions for FrontDesk
 */

export const formatDate = (date, options = {}) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", ...options }).format(date);

export const formatMonthLabel = (date) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  }).format(date);

export const formatTimeLabel = (value) => {
  if (!value || typeof value !== "string") return null;
  const [hoursStr, minutesStr = "00"] = value.split(":");
  const hours = Number(hoursStr);
  const minutes = Number(minutesStr);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return value;
  }
  const normalizedHours = String(Math.max(0, Math.min(23, hours))).padStart(2, "0");
  const normalizedMinutes = String(Math.max(0, Math.min(59, minutes))).padStart(2, "0");
  return `${normalizedHours}:${normalizedMinutes}`;
};

export const formatDateTime = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

export const numberFrom = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

