# Booking Room Selection Analysis

## Current State

### Current Implementation (JSON Approach)
- **Booking.roomSelections** (JSON field) stores all room selections as an array
- When order succeeds, we copy data from `OrderRoomSelection[]` into `Booking.roomSelections` JSON
- Each room selection in JSON contains:
  - `roomTypeId`, `roomTypeName`
  - `mealPlanId`
  - `rooms[]` (array of room objects with `roomId`, `roomName`, `roomCode`)
  - `pricing` (basePrice, tax, totalPrice)
  - `guests` (adults, children, total)

### Order Structure
- **Order** has multiple **OrderRoomSelection** records (one per room type)
- **OrderRoomSelection** stores:
  - `roomTypeId`, `roomTypeName`
  - `roomIds` (JSON array)
  - `mealPlanId`
  - `rooms`, `guests`, `children`
  - `price`, `tax`, `totalPrice` (in paise)
  - `checkIn`, `checkOut`, `datesToBlock`

---

## Option 1: Keep JSON Approach (Current)

### How It Works
```javascript
// When order succeeds, we copy OrderRoomSelection data into Booking.roomSelections JSON
Booking {
  roomSelections: [
    {
      roomTypeId: "uuid",
      roomTypeName: "Deluxe Suite",
      mealPlanId: "uuid", // MAP for this room type
      rooms: [
        { roomId: "uuid", roomName: "101", roomCode: "R101" },
        { roomId: "uuid", roomName: "102", roomCode: "R102" }
      ],
      pricing: { basePrice: 15000, tax: 2700, totalPrice: 17700 },
      guests: { adults: 2, children: 1, total: 3 }
    },
    {
      roomTypeId: "uuid",
      roomTypeName: "Suite",
      mealPlanId: "uuid", // AP for this room type
      rooms: [
        { roomId: "uuid", roomName: "201", roomCode: "R201" },
        { roomId: "uuid", roomName: "202", roomCode: "R202" }
      ],
      pricing: { basePrice: 20000, tax: 3600, totalPrice: 23600 },
      guests: { adults: 2, children: 0, total: 2 }
    }
  ]
}
```

### Pros ✅
1. **Simple**: All data in one place, easy to read
2. **Flexible**: Can store any structure without schema changes
3. **Performance**: No additional joins needed when fetching booking
4. **Current Implementation**: Already working in production code
5. **Snapshot**: Perfect for historical data preservation

### Cons ❌
1. **Not Queryable**: Cannot query by room type or meal plan directly
   ```sql
   -- ❌ Cannot do: Find all bookings with MAP meal plan
   SELECT * FROM bookings WHERE roomSelections->>'$[*].mealPlanId' = 'uuid'
   -- This is complex and not indexed
   ```

2. **No Foreign Keys**: Cannot enforce referential integrity
   - If `mealPlanId` in JSON points to deleted meal plan, no validation

3. **No Relations**: Cannot use Prisma relations
   ```prisma
   // ❌ Cannot do this:
   booking.roomSelections.mealPlan // No relation available
   ```

4. **Manual Validation**: Must validate JSON structure in application code

5. **Reporting Complexity**: Hard to aggregate bookings by room type or meal plan

---

## Option 2: Create BookingRoomSelection Model (Relational Approach)

### Proposed Schema Structure
```prisma
model BookingRoomSelection {
  id              String   @id @default(uuid()) @db.Char(36)
  bookingId       String   @db.Char(36)
  
  // Room Type Information
  roomTypeId      String   @db.Char(36)
  roomTypeName    String   // Snapshot at booking time
  
  // Selected Rooms (can still use JSON for room details, or create separate table)
  roomIds         Json     // Array of room IDs: ["uuid1", "uuid2"]
  
  // Booking Configuration
  rooms           Int      // Number of rooms
  guests          Int      // Adults
  children        Int      @default(0)
  mealPlanId      String?  @db.Char(36) // Selected meal plan ID
  
  // Pricing Snapshot (at time of booking) - stored in rupees
  basePrice       Decimal  @db.Decimal(10, 2) // Base price
  tax             Decimal  @db.Decimal(10, 2) // Tax amount
  totalPrice      Decimal  @db.Decimal(10, 2) // Total (base + tax)
  
  // Dates
  checkIn         DateTime @db.Date
  checkOut        DateTime @db.Date
  datesReserved   Json     // Array of date strings (YYYY-MM-DD)
  
  // Timestamps
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  // Relations
  booking         Booking  @relation(fields: [bookingId], references: [id], onDelete: Cascade)
  roomType        PropertyRoomType @relation(fields: [roomTypeId], references: [id])
  mealPlan        MealPlan? @relation(fields: [mealPlanId], references: [id])
  
  @@index([bookingId])
  @@index([roomTypeId])
  @@index([mealPlanId])
  @@map("booking_room_selections")
}

model Booking {
  // ... existing fields ...
  roomSelections  BookingRoomSelection[] // Replace JSON with relations
}
```

### How It Works
```javascript
// When order succeeds, create BookingRoomSelection records
// Copy from OrderRoomSelection to BookingRoomSelection

Order {
  roomSelections: [
    OrderRoomSelection {
      roomTypeId: "deluxe-uuid",
      mealPlanId: "map-uuid",
      roomIds: ["room1", "room2"],
      // ... other fields
    },
    OrderRoomSelection {
      roomTypeId: "suite-uuid",
      mealPlanId: "ap-uuid",
      roomIds: ["room3", "room4"],
      // ... other fields
    }
  ]
}

// ↓ Copy to ↓

Booking {
  roomSelections: [
    BookingRoomSelection {
      roomTypeId: "deluxe-uuid",
      mealPlanId: "map-uuid",
      roomIds: ["room1", "room2"],
      // ... other fields
    },
    BookingRoomSelection {
      roomTypeId: "suite-uuid",
      mealPlanId: "ap-uuid",
      roomIds: ["room3", "room4"],
      // ... other fields
    }
  ]
}
```

### Pros ✅
1. **Queryable**: Can query bookings by room type or meal plan
   ```prisma
   // ✅ Can do:
   const bookings = await prisma.booking.findMany({
     where: {
       roomSelections: {
         some: {
           mealPlanId: "map-uuid"
         }
       }
     },
     include: {
       roomSelections: {
         include: {
           mealPlan: true,
           roomType: true
         }
       }
     }
   })
   ```

2. **Foreign Keys**: Enforces referential integrity
   - Cannot create booking with invalid `mealPlanId`
   - Cascade deletes work properly

3. **Relations**: Can use Prisma relations
   ```prisma
   // ✅ Can do:
   booking.roomSelections[0].mealPlan // Get meal plan details
   booking.roomSelections[0].roomType // Get room type details
   ```

4. **Reporting**: Easy to aggregate and analyze
   ```prisma
   // ✅ Find most booked meal plans:
   const mealPlanStats = await prisma.bookingRoomSelection.groupBy({
     by: ['mealPlanId'],
     _count: true,
     _sum: {
       totalPrice: true
     }
   })
   ```

5. **Consistency**: Same structure as `OrderRoomSelection`, easier to understand

6. **Indexing**: Can add indexes on `roomTypeId`, `mealPlanId` for fast queries

### Cons ❌
1. **More Complex**: Requires additional table and relationships
2. **More Queries**: Need joins when fetching booking (but Prisma handles this well)
3. **Migration Required**: Need to migrate existing JSON data
4. **Slightly More Storage**: Separate records vs. single JSON field

---

## Option 3: Hybrid Approach (Recommended)

### Keep JSON + Add Computed Relations

Keep `roomSelections` JSON for:
- **Quick access**: All data in one query
- **Snapshot**: Historical preservation
- **Simplicity**: No joins for basic booking display

Add helper functions/views for:
- **Reporting**: Query based on JSON content when needed
- **Validation**: Ensure JSON structure matches schema

### Implementation
```prisma
model Booking {
  // Keep existing JSON field
  roomSelections Json? // Primary storage
  
  // Add helper indexes (MySQL 5.7+ supports JSON indexes)
  // Or use application-level caching for queries
}
```

```javascript
// Helper functions for querying JSON
async function findBookingsByMealPlan(mealPlanId) {
  // Option 1: Query JSON directly (MySQL 5.7+)
  const bookings = await prisma.$queryRaw`
    SELECT * FROM bookings
    WHERE JSON_CONTAINS(roomSelections, JSON_OBJECT('mealPlanId', ${mealPlanId}))
  `;
  
  // Option 2: Fetch all and filter (for smaller datasets)
  const allBookings = await prisma.booking.findMany({
    where: { status: 'confirmed' }
  });
  return allBookings.filter(booking => {
    const selections = booking.roomSelections || [];
    return selections.some(rs => rs.mealPlanId === mealPlanId);
  });
}
```

---

## Recommendation: Use OrderRoomSelection Pattern ✅

### Best Approach: Create BookingRoomSelection Model

**Why?**
1. **Consistency**: Matches `OrderRoomSelection` structure (order → booking flow is natural)
2. **Queryability**: You asked "which roomtypes-rooms-mealplans is reserved" - this needs querying
3. **Payment Details**: Already have payment in Booking, room selections should be queryable too
4. **Production Standard**: Relational structure is better for complex queries and reporting
5. **Future-Proof**: Easier to add features like:
   - Partial cancellations (cancel one room type from booking)
   - Room-specific modifications
   - Meal plan changes per room type

### Migration Strategy
```javascript
// When order succeeds:
async function createBookingFromOrder(order) {
  // 1. Create Booking
  const booking = await prisma.booking.create({
    data: {
      bookingNumber: generateBookingNumber(),
      orderId: order.id,
      // ... other booking fields ...
    }
  });
  
  // 2. Copy OrderRoomSelection → BookingRoomSelection
  for (const orderSelection of order.roomSelections) {
    await prisma.bookingRoomSelection.create({
      data: {
        bookingId: booking.id,
        roomTypeId: orderSelection.roomTypeId,
        roomTypeName: orderSelection.roomTypeName,
        roomIds: orderSelection.roomIds, // JSON array
        rooms: orderSelection.rooms,
        guests: orderSelection.guests,
        children: orderSelection.children,
        mealPlanId: orderSelection.mealPlanId,
        basePrice: orderSelection.price / 100, // Convert from paise
        tax: orderSelection.tax / 100,
        totalPrice: orderSelection.totalPrice / 100,
        checkIn: orderSelection.checkIn,
        checkOut: orderSelection.checkOut,
        datesReserved: orderSelection.datesToBlock
      }
    });
  }
  
  return booking;
}
```

### What to Store in BookingRoomSelection

**Essential Fields:**
- ✅ `bookingId` - Link to booking
- ✅ `roomTypeId` + `roomTypeName` - Which room type
- ✅ `roomIds` (JSON) - Which specific rooms reserved
- ✅ `mealPlanId` - Which meal plan for this room type
- ✅ `rooms`, `guests`, `children` - Guest configuration
- ✅ `basePrice`, `tax`, `totalPrice` - Pricing snapshot
- ✅ `checkIn`, `checkOut` - Booking dates
- ✅ `datesReserved` (JSON) - Specific dates blocked

**Optional but Recommended:**
- ✅ Foreign key to `PropertyRoomType` (for relations)
- ✅ Foreign key to `MealPlan` (for relations)
- ✅ Indexes on `roomTypeId`, `mealPlanId`, `bookingId`

---

## Answer to Your Question

> **"Can I use OrderRoomSelection in bookings if order gets success?"**

### Option A: Direct Reuse (Not Recommended ❌)
- Cannot directly use `OrderRoomSelection` for bookings
- Order and Booking are separate entities (one-to-one now)
- Order can be deleted/expired, but booking must persist
- Need independent storage for bookings

### Option B: Copy Pattern (Recommended ✅)
- **YES**, you can and **SHOULD** use the same structure
- Create `BookingRoomSelection` model (similar to `OrderRoomSelection`)
- When order succeeds → Copy `OrderRoomSelection` data → Create `BookingRoomSelection` records
- This gives you:
  - ✅ Queryable room selections in bookings
  - ✅ Same structure as orders (easy to understand)
  - ✅ Independent persistence (bookings survive order cleanup)

---

## Summary

| Feature | JSON Approach | Relational Approach |
|---------|--------------|---------------------|
| **Simplicity** | ✅ Simple | ❌ More complex |
| **Queryability** | ❌ Hard to query | ✅ Easy queries |
| **Reporting** | ❌ Difficult | ✅ Easy aggregation |
| **Relations** | ❌ No FK | ✅ Full relations |
| **Performance** | ✅ Fast read | ✅ Good (with indexes) |
| **Maintenance** | ❌ Manual validation | ✅ DB enforces |
| **Consistency** | ⚠️ Custom structure | ✅ Matches Order pattern |

### Final Recommendation: **Use BookingRoomSelection Model**

For a production booking system where you need to:
- ✅ See which room types are reserved
- ✅ See which rooms are reserved
- ✅ See which meal plans are reserved
- ✅ Query and report on bookings
- ✅ Maintain data integrity

**The relational approach (BookingRoomSelection) is the production standard.**

