/*
  bookingCapacityPricing.js

  Production-grade capacity validation, distribution, and pricing for hotel rooms.

  Key features:
  - Validates total capacity: base occupancy + extra bed capacity across selected rooms
  - Distributes adults/children/infants across rooms respecting per-room Occupancy (O) and extraBedCapacity (E)
  - Computes extra beds required per room and ensures feasibility (distributability)
  - Calculates per-room pricing with single occupancy rules and separate extra-bed prices for adult/child/infant
  - Provides clear errors/warnings and suggestions (e.g., min rooms needed)

  Policy assumptions (document and align with product):
  - Adults always require a bed.
  - Children/infants can be split into two categories:
    * with bed: require a bed, can go into base slots or extra-bed slots
    * without bed: do NOT require a bed and do not consume capacity
  - Single occupancy price applies only when: exactly 1 adult and no bed-requiring kids/infants in that room.
  - If single occupancy price is missing, fallback to basePrice.
  - Base price covers up to Occupancy (O) persons (adults/kids with bed/infants with bed combined). Beyond O, every additional bed-requiring person consumes an extra bed and incurs extra-bed price by category.

  Data model expected for rooms:
  rooms: Array<{
    id: string | number,
    roomTypeId?: string | number,
    occupancy: number,              // Occupancy (O)
    extraBedCapacity: number,       // Extra bed capacity (E)
    basePrice: number,
    singleOccupancyPrice?: number,
    extraBedPriceAdult?: number,
    extraBedPriceChild?: number,
    extraBedPriceInfant?: number
  }>

  party: {
    adults: number,
    childrenBed?: number,     // children requiring bed
    childrenNoBed?: number,   // children sharing existing bed
    infantsBed?: number,      // infants requiring bed (rare, but supported)
    infantsNoBed?: number     // infants sharing bed
  }

  Notes:
  - All numbers are expected to be integers >= 0.
  - Pricing returns totals for all nights combined.
*/

/**
 * Clamp a number to [min, max].
 */
function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

/**
 * Sum helper.
 */
function sum(arr) {
  return arr.reduce((a, b) => a + b, 0);
}

/**
 * Validate basic input integrity.
 */
function validateInputs(rooms, party, nights) {
  const errors = [];
  if (!Array.isArray(rooms) || rooms.length === 0) {
    errors.push("No rooms selected.");
  }
  const adults = party.adults ?? 0;
  const childrenBed = party.childrenBed ?? 0;
  const childrenNoBed = party.childrenNoBed ?? 0;
  const infantsBed = party.infantsBed ?? 0;
  const infantsNoBed = party.infantsNoBed ?? 0;

  const negs = [adults, childrenBed, childrenNoBed, infantsBed, infantsNoBed, nights].some(
    (x) => typeof x !== 'number' || x < 0 || !Number.isFinite(x)
  );
  if (negs) errors.push("Invalid negative or non-numeric inputs.");
  if (adults === 0) errors.push("At least one adult is required.");
  if (!Number.isInteger(nights) || nights <= 0) errors.push("Nights must be a positive integer.");

  // Validate rooms properties
  rooms.forEach((r, i) => {
    if ((r.occupancy ?? -1) < 0 || (r.extraBedCapacity ?? -1) < 0) {
      errors.push(`Room[${i}] has invalid occupancy or extraBedCapacity.`);
    }
    if ((r.basePrice ?? -1) < 0) errors.push(`Room[${i}] has invalid basePrice.`);
  });

  return errors;
}

/**
 * Distribute bed-requiring people (adults, childrenBed, infantsBed) across rooms.
 * Strategy: fill base slots first (up to O), then extra bed slots (up to E) per room.
 * Adults prioritized into base slots to maximize chance for single occupancy pricing in some rooms.
 */
function distributeRequiringBeds(rooms, party) {
  // Deep clone mutable counters
  let remainingAdults = party.adults ?? 0;
  let remainingChildrenBed = party.childrenBed ?? 0;
  let remainingInfantsBed = party.infantsBed ?? 0;

  const assignments = rooms.map((r) => ({
    roomId: r.id,
    roomTypeId: r.roomTypeId,
    occupancy: r.occupancy,
    extraBedCapacity: r.extraBedCapacity,
    // Base slot allocations
    base: { adults: 0, childrenBed: 0, infantsBed: 0 },
    // Extra bed slot allocations
    extra: { adults: 0, childrenBed: 0, infantsBed: 0 },
    // Bedless do not consume slots
    noBed: { childrenNoBed: 0, infantsNoBed: 0 },
  }));

  // Helper to allocate into base slots
  function fillBase(assign, count, key) {
    if (count <= 0) return 0;
    const freeBase = assign.occupancy - (assign.base.adults + assign.base.childrenBed + assign.base.infantsBed);
    const take = clamp(count, 0, freeBase);
    assign.base[key] += take;
    return take;
  }

  // Helper to allocate into extra slots
  function fillExtra(assign, count, key) {
    if (count <= 0) return 0;
    const freeExtra = assign.extraBedCapacity - (assign.extra.adults + assign.extra.childrenBed + assign.extra.infantsBed);
    const take = clamp(count, 0, freeExtra);
    assign.extra[key] += take;
    return take;
  }

  // 1) Base allocation pass across rooms: prioritize adults, then childrenBed, then infantsBed
  for (const a of assignments) {
    let t = fillBase(a, remainingAdults, 'adults');
    remainingAdults -= t;
    t = fillBase(a, remainingChildrenBed, 'childrenBed');
    remainingChildrenBed -= t;
    t = fillBase(a, remainingInfantsBed, 'infantsBed');
    remainingInfantsBed -= t;
  }

  // 2) Extra bed allocation pass across rooms: same priority
  for (const a of assignments) {
    let t = fillExtra(a, remainingAdults, 'adults');
    remainingAdults -= t;
    t = fillExtra(a, remainingChildrenBed, 'childrenBed');
    remainingChildrenBed -= t;
    t = fillExtra(a, remainingInfantsBed, 'infantsBed');
    remainingInfantsBed -= t;
  }

  const remaining = {
    adults: remainingAdults,
    childrenBed: remainingChildrenBed,
    infantsBed: remainingInfantsBed,
  };

  return { assignments, remaining };
}

/**
 * Attach bedless party (no capacity consumption) to the first room by default (or distribute evenly if needed).
 * For simplicity, attach all to the first room; consumers can spread if they need UI display per room.
 */
function attachBedless(assignments, party) {
  if (assignments.length === 0) return;
  assignments[0].noBed.childrenNoBed = party.childrenNoBed ?? 0;
  assignments[0].noBed.infantsNoBed = party.infantsNoBed ?? 0;
}

/**
 * Calculate per-room total for all nights.
 */
function priceRoomAllNights(room, assign, nights) {
  const O = room.occupancy;
  const base = room.basePrice ?? 0;
  const single = room.singleOccupancyPrice ?? room.singleoccupancyprice ?? base;
  const pAdult = room.extraBedPriceAdult ?? room.extraBedPrice ?? 0;
  const pChild = room.extraBedPriceChild ?? 0;
  const pInfant = room.extraBedPriceInfant ?? 0;

  const baseUsed = assign.base.adults + assign.base.childrenBed + assign.base.infantsBed;
  const extraAdults = assign.extra.adults;
  const extraChild = assign.extra.childrenBed;
  const extraInfant = assign.extra.infantsBed;

  // Single occupancy rule: exactly 1 adult and zero bed-requiring kids/infants in this room
  const isSingle = assign.base.adults === 1 && baseUsed === 1 && extraAdults === 0 && extraChild === 0 && extraInfant === 0;

  let perNight = isSingle ? single : base;
  perNight += pAdult * extraAdults + pChild * extraChild + pInfant * extraInfant;

  return {
    perNight,
    total: perNight * nights,
    isSingle,
  };
}

/**
 * Compute totals and detailed breakdown.
 */
function computeTotals(rooms, assignments, nights) {
  const perRoom = assignments.map((a) => {
    const room = rooms.find((r) => r.id === a.roomId) || {};
    const price = priceRoomAllNights(room, a, nights);
    return {
      roomId: a.roomId,
      roomTypeId: a.roomTypeId,
      baseAllocated: a.base,
      extraAllocated: a.extra,
      noBed: a.noBed,
      perNight: price.perNight,
      total: price.total,
      isSingle: price.isSingle,
    };
  });
  const grandTotal = perRoom.reduce((acc, r) => acc + r.total, 0);
  return { perRoom, grandTotal };
}

/**
 * Suggest min rooms needed (homogeneous room capacity) if current selection insufficient.
 */
function suggestMinRoomsNeeded(party, roomCapacityPerRoom) {
  const needingBed = (party.adults ?? 0) + (party.childrenBed ?? 0) + (party.infantsBed ?? 0);
  if (roomCapacityPerRoom <= 0) return null;
  return Math.ceil(needingBed / roomCapacityPerRoom);
}

/**
 * Entry point: validate, distribute, and price.
 *
 * @param {{
 *   rooms: Array<{
 *     id: string|number,
 *     roomTypeId?: string|number,
 *     occupancy: number,
 *     extraBedCapacity: number,
 *     basePrice: number,
 *     singleOccupancyPrice?: number,
 *     singleoccupancyprice?: number,
 *     extraBedPriceAdult?: number,
 *     extraBedPriceChild?: number,
 *     extraBedPriceInfant?: number,
 *   }>,
 *   party: {
 *     adults: number,
 *     childrenBed?: number,
 *     childrenNoBed?: number,
 *     infantsBed?: number,
 *     infantsNoBed?: number,
 *   },
 *   nights: number,
 * }} params
 *
 * @returns {{
 *   ok: boolean,
 *   errors: string[],
 *   warnings: string[],
 *   assignment: any[] | null,
 *   totals: { perRoom: any[], grandTotal: number } | null,
 *   suggestions: { minRoomsNeeded?: number } | null,
 * }}
 */
export function validateAndPriceBooking(params) {
  const { rooms = [], party = {}, nights = 1 } = params || {};
  const errors = validateInputs(rooms, party, nights);
  const warnings = [];

  if (errors.length) {
    return { ok: false, errors, warnings, assignment: null, totals: null, suggestions: null };
  }

  // Aggregate capacities
  const totalBase = sum(rooms.map((r) => r.occupancy || 0));
  const totalExtra = sum(rooms.map((r) => r.extraBedCapacity || 0));

  const needBed = (party.adults ?? 0) + (party.childrenBed ?? 0) + (party.infantsBed ?? 0);

  // Quick capacity checks
  if (needBed > totalBase + totalExtra) {
    const perRoomCapacity = rooms.length > 0 ? Math.max(...rooms.map((r) => (r.occupancy || 0) + (r.extraBedCapacity || 0))) : 0;
    return {
      ok: false,
      errors: [
        `Selected rooms can host up to ${totalBase + totalExtra} bed-requiring guests, but ${needBed} provided.`,
      ],
      warnings,
      assignment: null,
      totals: null,
      suggestions: { minRoomsNeeded: suggestMinRoomsNeeded(party, perRoomCapacity) || undefined },
    };
  }

  // Distribute requiring-bed party across rooms (base first, then extra)
  const { assignments, remaining } = distributeRequiringBeds(rooms, party);

  if (remaining.adults > 0 || remaining.childrenBed > 0 || remaining.infantsBed > 0) {
    // Not distributable across rooms even though total capacity might be sufficient (should be rare with this strategy)
    return {
      ok: false,
      errors: [
        `Unable to distribute all bed-requiring guests across selected rooms within per-room limits. Remaining: ` +
          `${remaining.adults} adults, ${remaining.childrenBed} children with bed, ${remaining.infantsBed} infants with bed.`,
      ],
      warnings,
      assignment: assignments,
      totals: null,
      suggestions: null,
    };
  }

  // Attach bedless party for reference
  attachBedless(assignments, party);

  // Compute totals
  const totals = computeTotals(rooms, assignments, nights);

  // Additional warnings
  // Example: too many bedless kids for comfort (optional business rule)
  if ((party.childrenNoBed ?? 0) + (party.infantsNoBed ?? 0) > 2 * rooms.length) {
    warnings.push("High number of bed-sharing children/infants relative to rooms selected.");
  }

  return {
    ok: true,
    errors: [],
    warnings,
    assignment: assignments,
    totals,
    suggestions: {},
  };
}

/**
 * Convenience helper to prebuild rooms input from a UI selection list.
 * Accepts your selectedRooms array shape and maps it to the expected format.
 */
export function mapSelectedRoomsToPricingInput(selectedRooms) {
  return (selectedRooms || []).map((r) => ({
    id: r.roomId || r.id,
    roomTypeId: r.roomTypeId,
    occupancy: r.maxOccupancy ?? r.occupancy ?? r.Occupancy ?? 0,
    extraBedCapacity: r.extraBedCapacity ?? 0,
    basePrice: Number(r.basePrice ?? 0),
    singleOccupancyPrice: r.singleOccupancyPrice ?? r.singleoccupancyprice ?? undefined,
    extraBedPriceAdult: r.extraBedPriceAdult ?? r.extraBedPrice ?? 0,
    extraBedPriceChild: r.extraBedPriceChild ?? 0,
    extraBedPriceInfant: r.extraBedPriceInfant ?? 0,
  }));
}

/**
 * Price meal plans per room and return totals for all nights.
 *
 * Expected shape of mealPricingByRoomType:
 * {
 *   [roomTypeId]: {
 *     plans: {
 *       [planId]: {
 *         mode: 'delta' | 'absolute',   // delta: add-on vs included base; absolute: full per-person price
 *         adult: number,                // per-night per-adult amount (delta or absolute)
 *         child: number,                // per-night per-child amount (delta or absolute)
 *         name?: string,
 *         description?: string,
 *       }
 *     },
 *   }
 * }
 */
export function priceMealPlans({ assignments = [], rooms = [], mealSelections = {}, mealPricingByRoomType = {}, nights = 1, infantMealPolicy = 'child', }) {
  const perRoom = [];
  let totalMeals = 0;

  const num = (v) => (typeof v === 'number' && isFinite(v) ? v : 0);

  for (const a of assignments) {
    const selPlanId = mealSelections[a.roomId];
    if (!selPlanId) {
      perRoom.push({ roomId: a.roomId, total: 0 });
      continue;
    }
    const rtPricing = mealPricingByRoomType[a.roomTypeId] || {};
    const planConf = rtPricing.plans?.[selPlanId] || null;
    if (!planConf) {
      perRoom.push({ roomId: a.roomId, total: 0 });
      continue;
    }

    const adults = num(a.base.adults) + num(a.extra.adults);
    const kids = num(a.base.childrenBed) + num(a.extra.childrenBed);
    const infBeds = num(a.base.infantsBed) + num(a.extra.infantsBed);

    const perAdult = num(planConf.adult);
    const perChild = num(planConf.child);
    const perInfant = infantMealPolicy === 'child' ? perChild : 0;

    const perNight = (adults * perAdult) + (kids * perChild) + (infBeds * perInfant);
    const total = perNight * (Number.isInteger(nights) ? nights : 1);

    perRoom.push({ roomId: a.roomId, total });
    totalMeals += total;
  }

  return { perRoom, totalMeals };
}

/**
 * Combine bed totals with meal totals.
 */
export function combineTotalsWithMeals(bedTotals, mealTotals) {
  const bed = bedTotals || { perRoom: [], grandTotal: 0 };
  const meals = mealTotals || { perRoom: [], totalMeals: 0 };

  const perRoomMap = new Map();
  bed.perRoom.forEach((r) => perRoomMap.set(r.roomId, { ...r }));
  meals.perRoom.forEach((m) => {
    const existing = perRoomMap.get(m.roomId) || { roomId: m.roomId, total: 0 };
    existing.mealsTotal = (existing.mealsTotal || 0) + (m.total || 0);
    existing.totalWithMeals = (existing.total || 0) + (existing.mealsTotal || 0);
    perRoomMap.set(m.roomId, existing);
  });

  // Ensure totals for rooms without meals are still represented
  bed.perRoom.forEach((r) => {
    const existing = perRoomMap.get(r.roomId) || { ...r };
    existing.mealsTotal = existing.mealsTotal || 0;
    existing.totalWithMeals = (existing.total || 0) + existing.mealsTotal;
    perRoomMap.set(r.roomId, existing);
  });

  const perRoom = Array.from(perRoomMap.values());
  const grandTotal = (bed.grandTotal || 0) + (meals.totalMeals || 0);
  return { perRoom, grandTotal };
}
