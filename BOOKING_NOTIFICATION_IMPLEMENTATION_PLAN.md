# Booking Notification Implementation Plan
## Production-Ready SMS/Email Integration

---

## 📋 **NOTIFICATION REQUIREMENTS**

### **Recipients & Channels**:
1. **User/Agent** (who made booking):
   - ✅ SMS + Email

2. **Host** (property owner):
   - ✅ Email only (no SMS)

3. **Admin** (all active admins):
   - ✅ Email only (no SMS)

---

## 🔍 **DATA FETCHING STRATEGY**

### **Available in Order**:
- `order.guestEmail` - Guest email (may be from order form)
- `order.guestPhone` - Guest phone (may be from order form)
- `order.guestName` - Guest name
- `order.guestId` - User/Agent ID (if logged in)
- `order.createdByType` - 'user', 'agent', or null (frontdesk)
- `order.propertyId` - Property ID
- `order.property.ownerHostId` - Host ID

### **Data We Need to Fetch**:

#### **1. User/Agent Contact Info**:
```javascript
// Priority order:
// 1. If createdByType === 'user' → Fetch User by guestId → Use User.phone, User.email
// 2. If createdByType === 'agent' → Fetch TravelAgent by guestId → Use TravelAgent.phone, TravelAgent.email
// 3. Fallback → Use order.guestEmail, order.guestPhone
```

#### **2. Host Contact Info**:
```javascript
// Fetch Host by property.ownerHostId
// Use Host.email (email only, no SMS)
```

#### **3. Admin Contact Info**:
```javascript
// Fetch all active admins (status === 'ACTIVE', isDeleted === false)
// Use Admin.email for each admin (email only, no SMS)
```

---

## 📍 **INTEGRATION POINTS**

### **1. Booking Created (Payment Success)**

#### **Location**: `server/src/controllers/payment/webhook.controller.js`

#### **Two Functions** (same logic for both):

**A. `handlePaymentCaptured()` - User/Agent Bookings**
- **Line**: After line 122 (after booking creation completes)
- **After**: `const result = await prisma.$transaction(...)`
- **Before**: `return { event: 'payment.captured', ... }`

**B. `handlePaymentLinkPaid()` - Admin/Host Direct Bookings**
- **Line**: After line 265 (after booking creation completes)
- **After**: `const result = await prisma.$transaction(...)`
- **Before**: `return { event: 'payment_link.paid', ... }`

---

## 🏗️ **IMPLEMENTATION STRUCTURE**

### **Step 1: Create Helper Function**

Create a reusable function to fetch all notification recipients:

```javascript
// In webhook.controller.js or separate service file

/**
 * Fetch notification recipients for booking confirmation
 * @param {object} order - Order object with relations
 * @param {object} booking - Booking object
 * @param {object} tx - Prisma transaction client (optional)
 * @returns {Promise<object>} Recipients object
 */
const fetchNotificationRecipients = async (order, booking, tx = prisma) => {
  const recipients = {
    guest: {
      name: order.guestName || 'Guest',
      email: null,
      phone: null,
    },
    host: {
      name: null,
      email: null,
    },
    admins: [] // Array of admin emails
  };

  try {
    // 1. Fetch User/Agent contact info
    if (order.createdByType === 'user' && order.guestId) {
      const user = await tx.user.findUnique({
        where: { id: order.guestId, isDeleted: false },
        select: { email: true, phone: true, firstname: true, lastname: true }
      });
      if (user) {
        recipients.guest.email = user.email || order.guestEmail;
        recipients.guest.phone = user.phone || order.guestPhone;
        if (user.firstname) {
          recipients.guest.name = `${user.firstname}${user.lastname ? ' ' + user.lastname : ''}`;
        }
      }
    } else if (order.createdByType === 'agent' && order.guestId) {
      const agent = await tx.travelAgent.findUnique({
        where: { id: order.guestId, isDeleted: false },
        select: { email: true, phone: true, firstName: true, lastName: true }
      });
      if (agent) {
        recipients.guest.email = agent.email || order.guestEmail;
        recipients.guest.phone = agent.phone || order.guestPhone;
        if (agent.firstName) {
          recipients.guest.name = `${agent.firstName}${agent.lastName ? ' ' + agent.lastName : ''}`;
        }
      }
    }

    // Fallback to order guest details if user/agent not found
    if (!recipients.guest.email) {
      recipients.guest.email = order.guestEmail;
    }
    if (!recipients.guest.phone) {
      recipients.guest.phone = order.guestPhone;
    }

    // 2. Fetch Host contact info
    if (order.property?.ownerHostId) {
      const host = await tx.host.findUnique({
        where: { id: order.property.ownerHostId, isDeleted: false },
        select: { email: true, firstName: true, lastName: true }
      });
      if (host) {
        recipients.host.email = host.email;
        recipients.host.name = `${host.firstName || ''} ${host.lastName || ''}`.trim() || 'Property Owner';
      }
    }

    // 3. Fetch all active admins
    const activeAdmins = await tx.admin.findMany({
      where: {
        status: 'ACTIVE',
        isDeleted: false
      },
      select: { email: true }
    });
    recipients.admins = activeAdmins.map(admin => admin.email).filter(Boolean);

    return recipients;
  } catch (error) {
    console.error('Error fetching notification recipients:', error.message);
    // Return partial data if fetch fails
    return recipients;
  }
};
```

---

### **Step 2: Create Notification Sending Function**

```javascript
/**
 * Send booking confirmation notifications
 * @param {object} order - Full order object with relations
 * @param {object} booking - Booking object
 * @param {object} recipients - Recipients object from fetchNotificationRecipients
 * @param {string} requestId - Request ID for logging
 */
const sendBookingConfirmationNotifications = async (order, booking, recipients, requestId) => {
  try {
    // Prepare booking data for templates
    const nights = Math.ceil((order.checkOut - order.checkIn) / (1000 * 60 * 60 * 24));
    
    const bookingData = {
      bookingNumber: booking.bookingNumber,
      guestName: recipients.guest.name,
      propertyName: order.property?.title || 'Property',
      propertyAddress: order.property?.location?.address || '',
      checkIn: order.checkIn,
      checkOut: order.checkOut,
      nights: nights,
      guests: order.guests,
      children: order.children || 0,
      totalAmount: order.amount / 100, // Convert from paise to rupees
      roomDetails: order.roomSelections?.map(rs => ({
        roomTypeName: rs.roomTypeName,
        rooms: rs.rooms,
        guests: rs.guests,
        children: rs.children || 0,
        mealPlan: rs.mealPlanId ? 'Included' : 'Not included',
        price: rs.price / 100
      })) || [],
      paymentMethod: 'Online Payment'
    };

    // 1. Send SMS + Email to User/Agent
    if (recipients.guest.phone && recipients.guest.email) {
      try {
        const guestSMS = smsTemplates.bookingConfirmation(bookingData);
        const guestEmailHTML = emailTemplates.bookingConfirmation(bookingData);

        await smsService.send({
          to: recipients.guest.phone,
          message: guestSMS
        });

        await emailService.send({
          to: recipients.guest.email,
          subject: 'Booking Confirmation - ZomesStay',
          content: guestEmailHTML
        });

        console.log(`[${requestId}] ✅ Booking confirmation sent to guest`, {
          email: recipients.guest.email,
          phone: recipients.guest.phone
        });
      } catch (error) {
        console.error(`[${requestId}] Failed to send guest notifications:`, error.message);
      }
    }

    // 2. Send Email to Host
    if (recipients.host.email) {
      try {
        const hostData = {
          hostName: recipients.host.name,
          ...bookingData
        };

        const hostEmailHTML = emailTemplates.bookingNotificationToHost(hostData);

        await emailService.send({
          to: recipients.host.email,
          subject: 'New Booking Received - ZomesStay',
          content: hostEmailHTML
        });

        console.log(`[${requestId}] ✅ Booking notification sent to host`, {
          email: recipients.host.email
        });
      } catch (error) {
        console.error(`[${requestId}] Failed to send host notification:`, error.message);
      }
    }

    // 3. Send Email to all Admins
    if (recipients.admins.length > 0) {
      try {
        const adminEmailHTML = emailTemplates.adminBookingNotification({
          bookingNumber: booking.bookingNumber,
          propertyName: bookingData.propertyName,
          guestName: bookingData.guestName,
          guestEmail: recipients.guest.email,
          guestPhone: recipients.guest.phone,
          checkIn: bookingData.checkIn,
          checkOut: bookingData.checkOut,
          totalAmount: bookingData.totalAmount
        });

        // Send to all admins in parallel
        await Promise.all(
          recipients.admins.map(adminEmail =>
            emailService.send({
              to: adminEmail,
              subject: 'New Booking Confirmed - ZomesStay',
              content: adminEmailHTML
            })
          )
        );

        console.log(`[${requestId}] ✅ Booking notification sent to ${recipients.admins.length} admin(s)`);
      } catch (error) {
        console.error(`[${requestId}] Failed to send admin notifications:`, error.message);
      }
    }

  } catch (error) {
    console.error(`[${requestId}] Error sending booking confirmation notifications:`, error.message);
    // Don't throw - notifications are non-critical
  }
};
```

---

### **Step 3: Integration in Webhook Handlers**

#### **In `handlePaymentCaptured()`** (after line 122):

```javascript
// After booking creation completes successfully
// After: const result = await prisma.$transaction(...)

// Check if booking was already processed (idempotency)
if (!result.alreadyProcessed) {
  try {
    // Fetch full order with all relations needed for notifications
    const fullOrder = await prisma.order.findUnique({
      where: { id: order.id },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            ownerHostId: true,
            location: true
          }
        },
        roomSelections: {
          select: {
            roomTypeName: true,
            rooms: true,
            guests: true,
            children: true,
            mealPlanId: true,
            price: true,
            tax: true,
            totalPrice: true
          }
        }
      }
    });

    if (fullOrder) {
      // Fetch notification recipients
      const recipients = await fetchNotificationRecipients(fullOrder, result.booking);
      
      // Send notifications (non-blocking)
      sendBookingConfirmationNotifications(fullOrder, result.booking, recipients, requestId)
        .catch(error => {
          console.error(`[${requestId}] Notification sending failed (non-critical):`, error.message);
        });
    }
  } catch (error) {
    console.error(`[${requestId}] Failed to send notifications (non-critical):`, error.message);
    // Don't fail webhook if notifications fail
  }
}
```

#### **Same logic in `handlePaymentLinkPaid()`** (after line 265)

---

## 📊 **DATA FLOW DIAGRAM**

```
Booking Created Successfully
    ↓
Fetch Full Order (with property, roomSelections)
    ↓
Fetch Notification Recipients:
    ├─→ User/Agent: Fetch by guestId (if logged in)
    │   └─→ Fallback: Use order.guestEmail, order.guestPhone
    ├─→ Host: Fetch by property.ownerHostId
    └─→ Admins: Fetch all active admins
    ↓
Send Notifications (Parallel):
    ├─→ User/Agent: SMS + Email
    ├─→ Host: Email only
    └─→ Admins: Email only (all active admins)
    ↓
Log Results (Success/Failure)
```

---

## ✅ **IMPLEMENTATION CHECKLIST**

### **Step 1: Create Admin Booking Notification Template**
- [ ] Add `adminBookingNotification` template to `emailTemplate.service.js`
- [ ] Template should include: booking number, property name, guest details, dates, amount

### **Step 2: Import Dependencies**
- [ ] Import communication services in `webhook.controller.js`
- [ ] Import Prisma models (User, TravelAgent, Host, Admin)

### **Step 3: Create Helper Functions**
- [ ] Create `fetchNotificationRecipients()` function
- [ ] Create `sendBookingConfirmationNotifications()` function
- [ ] Handle all edge cases (missing data, fetch failures)

### **Step 4: Integrate in Webhook Handlers**
- [ ] Add notification code after `handlePaymentCaptured()` (line ~122)
- [ ] Add notification code after `handlePaymentLinkPaid()` (line ~265)
- [ ] Check `result.alreadyProcessed` to avoid duplicate notifications
- [ ] Fetch full order with required relations
- [ ] Wrap in try-catch (non-blocking)

### **Step 5: Error Handling**
- [ ] All notification code wrapped in try-catch
- [ ] Don't fail webhook if notifications fail
- [ ] Log errors for debugging
- [ ] Handle missing email/phone gracefully

### **Step 6: Testing**
- [ ] Test user booking flow
- [ ] Test agent booking flow
- [ ] Test admin direct booking flow
- [ ] Test host direct booking flow
- [ ] Test with missing guest data
- [ ] Test with missing host data
- [ ] Verify all notifications are sent correctly

---

## 🔧 **PRODUCTION CONSIDERATIONS**

### **1. Performance**:
- Fetch all data in single query (use `include`)
- Send notifications in parallel (don't await sequentially)
- Non-blocking (don't await notification sending)

### **2. Error Handling**:
- Never fail webhook if notifications fail
- Log all errors for monitoring
- Graceful degradation (send what we can)

### **3. Data Validation**:
- Check if email/phone exists before sending
- Validate email format
- Validate phone format (E.164)

### **4. Idempotency**:
- Check `result.alreadyProcessed` before sending
- Don't send duplicate notifications

### **5. Logging**:
- Log notification attempts
- Log success/failure
- Include requestId for tracing

---

## 📝 **CODE STRUCTURE SUMMARY**

```javascript
// In webhook.controller.js

// After booking creation (line ~122 or ~265)
if (!result.alreadyProcessed) {
  // 1. Fetch full order
  const fullOrder = await prisma.order.findUnique({
    where: { id: order.id },
    include: { property: {...}, roomSelections: {...} }
  });

  // 2. Fetch recipients
  const recipients = await fetchNotificationRecipients(fullOrder, result.booking);

  // 3. Send notifications (non-blocking)
  sendBookingConfirmationNotifications(fullOrder, result.booking, recipients, requestId)
    .catch(error => console.error('Notification failed:', error.message));
}
```

---

## 🎯 **RECIPIENT SUMMARY**

| Recipient | SMS | Email | Data Source |
|-----------|-----|-------|-------------|
| **User** | ✅ | ✅ | User table (by guestId) or order.guestEmail/Phone |
| **Agent** | ✅ | ✅ | TravelAgent table (by guestId) or order.guestEmail/Phone |
| **Host** | ❌ | ✅ | Host table (by property.ownerHostId) |
| **Admin** | ❌ | ✅ | Admin table (all active admins) |

---

**Last Updated**: [Current Date]
**Status**: Ready for implementation

