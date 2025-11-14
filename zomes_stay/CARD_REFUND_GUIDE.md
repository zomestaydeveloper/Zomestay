# Card Payment Refund Guide

## How Card Refunds Work in Razorpay

### ✅ **Key Point: NO Account Details Needed!**

When a user pays using a **card**, Razorpay **automatically refunds** to the **same card** used for payment. You don't need:
- ❌ Card number
- ❌ Account number
- ❌ IFSC code
- ❌ UPI ID
- ❌ Any customer details

**All you need is:**
- ✅ Razorpay Payment ID (`razorpay_payment_id`)
- ✅ Refund amount (optional - omit for full refund)

---

## How It Works

### Step 1: Razorpay Stores Card Details
When a payment is made via card, Razorpay automatically stores:
- Card token (for refund)
- Last 4 digits of card
- Card type (Visa, Mastercard, etc.)
- Card network

### Step 2: Refund Process
When you initiate a refund:
1. Razorpay uses the stored card token
2. Refunds to the same card automatically
3. Takes 5-7 business days to reflect
4. User gets notification from their bank

---

## Implementation Code

### 1. Create Refund Endpoint

```javascript
// server/src/controllers/payment.controller.js

const refundPayment = async (req, res) => {
  try {
    const { paymentId, amount, bookingId, reason } = req.body;
    
    // Validate payment ID
    if (!paymentId) {
      return res.status(400).json({
        success: false,
        message: 'Payment ID is required'
      });
    }

    // Find the payment in database
    const payment = await prisma.payment.findFirst({
      where: {
        transactionID: paymentId, // This is razorpay_payment_id
        isDeleted: false
      },
      include: {
        booking: true
      }
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Check if already refunded
    if (payment.status === 'REFUNDED' || payment.status === 'PARTIAL_REFUND') {
      return res.status(400).json({
        success: false,
        message: 'Payment already refunded'
      });
    }

    // Fetch payment details from Razorpay to check original payment method
    const razorpayPayment = await razorpay.payments.fetch(paymentId);
    
    console.log('Payment Method:', razorpayPayment.method); // 'card', 'upi', 'netbanking', etc.
    console.log('Card Details:', razorpayPayment.card); // Last 4 digits, type, etc.

    // Calculate refund amount
    const refundAmount = amount 
      ? Math.round(amount * 100) // Convert rupees to paise if partial refund
      : razorpayPayment.amount; // Full refund (amount in paise)

    // Check if refund amount exceeds payment amount
    if (refundAmount > razorpayPayment.amount) {
      return res.status(400).json({
        success: false,
        message: 'Refund amount cannot exceed payment amount'
      });
    }

    // Initiate refund - Razorpay automatically handles card refund
    const refund = await razorpay.payments.refund(paymentId, {
      amount: refundAmount, // Omit for full refund, or specify amount in paise
      speed: 'normal', // 'normal' (5-7 days) or 'optimum' (faster, higher fees)
      notes: {
        reason: reason || 'Customer cancellation',
        bookingId: bookingId || payment.bookingId,
        refundedBy: 'system' // or admin/host ID
      }
    });

    // Update payment status in database
    const isFullRefund = refundAmount === razorpayPayment.amount;
    
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: isFullRefund ? 'REFUNDED' : 'PARTIAL_REFUND',
        // Store refund details if you add these fields to Payment model
        refundId: refund.id,
        refundAmount: refund.amount / 100, // Convert from paise to rupees
        refundDate: new Date(),
        refundStatus: refund.status, // 'pending', 'processed', 'failed'
        refundReason: reason
      }
    });

    // Update booking status if full refund
    if (isFullRefund && payment.bookingId) {
      await prisma.booking.update({
        where: { id: payment.bookingId },
        data: {
          status: 'CANCELLED',
          cancellationDate: new Date(),
          cancellationReason: reason || 'Customer cancellation'
        }
      });

      // Release rooms (if needed)
      // ... room release logic
    }

    res.json({
      success: true,
      message: 'Refund initiated successfully',
      data: {
        refundId: refund.id,
        refundAmount: refund.amount / 100, // In rupees
        status: refund.status,
        paymentMethod: razorpayPayment.method, // 'card', 'upi', etc.
        estimatedTime: razorpayPayment.method === 'card' 
          ? '5-7 business days' 
          : 'Instant to 24 hours'
      }
    });

  } catch (error) {
    console.error('Refund Error:', error);
    
    // Handle Razorpay API errors
    if (error.error) {
      return res.status(400).json({
        success: false,
        message: error.error.description || 'Refund failed',
        error: error.error
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to process refund',
      error: error.message
    });
  }
};
```

---

## Example: Full Refund (Card Payment)

```javascript
// POST /api/payments/refund
{
  "paymentId": "pay_ABC123xyz",  // Razorpay payment ID
  "bookingId": "booking-123",
  "reason": "Customer cancellation"
  // No amount specified = full refund
}

// Response:
{
  "success": true,
  "message": "Refund initiated successfully",
  "data": {
    "refundId": "rfnd_XYZ789",
    "refundAmount": 5000,  // Full amount
    "status": "processed",
    "paymentMethod": "card",
    "estimatedTime": "5-7 business days"
  }
}
```

---

## Example: Partial Refund (Card Payment)

```javascript
// POST /api/payments/refund
{
  "paymentId": "pay_ABC123xyz",
  "amount": 2500,  // Partial refund (in rupees)
  "bookingId": "booking-123",
  "reason": "Partial cancellation"
}

// Response:
{
  "success": true,
  "message": "Refund initiated successfully",
  "data": {
    "refundId": "rfnd_XYZ789",
    "refundAmount": 2500,  // Partial amount
    "status": "processed",
    "paymentMethod": "card",
    "estimatedTime": "5-7 business days"
  }
}
```

---

## Fetch Payment Details (Check Original Payment Method)

```javascript
// Check what payment method was used
const payment = await razorpay.payments.fetch('pay_ABC123xyz');

console.log(payment.method); // 'card', 'upi', 'netbanking', 'wallet'
console.log(payment.card);   // Card details (if card payment)
// {
//   id: "card_xxx",
//   entity: "card",
//   name: "Visa",
//   last4: "1234",
//   network: "Visa",
//   type: "credit",
//   issuer: "HDFC",
//   international: false,
//   emi: false,
//   sub_type: "consumer"
// }

// For card payments, Razorpay automatically refunds to this card
// No additional information needed!
```

---

## Refund Timing for Cards

| Payment Method | Refund Time | Account Details Needed? |
|---------------|-------------|------------------------|
| **Card** | 5-7 business days | ❌ No |
| UPI | Instant to 24 hours | ❌ No |
| Netbanking | 5-7 business days | ❌ No |
| Wallet | Usually instant | ❌ No |

---

## Update Database Schema

Add refund tracking fields to Payment model:

```prisma
model Payment {
  // ... existing fields
  transactionID String   @unique  // This is razorpay_payment_id
  
  // Refund fields
  refundId        String?   // Razorpay refund ID
  refundAmount    Decimal?  // Refunded amount (in rupees)
  refundStatus    String?   // 'pending', 'processed', 'failed'
  refundDate      DateTime?
  refundReason    String?
  
  // Store original payment method for reference
  paymentMethodType String? // 'card', 'upi', 'netbanking', 'wallet'
  cardLast4        String?  // Last 4 digits (if card payment)
}
```

---

## Complete Refund Flow

```javascript
// 1. User cancels booking
// 2. System checks cancellation policy
// 3. Calculate refund amount
// 4. Call refund API with payment ID
// 5. Razorpay automatically refunds to card
// 6. Update database
// 7. Notify user

async function processCancellation(bookingId) {
  // 1. Find booking and payment
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { payments: true }
  });

  // 2. Get the payment
  const payment = booking.payments[0]; // Assuming one payment per booking
  
  // 3. Check cancellation policy
  const refundAmount = calculateRefundAmount(booking);
  
  // 4. Initiate refund (automatically to card)
  const refund = await razorpay.payments.refund(payment.transactionID, {
    amount: refundAmount ? Math.round(refundAmount * 100) : undefined, // Paise
    speed: 'normal',
    notes: {
      reason: 'Booking cancellation',
      bookingId: bookingId
    }
  });

  // 5. Update database
  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: 'REFUNDED',
      refundId: refund.id,
      refundAmount: refund.amount / 100,
      refundDate: new Date()
    }
  });

  // 6. Update booking
  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: 'CANCELLED',
      cancellationDate: new Date()
    }
  });

  // 7. Notify user
  // ... send email/SMS notification
}
```

---

## Important Points

### ✅ **What You DON'T Need:**
- Card number
- CVV
- Expiry date
- Account number
- IFSC code
- UPI ID
- Any customer bank details

### ✅ **What You DO Need:**
- Razorpay Payment ID (`razorpay_payment_id`)
- Refund amount (optional)

### ✅ **How Razorpay Handles It:**
1. You call `razorpay.payments.refund(paymentId)`
2. Razorpay looks up the original payment
3. Finds the card token from that payment
4. Refunds to the same card automatically
5. User gets notification from their bank

### ✅ **Refund Time:**
- **Card**: 5-7 business days (bank processing time)
- **UPI**: Instant to 24 hours
- **Netbanking**: 5-7 business days

---

## Testing in Razorpay Test Mode

```javascript
// Use test payment IDs
const testPaymentId = 'pay_test_ABC123';

// Refund will work in test mode
const refund = await razorpay.payments.refund(testPaymentId, {
  amount: 500000, // 5000 rupees in paise
  speed: 'normal'
});
```

---

## Error Handling

```javascript
try {
  const refund = await razorpay.payments.refund(paymentId, {
    amount: refundAmount
  });
} catch (error) {
  if (error.error?.code === 'BAD_REQUEST_ERROR') {
    // Payment already refunded or invalid payment ID
    console.error('Refund failed:', error.error.description);
  } else if (error.error?.code === 'GATEWAY_ERROR') {
    // Razorpay gateway error
    console.error('Gateway error:', error.error.description);
  } else {
    // Other errors
    console.error('Unknown error:', error);
  }
}
```

---

## Summary

**For Card Payments:**
1. ✅ **NO account details needed** - Razorpay handles it automatically
2. ✅ **Just need payment ID** - That's it!
3. ✅ **Refunds to same card** - Automatically
4. ✅ **Takes 5-7 days** - Bank processing time
5. ✅ **Simple API call** - `razorpay.payments.refund(paymentId)`

**Code Example:**
```javascript
// That's it! This refunds to the card automatically
const refund = await razorpay.payments.refund('pay_ABC123', {
  // amount: 500000,  // Optional: omit for full refund
  speed: 'normal',
  notes: { reason: 'Cancellation' }
});
```

**No account number, no IFSC, no UPI ID needed!** 🎉

