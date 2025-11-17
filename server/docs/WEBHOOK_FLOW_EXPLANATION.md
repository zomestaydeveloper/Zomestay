# 🔄 Payment Link Webhook Flow - Simple Explanation

## 📋 Overview
This document explains how the payment link system works, from creating a payment link to handling payment results via webhooks.

---

## 🎯 The Big Picture

Think of it like ordering food:
1. **You create an order** (payment link) → Room is **blocked** (held)
2. **Customer pays** → Razorpay sends us a notification (webhook)
3. **We confirm the order** → Room becomes **booked**
4. **If payment fails/expires** → Room is **released** (available again)

---

## 📝 Step-by-Step Flow

### **STEP 1: Admin/Host Creates Payment Link**

**What happens:**
```
Admin/Host (Front Desk) → Selects room → Creates payment link
```

**In code (`createPaymentLink` function):**

1. **Input**: Admin provides:
   - Property ID
   - Room IDs (which rooms to book)
   - Check-in/Check-out dates
   - Guest details (name, phone, email)
   - Amount to pay
   - Hold records (temporary room holds)

2. **Create Razorpay Payment Link**:
   ```javascript
   const paymentLink = await razorpay.paymentLink.create({
     amount: 50000,  // ₹500 in paise (₹1 = 100 paise)
     currency: 'INR',
     expire_by: 1234567890,  // Link expires in 15 minutes
     customer: {
       name: "John Doe",
       contact: "+919876543210",
       email: "john@example.com"
     }
   });
   ```

3. **Save Order in Database**:
   ```javascript
   // Create order record with status: 'PENDING'
   const order = await prisma.order.create({
     data: {
       razorpayOrderId: "order_xyz123",
       amount: 50000,
       status: "PENDING",  // ⏳ Waiting for payment
       propertyId: "prop_123",
       checkIn: "2024-12-25",
       checkOut: "2024-12-27",
       expiresAt: "2024-12-20 10:30:00"  // Link expires in 15 min
     }
   });
   ```

4. **Block Rooms (Hold)**:
   ```javascript
   // Update availability records to "blocked"
   await prisma.availability.updateMany({
     where: { id: { in: holdRecordIds } },
     data: {
       status: 'blocked',  // 🚫 Room is blocked (reserved)
       blockedBy: order.id,  // Link to order
       holdExpiresAt: "2024-12-20 10:30:00"  // Hold expires when link expires
     }
   });
   ```

5. **Return Payment Link URL**:
   ```javascript
   return {
     paymentLinkUrl: "https://rzp.io/pay/abc123",
     orderId: "order_xyz123",
     expiresAt: "2024-12-20 10:30:00"
   };
   ```

**Result**: 
- ✅ Payment link created
- ✅ Room is **BLOCKED** (status: 'blocked')
- ✅ Order saved with status: 'PENDING'
- ✅ Payment link sent to customer

---

### **STEP 2: Customer Pays (or Doesn't)**

**What happens:**
```
Customer → Clicks payment link → Pays via Razorpay
Razorpay → Processes payment → Sends webhook to our server
```

**Three possible outcomes:**

#### **✅ Outcome 1: Payment Successful**

**What Razorpay does:**
1. Customer pays successfully
2. Razorpay sends webhook: `payment_link.paid`
3. Our server receives webhook at `/webhooks/razorpay`

**In code (`handlePaymentLinkPaid` function):**

1. **Verify Webhook Signature** (Security):
   ```javascript
   // Razorpay sends a signature to verify the request is authentic
   const signature = req.headers['x-razorpay-signature'];
   const isValid = verifyWebhookSignature(rawBody, signature);
   // ✅ Only process if signature is valid (prevents fake webhooks)
   ```

2. **Find Order**:
   ```javascript
   // Find the order using razorpayOrderId from webhook
   const order = await prisma.order.findUnique({
     where: { razorpayOrderId: "order_xyz123" }
   });
   // Order status: 'PENDING'
   ```

3. **Check Idempotency** (Prevent duplicate processing):
   ```javascript
   // If order is already processed, skip
   if (order.status === 'SUCCESS') {
     return { skipped: true };  // ✅ Already processed, nothing to do
   }
   ```

4. **Get Blocked Rooms**:
   ```javascript
   // Find all rooms blocked by this order
   const blockedRooms = await prisma.availability.findMany({
     where: {
       blockedBy: order.id,
       status: 'blocked'
     }
   });
   ```

5. **Create Booking** (Transaction - All or Nothing):
   ```javascript
   await prisma.$transaction(async (tx) => {
     // Step 1: Update order status
     await tx.order.update({
       where: { id: order.id },
       data: { status: 'SUCCESS' }  // ✅ Payment successful
     });

     // Step 2: Create booking record
     const booking = await tx.booking.create({
       data: {
         bookingNumber: "BK20241220123456",
         orderId: order.id,
         propertyId: order.propertyId,
         guestName: order.guestName,
         startDate: order.checkIn,
         endDate: order.checkOut,
         totalAmount: order.amount / 100,  // Convert paise to rupees
         paymentStatus: 'PAID',  // ✅ Payment confirmed
         status: 'confirmed'  // ✅ Booking confirmed
       }
     });

     // Step 3: Convert blocked rooms to booked
     await tx.availability.updateMany({
       where: { blockedBy: order.id },
       data: {
         status: 'booked',  // ✅ Room is now booked
         blockedBy: booking.id,  // Link to booking (not order)
         holdExpiresAt: null  // Clear expiry (booking is permanent)
       }
     });

     // Step 4: Create payment record
     await tx.payment.create({
       data: {
         transactionID: "pay_xyz123",
         amount: order.amount / 100,
         status: 'SUCCESS',
         bookingId: booking.id
       }
     });
   });
   ```

**Result**: 
- ✅ Order status: 'SUCCESS'
- ✅ Booking created
- ✅ Room status: 'booked' (confirmed)
- ✅ Payment record saved

---

#### **⏰ Outcome 2: Payment Link Expired**

**What Razorpay does:**
1. Payment link expires (15 minutes passed, no payment)
2. Razorpay sends webhook: `payment_link.expired`
3. Our server receives webhook

**In code (`handlePaymentLinkExpired` function):**

1. **Find Order**:
   ```javascript
   const order = await prisma.order.findUnique({
     where: { razorpayOrderId: "order_xyz123" }
   });
   // Order status: 'PENDING'
   ```

2. **Update Order Status**:
   ```javascript
   await prisma.order.update({
     where: { id: order.id },
     data: { status: 'EXPIRED' }  // ⏰ Payment link expired
   });
   ```

3. **Release Rooms** (Delete blocked records):
   ```javascript
   // Delete availability records (release the hold)
   await prisma.availability.deleteMany({
     where: {
       blockedBy: order.id,
       status: 'blocked'
     }
   });
   // Rooms are now available again! 🎉
   ```

**Result**: 
- ✅ Order status: 'EXPIRED'
- ✅ Rooms released (available again)
- ✅ No booking created

---

#### **❌ Outcome 3: Payment Link Cancelled**

**What Razorpay does:**
1. Customer cancels payment or admin cancels link
2. Razorpay sends webhook: `payment_link.cancelled`
3. Our server receives webhook

**In code (`handlePaymentLinkCancelled` function):**

Same as expired:
1. Update order status: 'CANCELLED'
2. Release rooms (delete blocked records)

**Result**: 
- ✅ Order status: 'CANCELLED'
- ✅ Rooms released (available again)
- ✅ No booking created

---

## 🔒 Security: Webhook Signature Verification

**Why it's important:**
- Anyone can send fake webhooks to our server
- We need to verify the webhook is really from Razorpay

**How it works:**

1. **Razorpay sends signature**:
   ```
   Headers:
   X-Razorpay-Signature: abc123def456...
   ```

2. **We verify signature**:
   ```javascript
   // Calculate expected signature
   const expectedSignature = crypto
     .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
     .update(rawBody)  // Raw request body
     .digest('hex');

   // Compare with received signature
   const isValid = crypto.timingSafeEqual(
     Buffer.from(receivedSignature, 'hex'),
     Buffer.from(expectedSignature, 'hex')
   );
   // ✅ Only process if signatures match
   ```

**Result**: Only authentic Razorpay webhooks are processed! 🔒

---

## 🧹 Automatic Cleanup (Background Job)

**What it does:**
- Runs every 60 seconds (configurable)
- Finds expired holds that weren't released by webhooks
- Releases them automatically

**In code (`frontdeskHoldCleanup.js`):**

```javascript
// Find expired blocked records
const expiredHolds = await prisma.availability.findMany({
  where: {
    status: 'blocked',
    holdExpiresAt: { lt: new Date() },  // Expired
    isDeleted: false
  }
});

// Check if order is still active
const activeOrders = await prisma.order.findMany({
  where: {
    id: { in: expiredHolds.map(h => h.blockedBy) },
    status: 'PENDING'  // Still waiting for payment
  }
});

// Release holds NOT tied to active orders
const holdsToRelease = expiredHolds.filter(
  hold => !activeOrders.some(order => order.id === hold.blockedBy)
);

// Delete expired holds
await prisma.availability.deleteMany({
  where: { id: { in: holdsToRelease.map(h => h.id) } }
});
```

**Why it's needed:**
- Webhooks might fail (network issues, server down)
- This ensures expired holds are always released
- Prevents rooms from being stuck in "blocked" state

---

## 📊 Database States

### **Order States:**
- `PENDING` → Waiting for payment
- `SUCCESS` → Payment successful, booking created
- `EXPIRED` → Payment link expired
- `CANCELLED` → Payment link cancelled
- `FAILED` → Payment failed

### **Availability States:**
- `available` → Room is available
- `blocked` → Room is held (waiting for payment)
- `booked` → Room is booked (payment confirmed)
- `maintenance` → Room is under maintenance
- `out_of_service` → Room is out of service

### **Booking States:**
- `pending` → Booking pending
- `confirmed` → Booking confirmed (payment received)
- `cancelled` → Booking cancelled
- `completed` → Stay completed

---

## 🔄 Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ STEP 1: Create Payment Link                                 │
├─────────────────────────────────────────────────────────────┤
│ Admin → Front Desk → Create Payment Link                    │
│   ├─ Create Razorpay Payment Link                           │
│   ├─ Save Order (status: PENDING)                           │
│   └─ Block Rooms (status: blocked)                          │
│   └─ Return Payment Link URL                                │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 2: Customer Pays                                        │
├─────────────────────────────────────────────────────────────┤
│ Customer → Payment Link → Razorpay → Payment                │
└─────────────────────────────────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                ▼                       ▼
    ┌───────────────────┐   ┌───────────────────┐
    │ Payment Success   │   │ Payment Failed    │
    │                   │   │ / Expired         │
    │ Webhook: paid     │   │ Webhook: expired  │
    └───────────────────┘   └───────────────────┘
                │                       │
                ▼                       ▼
    ┌───────────────────┐   ┌───────────────────┐
    │ Create Booking    │   │ Release Rooms     │
    │ Order: SUCCESS    │   │ Order: EXPIRED    │
    │ Room: booked      │   │ Room: available   │
    └───────────────────┘   └───────────────────┘
```

---

## 🎓 Key Concepts

### **1. Transaction (All or Nothing)**
```javascript
await prisma.$transaction(async (tx) => {
  // If ANY step fails, ALL steps are rolled back
  await tx.order.update(...);
  await tx.booking.create(...);
  await tx.availability.updateMany(...);
  // ✅ All succeed → Commit
  // ❌ Any fails → Rollback (nothing saved)
});
```

### **2. Idempotency (Safe to Retry)**
```javascript
// If webhook is called twice, we check:
if (order.status === 'SUCCESS') {
  return { skipped: true };  // Already processed, skip
}
// ✅ Prevents duplicate bookings
```

### **3. Webhook Signature (Security)**
```javascript
// Verify webhook is from Razorpay
const isValid = verifyWebhookSignature(rawBody, signature);
if (!isValid) {
  return res.status(401).json({ error: 'Invalid signature' });
}
// ✅ Prevents fake webhooks
```

---

## 🚀 Testing

### **Local Testing:**
1. Use ngrok/cloudflared to expose local server:
   ```bash
   ngrok http 5000
   # Get public URL: https://abc123.ngrok.io
   ```

2. Configure webhook in Razorpay Dashboard:
   - URL: `https://abc123.ngrok.io/webhooks/razorpay`
   - Events: `payment_link.paid`, `payment_link.expired`, `payment_link.cancelled`

3. Test payment:
   - Create payment link
   - Pay with test card
   - Check webhook logs

### **Production:**
1. Set `RAZORPAY_WEBHOOK_SECRET` in environment variables
2. Configure webhook URL in Razorpay Dashboard
3. Monitor webhook logs for errors

---

## ❓ Common Questions

### **Q: What if webhook fails?**
A: Razorpay retries webhooks. Also, cleanup job releases expired holds automatically.

### **Q: What if customer pays but webhook never arrives?**
A: Use Razorpay API to poll order status periodically, or customer can refresh booking page.

### **Q: Can we manually verify payment?**
A: Yes, use Razorpay API to check payment status:
```javascript
const payment = await razorpay.payments.fetch(paymentId);
if (payment.status === 'captured') {
  // Payment successful
}
```

### **Q: What if rooms are already booked?**
A: When creating payment link, we check if rooms are available. If not, payment link creation fails.

---

## 📝 Summary

1. **Create Payment Link** → Block rooms → Wait for payment
2. **Payment Success** → Create booking → Rooms booked
3. **Payment Failed/Expired** → Release rooms → Rooms available
4. **Webhook Security** → Verify signature → Process only authentic webhooks
5. **Automatic Cleanup** → Release expired holds → Prevent stuck rooms

**That's it! The complete flow from payment link creation to booking confirmation.** 🎉

