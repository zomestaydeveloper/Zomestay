# Cash Payment Recording - Implementation Plan

## Overview
Enable front desk staff to record cash payments and create bookings directly without generating payment links. This allows for walk-in bookings and immediate cash transactions.

## Current Flow Analysis

### Existing Payment Link Flow:
1. User fills booking form → Creates hold → Sends payment link → Guest pays → Webhook creates booking
2. Uses `createPaymentLink` API which creates an Order and Razorpay payment link
3. Webhook handler (`payment_link.paid`) triggers `createBookingFromOrder` service

### Proposed Cash Payment Flow:
1. User fills booking form → Creates hold → Records cash payment → Booking created immediately
2. Direct booking creation with cash payment record
3. No external payment gateway involved

---

## Implementation Plan

### Phase 1: Backend API Development

#### 1.1 Create Cash Payment Booking Endpoint
**File:** `server/src/controllers/frontdeskController/cashPayment.controller.js`

**Endpoint:** `POST /api/admin/frontdesk/properties/:propertyId/bookings/cash`

**Request Payload:**
```javascript
{
  propertyRoomTypeId: string,
  booking: {
    from: string,              // YYYY-MM-DD
    to: string,                // YYYY-MM-DD
    adults: number,
    children: number,
    infants: number,
    totalGuests: number,
    notes: string,
    mealPlanId: string | null,
    selectedRoomIds: string[]
  },
  pricing: {
    total: number,             // Total amount in rupees
    nights: number,
    basePerNightTotal: number,
    extrasPerNight: number,
    totalPerNight: number,
    perRoomBreakdown: Array<{
      roomIndex: number,
      baseGuests: number,
      basePerNight: number,
      extras: Array<{type: string, count: number, perNight: number}>,
      perNight: number,
      total: number,
      tax: number,
      totalWithTax: number
    }>
  },
  hold: {
    recordIds: string[],       // Availability record IDs from hold
    holdUntil: string | null   // ISO datetime
  },
  guest: {
    fullName: string,          // Required for cash payment
    email: string,             // Required
    phone: string,             // Required (10 digits)
    address?: string           // Optional
  },
  payment: {
    amount: number,            // Cash amount received (in rupees)
    receivedBy: string,        // Staff member who received payment
    paymentDate: string,       // ISO datetime (default: now)
    receiptNumber?: string     // Optional receipt number
  },
  createdBy: {
    type: string,              // "admin" | "host"
    id: string,
    label: string
  }
}
```

**Response:**
```javascript
{
  success: true,
  data: {
    booking: {
      id: string,
      bookingNumber: string,
      status: "CONFIRMED",
      // ... full booking details
    },
    payment: {
      id: string,
      transactionID: string,
      amount: number,
      status: "COMPLETED",
      paymentMethod: "CASH",
      // ... payment details
    },
    order: {
      id: string,
      status: "PAID",
      // ... order details (if needed)
    }
  },
  message: "Booking created successfully with cash payment"
}
```

#### 1.2 Service Layer
**File:** `server/src/services/frontdesk/cashBooking.service.js`

**Functions:**
- `createCashBooking(payload, propertyId, tx)` - Main service function
  - Validate hold records exist and are valid
  - Validate guest information (name, email, phone)
  - Validate payment amount matches pricing total
  - Create Order record (status: PAID, paymentMethod: CASH)
  - Create Booking record (status: CONFIRMED)
  - Create Payment record (status: COMPLETED, paymentMethod: CASH)
  - Convert hold Availability records to booked status
  - Release any remaining hold records
  - Calculate and store commission (if applicable)
  - Return booking, payment, and order details

**Transaction Management:**
- Wrap entire operation in Prisma transaction
- Rollback on any error
- Ensure atomicity

#### 1.3 Validation Requirements
- **Hold Validation:**
  - Hold records must exist and belong to correct property/rooms
  - Hold must not be expired
  - Hold records must match selected rooms
  
- **Guest Validation:**
  - Full name: required, min 2 characters
  - Email: required, valid email format
  - Phone: required, exactly 10 digits
  
- **Payment Validation:**
  - Amount must match pricing total (allow small tolerance for rounding)
  - Payment date cannot be in the future
  - Received by must be provided

- **Booking Validation:**
  - Rooms must still be available (double-check)
  - Dates must be valid
  - Guest count must match room capacity

#### 1.4 Route Registration
**File:** `server/src/routes/adminRoutes/frontdesk.routes.js`

```javascript
router.post(
  '/properties/:propertyId/bookings/cash',
  extractRole,
  CashPaymentController.createCashBooking
);
```

---

### Phase 2: Frontend Service Layer

#### 2.1 Service Function
**File:** `zomes_stay/src/services/property/frontdesk/cashPaymentService.js`

```javascript
import apiService from '../../index';

const cashPaymentService = {
  createCashBooking: async (propertyId, payload) => {
    return apiService.post(
      `/admin/frontdesk/properties/${propertyId}/bookings/cash`,
      payload
    );
  }
};

export default cashPaymentService;
```

---

### Phase 3: Frontend UI Components

#### 3.1 Cash Payment Modal Component
**File:** `zomes_stay/src/components/shared/FrontDesk/components/CashPaymentModal.jsx`

**Features:**
- Guest information form (if not already collected)
  - Full Name (required)
  - Email (required)
  - Phone (required)
  - Address (optional)
- Payment details
  - Amount (pre-filled from pricing, editable)
  - Payment date (default: today)
  - Receipt number (optional)
  - Received by (auto-filled from frontdeskActor)
- Validation display
- Loading state
- Success/Error messages

**Props:**
```javascript
{
  isOpen: boolean,
  pricingSummary: object,
  holdData: object,
  frontdeskActor: object,
  paymentLinkData: object | null,  // Pre-fill guest data if available
  onClose: () => void,
  onSubmit: (cashPaymentData) => Promise<void>,
  onSuccess: (bookingData) => void
}
```

#### 3.2 Update BookingForm Component
**File:** `zomes_stay/src/components/shared/FrontDesk/components/BookingForm.jsx`

**Changes:**
1. Add state for cash payment modal
2. Add handler for "Record cash payment" button
3. Pass required props to CashPaymentModal
4. Handle success callback (refresh board, show success message, close modal)

**Button Logic:**
- Enable button when:
  - Hold is successfully created (`holdState.status === "success"`)
  - Pricing summary is available
  - Guest information is available (from paymentLinkData or new form)
- Disable when:
  - Loading states active
  - Hold not created
  - Validation errors

#### 3.3 Update FrontDeskBoard Component
**File:** `zomes_stay/src/components/shared/FrontDesk/FrontDeskBoard.jsx`

**Changes:**
1. Import cash payment service
2. Add `handleRecordCashPayment` function
3. Add state for cash payment request
4. Pass handler to BookingForm
5. Handle success:
   - Refresh snapshot (auto-refresh will handle this)
   - Show success toast
   - Close booking modal
   - Reset booking draft

**Handler Function:**
```javascript
const handleRecordCashPayment = useCallback(async (cashPaymentData) => {
  // Validate required data
  // Call API
  // Handle success/error
  // Refresh board
}, [propertyId, bookingDraft, pricingSummary, holdState, frontdeskActor]);
```

---

### Phase 4: State Management

#### 4.1 Cash Payment State
```javascript
const [cashPaymentRequest, setCashPaymentRequest] = useState({
  status: "idle",  // "idle" | "loading" | "success" | "error"
  data: null,
  error: null,
  booking: null
});
```

#### 4.2 Success Flow
1. API call succeeds
2. Update state to success
3. Show success message with booking number
4. Auto-refresh board (existing 30s interval)
5. Close modal after 2 seconds
6. Reset booking draft

---

### Phase 5: Error Handling

#### 5.1 Error Scenarios
- **Hold expired:** Show error, allow re-hold
- **Rooms no longer available:** Show error, refresh availability
- **Payment amount mismatch:** Show error with expected amount
- **Guest info missing:** Show validation errors
- **Network error:** Show retry option
- **Server error:** Show generic error with support contact

#### 5.2 Error Display
- Inline validation errors in form
- Toast notifications for API errors
- Error state in cash payment modal

---

### Phase 6: Edge Cases & Validation

#### 6.1 Edge Cases
1. **Partial Payment:** 
   - Allow partial payment? (Future enhancement)
   - For now: Require full payment

2. **Hold Expiration:**
   - Check hold validity before creating booking
   - Auto-extend hold if about to expire

3. **Concurrent Bookings:**
   - Double-check room availability before booking
   - Handle race conditions

4. **Guest Already Exists:**
   - Check if guest email/phone exists
   - Option to link to existing user account (Future)

5. **Refund Handling:**
   - Not applicable for cash payments (handled separately)

#### 6.2 Validation Rules
- **Amount:** Must match total (allow ±1 rupee for rounding)
- **Phone:** Exactly 10 digits, no country code
- **Email:** Valid format
- **Name:** 2-100 characters
- **Payment Date:** Cannot be future date

---

### Phase 7: Testing Checklist

#### 7.1 Unit Tests
- [ ] Service function handles valid payload
- [ ] Service function validates hold records
- [ ] Service function creates booking correctly
- [ ] Service function creates payment correctly
- [ ] Service function handles transaction rollback on error

#### 7.2 Integration Tests
- [ ] API endpoint creates booking successfully
- [ ] API endpoint creates payment successfully
- [ ] Hold records are converted to booked status
- [ ] Availability is updated correctly
- [ ] Error handling works correctly

#### 7.3 E2E Tests
- [ ] Complete flow: Form → Hold → Cash Payment → Booking Created
- [ ] Error scenarios handled gracefully
- [ ] UI updates correctly after booking
- [ ] Board refreshes to show new booking

---

### Phase 8: UI/UX Considerations

#### 8.1 User Experience Flow
1. User completes booking form
2. Clicks "Continue to booking" → Hold created
3. Sees "Record cash payment" button enabled
4. Clicks button → Cash payment modal opens
5. Fills guest info (if not already filled)
6. Confirms payment amount
7. Clicks "Record payment" → Loading state
8. Success → Booking number shown → Modal closes → Board refreshes

#### 8.2 Visual Feedback
- Loading spinner during API call
- Success message with booking number
- Error messages inline and via toast
- Disabled states for buttons during processing

#### 8.3 Accessibility
- Proper form labels
- Error announcements for screen readers
- Keyboard navigation support
- Focus management

---

### Phase 9: Documentation

#### 9.1 API Documentation
- Endpoint documentation
- Request/Response examples
- Error codes and messages

#### 9.2 User Guide
- How to record cash payment
- When to use cash vs payment link
- Troubleshooting guide

---

## Implementation Order

1. **Backend API** (Phase 1)
   - Create controller
   - Create service
   - Add route
   - Test with Postman/curl

2. **Frontend Service** (Phase 2)
   - Create service file
   - Test API connection

3. **UI Components** (Phase 3)
   - Create CashPaymentModal
   - Update BookingForm
   - Update FrontDeskBoard

4. **Integration** (Phase 4-6)
   - Connect all pieces
   - Handle edge cases
   - Add error handling

5. **Testing** (Phase 7)
   - Unit tests
   - Integration tests
   - Manual testing

6. **Polish** (Phase 8-9)
   - UX improvements
   - Documentation

---

## Success Criteria

✅ Cash payment can be recorded successfully
✅ Booking is created immediately after cash payment
✅ Hold records are converted to booked status
✅ Payment record is created with CASH method
✅ Board refreshes to show new booking
✅ Error handling works for all scenarios
✅ Guest information is validated
✅ Payment amount is validated
✅ UI provides clear feedback at each step

---

## Future Enhancements (Post-MVP)

1. **Partial Payments:** Allow recording partial cash payments
2. **Receipt Generation:** Generate PDF receipts
3. **Payment History:** View cash payment history
4. **Refunds:** Handle cash refunds
5. **Multiple Payment Methods:** Combine cash + online payments
6. **Guest Management:** Link to existing guest accounts
7. **Reporting:** Cash payment reports and analytics

---

## Notes

- Cash payments bypass payment gateway (no Razorpay involved)
- Booking status is immediately CONFIRMED (not pending)
- Payment status is immediately COMPLETED
- Order record may still be created for consistency (status: PAID)
- Commission calculation should be handled if applicable
- Tax calculation should match payment link flow


