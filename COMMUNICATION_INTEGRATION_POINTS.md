# Communication Integration Points
## Exact Locations for SMS/Email Integration

---

## ✅ **1. PAYMENT SUCCESS (Booking Confirmed)**

### **Location**: `server/src/controllers/userController/payment.controller.js`
### **Function**: `verifyPayment()` 
### **Integration Point**: After booking is successfully created (around line 1055-1080)

### **When to Send**:
- ✅ After booking is successfully created in database
- ✅ After payment record is created
- ✅ After transaction completes successfully

### **Where to Add Code**:
```javascript
// After line 1055 (inside verifyPayment function, after transaction completes)
// After this line:
return {
  booking, // Single booking
  bookingNumber,
  blockedRooms: blockedRooms.length,
  alreadyProcessed: false
};

// ADD HERE: Send notifications after successful booking creation
```

### **Exact Location**:
- **Line ~1073-1092**: After `result` is returned from transaction
- **After**: `console.log('[${requestId}] Payment verified successfully')`
- **Before**: `res.json({ success: true, ... })`

### **Data Available**:
- `result.booking` - Full booking object with all details
- `result.bookingNumber` - Booking number
- `order.guestEmail` - Guest email
- `order.guestPhone` - Guest phone
- `order.guestName` - Guest name
- `order.property` - Property details (includes ownerHostId)
- `order.roomSelections` - Room selection details
- `order.checkIn`, `order.checkOut` - Dates
- `order.amount` - Total amount
- `createdByType` - 'agent', 'user', or null

### **Recipients**:
1. **User/Agent** (who made booking):
   - Phone: `order.guestPhone`
   - Email: `order.guestEmail`
   - Name: `order.guestName`

2. **Host/Property Owner**:
   - Need to fetch from `order.property.ownerHostId`
   - Fetch host details from database

### **Templates to Use**:
- **User/Agent**: `emailTemplates.bookingConfirmation()` + `smsTemplates.bookingConfirmation()`
- **Host**: `emailTemplates.bookingNotificationToHost()` + `smsTemplates.bookingNotificationToHost()`

---

## ✅ **2. PAYMENT FAILED**

### **Location**: `server/src/controllers/payment/webhook.controller.js`
### **Function**: `handlePaymentFailed()`
### **Integration Point**: After payment fails and rooms are released (around line 349-360)

### **When to Send**:
- ✅ After order status is updated to 'FAILED'
- ✅ After rooms are released
- ✅ After transaction completes

### **Where to Add Code**:
```javascript
// After line 349 (inside handlePaymentFailed function, after transaction completes)
// After this line:
const releasedCount = await releaseOrderHolds(order.id, tx);
return releasedCount;

// ADD HERE: Send notifications after payment failure
```

### **Exact Location**:
- **Line ~351-360**: After `result` is returned from transaction
- **After**: `console.log('[${requestId}] ✅ Payment failed: Order ${order.id}')`
- **Before**: `return { event: 'payment.failed', ... }`

### **Data Available**:
- `order.id` - Order ID
- Need to fetch full order details: `order.guestEmail`, `order.guestPhone`, `order.guestName`, `order.amount`, etc.
- Need to fetch order with: `include: { property: true }`

### **Recipients**:
1. **User/Agent Only** (who tried to book):
   - Phone: `order.guestPhone`
   - Email: `order.guestEmail`
   - Name: `order.guestName`

2. **Host**: ❌ Do NOT send (payment failed, no booking)

### **Templates to Use**:
- **User/Agent**: `emailTemplates.paymentFailed()` + `smsTemplates.paymentFailed()`

---

## 📋 **IMPLEMENTATION CHECKLIST**

### **Payment Success Integration**:
- [ ] Import communication services at top of `payment.controller.js`
- [ ] Fetch host details (phone, email, name) from `order.property.ownerHostId`
- [ ] Prepare booking data for templates
- [ ] Send SMS + Email to user/agent using `bookingConfirmation` templates
- [ ] Send SMS + Email to host using `bookingNotificationToHost` templates
- [ ] Handle errors gracefully (don't fail payment if notification fails)
- [ ] Add try-catch around notification code

### **Payment Failed Integration**:
- [ ] Import communication services at top of `webhook.controller.js`
- [ ] Fetch full order details (guestEmail, guestPhone, guestName, amount)
- [ ] Prepare payment failure data for templates
- [ ] Send SMS + Email to user/agent using `paymentFailed` templates
- [ ] Handle errors gracefully (don't fail webhook if notification fails)
- [ ] Add try-catch around notification code

---

## 🔧 **CODE STRUCTURE**

### **Payment Success** (in `verifyPayment`):
```javascript
// After line 1073, before res.json()
try {
  // Fetch host details
  const host = await prisma.host.findUnique({
    where: { id: order.property.ownerHostId },
    select: { phone: true, email: true, firstName: true, lastName: true }
  });

  // Prepare booking data
  const bookingData = {
    bookingNumber: result.bookingNumber,
    guestName: order.guestName,
    guestEmail: order.guestEmail,
    guestPhone: order.guestPhone,
    propertyName: order.property.title,
    propertyAddress: order.property.address,
    checkIn: order.checkIn,
    checkOut: order.checkOut,
    nights: Math.ceil((order.checkOut - order.checkIn) / (1000 * 60 * 60 * 24)),
    guests: order.guests,
    children: order.children || 0,
    totalAmount: order.amount / 100,
    roomDetails: order.roomSelections.map(rs => ({
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
  const guestSMS = smsTemplates.bookingConfirmation(bookingData);
  const guestEmailHTML = emailTemplates.bookingConfirmation(bookingData);
  
  await smsService.send({ to: order.guestPhone, message: guestSMS });
  await emailService.send({ 
    to: order.guestEmail, 
    subject: 'Booking Confirmation - ZomesStay',
    content: guestEmailHTML 
  });

  // Send to host
  if (host) {
    const hostData = {
      hostName: `${host.firstName} ${host.lastName}`,
      ...bookingData
    };
    
    const hostSMS = smsTemplates.bookingNotificationToHost(hostData);
    const hostEmailHTML = emailTemplates.bookingNotificationToHost(hostData);
    
    await smsService.send({ to: host.phone, message: hostSMS });
    await emailService.send({ 
      to: host.email, 
      subject: 'New Booking Received - ZomesStay',
      content: hostEmailHTML 
    });
  }
} catch (error) {
  // Don't fail payment if notification fails
  console.error('Failed to send booking confirmation notifications:', error.message);
}
```

### **Payment Failed** (in `handlePaymentFailed`):
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
  // Don't fail webhook if notification fails
  console.error('Failed to send payment failure notifications:', error.message);
}
```

---

## ⚠️ **IMPORTANT NOTES**

1. **Error Handling**: Always wrap notification code in try-catch
2. **Non-blocking**: Don't fail payment/webhook if notifications fail
3. **Data Validation**: Check if email/phone exists before sending
4. **Host Lookup**: Need to fetch host details from database
5. **Amount Conversion**: Convert from paise (order.amount) to rupees (divide by 100)
6. **Date Formatting**: Templates handle date formatting automatically
7. **Room Details**: Map `order.roomSelections` to template format

---

**Last Updated**: [Current Date]
**Status**: Ready for implementation


