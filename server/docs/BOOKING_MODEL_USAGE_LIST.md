# Booking Model Usage - Complete List

This document lists all places where the `Booking` model is used in the codebase. After introducing `BookingRoomSelection` model, these locations need to be updated to handle multiple room types per booking.

---

## 📋 **BACKEND CONTROLLERS**

### 1. **`server/src/controllers/getAllbookings/getAllBookings.controller.js`**
   - **Status**: ⚠️ **NEEDS UPDATE**
   - **Usage**: 
     - Fetches all bookings for admin/agent/host/user roles (line 184)
     - Includes `property`, `propertyRoomType`, `order`
     - **MISSING**: `bookingRoomSelections` in include
   - **Current Issue**: Only returns primary room type (`propertyRoomType`), not all room types from `bookingRoomSelections`
   - **Update Required**: 
     - Add `bookingRoomSelections` with `roomType` and `mealPlan` relations
     - Return all room types per booking

---

### 2. **`server/src/controllers/booking_cancellation/bookingCancellation.controller.js`**
   - **Status**: ✅ **PARTIALLY UPDATED**
   - **Usage**: 
     - Cancels bookings (line 115, 192)
     - Extracts room IDs from bookings (line 58-69)
     - Updates booking status and refund info
   - **Current Status**: 
     - ✅ Already uses `bookingRoomSelections` for room extraction (line 63-69)
     - ✅ Includes `bookingRoomSelections: true` in queries (line 205)
   - **Update Required**: 
     - ✅ Already correct - uses `bookingRoomSelections`

---

### 3. **`server/src/controllers/userController/payment.controller.js`**
   - **Status**: ✅ **FULLY UPDATED**
   - **Usage**: 
     - Creates bookings on payment verification (line 876-964)
     - Checks existing bookings for idempotency (line 682-729)
   - **Current Status**: 
     - ✅ Creates `BookingRoomSelection` records (line 911-932)
     - ✅ Includes `bookingRoomSelections` in queries (line 582, 685, 716)
   - **Update Required**: 
     - ✅ Already correct

---

### 4. **`server/src/controllers/PaymentController/payments.controller.js`**
   - **Status**: ⚠️ **NEEDS UPDATE**
   - **Usage**: 
     - Fetches payments with booking info (line 65)
     - Displays customer info from booking (line 89-91, 221-223, 443-445)
     - Uses `booking.bookingNumber`, `booking.guestName`, `booking.guestEmail`, `booking.guestPhone`
   - **Current Issue**: Only accesses basic booking fields, not room selections
   - **Update Required**: 
     - Add `bookingRoomSelections` to include if room details are needed
     - **Note**: May not need update if only displaying basic booking info

---

### 5. **`server/src/controllers/GuestsController/guests.controller.js`**
   - **Status**: ⚠️ **MAY NEED UPDATE**
   - **Usage**: 
     - Fetches bookings to group by guest (line 25, 159)
     - Uses `booking.guestEmail`, `booking.guestPhone`, `booking.guestName`, `booking.propertyId`
   - **Current Issue**: Only uses guest and property info, not room details
   - **Update Required**: 
     - **May not need update** - only groups by guest info
     - If guest history needs room type details, add `bookingRoomSelections`

---

### 6. **`server/src/controllers/frontdeskController/frontdeskBooking.controller.js`**
   - **Status**: ⚠️ **NEEDS UPDATE**
   - **Usage**: 
     - Fetches bookings for frontdesk calendar view (line 152)
     - Uses `booking.roomId`, `booking.startDate`, `booking.endDate` for availability (line 198-214)
   - **Current Issue**: 
     - Only uses `booking.roomId` (single room per booking)
     - Needs to handle multiple rooms from `bookingRoomSelections`
   - **Update Required**: 
     - Query `bookingRoomSelections` to get all room IDs
     - Update availability calculation to use multiple room IDs

---

### 7. **`server/src/controllers/frontdeskController/frontdesk.controller.js`**
   - **Status**: ✅ **RESOLVED**
   - **Usage**: 
     - Fetches bookings for frontdesk dashboard calendar (line 121)
     - Uses `bookingRoomSelections` to handle multiple rooms per booking (line 135-142, 166-215)
   - **Resolution**: 
     - ✅ Query includes `bookingRoomSelections` with `roomIds`, `checkIn`, `checkOut` (line 135-142)
     - ✅ Iterates through `bookingRoomSelections` to process each room selection (line 180)
     - ✅ Parses `roomIds` from JSON array and marks each room as booked for date range (line 182-211)
     - ✅ Removed outdated `booking.roomId` check, now checks for `bookingRoomSelections` (line 171)
   - **Update Date**: Fixed to use `bookingRoomSelections` instead of single `booking.roomId`

---

### 8. **`server/src/controllers/frontdeskController/webhook.controller.js`**
   - **Status**: ✅ **RESOLVED**
   - **Usage**: 
     - Creates bookings when payment link is paid (line 65)
     - Now uses `BookingRoomSelection` model (line 196-380)
   - **Resolution**: 
     - ✅ Query includes `order.roomSelections` (OrderRoomSelection) (line 92-109)
     - ✅ Creates ONE booking per order (line 298-386)
     - ✅ Creates `BookingRoomSelection` records from `OrderRoomSelection` data (line 365-381)
     - ✅ Removed `roomSelections` JSON field usage - now uses relational `BookingRoomSelection`
     - ✅ Aggregates totals from all room selections (line 186-243)
     - ✅ Maps `datesToBlock` to `datesReserved` (line 221-237)
     - ✅ Converts pricing from paise to rupees for Decimal fields (line 253-255)
   - **Update Date**: Fixed to create one booking with BookingRoomSelection records

---

### 9. **`server/src/controllers/adminController/propertyUpdation.controller.js`**
   - **Status**: ✅ **RESOLVED**
   - **Usage**: 
     - Checks for active bookings before deleting room type (line 2014)
     - Now uses `BookingRoomSelection` to check if room type is in use (line 2014-2030)
   - **Resolution**: 
     - ✅ Updated to check `BookingRoomSelection` instead of `booking.propertyRoomTypeId`
     - ✅ Correctly identifies if room type is used in any active bookings
     - ✅ Provides booking number in error message for better debugging (line 2025)
   - **Update Date**: Fixed to use BookingRoomSelection for room type validation

---

## 🔧 **BACKEND UTILITIES**

### 10. **`server/src/utils/property.utils.js`**
   - **Status**: ✅ **RESOLVED**
   - **Usage**: 
     - Fetches bookings for availability calculation (line 235)
     - Now uses `bookingRoomSelections` to get all rooms per booking (line 235-256)
   - **Resolution**: 
     - ✅ Updated booking query to include `bookingRoomSelections` with `roomIds`, `checkIn`, `checkOut`, and `datesReserved`
     - ✅ Iterates through `bookingRoomSelections` to process each room selection (line 272-340)
     - ✅ Parses `roomIds` from JSON array and marks all rooms as unavailable for the date range
     - ✅ Uses `datesReserved` when available for accurate date tracking, falls back to `checkIn`/`checkOut`
     - ✅ Handles legacy bookings without `bookingRoomSelections` gracefully
   - **Update Date**: Fixed to use BookingRoomSelection for accurate room availability calculation

---

## 🎨 **FRONTEND SERVICES**

### 11. **`zomes_stay/src/services/property/admin/booking/bookingService.js`**
   - **Status**: ✅ **OK - API WRAPPER**
   - **Usage**: 
     - API service wrapper for booking endpoints
     - Calls backend API, doesn't directly use Booking model
   - **Update Required**: 
     - ✅ No change needed - just API wrapper

---

### 12. **`zomes_stay/src/services/property/user/bookingData.js`**
   - **Status**: ✅ **OK - API WRAPPER**
   - **Usage**: 
     - API service for fetching booking data
     - Calls backend API for property booking data
   - **Update Required**: 
     - ✅ No change needed - just API wrapper

---

## 🖥️ **FRONTEND UI COMPONENTS**

### 13. **`zomes_stay/src/pages/Agent/AgentDashboard.jsx`**
   - **Status**: ⚠️ **NEEDS UPDATE**
   - **Usage**: 
     - Displays bookings list in table/cards (line 728-882)
     - Maps booking data (line 106-127)
     - Shows `booking.propertyRoomType?.roomType?.name` (line 113)
   - **Current Issue**: 
     - Only displays primary room type (`propertyRoomType`)
     - Needs to display all room types from `bookingRoomSelections`
   - **Update Required**: 
     - Update `mapBookingData` to include `bookingRoomSelections`
     - Display multiple room types (e.g., "Deluxe (2), Suite (1)")
     - Show room details modal with all room selections

---

### 14. **`zomes_stay/src/pages/Host/HostAllBookings.jsx`**
   - **Status**: ⚠️ **NEEDS UPDATE**
   - **Usage**: 
     - Displays bookings for host
     - Similar structure to AgentDashboard
   - **Current Issue**: 
     - Likely only displays primary room type
   - **Update Required**: 
     - Similar to AgentDashboard - display multiple room types

---

### 15. **`zomes_stay/src/pages/Admin/AllBookings.jsx`**
   - **Status**: ⚠️ **NEEDS UPDATE**
   - **Usage**: 
     - Displays all bookings for admin
     - Uses mock data currently (line 3-67)
   - **Current Issue**: 
     - Using mock data, not real API
   - **Update Required**: 
     - Connect to real API
     - Display multiple room types per booking

---

### 16. **`zomes_stay/src/pages/BookingSuccess.jsx`**
   - **Status**: ✅ **OK - MINIMAL USAGE**
   - **Usage**: 
     - Displays booking confirmation
     - Shows `bookingDetails.bookingNumber` (line 71)
   - **Current Status**: Only displays booking number, no room details
   - **Update Required**: 
     - ✅ Already sufficient - minimal usage

---

### 17. **`zomes_stay/src/pages/BookingFailure.jsx`**
   - **Status**: ✅ **OK - NOT USED**
   - **Usage**: Not checked, but likely minimal
   - **Update Required**: 
     - Check if booking data is displayed

---

### 18. **`zomes_stay/src/components/shared/bookingList/bookingList.jsx`**
   - **Status**: ⚠️ **NEEDS CHECK**
   - **Usage**: 
     - Shared booking list component
   - Likely displays booking data
   - **Update Required**: 
     - Check component and update if needed

---

## 📊 **SUMMARY**

### ✅ **Already Updated (3)**
1. `bookingCancellation.controller.js` - Uses `bookingRoomSelections`
2. `payment.controller.js` - Creates `BookingRoomSelection` records
3. `propertyUpdation.controller.js` - Minimal usage, OK

### ⚠️ **Needs Update - High Priority (6)**
1. `getAllBookings.controller.js` - **CRITICAL** - Main booking list endpoint
2. `frontdeskBooking.controller.js` - **CRITICAL** - Frontdesk calendar
3. `frontdesk.controller.js` - **CRITICAL** - Frontdesk dashboard
4. `webhook.controller.js` - **CRITICAL** - Creates bookings from webhooks
5. `property.utils.js` - **CRITICAL** - Availability calculation
6. `AgentDashboard.jsx` - **CRITICAL** - Main UI for booking display

### ⚠️ **Needs Update - Medium Priority (3)**
7. `HostAllBookings.jsx` - Host booking list UI
8. `AllBookings.jsx` - Admin booking list UI
9. `payments.controller.js` - May need room details in payment list

### ✅ **OK - No Update Needed (5)**
10. `guests.controller.js` - Only uses guest info
11. `bookingService.js` - API wrapper
12. `bookingData.js` - API wrapper
13. `BookingSuccess.jsx` - Minimal usage
14. `bookingList.jsx` - Needs check

---

## 🎯 **PRIORITY ORDER FOR UPDATES**

### **Phase 1: Backend Core (Critical)**
1. `getAllBookings.controller.js` - Main booking list API
2. `property.utils.js` - Availability calculation
3. `frontdesk.controller.js` - Frontdesk dashboard
4. `frontdeskBooking.controller.js` - Frontdesk calendar
5. `webhook.controller.js` - Booking creation from webhooks

### **Phase 2: Frontend UI (Critical)**
6. `AgentDashboard.jsx` - Agent booking display
7. `HostAllBookings.jsx` - Host booking display
8. `AllBookings.jsx` - Admin booking display

### **Phase 3: Additional (Optional)**
9. `payments.controller.js` - Add room details if needed
10. `bookingList.jsx` - Shared component update

---

## 🔍 **KEY CHANGES NEEDED**

### **Backend Pattern:**
```javascript
// OLD
include: {
  propertyRoomType: { ... }
}

// NEW
include: {
  propertyRoomType: { ... }, // Keep for primary room type
  bookingRoomSelections: {
    include: {
      roomType: { ... },
      mealPlan: { ... }
    }
  }
}
```

### **Frontend Pattern:**
```javascript
// OLD
roomType: booking.propertyRoomType?.roomType?.name || 'N/A'

// NEW
roomTypes: booking.bookingRoomSelections?.map(rs => 
  `${rs.roomTypeName} (${rs.rooms})`
).join(', ') || booking.propertyRoomType?.roomType?.name || 'N/A'
```

---

**Last Updated**: 2025-01-15
**Status**: Ready for implementation

