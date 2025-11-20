# Booking Communication Integration Plan
## Complete Study & Implementation Plan

---

## 📋 **BOOKING FLOW ANALYSIS**

### **Flow 1: User/Agent Booking**
```
1. User/Agent selects rooms → Frontend
2. createOrder() → payment.controller.js
   - Creates Order in database
   - Blocks rooms in Availability table
   - Returns Razorpay order details
3. User pays via Razorpay → Razorpay Gateway
4. Razorpay sends webhook → payment.captured event
5. handlePaymentCaptured() → webhook.controller.js
   - Calls createBookingFromOrder() service
6. createBookingFromOrder() → bookingCreation.service.js
   - Creates Booking in database ✅
   - Creates Payment record
   - Converts blocked rooms to booked
   - Returns booking details
7. ✅ SEND NOTIFICATIONS HERE (after booking created)
```

### **Flow 2: Admin/Host Direct Booking**
```
1. Admin/Host creates payment link → createPaymentLink() → paymentLink.controller.js
   - Creates Order in database
   - Blocks rooms in Availability table
   - Creates Razorpay payment link
   - Returns payment link URL
2. Guest pays via payment link → Razorpay Gateway
3. Razorpay sends webhook → payment_link.paid event
4. handlePaymentLinkPaid() → webhook.controller.js
   - Calls createBookingFromOrder() service
5. createBookingFromOrder() → bookingCreation.service.js
   - Creates Booking in database ✅
   - Creates Payment record
   - Converts blocked rooms to booked
   - Returns booking details
6. ✅ SEND NOTIFICATIONS HERE (after booking created)
```

### **Flow 3: Payment Failed**
```
1. Payment fails → Razorpay Gateway
2. Razorpay sends webhook → payment.failed event
3. handlePaymentFailed() → webhook.controller.js
   - Updates Order status to FAILED
   - Releases blocked rooms
   - Returns result
4. ✅ SEND NOTIFICATIONS HERE (after payment fails)
```

---

## 🎯 **INTEGRATION POINTS**

### **✅ 1. BOOKING CREATED (Payment Success)**

#### **Location**: `server/src/controllers/payment/webhook.controller.js`

#### **Integration Points** (2 places - same logic):

**A. After `handlePaymentCaptured()` (User/Agent bookings)**
- **Function**: `handlePaymentCaptured()`
- **Line**: After line 122 (after `createBookingFromOrder()` returns)
- **After**: `const result = await prisma.$transaction(...)`
- **Before**: `return { event: 'payment.captured', ... }`

**B. After `handlePaymentLinkPaid()` (Admin/Host bookings)**
- **Function**: `handlePaymentLinkPaid()`
- **Line**: After line 265 (after `createBookingFromOrder()` returns)
- **After**: `const result = await prisma.$transaction(...)`
- **Before**: `return { event: 'payment_link.paid', ... }`

#### **Data Available**:
- `result.booking` - Full booking object with all details
- `result.bookingNumber` - Booking number
- `order` - Order object (need to fetch full order with property, guest details)
- Need to fetch: `order.property.ownerHostId` for host details

#### **Recipients**:
1. **User/Agent** (who made booking):
   - Phone: `order.guestPhone`
   - Email: `order.guestEmail`
   - Name: `order.guestName`

2. **Host/Property Owner**:
   - Fetch from `order.property.ownerHostId`
   - Phone: `host.phone`
   - Email: `host.email`
   - Name: `host.firstName + host.lastName`

---

### **✅ 2. PAYMENT FAILED**

#### **Location**: `server/src/controllers/payment/webhook.controller.js`

#### **Integration Point**:
- **Function**: `handlePaymentFailed()`
- **Line**: After line 349 (after transaction completes, rooms released)
- **After**: `const result = await prisma.$transaction(...)`
- **Before**: `return { event: 'payment.failed', ... }`

#### **Data Available**:
- `order.id` - Order ID
- Need to fetch full order: `order.guestEmail`, `order.guestPhone`, `order.guestName`, `order.amount`, `order.property`

#### **Recipients**:
1. **User/Agent Only** (who tried to book):
   - Phone: `order.guestPhone`
   - Email: `order.guestEmail`
   - Name: `order.guestName`

2. **Host**: ❌ Do NOT send (payment failed, no booking)

---

## 📝 **IMPLEMENTATION DETAILS**

### **1. Booking Created Notifications**

#### **Where**: In `webhook.controller.js` - Both `handlePaymentCaptured()` and `handlePaymentLinkPaid()`

#### **Code Structure**:
```javascript
// After createBookingFromOrder() returns successfully
// After line 122 (handlePaymentCaptured) or line 265 (handlePaymentLinkPaid)

try {
  // Fetch full order details with property and host info
  const fullOrder = await prisma.order.findUnique({
    where: { id: order.id },
    include: {
      property: {
        include: {
          host: {
            select: {
              id: true,
              phone: true,
              email: true,
              firstName: true,
              lastName: true
            }
          }
        }
      },
      roomSelections: true
    }
  });

  if (!fullOrder) {
    console.error('Order not found for notifications');
    return; // Don't fail webhook if order fetch fails
  }

  // Prepare booking data for templates
  const bookingData = {
    bookingNumber: result.bookingNumber,
    guestName: fullOrder.guestName,
    guestEmail: fullOrder.guestEmail,
    guestPhone: fullOrder.guestPhone,
    propertyName: fullOrder.property.title,
    propertyAddress: fullOrder.property.address || '',
    checkIn: fullOrder.checkIn,
    checkOut: fullOrder.checkOut,
    nights: Math.ceil((fullOrder.checkOut - fullOrder.checkIn) / (1000 * 60 * 60 * 24)),
    guests: fullOrder.guests,
    children: fullOrder.children || 0,
    totalAmount: fullOrder.amount / 100, // Convert from paise
    roomDetails: fullOrder.roomSelections.map(rs => ({
      roomTypeName: rs.roomTypeName,
      rooms: rs.rooms,
      guests: rs.guests,
      children: rs.children || 0,
      mealPlan: rs.mealPlanId ? 'Included' : 'Not included',
      price: rs.price / 100
    })),
    paymentMethod: 'Online Payment'
  };

  // Send to user/agent
  if (fullOrder.guestEmail && fullOrder.guestPhone) {
    const guestSMS = smsTemplates.bookingConfirmation(bookingData);
    const guestEmailHTML = emailTemplates.bookingConfirmation(bookingData);
    
    await smsService.send({ to: fullOrder.guestPhone, message: guestSMS });
    await emailService.send({ 
      to: fullOrder.guestEmail, 
      subject: 'Booking Confirmation - ZomesStay',
      content: guestEmailHTML 
    });
  }

  // Send to host
  if (fullOrder.property.host && fullOrder.property.host.phone && fullOrder.property.host.email) {
    const hostData = {
      hostName: `${fullOrder.property.host.firstName} ${fullOrder.property.host.lastName}`,
      ...bookingData
    };
    
    const hostSMS = smsTemplates.bookingNotificationToHost(hostData);
    const hostEmailHTML = emailTemplates.bookingNotificationToHost(hostData);
    
    await smsService.send({ to: fullOrder.property.host.phone, message: hostSMS });
    await emailService.send({ 
      to: fullOrder.property.host.email, 
      subject: 'New Booking Received - ZomesStay',
      content: hostEmailHTML 
    });
  }
} catch (error) {
  // Don't fail webhook if notifications fail
  console.error('Failed to send booking confirmation notifications:', error.message);
}
```

---

### **2. Payment Failed Notifications**

#### **Where**: In `webhook.controller.js` - `handlePaymentFailed()`

#### **Code Structure**:
```javascript
// After line 349, before return statement
try {
  // Fetch full order details
  const fullOrder = await prisma.order.findUnique({
    where: { id: order.id },
    include: { property: true }
  });

  if (fullOrder && fullOrder.guestEmail && fullOrder.guestPhone) {
    const paymentData = {
      guestName: fullOrder.guestName,
      orderId: fullOrder.razorpayOrderId,
      amount: fullOrder.amount / 100,
      reason: 'Payment could not be processed',
      retryLink: null // Can add retry link if needed
    };

    const smsMessage = smsTemplates.paymentFailed(paymentData);
    const emailHTML = emailTemplates.paymentFailed(paymentData);

    await smsService.send({ to: fullOrder.guestPhone, message: smsMessage });
    await emailService.send({ 
      to: fullOrder.guestEmail, 
      subject: 'Payment Failed - ZomesStay',
      content: emailHTML 
    });
  }
} catch (error) {
  // Don't fail webhook if notifications fail
  console.error('Failed to send payment failure notifications:', error.message);
}
```

---

## 📊 **BOOKING TYPES HANDLED**

| Booking Type | Flow | Webhook Event | Handler Function | Notification Recipients |
|--------------|------|---------------|-------------------|------------------------|
| **User Booking** | createOrder → payment | `payment.captured` | `handlePaymentCaptured()` | User + Host |
| **Agent Booking** | createOrder → payment | `payment.captured` | `handlePaymentCaptured()` | Agent + Host |
| **Admin Direct Booking** | createPaymentLink | `payment_link.paid` | `handlePaymentLinkPaid()` | Guest + Host |
| **Host Direct Booking** | createPaymentLink | `payment_link.paid` | `handlePaymentLinkPaid()` | Guest + Host |
| **Payment Failed (Any)** | Any payment fails | `payment.failed` | `handlePaymentFailed()` | User/Agent/Guest only |

---

## 🔍 **DATA STRUCTURE**

### **Order Object** (from database):
```javascript
{
  id: string,
  razorpayOrderId: string,
  propertyId: string,
  guestName: string,
  guestEmail: string,
  guestPhone: string,
  guestId: string | null, // User/Agent ID
  createdByType: 'user' | 'agent' | null, // null = frontdesk
  createdById: string | null, // Admin/Host ID (if frontdesk)
  checkIn: Date,
  checkOut: Date,
  guests: number,
  children: number,
  amount: number, // in paise
  currency: string,
  property: {
    id: string,
    title: string,
    address: string,
    ownerHostId: string, // Host ID
    host: {
      id: string,
      phone: string,
      email: string,
      firstName: string,
      lastName: string
    }
  },
  roomSelections: [
    {
      roomTypeName: string,
      rooms: number,
      guests: number,
      children: number,
      mealPlanId: string | null,
      price: number, // in paise
      tax: number, // in paise
      totalPrice: number // in paise
    }
  ]
}
```

### **Booking Object** (from createBookingFromOrder):
```javascript
{
  id: string,
  bookingNumber: string,
  orderId: string,
  propertyId: string,
  userId: string | null, // If user booking
  agentId: string | null, // If agent booking
  guestName: string,
  guestEmail: string,
  guestPhone: string,
  startDate: Date,
  endDate: Date,
  nights: number,
  adults: number,
  children: number,
  rooms: number,
  totalAmount: number, // in rupees
  status: 'confirmed',
  bookingRoomSelections: [...]
}
```

---

## ✅ **IMPLEMENTATION CHECKLIST**

### **Step 1: Import Communication Services**
- [ ] Add imports to `webhook.controller.js`:
  ```javascript
  const { smsService, emailService, smsTemplates, emailTemplates } = require('../../services/communication');
  ```

### **Step 2: Booking Created Notifications**
- [ ] Add notification code after `handlePaymentCaptured()` (line ~122)
- [ ] Add notification code after `handlePaymentLinkPaid()` (line ~265)
- [ ] Fetch full order with property and host details
- [ ] Send SMS + Email to user/agent
- [ ] Send SMS + Email to host
- [ ] Handle errors gracefully

### **Step 3: Payment Failed Notifications**
- [ ] Add notification code after `handlePaymentFailed()` (line ~349)
- [ ] Fetch full order details
- [ ] Send SMS + Email to user/agent/guest
- [ ] Handle errors gracefully

### **Step 4: Testing**
- [ ] Test user booking flow
- [ ] Test agent booking flow
- [ ] Test admin direct booking flow
- [ ] Test host direct booking flow
- [ ] Test payment failed flow
- [ ] Verify all notifications are sent correctly

---

## ⚠️ **IMPORTANT NOTES**

1. **Non-blocking**: Notifications should NOT fail the webhook
2. **Error Handling**: Wrap all notification code in try-catch
3. **Data Fetching**: Need to fetch full order details (not just order.id)
4. **Host Lookup**: Need to fetch host from `property.ownerHostId` or `property.host`
5. **Amount Conversion**: Convert from paise (order.amount) to rupees (divide by 100)
6. **Date Formatting**: Templates handle date formatting automatically
7. **Room Details**: Map `order.roomSelections` to template format
8. **Idempotency**: Check `result.alreadyProcessed` - don't send duplicate notifications

---

## 🎯 **SUMMARY**

### **Integration Points**:
1. ✅ **Booking Created**: `webhook.controller.js` - After `createBookingFromOrder()` returns (2 places)
2. ✅ **Payment Failed**: `webhook.controller.js` - After `handlePaymentFailed()` completes

### **All Booking Types Covered**:
- ✅ User bookings
- ✅ Agent bookings  
- ✅ Admin direct bookings
- ✅ Host direct bookings
- ✅ Payment failures

---

**Last Updated**: [Current Date]
**Status**: Ready for implementation


