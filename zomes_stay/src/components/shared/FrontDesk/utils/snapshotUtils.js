/**
 * Snapshot mapping utilities for FrontDesk
 */

import { parseDateOnly } from './dateUtils';

export const normalizeSlotType = (statusRaw) => {
  const status = (statusRaw || "").toLowerCase();
  if (status === "booked") return "booked";
  if (status === "maintenance") return "maintenance";
  if (status === "out_of_service") return "out_of_service";
  if (status === "blocked" || status === "hold") return "blocked";
  return "available";
};

export const mapSlotStatus = (dayKey, slot) => {
  const date = parseDateOnly(dayKey);
  if (!slot) {
    return {
      date,
      dateKey: dayKey,
      type: "available",
      status: "available",
    };
  }

  const type = normalizeSlotType(slot.status);

  if (type === "booked") {
    return {
      date,
      dateKey: dayKey,
      type,
      status: "booked",
      guest: slot.guest || slot.guestName || "Guest",
      ref: slot.reference || slot.bookingId || "N/A",
      bookingId: slot.bookingId || null,
      stay: slot.stay || null,
    };
  }

  if (type === "blocked") {
    return {
      date,
      dateKey: dayKey,
      type,
      status: "blocked",
      owner: slot.blockedBy || null,
      notes: slot.reason || null,
      availabilityId: slot.availabilityId || null,
    };
  }

  if (type === "out_of_service") {
    return {
      date,
      dateKey: dayKey,
      type,
      status: "out_of_service",
      owner: slot.blockedBy || "Front desk",
      notes: slot.reason || null,
      availabilityId: slot.availabilityId || null,
    };
  }

  if (type === "maintenance") {
    return {
      date,
      dateKey: dayKey,
      type,
      status: "maintenance",
      owner: slot.blockedBy || "Maintenance",
      notes: slot.reason || null,
      availabilityId: slot.availabilityId || null,
    };
  }

  return {
    date,
    dateKey: dayKey,
    type: "available",
    status: slot.status || "available",
  };
};

export const mapSnapshotToBoard = (snapshot) => {
  if (!snapshot) {
    return null;
  }

  const dayEntries = snapshot.range?.days || [];
  const dayKeys = dayEntries.map((item) => item.date);
  const dayDates = dayKeys.map((dateKey) => parseDateOnly(dateKey));

  const summaryMap = new Map(
    (snapshot.summary || []).map((item) => [item.date, item])
  );

  const summary = dayKeys.map((dayKey, index) => {
    const entry = summaryMap.get(dayKey) || {};
    const date = dayDates[index] || parseDateOnly(entry.date);
    return {
      date,
      dateKey: dayKey,
      weekday: entry.weekday || dayEntries[index]?.weekday || "",
      totalRooms: entry.totalRooms ?? snapshot.property?.totalRooms ?? 0,
      booked: entry.booked ?? 0,
      blocked: entry.blocked ?? 0,
      maintenance: entry.maintenance ?? 0,
      available: entry.available ?? 0,
    };
  });

  const roomTypes = (snapshot.roomTypes || []).map((roomType) => {
    const availabilityMap = new Map(
      (roomType.availability || []).map((item) => [item.date, item])
    );

    const rooms = (roomType.rooms || []).map((room) => {
      const slotMap = new Map(
        (room.slots || []).map((slot) => [slot.date, slot])
      );

      const slots = dayKeys.map((dayKey) =>
        mapSlotStatus(dayKey, slotMap.get(dayKey))
      );

      return {
        id: room.id,
        label: room.label || room.name || room.code || "Room",
        slots,
      };
    });

    return {
      id: roomType.id,
      name: roomType.name,
      available: dayKeys.map(
        (dayKey) => availabilityMap.get(dayKey)?.available ?? 0
      ),
      rooms,
    };
  });

  return {
    property: {
      id: snapshot.property?.id || null,
      name: snapshot.property?.name || "",
      totalRooms:
        snapshot.property?.totalRooms ?? summary[0]?.totalRooms ?? 0,
    },
    range: snapshot.range || null,
    days: dayDates,
    dayKeys,
    summary,
    roomTypes,
  };
};

