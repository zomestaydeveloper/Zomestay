import apiService from "../../api/apiService";
import { FRONT_DESK } from "../../api/apiEndpoints";

const encodeId = (value) => encodeURIComponent(value);

const withPropertyId = (template, propertyId) =>
  template.replace(":propertyId", encodeId(propertyId));

const withPropertyRoomType = (template, propertyId, propertyRoomTypeId) =>
  withPropertyId(template, propertyId).replace(
    ":propertyRoomTypeId",
    encodeId(propertyRoomTypeId)
  );

const withAvailabilityId = (template, propertyId, availabilityId) =>
  withPropertyId(template, propertyId).replace(
    ":availabilityId",
    encodeId(availabilityId)
  );

const frontdeskCommon = {
  fetchSnapshot: ({ propertyId, from, to }) => {
    if (!propertyId) {
      throw new Error("Property identifier is required to fetch the front desk snapshot");
    }

    const url = withPropertyId(FRONT_DESK.SNAPSHOT, propertyId);

    return apiService.get(url, {
      params: {
        from,
        to,
      },
    });
  },
  fetchBookingContext: ({ propertyId, propertyRoomTypeId, from, to, roomsRequested }) => {
    if (!propertyId) {
      throw new Error("Property identifier is required to fetch the booking context");
    }

    if (!propertyRoomTypeId) {
      throw new Error("Property room type identifier is required to fetch the booking context");
    }

    if (!from || !to) {
      throw new Error("Both from and to dates are required to fetch the booking context");
    }

    const url = withPropertyRoomType(FRONT_DESK.BOOKING_CONTEXT, propertyId, propertyRoomTypeId);

    return apiService.get(url, {
      params: {
        from,
        to,
        roomsRequested,
      },
    });
  },
  createHold: ({
    propertyId,
    propertyRoomTypeId,
    roomIds,
    from,
    to,
    holdUntil,
    blockedBy,
    reason,
  }) => {
    if (!propertyId) {
      throw new Error("Property identifier is required to create a hold");
    }

    if (!propertyRoomTypeId) {
      throw new Error("Property room type identifier is required to create a hold");
    }

    if (!Array.isArray(roomIds) || roomIds.length === 0) {
      throw new Error("At least one room identifier is required to create a hold");
    }

    if (!from || !to) {
      throw new Error("Both from and to dates are required to create a hold");
    }

    const url = withPropertyId(FRONT_DESK.HOLDS, propertyId);

    return apiService.post(url, {
      propertyRoomTypeId,
      roomIds,
      from,
      to,
      holdUntil,
      blockedBy,
      reason,
    });
  },
  blockRoom: ({
    propertyId,
    propertyRoomTypeId,
    roomId,
    date,
    releaseAfterHours,
    reason,
    blockedBy,
  }) => {
    if (!propertyId) {
      throw new Error("Property identifier is required to block a room");
    }
    if (!propertyRoomTypeId) {
      throw new Error("Property room type identifier is required to block a room");
    }
    if (!roomId) {
      throw new Error("Room identifier is required to block a room");
    }
    if (!date) {
      throw new Error("Date is required to block a room");
    }
    const hours = Number(releaseAfterHours);
    if (!Number.isFinite(hours) || hours <= 0) {
      throw new Error("releaseAfterHours must be a positive number");
    }

    const url = withPropertyId(FRONT_DESK.BLOCKS, propertyId);

    return apiService.post(url, {
      propertyRoomTypeId,
      roomId,
      date,
      releaseAfterHours: hours,
      reason,
      blockedBy,
    });
  },
  releaseBlock: ({ propertyId, availabilityId }) => {
    if (!propertyId) {
      throw new Error("Property identifier is required to release a block");
    }
    if (!availabilityId) {
      throw new Error("Availability identifier is required to release a block");
    }

    const url = withAvailabilityId(FRONT_DESK.BLOCK_DETAIL, propertyId, availabilityId);
    return apiService.delete(url);
  },
  markMaintenance: ({ propertyId, propertyRoomTypeId, roomId, date, reason, blockedBy }) => {
    if (!propertyId) {
      throw new Error("Property identifier is required to mark maintenance");
    }
    if (!propertyRoomTypeId) {
      throw new Error("Property room type identifier is required to mark maintenance");
    }
    if (!roomId) {
      throw new Error("Room identifier is required to mark maintenance");
    }
    if (!date) {
      throw new Error("Date is required to mark maintenance");
    }

    const url = withPropertyId(FRONT_DESK.MAINTENANCE, propertyId);

    return apiService.post(url, {
      propertyRoomTypeId,
      roomId,
      date,
      reason,
      blockedBy,
    });
  },
  releaseMaintenance: ({ propertyId, availabilityId }) => {
    if (!propertyId) {
      throw new Error("Property identifier is required to release maintenance");
    }
    if (!availabilityId) {
      throw new Error("Availability identifier is required to release maintenance");
    }

    const url = withAvailabilityId(FRONT_DESK.MAINTENANCE_DETAIL, propertyId, availabilityId);
    return apiService.delete(url);
  },
  markOutOfService: ({ propertyId, propertyRoomTypeId, roomId, date, reason, blockedBy }) => {
    if (!propertyId) {
      throw new Error("Property identifier is required to mark out of service");
    }
    if (!propertyRoomTypeId) {
      throw new Error("Property room type identifier is required to mark out of service");
    }
    if (!roomId) {
      throw new Error("Room identifier is required to mark out of service");
    }
    if (!date) {
      throw new Error("Date is required to mark out of service");
    }

    const url = withPropertyId(FRONT_DESK.OUT_OF_SERVICE, propertyId);

    return apiService.post(url, {
      propertyRoomTypeId,
      roomId,
      date,
      reason,
      blockedBy,
    });
  },
  releaseOutOfService: ({ propertyId, availabilityId }) => {
    if (!propertyId) {
      throw new Error("Property identifier is required to release out of service status");
    }
    if (!availabilityId) {
      throw new Error("Availability identifier is required to release out of service status");
    }

    const url = withAvailabilityId(FRONT_DESK.OUT_OF_SERVICE_DETAIL, propertyId, availabilityId);
    return apiService.delete(url);
  },
};

export default frontdeskCommon;
