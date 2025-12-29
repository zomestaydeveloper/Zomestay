/**
 * Constants for FrontDesk components
 */

export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const DEFAULT_BLOCK_RELEASE_HOURS = 2;

export const CELL_STYLES = {
  booked: "bg-emerald-500 text-white",
  blocked: "bg-amber-400 text-gray-900",
  maintenance: "bg-rose-400 text-white",
  out_of_service: "bg-gray-600 text-white",
  available: "bg-white text-gray-700",
};

export const STATUS_LABEL = {
  booked: "Booked",
  blocked: "Blocked",
  maintenance: "Maintenance",
  out_of_service: "Out of service",
  available: "Available",
};

export const ROOM_STATUS_ACCENT = {
  blocked: "bg-amber-500",
  maintenance: "bg-rose-500",
  out_of_service: "bg-gray-600",
};

export const ROOM_STATUS_ACTION_LABELS = {
  blocked: {
    create: "Block room",
    release: "Release block",
  },
  maintenance: {
    create: "Mark maintenance",
    release: "Release maintenance",
  },
  out_of_service: {
    create: "Mark out of service",
    release: "Bring back in service",
  },
};

