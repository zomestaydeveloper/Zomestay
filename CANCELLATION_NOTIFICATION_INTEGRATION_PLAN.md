# Cancellation Request Notification Integration Plan
## Production-Ready Implementation

---

## 📋 **NOTIFICATION FLOW OVERVIEW**

### **Event 1: Cancellation Request Created**
**Location**: `createCancellationRequest()` - Line 190-236

**Recipients**:
1. **Requester** (User/Agent/Host): SMS + Email
2. **Admin** (All active admins): Email only

---

### **Event 2: Cancellation Request Approved**
**Location**: `approveCancellationRequest()` - Line 587-621

**Recipients**:
1. **Requester** (User/Agent/Host): SMS + Email
2. **Host** (Property owner): Email only

---

### **Event 3: Cancellation Request Rejected**
**Location**: `rejectCancellationRequest()` - Line 708-725

**Recipients**:
1. **Requester** (User/Agent/Host): SMS + Email only

---

## 🎯 **DETAILED INTEGRATION PLAN**

---

### **1. REQUEST CREATED NOTIFICATIONS**

#### **Integration Point**: `createCancellationRequest()` - After line 218 (after request created)

#### **Data Available**:
- `cancellationRequest` - Full request object with booking details
- `cancellationRequest.booking` - Booking object with property info
- `cancellationRequest.requestedBy` - Requester ID
- `cancellationRequest.role` - 'user', 'agent', or 'host'

#### **Recipients to Fetch**:

**A. Requester Contact Info**:
```javascript
// Priority order:
// 1. If role === 'user' → Fetch User by requestedBy → Use User.phone, User.email
// 2. If role === 'agent' → Fetch TravelAgent by requestedBy → Use TravelAgent.phone, TravelAgent.email
// 3. If role === 'host' → Fetch Host by requestedBy → Use Host.phone, Host.email
// Fallback: Use booking.guestPhone, booking.guestEmail
```

**B. Admin Contact Info**:
```javascript
// Fetch all active admins (status === 'ACTIVE', isDeleted === false)
// Use Admin.email for each admin
```

#### **Notification Content**:

**To Requester**:
- SMS: `cancellationRequestSubmitted` template
- Email: `cancellationRequestSubmitted` template
- Data: guestName, bookingNumber, propertyName, checkIn, checkOut, requestId, reason

**To Admin**:
- Email: `adminCancellationRequestNotification` template
- Data: bookingNumber, propertyName, requesterName, requesterRole, requesterEmail, requesterPhone, checkIn, checkOut, reason, customReason, requestId

---

### **2. REQUEST APPROVED NOTIFICATIONS**

#### **Integration Point**: `approveCancellationRequest()` - After line 621 (after transaction completes)

#### **Data Available**:
- `result` - Updated cancellation request with booking details
- `cancellationRequest.booking` - Booking object (before update)
- Need to fetch: Requester contact info, Host contact info

#### **Recipients to Fetch**:

**A. Requester Contact Info**:
```javascript
// Same logic as request created
// Fetch User/Agent/Host by cancellationRequest.requestedBy
```

**B. Host Contact Info**:
```javascript
// Fetch Host by booking.property.ownerHostId
// Use Host.email (email only, no SMS)
```

#### **Notification Content**:

**To Requester**:
- SMS: `cancellationApproved` template
- Email: `cancellationApproved` template
- Data: guestName, bookingNumber, propertyName, refundAmount, refundTimeline
- Note: refundAmount = booking.totalAmount (full refund for now, can be calculated based on policy later)

**To Host**:
- Email: `bookingCancelled` template (if exists) OR create new template
- Data: hostName, bookingNumber, propertyName, guestName, checkIn, checkOut, refundAmount
- Note: Inform host that booking was cancelled

---

### **3. REQUEST REJECTED NOTIFICATIONS**

#### **Integration Point**: `rejectCancellationRequest()` - After line 725 (after request updated)

#### **Data Available**:
- `updatedRequest` - Updated cancellation request
- `updatedRequest.booking` - Booking object
- Need to fetch: Requester contact info

#### **Recipients to Fetch**:

**A. Requester Contact Info**:
```javascript
// Same logic as request created
// Fetch User/Agent/Host by cancellationRequest.requestedBy
```

#### **Notification Content**:

**To Requester**:
- SMS: `cancellationRejected` template
- Email: `cancellationRejected` template
- Data: guestName, bookingNumber, propertyName, adminNotes

---

## 🏗️ **IMPLEMENTATION STRUCTURE**

### **Step 1: Create Helper Functions**

#### **A. Fetch Requester Contact Info**:
```javascript
/**
 * Fetch requester contact information based on role
 * @param {string} role - 'user', 'agent', or 'host'
 * @param {string} requestedBy - Requester ID
 * @param {object} booking - Booking object (for fallback)
 * @param {object} tx - Prisma transaction client (optional)
 * @returns {Promise<object>} { name, email, phone }
 */
const fetchRequesterContactInfo = async (role, requestedBy, booking, tx = prisma) => {
  const contactInfo = {
    name: booking?.guestName || 'Guest',
    email: booking?.guestEmail || null,
    phone: booking?.guestPhone || null,
  };

  try {
    if (role === 'user' && requestedBy) {
      const user = await tx.user.findUnique({
        where: { id: requestedBy, isDeleted: false },
        select: { email: true, phone: true, firstname: true, lastname: true }
      });
      if (user) {
        contactInfo.email = user.email || contactInfo.email;
        contactInfo.phone = user.phone || contactInfo.phone;
        if (user.firstname) {
          contactInfo.name = `${user.firstname}${user.lastname ? ' ' + user.lastname : ''}`;
        }
      }
    } else if (role === 'agent' && requestedBy) {
      const agent = await tx.travelAgent.findUnique({
        where: { id: requestedBy, isDeleted: false },
        select: { email: true, phone: true, firstName: true, lastName: true }
      });
      if (agent) {
        contactInfo.email = agent.email || contactInfo.email;
        contactInfo.phone = agent.phone || contactInfo.phone;
        if (agent.firstName) {
          contactInfo.name = `${agent.firstName}${agent.lastName ? ' ' + agent.lastName : ''}`;
        }
      }
    } else if (role === 'host' && requestedBy) {
      const host = await tx.host.findUnique({
        where: { id: requestedBy, isDeleted: false },
        select: { email: true, phone: true, firstName: true, lastName: true }
      });
      if (host) {
        contactInfo.email = host.email || contactInfo.email;
        contactInfo.phone = host.phone || contactInfo.phone;
        if (host.firstName) {
          contactInfo.name = `${host.firstName}${host.lastName ? ' ' + host.lastName : ''}`;
        }
      }
    }
  } catch (error) {
    console.error('Error fetching requester contact info:', error.message);
  }

  return contactInfo;
};
```

#### **B. Fetch Host Contact Info**:
```javascript
/**
 * Fetch host contact information
 * @param {string} propertyId - Property ID
 * @param {object} tx - Prisma transaction client (optional)
 * @returns {Promise<object>} { name, email }
 */
const fetchHostContactInfo = async (propertyId, tx = prisma) => {
  try {
    const property = await tx.property.findUnique({
      where: { id: propertyId },
      select: {
        ownerHostId: true,
        host: {
          select: {
            email: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    if (property?.host) {
      return {
        name: `${property.host.firstName || ''} ${property.host.lastName || ''}`.trim() || 'Property Owner',
        email: property.host.email
      };
    }
  } catch (error) {
    console.error('Error fetching host contact info:', error.message);
  }

  return { name: null, email: null };
};
```

#### **C. Fetch All Active Admins**:
```javascript
/**
 * Fetch all active admin emails
 * @param {object} tx - Prisma transaction client (optional)
 * @returns {Promise<Array<string>>} Array of admin emails
 */
const fetchActiveAdminEmails = async (tx = prisma) => {
  try {
    const admins = await tx.admin.findMany({
      where: {
        status: 'ACTIVE',
        isDeleted: false
      },
      select: { email: true }
    });
    return admins.map(admin => admin.email).filter(Boolean);
  } catch (error) {
    console.error('Error fetching active admin emails:', error.message);
    return [];
  }
};
```

---

### **Step 2: Notification Sending Functions**

#### **A. Send Request Created Notifications**:
```javascript
/**
 * Send notifications when cancellation request is created
 * @param {object} cancellationRequest - Cancellation request object
 * @param {object} requesterContact - Requester contact info
 * @param {Array<string>} adminEmails - Array of admin emails
 */
const sendRequestCreatedNotifications = async (cancellationRequest, requesterContact, adminEmails) => {
  try {
    const booking = cancellationRequest.booking;
    const requestData = {
      guestName: requesterContact.name,
      bookingNumber: booking.bookingNumber,
      propertyName: booking.property?.title || 'Property',
      checkIn: booking.startDate,
      checkOut: booking.endDate,
      requestId: cancellationRequest.id,
      reason: cancellationRequest.reason
    };

    // 1. Send to Requester (SMS + Email)
    if (requesterContact.phone && requesterContact.email) {
      try {
        const smsMessage = smsTemplates.cancellationRequestSubmitted({
          guestName: requesterContact.name,
          bookingNumber: booking.bookingNumber,
          requestId: cancellationRequest.id
        });

        const emailHTML = emailTemplates.cancellationRequestSubmitted(requestData);

        const smsProvider = process.env.SMS_PROVIDER || 'mock';
        const smsFrom = (smsProvider === 'twilio' && process.env.TWILIO_PHONE_NUMBER) 
          ? process.env.TWILIO_PHONE_NUMBER 
          : 'ZOMESSTAY';

        await smsService.send({
          to: requesterContact.phone,
          message: smsMessage,
          from: smsFrom
        });

        await emailService.send({
          to: requesterContact.email,
          subject: 'Cancellation Request Received - ZomesStay',
          content: emailHTML
        });
      } catch (error) {
        console.error('Failed to send requester notifications:', error.message);
      }
    }

    // 2. Send to All Admins (Email only)
    if (adminEmails.length > 0) {
      try {
        const adminEmailHTML = emailTemplates.adminCancellationRequestNotification({
          bookingNumber: booking.bookingNumber,
          propertyName: booking.property?.title || 'Property',
          requesterName: requesterContact.name,
          requesterRole: cancellationRequest.role,
          requesterEmail: requesterContact.email,
          requesterPhone: requesterContact.phone || cancellationRequest.contactNumber,
          checkIn: booking.startDate,
          checkOut: booking.endDate,
          reason: cancellationRequest.reason,
          customReason: cancellationRequest.customReason,
          requestId: cancellationRequest.id
        });

        await Promise.all(
          adminEmails.map(adminEmail =>
            emailService.send({
              to: adminEmail,
              subject: 'New Cancellation Request - ZomesStay',
              content: adminEmailHTML
            })
          )
        );
      } catch (error) {
        console.error('Failed to send admin notifications:', error.message);
      }
    }
  } catch (error) {
    console.error('Error sending request created notifications:', error.message);
  }
};
```

#### **B. Send Request Approved Notifications**:
```javascript
/**
 * Send notifications when cancellation request is approved
 * @param {object} cancellationRequest - Cancellation request object
 * @param {object} booking - Booking object
 * @param {object} requesterContact - Requester contact info
 * @param {object} hostContact - Host contact info
 */
const sendRequestApprovedNotifications = async (cancellationRequest, booking, requesterContact, hostContact) => {
  try {
    const refundAmount = booking.totalAmount; // Full refund for now
    const refundTimeline = '5-7 business days';

    const approvalData = {
      guestName: requesterContact.name,
      bookingNumber: booking.bookingNumber,
      propertyName: booking.property?.title || 'Property',
      refundAmount: refundAmount,
      refundTimeline: refundTimeline
    };

    // 1. Send to Requester (SMS + Email)
    if (requesterContact.phone && requesterContact.email) {
      try {
        const smsMessage = smsTemplates.cancellationApproved({
          guestName: requesterContact.name,
          bookingNumber: booking.bookingNumber,
          refundAmount: refundAmount,
          refundTimeline: refundTimeline
        });

        const emailHTML = emailTemplates.cancellationApproved(approvalData);

        const smsProvider = process.env.SMS_PROVIDER || 'mock';
        const smsFrom = (smsProvider === 'twilio' && process.env.TWILIO_PHONE_NUMBER) 
          ? process.env.TWILIO_PHONE_NUMBER 
          : 'ZOMESSTAY';

        await smsService.send({
          to: requesterContact.phone,
          message: smsMessage,
          from: smsFrom
        });

        await emailService.send({
          to: requesterContact.email,
          subject: 'Cancellation Approved - ZomesStay',
          content: emailHTML
        });
      } catch (error) {
        console.error('Failed to send requester approval notifications:', error.message);
      }
    }

    // 2. Send to Host (Email only)
    if (hostContact.email) {
      try {
        // Use bookingCancelled template or create new hostCancellationNotification template
        const hostEmailHTML = emailTemplates.bookingCancelled({
          hostName: hostContact.name,
          bookingNumber: booking.bookingNumber,
          propertyName: booking.property?.title || 'Property',
          guestName: booking.guestName,
          checkIn: booking.startDate,
          checkOut: booking.endDate,
          refundAmount: refundAmount
        });

        await emailService.send({
          to: hostContact.email,
          subject: 'Booking Cancelled - ZomesStay',
          content: hostEmailHTML
        });
      } catch (error) {
        console.error('Failed to send host cancellation notification:', error.message);
      }
    }
  } catch (error) {
    console.error('Error sending request approved notifications:', error.message);
  }
};
```

#### **C. Send Request Rejected Notifications**:
```javascript
/**
 * Send notifications when cancellation request is rejected
 * @param {object} cancellationRequest - Cancellation request object
 * @param {object} booking - Booking object
 * @param {object} requesterContact - Requester contact info
 */
const sendRequestRejectedNotifications = async (cancellationRequest, booking, requesterContact) => {
  try {
    const rejectionData = {
      guestName: requesterContact.name,
      bookingNumber: booking.bookingNumber,
      propertyName: booking.property?.title || 'Property',
      adminNotes: cancellationRequest.adminNotes
    };

    // Send to Requester (SMS + Email)
    if (requesterContact.phone && requesterContact.email) {
      try {
        const smsMessage = smsTemplates.cancellationRejected({
          guestName: requesterContact.name,
          bookingNumber: booking.bookingNumber,
          adminNotes: cancellationRequest.adminNotes
        });

        const emailHTML = emailTemplates.cancellationRejected(rejectionData);

        const smsProvider = process.env.SMS_PROVIDER || 'mock';
        const smsFrom = (smsProvider === 'twilio' && process.env.TWILIO_PHONE_NUMBER) 
          ? process.env.TWILIO_PHONE_NUMBER 
          : 'ZOMESSTAY';

        await smsService.send({
          to: requesterContact.phone,
          message: smsMessage,
          from: smsFrom
        });

        await emailService.send({
          to: requesterContact.email,
          subject: 'Cancellation Request Declined - ZomesStay',
          content: emailHTML
        });
      } catch (error) {
        console.error('Failed to send requester rejection notifications:', error.message);
      }
    }
  } catch (error) {
    console.error('Error sending request rejected notifications:', error.message);
  }
};
```

---

## ✅ **INTEGRATION CHECKLIST**

### **Step 1: Import Dependencies**
- [ ] Import communication services in `cancellationRequest.controller.js`
- [ ] Import Prisma models (User, TravelAgent, Host, Admin)

### **Step 2: Create Helper Functions**
- [ ] Create `fetchRequesterContactInfo()` function
- [ ] Create `fetchHostContactInfo()` function
- [ ] Create `fetchActiveAdminEmails()` function
- [ ] Create `sendRequestCreatedNotifications()` function
- [ ] Create `sendRequestApprovedNotifications()` function
- [ ] Create `sendRequestRejectedNotifications()` function

### **Step 3: Integrate in Controllers**
- [ ] Add notification code after `createCancellationRequest()` (line ~218)
- [ ] Add notification code after `approveCancellationRequest()` (line ~621)
- [ ] Add notification code after `rejectCancellationRequest()` (line ~725)
- [ ] Wrap all notification code in try-catch (non-blocking)

### **Step 4: Error Handling**
- [ ] All notification code wrapped in try-catch
- [ ] Don't fail API response if notifications fail
- [ ] Log errors for debugging
- [ ] Handle missing email/phone gracefully

### **Step 5: Testing**
- [ ] Test user cancellation request flow
- [ ] Test agent cancellation request flow
- [ ] Test host cancellation request flow
- [ ] Test admin approval flow
- [ ] Test admin rejection flow
- [ ] Verify all notifications are sent correctly

---

## 📊 **NOTIFICATION SUMMARY**

| Event | Requester | Admin | Host |
|-------|-----------|-------|------|
| **Request Created** | SMS + Email | Email (all) | - |
| **Request Approved** | SMS + Email | - | Email |
| **Request Rejected** | SMS + Email | - | - |

---

## 🔧 **PRODUCTION CONSIDERATIONS**

1. **Non-blocking**: Notifications should NOT fail the API response
2. **Error Handling**: Wrap all notification code in try-catch
3. **Data Validation**: Check if email/phone exists before sending
4. **Performance**: Fetch all data efficiently, use parallel sending where possible
5. **Logging**: Log notification attempts and failures for monitoring
6. **Idempotency**: Notifications are idempotent (can be sent multiple times safely)

---

**Last Updated**: [Current Date]
**Status**: Ready for implementation


