/**
 * Occupancy calculation utilities for FrontDesk
 */

export const getOccupancyValue = (context) =>
  context?.roomType?.Occupancy ?? context?.roomType?.occupancy ?? 0;

export const getMinOccupancyValue = (context) => context?.roomType?.minOccupancy ?? 1;

export const getExtraCapacityValue = (context) => context?.roomType?.extraBedCapacity ?? 0;

export const adjustDraftForOccupancy = (draft, context) => {
  if (!draft) return draft;

  const selectedRoomIds = Array.isArray(draft.selectedRoomIds) ? draft.selectedRoomIds : [];
  const roomsCount = selectedRoomIds.length;
  const occupancy = getOccupancyValue(context);
  const extraCapacity = getExtraCapacityValue(context);
  const minOccupancy = getMinOccupancyValue(context);

  const normalizedAdults = Math.max(0, draft.adults ?? 0);
  const normalizedChildren = Math.max(0, draft.children ?? 0);
  const normalizedInfants = Math.max(0, draft.infants ?? 0);

  let adults = normalizedAdults;
  let children = normalizedChildren;
  let infants = normalizedInfants;

  if (!context) {
    if (
      adults === (draft.adults ?? 0) &&
      children === (draft.children ?? 0) &&
      infants === (draft.infants ?? 0)
    ) {
      return draft;
    }

    return {
      ...draft,
      adults,
      children,
      infants,
      selectedRoomIds,
    };
  }

  if (roomsCount === 0) {
    const minimum = Math.max(minOccupancy, 1);
    if (adults + children + infants === 0) {
      adults = minimum;
    }

    if (
      adults === normalizedAdults &&
      children === normalizedChildren &&
      infants === normalizedInfants
    ) {
      return draft;
    }

    return {
      ...draft,
      adults,
      children,
      infants,
      selectedRoomIds,
    };
  }

  const maxGuests = roomsCount * (occupancy + extraCapacity);
  const minGuests = roomsCount * minOccupancy;

  let totalGuests = adults + children + infants;

  if (totalGuests > maxGuests) {
    let overflow = totalGuests - maxGuests;

    const reduce = (type) => {
      while (overflow > 0) {
        if (type === "infant" && infants > 0) {
          infants -= 1;
          overflow -= 1;
        } else if (type === "child" && children > 0) {
          children -= 1;
          overflow -= 1;
        } else if (type === "adult" && adults > 0) {
          adults -= 1;
          overflow -= 1;
        } else {
          break;
        }
      }
    };

    reduce("infant");
    reduce("child");
    reduce("adult");
  }

  totalGuests = adults + children + infants;

  if (totalGuests < minGuests) {
    const deficit = minGuests - totalGuests;
    const potentialTotal = totalGuests + deficit;
    if (potentialTotal <= maxGuests) {
      adults += deficit;
    }
  }

  if (
    adults === normalizedAdults &&
    children === normalizedChildren &&
    infants === normalizedInfants
  ) {
    return draft;
  }

  return {
    ...draft,
    adults,
    children,
    infants,
    selectedRoomIds,
  };
};


