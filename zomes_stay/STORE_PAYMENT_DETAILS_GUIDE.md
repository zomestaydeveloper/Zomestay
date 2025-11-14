# Storing Payment Details from Razorpay

## Quick Answer

✅ **YES - You can store certain payment details**  
❌ **NO - You cannot store full card numbers (PCI DSS violation)**

---

## What You CAN Store (Safe & Recommended)

### ✅ **Safe to Store:**

1. **Payment Method Type**
   - `'card'`, `'upi'`, `'netbanking'`, `'wallet'`

2. **Card Information (Partial)**
   - Last 4 digits of card
   - Card type (Visa, Mastercard, etc.)
   - Card network
   - Card issuer (HDFC, SBI, etc.)

3. **UPI ID**
   - Full UPI ID (e.g., `user@paytm`, `user@phonepe`)

4. **Razorpay Payment IDs**
   - `razorpay_payment_id`
   - `razorpay_order_id`
   - `razorpay_signature`

5. **Payment Amount & Status**
   - Amount paid
   - Currency
   - Payment status

6. **Card Token (for Saved Cards)**
   - Razorpay card token (if using saved cards feature)

---

## What You CANNOT Store (Security Risk)

### ❌ **NEVER Store:**

1. **Full Card Number** (16 digits)
   - Violates PCI DSS compliance
   - Huge security risk
   - Legal liability

2. **CVV/CVV2**
   - Never stored by Razorpay
   - Cannot be retrieved

3. **Card Expiry Date**
   - Can be stored but not recommended
   - Not needed for refunds

4. **Full Bank Account Number**
   - Only store if user explicitly provides for refunds
   - Not needed for automatic refunds

---

## What Razorpay Provides in Payment Response

When you fetch payment details from Razorpay, you get:

```javascript
const payment = await razorpay.payments.fetch('pay_ABC123');

// Payment object structure:
{
  id: "pay_ABC123",
  entity: "payment",
  amount: 500000,  // In paise
  currency: "INR",
  status: "captured",
  method: "card",  // or "upi", "netbanking", "wallet"
  
  // Card details (if card payment)
  card: {
    id: "card_xxx",
    entity: "card",
    name: "Visa",
    last4: "1234",           // ✅ Safe to store
    network: "Visa",
    type: "credit",          // or "debit"
    issuer: "HDFC",
    international: false,
    emi: false,
    sub_type: "consumer"
  },
  
  // UPI details (if UPI payment)
  vpa: "user@paytm",         // ✅ Safe to store
  
  // Bank details (if netbanking)
  bank: "HDFC",
  
  // Wallet details (if wallet payment)
  wallet: "paytm",
  
  // Customer details
  contact: "+919876543210",
  email: "user@example.com",
  
  // Notes (if you passed any)
  notes: {
    bookingId: "booking-123"
  },
  
  // Timestamps
  created_at: 1234567890
}
```

---

## Implementation: Store Payment Details

### Step 1: Update Database Schema

```prisma
model Payment {
  id                String   @id @default(uuid())
  transactionID     String   @unique  // razorpay_payment_id
  
  // Payment details
  amount            Decimal  @db.Decimal(10, 2)
  currency          String   @default("INR")
  status            String   // 'SUCCESS', 'FAILED', 'REFUNDED'
  
  // Payment method type
  paymentMethodType String?  // 'card', 'upi', 'netbanking', 'wallet'
  
  // Card details (if card payment)
  cardLast4         String?  // Last 4 digits (e.g., "1234")
  cardType          String?  // 'credit', 'debit'
  cardNetwork       String?  // 'Visa', 'Mastercard', 'Rupay'
  cardIssuer        String?  // 'HDFC', 'SBI', etc.
  cardToken         String?  // Razorpay card token (for saved cards)
  
  // UPI details (if UPI payment)
  upiId             String?  // Full UPI ID (e.g., "user@paytm")
  
  // Bank details (if netbanking)
  bankName          String?  // Bank name
  
  // Wallet details (if wallet payment)
  walletName        String?  // Wallet name
  
  // Razorpay IDs
  razorpayOrderId   String?
  razorpaySignature String?
  
  // Customer details
  customerId        String?
  customerEmail     String?
  customerPhone     String?
  
  // Refund details
  refundId          String?
  refundAmount      Decimal?
  refundStatus      String?
  
  // Timestamps
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  // Relations
  bookingId         String?
  booking           Booking? @relation(fields: [bookingId], references: [id])
}
```

---

### Step 2: Fetch and Store Payment Details

Update your `verifyPayment` function to fetch and store payment method details:

```javascript
// server/src/controllers/payment.controller.js

const verifyPayment = async (req, res) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
    
    // ... existing validation code ...

    if (generated_signature === razorpay_signature) {
      // Fetch payment details from Razorpay
      const razorpayPayment = await razorpay.payments.fetch(razorpay_payment_id);
      
      // Extract payment method details
      const paymentMethodDetails = extractPaymentMethodDetails(razorpayPayment);
      
      // ... existing booking creation code ...

      // Create payment record with all details
      const payment = await tx.payment.create({
        data: {
          transactionID: razorpay_payment_id,
          razorpayOrderId: razorpay_order_id,
          razorpaySignature: razorpay_signature,
          
          // Basic payment info
          amount: razorpayPayment.amount / 100, // Convert paise to rupees
          currency: razorpayPayment.currency,
          status: razorpayPayment.status === 'captured' ? 'SUCCESS' : 'FAILED',
          
          // Payment method type
          paymentMethodType: razorpayPayment.method, // 'card', 'upi', etc.
          
          // Card details (if card payment)
          cardLast4: paymentMethodDetails.cardLast4,
          cardType: paymentMethodDetails.cardType,
          cardNetwork: paymentMethodDetails.cardNetwork,
          cardIssuer: paymentMethodDetails.cardIssuer,
          cardToken: paymentMethodDetails.cardToken, // For saved cards
          
          // UPI details (if UPI payment)
          upiId: paymentMethodDetails.upiId,
          
          // Bank details (if netbanking)
          bankName: paymentMethodDetails.bankName,
          
          // Wallet details (if wallet payment)
          walletName: paymentMethodDetails.walletName,
          
          // Customer details
          customerEmail: razorpayPayment.email,
          customerPhone: razorpayPayment.contact,
          
          // Booking reference
          bookingId: bookings[0].id
        }
      });

      // ... rest of the code ...
    }
  } catch (error) {
    // ... error handling ...
  }
};

// Helper function to extract payment method details
function extractPaymentMethodDetails(razorpayPayment) {
  const details = {
    cardLast4: null,
    cardType: null,
    cardNetwork: null,
    cardIssuer: null,
    cardToken: null,
    upiId: null,
    bankName: null,
    walletName: null
  };

  // Card payment
  if (razorpayPayment.method === 'card' && razorpayPayment.card) {
    details.cardLast4 = razorpayPayment.card.last4;
    details.cardType = razorpayPayment.card.type; // 'credit' or 'debit'
    details.cardNetwork = razorpayPayment.card.network; // 'Visa', 'Mastercard', etc.
    details.cardIssuer = razorpayPayment.card.issuer; // 'HDFC', 'SBI', etc.
    
    // Card token (if using saved cards feature)
    if (razorpayPayment.card.id) {
      details.cardToken = razorpayPayment.card.id; // This is the card token
    }
  }

  // UPI payment
  if (razorpayPayment.method === 'upi' && razorpayPayment.vpa) {
    details.upiId = razorpayPayment.vpa; // Full UPI ID
  }

  // Netbanking payment
  if (razorpayPayment.method === 'netbanking' && razorpayPayment.bank) {
    details.bankName = razorpayPayment.bank;
  }

  // Wallet payment
  if (razorpayPayment.method === 'wallet' && razorpayPayment.wallet) {
    details.walletName = razorpayPayment.wallet;
  }

  return details;
}
```

---

## Using Saved Cards (Razorpay Feature)

### Option 1: Save Card Token for Future Use

Razorpay provides a card token that can be saved for future payments:

```javascript
// After payment, save the card token
const cardToken = razorpayPayment.card.id; // e.g., "card_ABC123"

// Store in database
await prisma.savedCard.create({
  data: {
    userId: userId,
    cardToken: cardToken,
    cardLast4: razorpayPayment.card.last4,
    cardType: razorpayPayment.card.type,
    cardNetwork: razorpayPayment.card.network,
    cardIssuer: razorpayPayment.card.issuer,
    isDefault: false
  }
});
```

### Option 2: Use Razorpay's Saved Cards Feature

Razorpay has a built-in saved cards feature. Enable it in Razorpay dashboard:

```javascript
// In frontend Razorpay options
const options = {
  key: 'rzp_test_xxx',
  amount: 500000,
  name: 'Zomes Stay',
  handler: function(response) {
    // Payment success
  },
  // Enable saved cards
  prefill: {
    name: 'User Name',
    email: 'user@example.com',
    contact: '+919876543210'
  },
  // Show saved cards option
  modal: {
    save: true  // Enable save card option
  }
};
```

---

## Complete Example: Store Payment Details

```javascript
// Complete implementation

const verifyPayment = async (req, res) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
    
    // ... signature verification ...

    if (generated_signature === razorpay_signature) {
      // Fetch detailed payment info from Razorpay
      const razorpayPayment = await razorpay.payments.fetch(razorpay_payment_id);
      
      console.log('Payment Method:', razorpayPayment.method);
      console.log('Card Details:', razorpayPayment.card);
      console.log('UPI ID:', razorpayPayment.vpa);
      console.log('Bank:', razorpayPayment.bank);
      console.log('Wallet:', razorpayPayment.wallet);

      const result = await prisma.$transaction(async (tx) => {
        // ... create booking ...

        // Extract payment method details
        const paymentDetails = {
          paymentMethodType: razorpayPayment.method,
          cardLast4: razorpayPayment.card?.last4 || null,
          cardType: razorpayPayment.card?.type || null,
          cardNetwork: razorpayPayment.card?.network || null,
          cardIssuer: razorpayPayment.card?.issuer || null,
          cardToken: razorpayPayment.card?.id || null, // For saved cards
          upiId: razorpayPayment.vpa || null,
          bankName: razorpayPayment.bank || null,
          walletName: razorpayPayment.wallet || null
        };

        // Create payment record with all details
        const payment = await tx.payment.create({
          data: {
            transactionID: razorpay_payment_id,
            razorpayOrderId: razorpay_order_id,
            razorpaySignature: razorpay_signature,
            amount: razorpayPayment.amount / 100,
            currency: razorpayPayment.currency,
            status: razorpayPayment.status === 'captured' ? 'SUCCESS' : 'FAILED',
            paymentMethodType: paymentDetails.paymentMethodType,
            cardLast4: paymentDetails.cardLast4,
            cardType: paymentDetails.cardType,
            cardNetwork: paymentDetails.cardNetwork,
            cardIssuer: paymentDetails.cardIssuer,
            cardToken: paymentDetails.cardToken,
            upiId: paymentDetails.upiId,
            bankName: paymentDetails.bankName,
            walletName: paymentDetails.walletName,
            customerEmail: razorpayPayment.email,
            customerPhone: razorpayPayment.contact,
            bookingId: bookings[0].id
          }
        });

        // Optionally save card for future use
        if (paymentDetails.cardToken && userId) {
          // Check if card already saved
          const existingCard = await tx.savedCard.findFirst({
            where: {
              userId: userId,
              cardToken: paymentDetails.cardToken
            }
          });

          if (!existingCard) {
            await tx.savedCard.create({
              data: {
                userId: userId,
                cardToken: paymentDetails.cardToken,
                cardLast4: paymentDetails.cardLast4,
                cardType: paymentDetails.cardType,
                cardNetwork: paymentDetails.cardNetwork,
                cardIssuer: paymentDetails.cardIssuer,
                isDefault: false
              }
            });
          }
        }

        return { bookings, payment, bookingNumber };
      });

      res.json({
        success: true,
        message: 'Payment verified and details saved',
        data: {
          paymentId: razorpay_payment_id,
          paymentMethod: razorpayPayment.method,
          cardLast4: razorpayPayment.card?.last4,
          upiId: razorpayPayment.vpa,
          bookingId: result.bookings[0].id
        }
      });
    }
  } catch (error) {
    // ... error handling ...
  }
};
```

---

## Database Schema for Saved Cards

```prisma
model SavedCard {
  id          String   @id @default(uuid())
  userId      String   @db.Char(36)
  cardToken   String   @unique  // Razorpay card token
  cardLast4   String   // Last 4 digits
  cardType    String   // 'credit' or 'debit'
  cardNetwork String   // 'Visa', 'Mastercard', etc.
  cardIssuer  String?  // Bank name
  isDefault   Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  user        User     @relation(fields: [userId], references: [id])
  
  @@index([userId])
}
```

---

## Using Saved Cards for Future Payments

```javascript
// Use saved card token for future payments
const savedCard = await prisma.savedCard.findFirst({
  where: { userId: userId, isDefault: true }
});

// Create order with saved card
const order = await razorpay.orders.create({
  amount: 500000,
  currency: 'INR',
  method: 'card',
  card_id: savedCard.cardToken  // Use saved card token
});

// Or in frontend Razorpay options
const options = {
  key: 'rzp_test_xxx',
  amount: 500000,
  method: 'card',
  card_id: savedCard.cardToken,  // Use saved card
  handler: function(response) {
    // Payment success
  }
};
```

---

## Summary

### ✅ **What You CAN Store:**
- Payment method type (`card`, `upi`, `netbanking`, `wallet`)
- Last 4 digits of card
- Card type, network, issuer
- Card token (for saved cards)
- UPI ID (full)
- Bank name
- Wallet name
- Razorpay payment IDs

### ❌ **What You CANNOT Store:**
- Full card number (16 digits)
- CVV
- Card expiry date (not recommended)
- Full bank account number (unless user provides for refunds)

### 🔒 **Security Best Practices:**
1. **Never store full card numbers** - Use last 4 digits only
2. **Use card tokens** - Razorpay provides tokens for saved cards
3. **Encrypt sensitive data** - If storing, encrypt in database
4. **PCI DSS compliance** - Don't handle card data directly
5. **Use Razorpay's saved cards** - Let Razorpay handle card storage

---

## Example: Display Payment Method in UI

```javascript
// Frontend: Display payment method
function PaymentMethodDisplay({ payment }) {
  if (payment.paymentMethodType === 'card') {
    return (
      <div>
        <span>Card ending in {payment.cardLast4}</span>
        <span>{payment.cardNetwork} {payment.cardType}</span>
      </div>
    );
  }
  
  if (payment.paymentMethodType === 'upi') {
    return (
      <div>
        <span>UPI: {payment.upiId}</span>
      </div>
    );
  }
  
  if (payment.paymentMethodType === 'netbanking') {
    return (
      <div>
        <span>Netbanking: {payment.bankName}</span>
      </div>
    );
  }
  
  return <div>{payment.paymentMethodType}</div>;
}
```

---

**Key Takeaway**: Razorpay provides safe payment method details that you can store. Use card tokens for saved cards, and never store full card numbers!

