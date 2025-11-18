# Unified Razorpay Webhook Handler - Production Plan

## 📋 **Current Situation Analysis**

### **Issue:**
Razorpay only allows **ONE webhook endpoint** to be configured, but we currently have:
1. **Direct Verification Endpoint** (`/api/verify-payment`) - Called from frontend after payment (user/agent bookings)
2. **Webhook Endpoint** (`/webhooks/verify-payment`) - Called by Razorpay automatically (payment link bookings)

**Note:** We have **2 separate order creation controllers** (which is fine):
- `payment.controller.js` → `createOrder()` - Creates Razorpay orders for user/agent bookings
- `paymentLink.controller.js` → `createPaymentLink()` - Creates Razorpay payment links for frontdesk bookings

**Problem:** Payment verification is split across 2 controllers:
- `payment.controller.js` → `verifyPayment()` - Handles `payment.captured` (direct verification)
- `webhook.controller.js` → `verifyPaymentWebhook()` - Handles `payment_link.paid` (webhook)

This creates potential issues:
- ❌ **Duplicate processing**: Same payment verified twice (direct + webhook)
- ❌ **Race conditions**: Both endpoints try to create booking simultaneously
- ❌ **Inconsistent state**: One succeeds, one fails, leaving partial state
- ❌ **Data integrity issues**: Multiple bookings for same order
- ❌ **Not production-ready**: Manual verification bypasses webhook reliability
- ❌ **Two verification flows**: Different logic for same operation (booking creation)

---

## 🎯 **Production Solution: Unified Webhook Architecture**

### **Principle:**
**Single Source of Truth**: Razorpay webhooks are the ONLY authoritative source for payment status updates.

### **Approach:**
**Keep Order Creation Separate** (2 controllers - OK):
- ✅ `payment.controller.js` → `createOrder()` - User/Agent bookings (Razorpay Orders)
- ✅ `paymentLink.controller.js` → `createPaymentLink()` - Frontdesk bookings (Payment Links)

**Unify Payment Verification** (1 webhook handler):
- ✅ Single unified webhook handler for ALL payment events
- ✅ Handles both `payment.captured` (from orders) and `payment_link.paid` (from payment links)
- ✅ Shared booking creation logic for both payment types

---

## 📐 **Architecture Plan**

### **1. Single Unified Webhook Endpoint**

**Path:** `/webhooks/razorpay` (or `/webhooks/verify-payment`)

**Responsibility:** Handle ALL Razorpay webhook events from ONE endpoint

**Supported Events:**
- ✅ `payment.captured` - Regular payment success (user/agent bookings)
- ✅ `payment.failed` - Payment failed
- ✅ `payment_link.paid` - Payment link paid (frontdesk bookings)
- ✅ `payment_link.expired` - Payment link expired
- ✅ `payment_link.cancelled` - Payment link cancelled
- ✅ `order.paid` - Order payment success (if used)

---

## 🔄 **Event Flow Architecture**

```
┌─────────────────────────────────────────────────────────────────┐
│                    RAZORPAY WEBHOOKS (ALL EVENTS)                │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│           Unified Webhook Handler (/webhooks/razorpay)          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  1. Verify Webhook Signature (Security)                  │  │
│  │  2. Parse Event Type                                     │  │
│  │  3. Route to Specific Handler                            │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┴───────────────────┐
        │                                       │
        ▼                                       ▼
┌──────────────────────┐           ┌──────────────────────┐
│  Regular Payment     │           │  Payment Link        │
│  Events Handler      │           │  Events Handler      │
│                      │           │                      │
│  - payment.captured  │           │  - payment_link.paid │
│  - payment.failed    │           │  - expired           │
│                      │           │  - cancelled         │
└──────────────────────┘           └──────────────────────┘
        │                                       │
        └───────────────────┬───────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              Shared Booking Creation Logic                       │
│  - Idempotency checks                                           │
│  - Transaction management                                       │
│  - Room availability updates                                    │
│  - Payment record creation                                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📁 **File Structure Plan**

```
server/src/
├── controllers/
│   ├── userController/
│   │   └── payment.controller.js           ✅ KEEP (createOrder only)
│   │
│   ├── frontdeskController/
│   │   ├── paymentLink.controller.js       ✅ KEEP (createPaymentLink only)
│   │   └── webhook.controller.js             ⚠️ DEPRECATE (Move to unified)
│   │
│   └── payment/                            🆕 NEW FOLDER
│       └── webhook.controller.js           🆕 NEW (Unified webhook handler)
│
├── services/
│   └── payment/
│       ├── bookingCreation.service.js      🆕 NEW (Shared booking logic)
│       ├── roomAvailability.service.js     🆕 NEW (Room blocking/releasing)
│       └── webhookVerification.service.js  🆕 NEW (Signature verification)
│
└── routes/
    ├── userRoutes/
    │   └── payment.routes.js               ✅ KEEP (createOrder only, remove verifyPayment)
    │
    └── webhooks/
        └── razorpay.routes.js              🆕 NEW (Unified webhook endpoint)
```

---

## 🔧 **Implementation Plan**

### **Phase 1: Create Unified Webhook Handler**

**File:** `server/src/controllers/payment/webhook.controller.js` (NEW)

**Structure:**
```javascript
// Unified webhook handler for ALL Razorpay events
const verifyWebhookSignature = async (payload, signature) => { ... }

// Handles payment.captured (from user/agent bookings via createOrder)
const handlePaymentCaptured = async (eventData) => {
  // Extract order_id from payment entity
  // Find order by razorpayOrderId
  // Create booking using shared service
  // Same logic as current verifyPayment() but via webhook
}

// Handles payment_link.paid (from frontdesk bookings via createPaymentLink)
const handlePaymentLinkPaid = async (eventData) => {
  // Extract order_id from payment_link entity
  // Find order by razorpayOrderId
  // Create booking using shared service
  // Same logic as current webhook.controller.js handlePaymentLinkPaid()
}

const handlePaymentFailed = async (eventData) => { ... }
const handlePaymentLinkExpired = async (eventData) => { ... }
const handlePaymentLinkCancelled = async (eventData) => { ... }

const unifiedWebhookHandler = async (req, res) => {
  // 1. Verify webhook signature
  // 2. Parse event type (payment.captured, payment_link.paid, etc.)
  // 3. Route to appropriate handler
  // 4. Return 200 to Razorpay (prevent retries)
}
```

**Key Changes:**
- ✅ Unifies `verifyPayment()` logic from `payment.controller.js`
- ✅ Unifies `handlePaymentLinkPaid()` logic from `webhook.controller.js`
- ✅ Both use shared `createBookingFromOrder()` service
- ✅ Single endpoint for ALL Razorpay webhook events

---

### **Phase 2: Extract Shared Booking Logic**

**File:** `server/src/services/payment/bookingCreation.service.js` (NEW)

**Purpose:** Centralize booking creation logic (used by BOTH payment.captured AND payment_link.paid)

**Functions:**
```javascript
/**
 * Creates a booking from an order (used by both payment types)
 * Handles both:
 * - payment.captured (user/agent bookings from createOrder)
 * - payment_link.paid (frontdesk bookings from createPaymentLink)
 */
const createBookingFromOrder = async (orderId, paymentDetails, tx) => {
  // 1. Fetch order with room selections
  // 2. Validate order status (must be PENDING)
  // 3. Idempotency check (check if booking already exists)
  // 4. Verify payment with Razorpay API (CRITICAL for production)
  // 5. Create booking with BookingRoomSelection records
  // 6. Convert blocked rooms to booked
  // 7. Create payment record
  // 8. Update order status to SUCCESS
  // Return: { booking, bookingNumber, alreadyProcessed }
}

/**
 * Helper: Release order holds (for expired/failed/cancelled)
 */
const releaseOrderHolds = async (orderId, tx) => { ... }
```

**Migration:**
- Extract booking creation logic from `payment.controller.js` → `verifyPayment()`
- Extract booking creation logic from `webhook.controller.js` → `handlePaymentLinkPaid()`
- Combine into single shared service
- Both webhook handlers call this service

**Benefits:**
- ✅ **DRY Principle**: Single source of booking creation logic
- ✅ **Consistency**: Same logic for all payment types
- ✅ **Maintainability**: One place to update booking logic
- ✅ **Testability**: Easy to unit test shared logic

---

### **Phase 3: Update Routes**

**File:** `server/src/routes/webhooks/razorpay.routes.js` (NEW)

```javascript
const express = require('express');
const router = express.Router();
const { unifiedWebhookHandler } = require('../../controllers/payment/webhook.controller');

// Single endpoint for ALL Razorpay webhook events
router.post(
  '/razorpay',
  express.raw({ type: 'application/json' }), // Raw body for signature verification
  unifiedWebhookHandler
);

module.exports = router;
```

**Update:** `server/index.js`
```javascript
// Register unified webhook route BEFORE JSON parser
app.use('/webhooks', WebhookRoute);
```

---

### **Phase 4: Remove Direct Verification Endpoint**

**File:** `server/src/routes/userRoutes/payment.routes.js`

**Action:** Remove `verifyPayment` route (webhook handles it now)

**Before:**
```javascript
router.post('/create-order', createOrder);
router.post('/verify-payment', verifyPayment); // ❌ REMOVE THIS
```

**After:**
```javascript
router.post('/create-order', createOrder); // ✅ KEEP (order creation only)
// verifyPayment removed - handled by unified webhook
```

**Update Frontend:**
- Update `RoomSection.jsx` to NOT call `/api/verify-payment` after payment
- Rely solely on webhook for payment verification
- Frontend polls booking status: `GET /api/bookings/order/:orderId`
- Or implement WebSocket for real-time updates

---

## 🔐 **Security & Production Features**

### **1. Webhook Signature Verification**
```javascript
// Always verify signature from X-Razorpay-Signature header
// Use RAZORPAY_WEBHOOK_SECRET from environment
// Use crypto.timingSafeEqual() for constant-time comparison
```

### **2. Idempotency (Prevent Duplicate Processing)**
```javascript
// Check multiple levels:
// 1. Payment ID already exists in payments table
// 2. Order status already SUCCESS
// 3. Booking already exists for orderId
// Use database transaction for atomic checks
```

### **3. Race Condition Prevention**
```javascript
// Use Prisma transactions with:
// - SELECT FOR UPDATE (pessimistic locking)
// - Order status check INSIDE transaction
// - Unique constraints on orderId (already in schema)
```

### **4. Error Handling & Retry Logic**
```javascript
// Webhook handlers should:
// - Return 200 OK to Razorpay (prevent retries on business logic errors)
// - Log errors for manual investigation
// - Have dead-letter queue for failed events
// - Alert monitoring system on repeated failures
```

### **5. Structured Logging**
```javascript
// Log all events with:
// - Request ID (for tracing)
// - Event type
// - Order ID
// - Payment ID
// - Processing time
// - Success/failure status
```

---

## 🔄 **Event Handler Details**

### **Event 1: `payment.captured` (Regular Payments)**
**Triggered when:** User/Agent completes Razorpay payment

**Handler:** `handlePaymentCaptured`
**Process:**
1. Extract `payment.entity.order_id` from event
2. Find order by `razorpayOrderId`
3. Validate order status (must be PENDING)
4. Call `createBookingFromOrder()` service
5. Update order status to SUCCESS
6. Return booking details

**Response:** 200 OK to Razorpay

---

### **Event 2: `payment.failed`**
**Triggered when:** Payment fails

**Handler:** `handlePaymentFailed`
**Process:**
1. Find order by payment order_id
2. Update order status to FAILED
3. Release blocked rooms (via `releaseOrderHolds()`)
4. Log failure reason

**Response:** 200 OK to Razorpay

---

### **Event 3: `payment_link.paid` (Payment Links)**
**Triggered when:** Frontdesk payment link is paid

**Handler:** `handlePaymentLinkPaid` (migrate from webhook.controller.js)
**Process:**
1. Extract `payment_link.entity.order_id`
2. Find order by `razorpayOrderId`
3. Validate order status (must be PENDING)
4. Call `createBookingFromOrder()` service (shared logic)
5. Update order status to SUCCESS
6. Return booking details

**Response:** 200 OK to Razorpay

---

### **Event 4: `payment_link.expired`**
**Handler:** `handlePaymentLinkExpired` (migrate from webhook.controller.js)
**Process:**
1. Find order by payment link order_id
2. Update order status to EXPIRED
3. Release blocked rooms
4. Log expiration

**Response:** 200 OK to Razorpay

---

### **Event 5: `payment_link.cancelled`**
**Handler:** `handlePaymentLinkCancelled` (migrate from webhook.controller.js)
**Process:**
1. Find order by payment link order_id
2. Update order status to CANCELLED
3. Release blocked rooms
4. Log cancellation

**Response:** 200 OK to Razorpay

---

## 📊 **Frontend Update Strategy**

### **Current Flow (Direct Verification - User/Agent):**
```
User/Agent pays → Razorpay Checkout → Payment Success → 
Frontend calls /api/verify-payment → Booking created
```

### **Current Flow (Webhook - Frontdesk):**
```
Frontdesk creates payment link → Guest pays → 
Razorpay sends webhook → Booking created (backend)
```

### **New Unified Flow (Webhook-based for ALL):**
```
User/Agent pays → Razorpay Checkout → Payment Success → 
Razorpay sends webhook (payment.captured) → 
Unified webhook handler → Booking created (backend) →
Frontend polls /api/bookings/order/:orderId or uses WebSocket

Frontdesk creates payment link → Guest pays → 
Razorpay sends webhook (payment_link.paid) → 
Unified webhook handler → Booking created (backend) →
Frontend polls /api/bookings/order/:orderId
```

### **Migration Steps:**

1. **Keep `/api/verify-payment` temporarily** (deprecated warning)
2. **Update frontend** to:
   - Show "Processing payment..." after Razorpay success
   - Poll booking status: `GET /api/bookings/order/:orderId`
   - Or implement WebSocket for real-time updates
3. **Remove direct verification** after frontend migration

---

## ✅ **Benefits of Unified Approach**

1. **✅ Single Source of Truth**: Webhooks are authoritative
2. **✅ Reliability**: Razorpay retries failed webhooks automatically
3. **✅ Consistency**: Same booking logic for all payment types
4. **✅ Security**: All payments verified by Razorpay signature
5. **✅ Scalability**: Webhook-based is async and non-blocking
6. **✅ Auditability**: All events logged with request IDs
7. **✅ Idempotency**: Built-in duplicate prevention
8. **✅ Production-Ready**: Follows Razorpay best practices

---

## 🚨 **Production-Ready Enhancements Required**

### **1. Razorpay API Verification (Critical)**
**Status:** ⚠️ **MISSING** - Must add for production

**Requirement:** Verify payment status directly with Razorpay API before processing
```javascript
// Before creating booking, verify payment with Razorpay API
const razorpay = new Razorpay({ key_id, key_secret });
const payment = await razorpay.payments.fetch(razorpay_payment_id);

// Verify:
// 1. Payment status === 'captured'
// 2. Amount matches order amount
// 3. Payment is linked to correct order
// 4. Payment method matches
```

**Why Critical:**
- ✅ Prevents fraud (webhook spoofing)
- ✅ Double-verification of payment status
- ✅ Ensures amount matches (prevent tampering)
- ✅ Production security standard

**Implementation:**
- Add `verifyPaymentWithRazorpayAPI()` service
- Call before creating booking in webhook handler
- Log API verification results
- Fail gracefully if API verification fails

---

### **2. Webhook Event Logging (Critical)**
**Status:** ⚠️ **MISSING** - Must add for production

**Requirement:** Store ALL webhook events in database for audit trail

**Schema Addition:**
```prisma
model WebhookEvent {
  id              String   @id @default(uuid())
  eventType       String   // 'payment.captured', 'payment_link.paid', etc.
  razorpayEventId String?  // Razorpay event ID (if available)
  orderId         String?  // Related order ID
  paymentId       String?  // Related payment ID
  rawPayload      Json     // Full webhook payload (for debugging)
  signature       String?  // Webhook signature
  status          String   // 'received', 'processed', 'failed', 'retry'
  processedAt     DateTime?
  errorMessage    String?
  retryCount      Int      @default(0)
  requestId       String   // Request ID for tracing
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@index([eventType])
  @@index([orderId])
  @@index([status])
  @@index([createdAt])
}
```

**Why Critical:**
- ✅ Complete audit trail
- ✅ Debug failed webhooks
- ✅ Replay failed events
- ✅ Compliance (financial records)
- ✅ Analytics (webhook success rates)

---

### **3. Dead Letter Queue (DLQ) for Failed Webhooks**
**Status:** ⚠️ **MISSING** - Must add for production

**Requirement:** Queue failed webhook processing for manual retry

**Implementation:**
- Store failed events in `WebhookEvent` table with `status = 'failed'`
- Admin dashboard to view and retry failed events
- Automatic retry mechanism (exponential backoff)
- Alert when failures exceed threshold

**Why Critical:**
- ✅ No lost webhook events
- ✅ Manual intervention capability
- ✅ Recovery from transient failures
- ✅ Production reliability standard

---

### **4. Monitoring & Alerting**
**Status:** ⚠️ **MISSING** - Must add for production

**Requirements:**
- **Webhook Delivery Monitoring:**
  - Track webhook success rate (%)
  - Track processing time (p50, p95, p99)
  - Track failure rate
  - Alert when success rate < 95%

- **Business Metrics:**
  - Bookings created via webhook
  - Failed bookings (webhook received but booking failed)
  - Payment verification failures
  - Order status inconsistencies

- **System Health:**
  - Webhook endpoint response time
  - Database transaction failures
  - API rate limit usage

**Implementation:**
- Integrate with monitoring tool (Prometheus, Datadog, etc.)
- Set up alerts (email/Slack/PagerDuty)
- Dashboard for webhook metrics

---

### **5. Rate Limiting & Security**
**Status:** ⚠️ **PARTIALLY MISSING** - Must enhance

**Current:** Webhook signature verification ✅

**Additional Requirements:**
- **Rate Limiting:**
  - Limit webhook requests per IP (prevent spam)
  - Limit webhook requests per order (prevent replay attacks)
  - Use express-rate-limit middleware

- **IP Whitelisting (Optional):**
  - Whitelist Razorpay IP ranges (production only)
  - Add extra security layer

- **Request Timeout:**
  - Timeout webhook processing (max 30 seconds)
  - Queue long-running tasks for async processing

**Implementation:**
```javascript
const rateLimit = require('express-rate-limit');

const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute per IP
  message: 'Too many webhook requests'
});

router.post('/razorpay', webhookLimiter, unifiedWebhookHandler);
```

---

### **6. Webhook Retry Strategy**
**Status:** ⚠️ **MISSING** - Must add for production

**Requirement:** Handle Razorpay webhook retries gracefully

**Current Behavior:**
- Return 200 OK → Razorpay stops retrying
- Return 500 → Razorpay retries (up to 3 times)

**Production Strategy:**
```javascript
// 1. Business Logic Errors (return 200, don't retry)
//    - Order already processed (idempotent)
//    - Invalid order status
//    - Missing required data

// 2. Transient Errors (return 500, allow retry)
//    - Database connection failure
//    - Timeout errors
//    - Network issues

// 3. Permanent Errors (return 200, queue for manual retry)
//    - Payment verification failed
//    - Order not found
//    - Invalid signature
```

**Implementation:**
- Categorize errors correctly
- Return appropriate HTTP status
- Log retry attempts
- Alert on repeated failures

---

### **7. Event Ordering & Idempotency**
**Status:** ✅ **HANDLED** - Already implemented

**Current Implementation:**
- Idempotency checks at multiple levels
- Transaction-based locking
- Order status check inside transaction

**Additional Considerations:**
- Handle events arriving out of order
- Ensure older events don't overwrite newer state
- Use timestamps for event ordering

---

### **8. Partial Failure Handling**
**Status:** ⚠️ **MISSING** - Must add for production

**Scenario:** What if booking creation succeeds but payment record creation fails?

**Solution:**
- Use database transactions (already implemented) ✅
- Transaction rollback on any failure ✅
- Add compensation logic for edge cases
- Add reconciliation job to fix inconsistencies

**Implementation:**
```javascript
// Wrap entire booking creation in transaction
await prisma.$transaction(async (tx) => {
  // All or nothing - if any step fails, rollback
  // This is already implemented ✅
});

// Add reconciliation job (cron):
// - Find bookings without payment records
// - Find payment records without bookings
// - Fix inconsistencies
```

---

### **9. Admin Dashboard for Webhook Management**
**Status:** ⚠️ **MISSING** - Must add for production

**Requirements:**
- View all webhook events
- Filter by status, event type, date range
- Retry failed webhooks manually
- View webhook payload (for debugging)
- View error messages
- Statistics dashboard (success rate, failure rate)

**Features:**
- Retry button for failed events
- Replay webhook event
- View related order/booking
- Export webhook logs

---

### **10. Notification System**
**Status:** ⚠️ **MISSING** - Must add for production

**Requirements:**
- **Email/SMS Alerts:**
  - Webhook processing failures
  - Payment verification failures
  - Repeated webhook failures (>3)
  - Booking creation failures

- **Success Notifications:**
  - Booking confirmation email (already planned)
  - Payment receipt email

**Implementation:**
- Integrate email service (SendGrid, AWS SES, etc.)
- Integrate SMS service (Twilio, AWS SNS, etc.)
- Template-based notifications
- Retry failed notifications

---

### **11. Testing Strategy**
**Status:** ⚠️ **MISSING** - Must add for production

**Requirements:**
- **Unit Tests:**
  - Webhook signature verification
  - Event parsing
  - Idempotency checks
  - Booking creation logic

- **Integration Tests:**
  - Webhook endpoint with Razorpay test mode
  - Full booking creation flow
  - Error scenarios

- **Load Tests:**
  - Webhook endpoint performance
  - Concurrent webhook processing
  - Database transaction performance

- **End-to-End Tests:**
  - Complete payment flow (webhook → booking)
  - Error scenarios (failed payment, expired order)

---

### **12. Documentation**
**Status:** ⚠️ **PARTIALLY MISSING** - Must enhance

**Requirements:**
- API documentation (Swagger/OpenAPI)
- Webhook event documentation
- Error code reference
- Troubleshooting guide
- Deployment guide
- Rollback procedure

---

## 🎯 **Production Readiness Checklist**

### **Security** ✅
- [x] Webhook signature verification
- [ ] Razorpay API verification (CRITICAL - MISSING)
- [ ] Rate limiting
- [ ] IP whitelisting (optional)
- [ ] Request timeout handling

### **Reliability** ⚠️
- [x] Idempotency checks
- [x] Transaction-based processing
- [ ] Dead letter queue (MISSING)
- [ ] Webhook retry strategy (MISSING)
- [ ] Partial failure handling (needs enhancement)
- [ ] Event ordering (handled)

### **Observability** ⚠️
- [x] Structured logging
- [ ] Webhook event logging to database (MISSING)
- [ ] Monitoring & metrics (MISSING)
- [ ] Alerting (MISSING)
- [ ] Dashboard (MISSING)

### **Operations** ⚠️
- [ ] Admin dashboard (MISSING)
- [ ] Manual retry mechanism (MISSING)
- [ ] Notification system (MISSING)
- [ ] Testing strategy (MISSING)
- [ ] Documentation (PARTIALLY MISSING)

---

## ⚠️ **Critical Gaps for Production**

1. **🔴 CRITICAL: Razorpay API Verification**
   - **Impact:** Security risk (webhook spoofing possible)
   - **Priority:** P0 (Must have before production)
   - **Effort:** 1-2 days

2. **🔴 CRITICAL: Webhook Event Logging**
   - **Impact:** No audit trail, difficult to debug
   - **Priority:** P0 (Must have before production)
   - **Effort:** 2-3 days

3. **🟡 HIGH: Dead Letter Queue**
   - **Impact:** Lost webhook events, manual recovery difficult
   - **Priority:** P1 (Should have before production)
   - **Effort:** 2-3 days

4. **🟡 HIGH: Monitoring & Alerting**
   - **Impact:** Blind to webhook failures
   - **Priority:** P1 (Should have before production)
   - **Effort:** 2-3 days

5. **🟢 MEDIUM: Admin Dashboard**
   - **Impact:** Difficult to manage failed webhooks
   - **Priority:** P2 (Nice to have)
   - **Effort:** 3-5 days

6. **🟢 MEDIUM: Testing Strategy**
   - **Impact:** Unknown bugs in production
   - **Priority:** P2 (Should have)
   - **Effort:** 3-5 days

---

## 📊 **Production Readiness Score**

**Current Score:** 60/100 ⚠️

**Breakdown:**
- Security: 70% (missing API verification)
- Reliability: 75% (missing DLQ, retry strategy)
- Observability: 40% (missing logging, monitoring)
- Operations: 30% (missing dashboard, notifications)

**Target Score for Production:** 85/100 ✅

**Gap:** 25 points (implement critical and high priority items)

---

## 🚨 **Migration Risks & Mitigation**

### **Risk 1: Lost Payments (Webhook fails)**
**Mitigation:**
- Razorpay retries webhooks automatically (up to 3 times)
- Implement webhook retry queue for manual retries
- Have admin dashboard to manually trigger booking creation
- Monitor webhook delivery success rate

### **Risk 2: Frontend Waiting Forever**
**Mitigation:**
- Implement polling with timeout (max 30 seconds)
- Show "Payment processing..." message
- Have fallback to manual verification endpoint (admin only)
- Implement WebSocket for real-time updates

### **Risk 3: Duplicate Processing**
**Mitigation:**
- Multiple idempotency checks (payment ID, order status, booking existence)
- Database transactions with proper locking
- Unique constraints on orderId

---

## 📝 **Implementation Checklist**

### **Backend:**
- [ ] Create `server/src/services/payment/bookingCreation.service.js`
  - [ ] Extract booking creation logic from `payment.controller.js` → `verifyPayment()`
  - [ ] Extract booking creation logic from `webhook.controller.js` → `handlePaymentLinkPaid()`
  - [ ] Combine into shared `createBookingFromOrder()` function
  - [ ] Add Razorpay API verification (CRITICAL)
  - [ ] Add idempotency checks
  - [ ] Add transaction management
  
- [ ] Create `server/src/controllers/payment/webhook.controller.js`
  - [ ] Add `verifyWebhookSignature()` function
  - [ ] Add `handlePaymentCaptured()` - Extract from `payment.controller.js` → `verifyPayment()`
  - [ ] Add `handlePaymentLinkPaid()` - Extract from `webhook.controller.js` → `handlePaymentLinkPaid()`
  - [ ] Add `handlePaymentFailed()` - New or extract from existing
  - [ ] Add `handlePaymentLinkExpired()` - Extract from `webhook.controller.js`
  - [ ] Add `handlePaymentLinkCancelled()` - Extract from `webhook.controller.js`
  - [ ] Add `unifiedWebhookHandler()` - Main router function
  
- [ ] Create `server/src/routes/webhooks/razorpay.routes.js`
  - [ ] Register `/webhooks/razorpay` endpoint
  - [ ] Use `express.raw()` for signature verification
  
- [ ] Update `server/src/routes/userRoutes/payment.routes.js`
  - [ ] Remove `verifyPayment` route
  - [ ] Keep only `createOrder` route
  
- [ ] Update `server/src/controllers/userController/payment.controller.js`
  - [ ] Remove `verifyPayment` function (moved to webhook handler)
  - [ ] Keep only `createOrder` function
  
- [ ] Update `server/src/controllers/frontdeskController/webhook.controller.js`
  - [ ] Mark as DEPRECATED
  - [ ] Add migration note (logic moved to unified handler)
  - [ ] Can be removed after migration confirmed
  
- [ ] Update `server/index.js`
  - [ ] Register new unified webhook route: `/webhooks/razorpay`
  
- [ ] Update API documentation

### **Frontend:**
- [ ] Remove direct call to `/api/verify-payment` after payment
- [ ] Implement polling for booking status: `GET /api/bookings/order/:orderId`
- [ ] Show "Processing payment..." message
- [ ] Handle payment success redirect properly
- [ ] Add timeout handling (30 seconds)
- [ ] Add error handling for webhook delays

### **Testing:**
- [ ] Test webhook signature verification
- [ ] Test idempotency (duplicate webhook calls)
- [ ] Test race conditions (concurrent webhooks)
- [ ] Test all event types (captured, failed, paid, expired, cancelled)
- [ ] Test frontend polling mechanism
- [ ] Test error scenarios (webhook failure, timeout)

### **Monitoring:**
- [ ] Add webhook delivery monitoring
- [ ] Add booking creation success rate
- [ ] Add webhook processing time metrics
- [ ] Add alerts for failed webhooks
- [ ] Add dashboard for webhook event log

---

## 🔗 **Razorpay Webhook Configuration**

### **Single Webhook URL:**
```
https://your-domain.com/webhooks/razorpay
```

### **Webhook Events to Subscribe:**
- ✅ `payment.captured`
- ✅ `payment.failed`
- ✅ `payment_link.paid`
- ✅ `payment_link.expired`
- ✅ `payment_link.cancelled`

### **Webhook Secret:**
Store in environment variable: `RAZORPAY_WEBHOOK_SECRET`

---

## 📚 **References**

- [Razorpay Webhooks Documentation](https://razorpay.com/docs/webhooks/)
- [Razorpay Webhook Security](https://razorpay.com/docs/webhooks/webhook-security/)
- [Best Practices for Webhooks](https://razorpay.com/docs/payments/server-integration/nodejs/payment-gateway/build-integration/)

---

## 🎯 **Summary**

**Goal:** Single unified webhook handler that processes ALL Razorpay payment events reliably and securely.

**Key Changes:**
1. ✅ Keep order creation separate (2 controllers - OK)
   - `payment.controller.js` → `createOrder()` (user/agent)
   - `paymentLink.controller.js` → `createPaymentLink()` (frontdesk)
2. ✅ Create unified webhook handler (`/webhooks/razorpay`)
3. ✅ Extract shared booking creation logic to service
4. ✅ Handle ALL payment events from one endpoint:
   - `payment.captured` (from createOrder)
   - `payment_link.paid` (from createPaymentLink)
   - `payment.failed`, `payment_link.expired`, etc.
5. ✅ Remove direct verification endpoint (`/api/verify-payment`)
6. ✅ Update frontend to use polling/WebSocket instead

**Timeline:** 
- Phase 1-2: Backend implementation (2-3 days)
  - Extract shared booking logic (1 day)
  - Create unified webhook handler (1-2 days)
- Phase 3: Route updates (0.5 day)
  - Remove verifyPayment route
  - Register unified webhook route
- Phase 4: Frontend migration (1-2 days)
  - Remove direct verification call
  - Add polling mechanism
- Testing & Monitoring: (1-2 days)

**Total Estimated Time:** 4-7 days

