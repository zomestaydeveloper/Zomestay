 Feature Implementation Plan

## Overview
This document outlines the implementation plan for three new features:
1. **Refund Amount Display** - Show refund amount when cancellation gets approved
2. **Cash Booking Functionality** - Add cash booking feature in front desk
3. **Booking Status Auto-Update** - Change booking status from "confirmed" to "completed" after checkout

---

## Feature 1: Show Refund Amount When Cancellation Gets Approved

### Current State
- Cancellation approval exists in `cancellationRequest.controller.js` (`approveCancellationRequest`)
- Refund calculation logic exists in `bookingCancellation.controller.js` (`buildRefundEvaluation`)
- Currently, refund amount is calculated but not returned in cancellation request approval response
- Line 300 in `cancellationRequest.controller.js` shows: `const refundAmount = booking.totalAmount; // Full refund for now` (hardcoded)

### Required Changes

#### Backend Changes

**1. Update `approveCancellationRequest` function**
   - **File**: `server/src/controllers/cancellationRequest/cancellationRequest.controller.js`
   - **Location**: Lines 890-1023
   - **Changes**:
     - Import refund calculation utility from `bookingCancellation.controller.js`
     - Calculate actual refund amount using cancellation policy rules
     - Include refund details in response
     - Store refund amount in `CancellationRequest` model (if field exists) or return in response

**2. Add refund calculation to approval flow**
   - **File**: `server/src/controllers/cancellationRequest/cancellationRequest.controller.js`
   - **Changes**:
     - Before updating cancellation request status, calculate refund using `buildRefundEvaluation`
     - Get cancellation policy rules (already fetched in line 915)
     - Calculate: `refundEligibleAmount`, `refundPercentage`, `daysNotice`
     - Update booking with refund details (similar to `cancelBooking` function)

**3. Update response structure**
   - **File**: `server/src/controllers/cancellationRequest/cancellationRequest.controller.js`
   - **Location**: Lines 1000-1013
   - **Changes**:
     - Add `refund` object to response:
       ```javascript
       refund: {
         eligibleAmount: refundEvaluation.eligibleAmount,
         percentage: refundEvaluation.percentage,
         daysNotice: refundEvaluation.daysNotice,
         refundedAmount: booking.refundedAmount,
         status: booking.paymentStatus
       }
       ```

**4. Update notification functions**
   - **File**: `server/src/controllers/cancellationRequest/cancellationRequest.controller.js`
   - **Location**: Lines 298-375 (`sendRequestApprovedNotifications`)
   - **Changes**:
     - Replace hardcoded `refundAmount` (line 300) with actual calculated refund
     - Pass refund details to email/SMS templates

**5. Update database queries**
   - **File**: `server/src/controllers/cancellationRequest/cancellationRequest.controller.js`
   - **Changes**:
     - Include `refundEligibleAmount`, `refundPercentage`, `refundedAmount` in booking select queries
     - Include cancellation policy rules in booking include queries

#### Frontend Changes

**1. Update Cancellation Request Details Page**
   - **Files**: 
     - `zomes_stay/src/pages/Admin/CancellationRequests.jsx` (if exists)
     - Any component displaying cancellation request details
   - **Changes**:
     - Display refund amount section when status is "approved"
     - Show: Eligible Amount, Refund Percentage, Days Notice, Refund Status
     - Format currency properly

**2. Update API Response Handling**
   - **Files**: Services handling cancellation requests
   - **Changes**:
     - Update TypeScript/PropTypes to include refund object
     - Handle refund data in response

**3. Update Email/SMS Templates** (if needed)
   - **Files**: Email/SMS template files
   - **Changes**:
     - Update templates to display calculated refund amount instead of hardcoded value

### Database Changes
- **No schema changes needed** - Refund fields already exist in `Booking` model:
  - `refundEligibleAmount`
  - `refundPercentage`
  - `refundedAmount`
  - `paymentStatus`

### Testing Checklist
- [ ] Test cancellation approval with different cancellation policies
- [ ] Verify refund calculation matches policy rules
- [ ] Test with bookings that have no cancellation policy
- [ ] Verify refund amount appears in admin cancellation request view
- [ ] Verify refund amount appears in user/agent cancellation request view
- [ ] Test email/SMS notifications contain correct refund amount

---

## Feature 2: Cash Booking Functionality in Front Desk

### Current State
- Front desk booking context exists (`frontdeskBooking.controller.js`)
- Front desk holds exist (`createHold` function)
- No direct booking creation endpoint for cash bookings
- Bookings are typically created through payment flow (`payment.controller.js`)

### Required Changes

#### Backend Changes

**1. Create Cash Booking Endpoint**
   - **File**: `server/src/controllers/frontdeskController/frontdeskBooking.controller.js`
   - **New Function**: `createCashBooking`
   - **Location**: Add after `createHold` function (around line 675)
   - **Functionality**:
     - Accept booking details: guest info, dates, rooms, pricing
     - Create booking with `paymentStatus: 'PAID'` (cash payment)
     - Set `paymentMethod: 'cash'` in Payment record
     - Set `createdByType: 'admin'` or `'host'` based on user role
     - Set `createdById` to current user ID
     - Create `BookingRoomSelection` records
     - Create `Availability` records (mark rooms as booked)
     - Generate booking number
     - Set booking status to `confirmed`

**2. Add Route**
   - **File**: `server/src/routes/adminRoutes/frontdesk.routes.js`
   - **New Route**: `POST /properties/:propertyId/front-desk/cash-booking`
   - **Middleware**: 
     - `extractRole` middleware
     - `requireAdmin` or `requireHost` middleware
     - Property access check

**3. Request Body Structure**
   ```javascript
   {
     propertyRoomTypeId: string,
     roomIds: string[],
     guestName: string,
     guestEmail: string,
     guestPhone: string,
     guestAddress?: string,
     checkIn: string (YYYY-MM-DD),
     checkOut: string (YYYY-MM-DD),
     adults: number,
     children?: number,
     infants?: number,
     mealPlanId?: string,
     totalAmount: number,
     baseAmount: number,
     taxes?: number,
     discount?: number,
     specialRequests?: string,
     paymentMethod: 'cash' // Required
   }
   ```

**4. Create Payment Record**
   - **File**: `server/src/controllers/frontdeskController/frontdeskBooking.controller.js`
   - **Changes**:
     - After booking creation, create `Payment` record:
       ```javascript
       {
         bookingId: booking.id,
         amount: totalAmount,
         currency: 'INR',
         status: 'PAID',
         paymentMethod: 'cash',
         razorpayPaymentId: null, // No Razorpay for cash
         razorpayOrderId: null,
         razorpaySignature: null,
         paidAt: new Date(),
         createdByType: 'admin' | 'host',
         createdById: userId
       }
       ```

**5. Update Payment Model** (if needed)
   - **File**: `server/prisma/schema.prisma`
   - **Check**: If `paymentMethod` field exists in Payment model
   - **If not**: Add `paymentMethod String?` field

**6. Validation**
   - Validate room availability (similar to `createHold`)
   - Validate dates
   - Validate guest information
   - Validate pricing amounts
   - Check property access permissions

**7. Error Handling**
   - Handle room conflicts
   - Handle invalid dates
   - Handle missing required fields
   - Handle property access denied

#### Frontend Changes

**1. Create Cash Booking Form Component**
   - **File**: `zomes_stay/src/components/FrontDesk/CashBookingForm.jsx` (new)
   - **Features**:
     - Guest information form
     - Date selection (check-in/check-out)
     - Room selection
     - Meal plan selection
     - Pricing calculator
     - Payment method selector (cash)
     - Submit button

**2. Update Front Desk Page**
   - **Files**: 
     - `zomes_stay/src/pages/Admin/FrontDesk/AdminFrontDesk.jsx`
     - `zomes_stay/src/pages/Host/HostFrontDesk.jsx`
   - **Changes**:
     - Add "Create Cash Booking" button/modal
     - Integrate `CashBookingForm` component
     - Handle booking creation success/error

**3. Add API Service Method**
   - **File**: `zomes_stay/src/services/api/endpoints/hostAdminCommonEndpoints.js`
   - **New Method**:
     ```javascript
     CASH_BOOKING: {
       CREATE: (propertyId) => `/properties/${propertyId}/front-desk/cash-booking`
     }
     ```

**4. Update Booking List**
   - **Files**: Booking list components
   - **Changes**:
     - Display payment method (cash vs online)
     - Show "Cash" badge for cash bookings
     - Filter by payment method (optional)

### Database Changes

**1. Payment Model** (if `paymentMethod` doesn't exist)
   - **File**: `server/prisma/schema.prisma`
   - **Add**: `paymentMethod String?` field to Payment model
   - **Migration**: Create migration file

**2. Order Model** (if cash bookings need Order record)
   - **Decision**: Do cash bookings need Order records?
   - **If yes**: Create Order with `status: 'SUCCESS'` and `paymentMethod: 'cash'`
   - **If no**: Allow bookings without Order (set `orderId: null`)

### Testing Checklist
- [ ] Test cash booking creation with valid data
- [ ] Test room availability validation
- [ ] Test duplicate booking prevention
- [ ] Test property access permissions (admin vs host)
- [ ] Verify Payment record created correctly
- [ ] Verify Availability records created
- [ ] Verify BookingRoomSelection records created
- [ ] Test with different guest counts
- [ ] Test with/without meal plans
- [ ] Test error handling for invalid data
- [ ] Test frontend form validation
- [ ] Test booking appears in booking list

---

## Feature 3: Auto-Update Booking Status from "Confirmed" to "Completed"

### Current State
- Booking status enum: `pending`, `confirmed`, `cancelled`, `completed`
- Bookings are created with `status: 'confirmed'` (or `pending`)
- No automatic status update to `completed` after checkout
- Status update likely happens manually or not at all

### Required Changes

#### Backend Changes

**1. Create Scheduled Job/Function**
   - **File**: `server/src/services/booking/bookingStatus.service.js` (new)
   - **Function**: `updateCompletedBookings`
   - **Logic**:
     - Find all bookings where:
       - `status = 'confirmed'`
       - `endDate < today` (checkout date has passed)
       - `isDeleted = false`
     - Update status to `completed`
     - Set `completedAt` timestamp (if field exists)

**2. Add Scheduled Task**
   - **File**: `server/index.js` or `server/src/cron/bookingStatus.cron.js` (new)
   - **Options**:
     - **Option A**: Use `node-cron` package
       ```javascript
       cron.schedule('0 2 * * *', async () => {
         // Run daily at 2 AM
         await updateCompletedBookings();
       });
       ```
     - **Option B**: Use database trigger (PostgreSQL)
     - **Option C**: Manual endpoint for admin to trigger

**3. Add Manual Update Endpoint** (Optional but recommended)
   - **File**: `server/src/controllers/adminController/bookings.controller.js` or similar
   - **Route**: `PATCH /bookings/:id/complete`
   - **Functionality**:
     - Allow admin/host to manually mark booking as completed
     - Validate booking can be completed (endDate passed, status is confirmed)
     - Update status to `completed`

**4. Update Booking Model** (if `completedAt` doesn't exist)
   - **File**: `server/prisma/schema.prisma`
   - **Add**: `completedAt DateTime?` field to Booking model
   - **Migration**: Create migration file

**5. Update Booking Queries**
   - **Files**: All booking query files
   - **Changes**:
     - Include `completedAt` in select queries
     - Filter by `completedAt` if needed

**6. Add Webhook/Event Handler** (Alternative approach)
   - **File**: `server/src/services/payment/bookingCreation.service.js`
   - **Changes**:
     - After booking confirmation, schedule status update
     - Use `node-schedule` or similar to update status on `endDate`

#### Frontend Changes

**1. Update Booking Status Display**
   - **Files**: All components displaying booking status
   - **Changes**:
     - Add "Completed" status badge/style
     - Show `completedAt` date if available
     - Update status filters to include "completed"

**2. Add Manual Complete Button** (if manual endpoint added)
   - **Files**: Admin/Host booking detail pages
   - **Changes**:
     - Add "Mark as Completed" button
     - Show only if status is "confirmed" and endDate has passed
     - Call API endpoint to update status

**3. Update Booking Filters**
   - **Files**: Booking list components
   - **Changes**:
     - Add "Completed" filter option
     - Update status dropdowns

### Database Changes

**1. Booking Model** (if `completedAt` doesn't exist)
   - **File**: `server/prisma/schema.prisma`
   - **Add**: `completedAt DateTime?` field
   - **Migration**: Create migration

**2. Index** (for performance)
   - **File**: `server/prisma/schema.prisma`
   - **Add**: Index on `(status, endDate, isDeleted)` for faster queries

### Implementation Approaches

**Approach 1: Scheduled Cron Job** (Recommended)
- Run daily at 2 AM
- Update all bookings where `endDate < today` and `status = 'confirmed'`
- Pros: Automatic, no manual intervention
- Cons: Requires cron setup, slight delay

**Approach 2: Real-time Check on Booking Access**
- Check status when booking is accessed/viewed
- Update if `endDate` has passed
- Pros: Always up-to-date
- Cons: Extra query on every access

**Approach 3: Database Trigger** (PostgreSQL)
- Use database trigger to update on date change
- Pros: Database-level, always accurate
- Cons: Database-specific, harder to maintain

**Approach 4: Hybrid Approach** (Recommended)
- Scheduled job for bulk updates (daily)
- Real-time check on booking detail view (optional)
- Manual endpoint for immediate update

### Testing Checklist
- [ ] Test scheduled job updates bookings correctly
- [ ] Test with bookings that have passed endDate
- [ ] Test with bookings that haven't passed endDate
- [ ] Test manual completion endpoint
- [ ] Verify `completedAt` timestamp is set
- [ ] Test status filter includes "completed"
- [ ] Test booking detail page shows completed status
- [ ] Test edge cases (same day checkout, timezone issues)
- [ ] Test with cancelled bookings (should not update)
- [ ] Test performance with large number of bookings

---

## Implementation Priority

1. **Feature 1 (Refund Amount)** - High Priority
   - Quick win, improves user experience
   - Relatively straightforward implementation
   - Estimated: 4-6 hours

2. **Feature 3 (Auto-Complete)** - Medium Priority
   - Important for data accuracy
   - Requires cron setup
   - Estimated: 6-8 hours

3. **Feature 2 (Cash Booking)** - Medium-High Priority
   - Important for front desk operations
   - More complex, requires careful testing
   - Estimated: 8-12 hours

---

## Dependencies

- **node-cron** or **node-schedule** package (for Feature 3)
- No new database migrations needed (unless adding `completedAt` or `paymentMethod` fields)
- Existing cancellation policy logic (Feature 1)
- Existing front desk infrastructure (Feature 2)

---

## Notes

- All features should be implemented with proper error handling
- All features should include logging for debugging
- All features should be tested thoroughly before production deployment
- Consider adding audit logs for status changes
- Consider adding notifications for status changes (optional)


