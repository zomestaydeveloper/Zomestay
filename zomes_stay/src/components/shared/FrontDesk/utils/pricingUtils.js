/**
 * Pricing calculation utilities for FrontDesk
 */

import { getOccupancyValue, getExtraCapacityValue } from './occupancyUtils';
import { calculateNights } from './dateUtils';
import { numberFrom } from './formatUtils';

export const DEFAULT_TAX_SLABS = [
  { min: 0, max: 999, rate: 0 },
  { min: 1000, max: 7499, rate: 5 },
  { min: 7500, max: Infinity, rate: 18 }
];


export const calculatePricingSummary = (bookingContext, bookingDraft) => {
  if (!bookingContext || !bookingDraft) return null;

  // PRODUCTION: Match by MealPlan.id (not PropertyRoomTypeMealPlan.id)
  // bookingDraft.mealPlanId contains MealPlan.id, but plan.id is PropertyRoomTypeMealPlan.id
  const mealPlan = (bookingContext.mealPlans || []).find(
    (plan) => plan.mealPlan?.id === bookingDraft.mealPlanId
  );
  if (!mealPlan) return null;

  const roomsSelected = bookingDraft.selectedRoomIds?.length || 0;
  if (roomsSelected === 0) {
    return null;
  }

  const occupancy = getOccupancyValue(bookingContext);
  const extraCapacity = getExtraCapacityValue(bookingContext);

  const nights = Math.max(
    bookingContext?.stay?.nights ?? calculateNights(bookingDraft.from, bookingDraft.to),
    1
  );

  const singleRate = numberFrom(mealPlan.pricing?.singleOccupancy);
  const doubleRate = numberFrom(mealPlan.pricing?.doubleOccupancy);
  const groupRate = numberFrom(mealPlan.pricing?.groupOccupancy);
  const extraAdultRate = numberFrom(mealPlan.pricing?.extraBedAdult);
  const extraChildRate = numberFrom(mealPlan.pricing?.extraBedChild);
  const extraInfantRate = numberFrom(mealPlan.pricing?.extraBedInfant);

  const adults = Math.max(0, bookingDraft.adults ?? 0);
  const children = Math.max(0, bookingDraft.children ?? 0);
  const infants = Math.max(0, bookingDraft.infants ?? 0);

  if (occupancy <= 0) {
    return {
      error: "Room occupancy details are unavailable for pricing.",
      total: 0,
      perRoomBreakdown: [],
      nights,
    };
  }

  const baseCapacity = occupancy * roomsSelected;
  let remainingBase = baseCapacity;

  const baseAdults = Math.min(adults, remainingBase);
  remainingBase -= baseAdults;
  const remainingAdults = adults - baseAdults;

  const baseChildren = Math.min(children, remainingBase);
  remainingBase -= baseChildren;
  const remainingChildren = children - baseChildren;

  const baseInfants = Math.min(infants, remainingBase);
  remainingBase -= baseInfants;
  const remainingInfants = infants - baseInfants;

  const extrasAdults = remainingAdults;
  const extrasChildren = remainingChildren;
  const extrasInfants = remainingInfants;
  const totalExtrasCount = extrasAdults + extrasChildren + extrasInfants;

  const maxExtraCapacity = roomsSelected * extraCapacity;
  if (totalExtrasCount > maxExtraCapacity) {
    return {
      error: `Not enough extra bed capacity for ${totalExtrasCount} additional guest(s).`,
      total: 0,
      perRoomBreakdown: [],
      nights,
    };
  }

  let basePerRoomPerNight = 0;
  if (occupancy > 2 && groupRate > 0) {
    basePerRoomPerNight = groupRate;
  } else if (occupancy >= 2 && doubleRate > 0) {
    basePerRoomPerNight = doubleRate;
  } else {
    basePerRoomPerNight = singleRate || doubleRate || groupRate;
  }

  if (!basePerRoomPerNight) {
    return {
      error: "Base pricing information is unavailable for the selected meal plan.",
      total: 0,
      perRoomBreakdown: [],
      nights,
    };
  }

  const extrasPerNight =
    extrasAdults * extraAdultRate +
    extrasChildren * extraChildRate +
    extrasInfants * extraInfantRate;

  const basePerNightTotal = basePerRoomPerNight * roomsSelected;
  const totalPerNight = basePerNightTotal + extrasPerNight;
  const totalBasePrice = totalPerNight * nights;

  // Build extra breakdown array first (before using it)
  const extraBreakdown = [];
  if (extrasAdults > 0) {
    extraBreakdown.push({
      type: "adult",
      count: extrasAdults,
      perNight: extraAdultRate,
    });
  }
  if (extrasChildren > 0) {
    extraBreakdown.push({
      type: "child",
      count: extrasChildren,
      perNight: extraChildRate,
    });
  }
  if (extrasInfants > 0) {
    extraBreakdown.push({
      type: "infant",
      count: extrasInfants,
      perNight: extraInfantRate,
    });
  }

  const taxSlabs =
    bookingContext?.property?.taxSlabs?.length
      ? bookingContext.property.taxSlabs
      : DEFAULT_TAX_SLABS;


  const getTaxPercentageFromSlabs = (amount, slabs) => {
    if (!amount || amount <= 0) return 0;

    const slab = slabs.find(s => {
      const min = s.min ?? 0;
      const max = s.max ?? Infinity;
      return amount >= min && amount <= max;
    });

    return slab?.rate || 0;
  };

  const calculateTaxFromSlabs = (amount, slabs) => {
    const rate = getTaxPercentageFromSlabs(amount, slabs);
    return (amount * rate) / 100;
  };

  // Calculate tax for each room and sum them
  let totalTax = 0;
  const perRoomBreakdown = Array.from({ length: roomsSelected }, (_, index) => {
    const isFirstRoom = index === 0;

    const perNight =
      basePerRoomPerNight + (isFirstRoom ? extrasPerNight : 0);

    const roomBasePrice = perNight * nights;
    const roomTax = calculateTaxFromSlabs(roomBasePrice, taxSlabs);
    const taxRate = getTaxPercentageFromSlabs(roomBasePrice, taxSlabs);

    totalTax += roomTax;

    return {
      roomIndex: index + 1,
      baseGuests: occupancy,
      basePerNight: basePerRoomPerNight,
      extras: isFirstRoom ? extraBreakdown : [],
      perNight,
      total: roomBasePrice,
      taxRate,
      tax: roomTax,
      totalWithTax: roomBasePrice + roomTax
    };
  });

  const total = totalBasePrice + totalTax;

  return {
    total,
    perRoomBreakdown,
    nights,
    extras: {
      adults: extrasAdults,
      children: extrasChildren,
      infants: extrasInfants,
    },
    basePerNightTotal,
    extrasPerNight,
    totalPerNight,
    totalBasePrice,
    totalTax,
  };
};


