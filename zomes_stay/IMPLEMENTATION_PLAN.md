# Implementation Plan: Multi-Role Authentication & Payment System

## Overview
This document outlines the implementation plan for handling multiple concurrent user sessions (user and agent), role-based pricing, Razorpay refunds, and admin/host booking creation with payment links.

---

## 1. Logout Management for Multiple Concurrent Sessions

### Problem Statement
When both user and agent are logged in simultaneously, clicking the logout button in the header clears ALL Redux data, not just the intended role's data. This creates confusion and potential data loss.

### Current Architecture
- **Redux Slices**: 
  - `authSlice` - User authentication state
  - `agentAuthSlice` - Agent authentication state
- **Logout Button Location**: Header components (`Header.jsx`, `DefaultHeader.jsx`)
- **Current Issue**: Logout logic doesn't distinguish which role initiated the logout

### Proposed Solutions

#### Option 1: Context-Based Role Tracking (User's Suggestion) ⭐ RECOMMENDED
**Approach**: Create a React Context that tracks the currently active role/session.

**Pros**:
- ✅ Clean separation of concerns
- ✅ Easy to track which role is "active" at any moment
- ✅ Can be extended to track multiple active sessions
- ✅ Works well with React's component tree
- ✅ Can persist active role preference

**Cons**:
- ⚠️ Adds another layer of state management
- ⚠️ Need to keep context in sync with Redux

**Implementation Plan**:
1. Create `src/context/AuthContext.jsx`:
   ```javascript
   // Track active role: 'user' | 'agent' | 'both' | null
   // Store in context: { activeRole, activeRoles: ['user', 'agent'], ... }
   ```

2. Update login flows:
   - `OtpVerification.jsx` → Set active role to 'user'
   - `AgentLoginModal.jsx` → Set active role to 'agent'
   - If both logged in → Set active role to 'both'

3. Update logout logic:
   - Check `activeRole` from context
   - If `activeRole === 'user'` → Clear only `authSlice`
   - If `activeRole === 'agent'` → Clear only `agentAuthSlice`
   - If `activeRole === 'both'` → Show modal to select which to logout, or clear both

4. Header logout button:
   - Show only when `activeRole === 'user'` or `activeRole === 'both'`
   - On click, clear only user data if `activeRole === 'user'`
   - If `activeRole === 'both'`, show confirmation modal

#### Option 2: URL-Based Role Detection
**Approach**: Check current route to determine which role should logout.

**Pros**:
- ✅ Simple implementation
- ✅ No additional state management

**Cons**:
- ❌ Fragile (depends on routing)
- ❌ Doesn't handle cases where both roles can access same routes
- ❌ Doesn't work well for shared pages (home page)

#### Option 3: Separate Logout Buttons with Role Indicators
**Approach**: Show separate logout buttons for each role with clear labels.

**Pros**:
- ✅ Very explicit user experience
- ✅ No ambiguity

**Cons**:
- ❌ UI clutter when both are logged in
- ❌ Doesn't solve the core technical issue

### Recommendation
**Choose Option 1 (Context-Based)** because:
1. It's the most scalable solution
2. Allows for future features (e.g., "Switch to Agent View")
3. Provides clear separation of concerns
4. Can be extended to track session expiration, etc.

### Implementation Steps
1. ✅ Create `src/context/AuthContext.jsx`
2. ✅ Wrap App with `AuthProvider`
3. ✅ Update login flows to set active role
4. ✅ Update logout handlers to check context
5. ✅ Update header components to use context
6. ✅ Add role switching UI (optional)
7. ✅ Test concurrent sessions

---

## 2. Agent Pricing vs User Pricing

### Problem Statement
When a travel agent is logged in, they should see agent-specific pricing (typically discounted rates) instead of regular user pricing when booking properties.

### Current Architecture
- Pricing logic in: `src/utils/bookingCapacityPricing.js`
- Room pricing in: `src/components/RoomSection.jsx`
- Property data structure includes room prices
- No current differentiation between user and agent pricing

### Proposed Solution

#### Approach: Role-Based Price Selection
Check the logged-in role (from Redux or Context) and fetch/display the appropriate price tier.

### Implementation Plan

#### Step 1: Backend Changes
1. **Database Schema** (if not exists):
   - Add `agentPrice` field to `PropertyRoomType` or `RatePlan`
   - Or create a separate `AgentRatePlan` table
   - Store agent commission/discount percentage

2. **API Endpoints**:
   - Modify property details endpoint to include agent pricing when agent is authenticated
   - Or create separate endpoint: `GET /api/properties/:id/agent-pricing`
   - Include agent pricing in room availability responses

3. **Price Calculation Logic**:
   - If agent logged in → Use `agentPrice` or calculate: `basePrice - (basePrice * agentDiscount%)`
   - If user logged in → Use `basePrice` or `userPrice`

#### Step 2: Frontend Changes
1. **Update Price Fetching**:
   - Check Redux state: `useSelector(state => state.agentAuth?.authToken)`
   - If agent token exists → Request agent pricing
   - If user token exists → Request user pricing
   - If both exist → Default to user pricing (or show option to switch)

2. **Update Pricing Components**:
   - `RoomSection.jsx`: Check role and use appropriate price
   - `ReservationWidget.jsx`: Use role-based pricing
   - `bookingCapacityPricing.js`: Add role parameter to pricing functions

3. **Display Updates**:
   - Show "Agent Price" badge when agent is logged in
   - Show original price strikethrough if agent discount applies
   - Display commission/discount percentage

### Database Schema Considerations
```prisma
model PropertyRoomType {
  // ... existing fields
  basePrice       Decimal  // Regular user price
  agentPrice      Decimal? // Agent-specific price
  agentDiscount   Decimal? // Percentage discount for agents (e.g., 10.00 for 10%)
}

// OR

model AgentRatePlan {
  id              String   @id @default(uuid())
  agentId         String
  roomTypeId      String
  price           Decimal
  commission      Decimal  // Agent commission percentage
  createdAt       DateTime @default(now())
  
  agent           TravelAgent @relation(...)
  roomType        PropertyRoomType @relation(...)
}
```

### API Response Structure
```json
{
  "roomType": {
    "id": "room-123",
    "basePrice": 5000,
    "agentPrice": 4500,  // Only included if agent authenticated
    "agentDiscount": 10  // Percentage
  }
}
```

### Implementation Steps
1. ✅ Update database schema (if needed)
2. ✅ Modify backend API to include agent pricing
3. ✅ Update frontend to check role and request appropriate pricing
4. ✅ Update pricing calculation utilities
5. ✅ Update UI components to display agent pricing
6. ✅ Test with both user and agent sessions

---

## 3. Razorpay Refund for Cancellations

### Problem Statement
When a booking is cancelled, the payment amount needs to be refunded to the customer via Razorpay.

### Current Architecture
- Payment controller: `server/src/controllers/payment.controller.js`
- Razorpay integration exists for order creation and payment verification
- No refund functionality currently implemented
- Booking cancellation logic exists but may not trigger refunds

### Proposed Solution

#### Approach: Automatic Refund on Cancellation
When a booking is cancelled (by user, admin, or host), automatically process a refund through Razorpay.

### Implementation Plan

#### Step 1: Razorpay Refund API Integration

**Important Note on Refund Requirements:**
- Razorpay **automatically refunds** to the original payment method (card/UPI/netbanking/wallet)
- **No account details needed** in most cases - Razorpay handles it automatically
- Account number/IFSC may be required **only if**:
  - Original payment method is no longer valid/available
  - Manual refund processing is needed (rare cases)
  - UPI ID is not available AND card/netbanking details are not accessible
- Best Practice: Store payment method details during payment for edge cases

1. **Create Refund Endpoint**:
   ```javascript
   POST /api/payments/refund
   {
     "paymentId": "pay_xxx",  // Razorpay payment ID
     "amount": 5000,          // Optional: partial refund amount (in paise)
     "bookingId": "booking-123",
     "reason": "Customer cancellation",
     // Optional: Only if automatic refund fails
     "accountNumber": "1234567890",  // Bank account number
     "ifscCode": "SBIN0001234",      // IFSC code
     "upiId": "user@paytm"           // UPI ID (alternative to bank account)
   }
   ```

2. **Refund Logic**:
   - Fetch payment details from database using `razorpayPaymentId`
   - Fetch payment details from Razorpay API to get original payment method
   - **Primary Method**: Automatic refund (no account details needed)
     ```javascript
     const refund = await razorpay.payments.refund(paymentId, {
       amount: refundAmount, // Optional for full refund
       speed: 'normal', // or 'optimum' for faster processing
       notes: {
         reason: 'Customer cancellation',
         bookingId: bookingId
       }
     });
     ```
   - **Fallback Method**: If automatic refund fails, use account details
     ```javascript
     // Only if automatic refund fails
     if (refundError) {
       const refund = await razorpay.payments.refund(paymentId, {
         amount: refundAmount,
         notes: { ... },
         // Account details (only if UPI not available)
         account_number: accountNumber,
         ifsc: ifscCode,
         // OR UPI ID (preferred over bank account)
         notes: {
           ...notes,
           refund_account: upiId || `${accountNumber}@${ifscCode}`
         }
       });
     }
     ```
   - Handle partial refunds (optional)
   - Update payment status in database
   - Update booking status to 'cancelled'

3. **Refund Types**:
   - **Full Refund**: When booking cancelled before check-in
   - **Partial Refund**: Based on cancellation policy (if implemented)
   - **No Refund**: Based on cancellation policy (non-refundable bookings)

4. **Payment Method Detection**:
   - Fetch payment details from Razorpay: `razorpay.payments.fetch(paymentId)`
   - Check `payment.method` (card, upi, netbanking, wallet)
   - For UPI: Check if UPI ID is available in payment details
   - For cards/netbanking: Razorpay handles refund automatically
   - Only request account details if automatic refund is not possible

#### Step 2: Cancellation Policy Integration
1. **Cancellation Rules**:
   - Define cancellation policies (e.g., "Free cancellation 48 hours before check-in")
   - Calculate refund amount based on policy
   - Apply refund fee if applicable

2. **Refund Calculation**:
   ```javascript
   function calculateRefundAmount(booking, cancellationPolicy) {
     const daysUntilCheckIn = calculateDaysUntil(booking.checkIn);
     
     if (daysUntilCheckIn >= cancellationPolicy.freeCancellationDays) {
       return booking.totalAmount; // Full refund
     } else if (daysUntilCheckIn >= cancellationPolicy.partialRefundDays) {
       return booking.totalAmount * cancellationPolicy.refundPercentage; // Partial
     } else {
       return 0; // No refund
     }
   }
   ```

#### Step 3: Update Booking Cancellation Flow
1. **Update Cancellation Endpoint**:
   - Check if booking is eligible for refund
   - Calculate refund amount
   - Call refund API
   - Update booking status
   - Send notification to user

2. **Error Handling**:
   - Handle Razorpay API errors
   - Handle cases where payment already refunded
   - Handle network failures (retry mechanism)
   - Log all refund attempts

### Razorpay Refund API Usage

**Standard Refund (Automatic - No Account Details Needed):**
```javascript
// Full refund - Razorpay automatically refunds to original payment method
const refund = await razorpay.payments.refund(paymentId, {
  // amount: 500000, // Optional: omit for full refund
  speed: 'normal', // 'normal' (5-7 days) or 'optimum' (faster, higher fees)
  notes: {
    reason: 'Customer cancellation',
    bookingId: 'booking-123'
  }
});

// Partial refund
const partialRefund = await razorpay.payments.refund(paymentId, {
  amount: 250000, // 50% refund in paise
  speed: 'normal',
  notes: { ... }
});
```

**Fetch Payment Details (to check original payment method):**
```javascript
// Fetch payment to check original payment method
const payment = await razorpay.payments.fetch(paymentId);

// Payment object includes:
// - payment.method: 'card', 'upi', 'netbanking', 'wallet'
// - payment.vpa: UPI ID (if UPI payment)
// - payment.card: Card details (if card payment)
// - payment.bank: Bank details (if netbanking)

// Based on payment method, Razorpay handles refund automatically:
// - Card → Refunds to card (takes 5-7 business days)
// - UPI → Refunds to UPI ID (usually instant to 24 hours)
// - Netbanking → Refunds to bank account (5-7 business days)
// - Wallet → Refunds to wallet (usually instant)
```

**Manual Refund with Account Details (Only if Automatic Refund Fails):**
```javascript
// This is RARELY needed - only if automatic refund fails
// Razorpay will automatically handle refunds in 99% of cases

// If automatic refund fails, you may need:
// 1. UPI ID (preferred) - OR
// 2. Bank Account Number + IFSC Code

// Option 1: Using UPI ID (if available)
const refundWithUpi = await razorpay.payments.refund(paymentId, {
  amount: refundAmount,
  notes: {
    refund_upi_id: 'user@paytm' // User's UPI ID for refund
  }
});

// Option 2: Using Bank Account (if UPI not available)
// Note: This requires Razorpay's approval and special setup
// Contact Razorpay support for manual refund API access
```

**Important Points:**
- ✅ **99% of refunds**: Razorpay handles automatically - no account details needed
- ✅ **UPI payments**: Refund automatically to UPI ID (stored in payment object)
- ✅ **Card payments**: Refund automatically to card (takes 5-7 days)
- ⚠️ **Account details**: Only needed if automatic refund fails (rare)
- ⚠️ **Best practice**: Store payment method details during payment for edge cases
- ⚠️ **User experience**: Ask for account details only if automatic refund fails

### Database Updates
```prisma
model Payment {
  // ... existing fields
  refundId        String?  // Razorpay refund ID
  refundAmount    Decimal? // Refunded amount
  refundStatus    String?  // 'pending', 'processed', 'failed'
  refundDate      DateTime?
  refundReason    String?
  
  // Store original payment method for refund tracking
  paymentMethod   String?  // 'card', 'upi', 'netbanking', 'wallet'
  upiId           String?  // UPI ID if payment was via UPI
  cardLast4       String?  // Last 4 digits of card (if card payment)
  
  // Refund account details (only if needed for manual processing)
  refundAccountNumber String? // Bank account number (if required)
  refundIfscCode      String? // IFSC code (if required)
  refundUpiId         String? // UPI ID for refund (if different from payment)
}

// OR create a separate RefundAccount model for user's refund preferences
model RefundAccount {
  id            String   @id @default(uuid())
  userId        String   @db.Char(36)
  accountNumber String?  // Bank account number
  ifscCode      String?  // IFSC code
  upiId         String?  // UPI ID (preferred)
  accountHolderName String?
  bankName      String?
  isDefault     Boolean  @default(false)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  user          User     @relation(fields: [userId], references: [id])
  
  @@index([userId])
}
```

### Implementation Steps
1. ✅ Create refund endpoint in payment controller
2. ✅ Integrate Razorpay refund API (automatic refund - primary method)
3. ✅ Fetch payment details from Razorpay to check original payment method
4. ✅ Store payment method details in database during payment
5. ✅ Add cancellation policy logic
6. ✅ Update booking cancellation flow
7. ✅ Add refund tracking in database
8. ✅ Handle automatic refund failures (fallback to account details)
9. ✅ Create UI for users to provide refund account details (only if needed)
10. ✅ Add error handling and logging
11. ✅ Test refund scenarios (full, partial, failed, different payment methods)
12. ✅ Add refund notifications to users
13. ✅ Add refund status tracking and display

### UI Considerations for Refund Account Details

**When to Ask for Account Details:**
- ✅ **Don't ask upfront** - Razorpay handles 99% of refunds automatically
- ✅ **Only ask if automatic refund fails** - Show form to collect:
  - UPI ID (preferred - faster)
  - OR Bank Account Number + IFSC Code (if UPI not available)
- ✅ **Store user preferences** - Save refund account details for future use

**Refund Account Form (Only shown if automatic refund fails):**
```javascript
// Show this form only if refund fails with automatic method
{
  refundMethod: 'upi' | 'bank',
  upiId: 'user@paytm', // If UPI selected
  accountNumber: '1234567890', // If bank selected
  ifscCode: 'SBIN0001234', // If bank selected
  accountHolderName: 'John Doe'
}
```

---

## 4. Admin/Host Booking Creation with Payment Links

### Problem Statement
Admin or host users need to create bookings on behalf of guests (e.g., walk-in guests, phone bookings). These bookings should generate Razorpay payment links that can be sent to guests for payment.

### Current Architecture
- Booking creation: Currently only through user-initiated payment flow
- Payment links: Not currently implemented
- Admin/Host booking creation: Not implemented

### Proposed Solution

#### Approach: Instant Payment Link Generation
When admin/host creates a booking, generate a Razorpay payment link that can be sent to the guest via email/SMS.

### Implementation Plan

#### Step 1: Razorpay Payment Links API
1. **Create Payment Link Endpoint**:
   ```javascript
   POST /api/bookings/create-by-admin
   {
     "propertyId": "prop-123",
     "guestName": "John Doe",
     "guestEmail": "john@example.com",
     "guestPhone": "+919876543210",
     "checkIn": "2024-12-01",
     "checkOut": "2024-12-05",
     "guests": 2,
     "rooms": 1,
     "roomSelections": [...],
     "amount": 20000,
     "createdBy": "admin" // or "host"
   }
   ```

2. **Payment Link Generation**:
   ```javascript
   const paymentLink = await razorpay.paymentLink.create({
     amount: 2000000, // Amount in paise
     currency: 'INR',
     description: `Booking for ${property.title}`,
     customer: {
       name: guestName,
       email: guestEmail,
       contact: guestPhone
     },
     notify: {
       sms: true,
       email: true
     },
     reminder_enable: true,
     callback_url: `${baseUrl}/booking-confirmation`,
     callback_method: 'get',
     notes: {
       bookingId: 'temp-booking-id',
       propertyId: propertyId
     }
   });
   ```

3. **Booking Creation Flow**:
   - Create booking with status: `pending_payment`
   - Generate payment link
   - Store payment link in booking
   - Send link to guest via email/SMS
   - Set expiry for payment link (e.g., 24 hours)

#### Step 2: Payment Link Webhook Handling
1. **Webhook Endpoint**:
   ```javascript
   POST /api/payments/payment-link-webhook
   ```

2. **Webhook Events**:
   - `payment_link.paid` → Update booking status to `confirmed`
   - `payment_link.expired` → Mark booking as expired, release rooms
   - `payment_link.cancelled` → Cancel booking, release rooms

3. **Booking Confirmation**:
   - When payment link is paid, update booking status
   - Block rooms in availability table
   - Send confirmation email to guest

#### Step 3: Admin/Host UI
1. **Booking Creation Form**:
   - Guest information fields
   - Property and room selection
   - Date selection
   - Price calculation (with edit capability)
   - Generate payment link button

2. **Payment Link Management**:
   - Display payment link status
   - Resend payment link
   - Cancel payment link
   - View payment status

### Razorpay Payment Links API
```javascript
// Create payment link
const paymentLink = await razorpay.paymentLink.create({
  amount: 2000000,
  currency: 'INR',
  description: 'Hotel Booking',
  customer: {
    name: 'John Doe',
    email: 'john@example.com',
    contact: '+919876543210'
  },
  notify: {
    sms: true,
    email: true
  },
  reminder_enable: true,
  expire_by: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
  callback_url: 'https://yourdomain.com/booking-confirmation',
  callback_method: 'get'
});

// Fetch payment link
const link = await razorpay.paymentLink.fetch(paymentLink.id);

// Cancel payment link
await razorpay.paymentLink.cancel(paymentLink.id);
```

### Database Schema Updates
```prisma
model Booking {
  // ... existing fields
  createdBy       String?  // 'user', 'admin', 'host'
  createdById     String?  // ID of admin/host who created
  paymentLinkId   String?  // Razorpay payment link ID
  paymentLinkUrl  String?  // Payment link URL
  paymentLinkExpiry DateTime? // Link expiry time
  paymentLinkStatus String? // 'active', 'paid', 'expired', 'cancelled'
}
```

### Security Considerations
1. **Authentication**: Only admin/host can create bookings
2. **Authorization**: Verify admin/host has permission for the property
3. **Amount Validation**: Ensure amount matches calculated price (with override capability)
4. **Payment Link Security**: Verify webhook signatures from Razorpay
5. **Rate Limiting**: Prevent abuse of payment link generation

### Implementation Steps
1. ✅ Create admin/host booking creation endpoint
2. ✅ Integrate Razorpay payment links API
3. ✅ Create webhook handler for payment link events
4. ✅ Update database schema for payment links
5. ✅ Create admin/host UI for booking creation
6. ✅ Add payment link management features
7. ✅ Add email/SMS notifications
8. ✅ Test payment link creation and webhook handling
9. ✅ Add security measures and validation

---

## Implementation Priority

### Phase 1: Critical (Week 1)
1. ✅ **Logout Management** - Fix concurrent session logout issue
2. ✅ **Agent Pricing** - Implement role-based pricing display

### Phase 2: Important (Week 2)
3. ✅ **Razorpay Refunds** - Implement cancellation refunds
4. ✅ **Payment Links** - Admin/host booking creation with payment links

---

## Testing Checklist

### Logout Management
- [ ] User logout clears only user data
- [ ] Agent logout clears only agent data
- [ ] Both logged in → Logout clears correct role
- [ ] Logout persists across page refreshes
- [ ] Logout API calls are made correctly

### Agent Pricing
- [ ] Agent sees agent pricing when logged in
- [ ] User sees regular pricing when logged in
- [ ] Both logged in → Correct pricing shown
- [ ] Price calculations are accurate
- [ ] Pricing updates when switching roles

### Razorpay Refunds
- [ ] Full refund works correctly
- [ ] Partial refund works correctly
- [ ] Refund failure is handled gracefully
- [ ] Refund status is updated in database
- [ ] User receives refund notification

### Payment Links
- [ ] Payment link is generated correctly
- [ ] Payment link is sent to guest
- [ ] Payment link expiry works
- [ ] Webhook handles payment events
- [ ] Booking status updates on payment
- [ ] Admin/host can manage payment links

---

## Notes & Considerations

1. **Context vs Redux**: Consider using Context for active role tracking while keeping Redux for persistent state.

2. **Pricing Strategy**: Decide if agent pricing is:
   - Fixed discount percentage
   - Custom pricing per agent
   - Negotiated rates per property

3. **Refund Policy**: Define clear cancellation policies before implementing refunds.

4. **Payment Links**: Consider implementing payment link analytics to track conversion rates.

5. **Security**: Ensure all payment-related endpoints are properly secured and rate-limited.

6. **Error Handling**: Implement comprehensive error handling and logging for all payment operations.

7. **Notifications**: Plan email/SMS notifications for all payment-related events.

---

## Questions to Resolve

1. **Agent Pricing**:
   - Is agent pricing a fixed discount or custom per agent?
   - Should agents see both user and agent prices?
   - What happens if agent discount changes after booking?

2. **Refunds**:
   - What is the cancellation policy?
   - Are there refund fees?
   - How long does refund processing take?
   - **Answer**: Razorpay automatically refunds to original payment method:
     - UPI: Instant to 24 hours
     - Cards: 5-7 business days
     - Netbanking: 5-7 business days
     - Account details (bank account/UPI ID) are **NOT required** for automatic refunds
     - Only needed if automatic refund fails (rare edge case)

3. **Payment Links**:
   - What is the payment link expiry time?
   - Can payment links be extended?
   - What happens if guest doesn't pay before expiry?

4. **Booking Creation**:
   - Can admin/host edit prices when creating bookings?
   - Can bookings be created without payment (credit)?
   - How are walk-in payments handled?

---

**Document Version**: 1.0  
**Last Updated**: 2024-11-28  
**Next Review**: After Phase 1 completion

