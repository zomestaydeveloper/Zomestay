# Communication Service Integration List
## SMS & Email Notifications - Complete Implementation Plan

---

## 📋 **INTEGRATION CHECKLIST**

### ✅ **1. USER/AGENT AUTHENTICATION (OTP)**

#### 1.1 User Login OTP (Phone Number)
- **Location**: `server/src/controllers/userController/auth.controller.js`
- **Function**: `sendOTP()` (Line ~35)
- **Current Status**: ✅ SMS already integrated
- **Action Required**:
  - ✅ SMS: Already sending OTP via SMS
  - ⚠️ **Email**: Send OTP via Email if user has email (optional enhancement)
- **Recipients**: 
  - SMS: User phone number
  - Email: User email (if available)

#### 1.2 User OTP Resend
- **Location**: `server/src/controllers/userController/auth.controller.js`
- **Function**: `resendOTP()` (Line ~226)
- **Current Status**: ✅ SMS already integrated
- **Action Required**: Same as 1.1

#### 1.3 Agent Login (Email/Password)
- **Location**: `server/src/controllers/agentController/auth.controller.js`
- **Function**: `login()` (Line ~131)
- **Current Status**: ❌ No notifications
- **Action Required**:
  - ⚠️ **SMS**: Send login notification SMS (optional security feature)
  - ⚠️ **Email**: Send login notification Email (optional security feature)
- **Recipients**: Agent phone & email

---

### ✅ **2. BOOKING CREATION & PAYMENT**

#### 2.1 Order Created (Payment Initiated)
- **Location**: `server/src/controllers/userController/payment.controller.js`
- **Function**: `createOrder()` (Line ~34)
- **Current Status**: ❌ No notifications
- **Action Required**:
  - ⚠️ **SMS**: Send order confirmation SMS to user/agent
  - ⚠️ **Email**: Send order confirmation Email to user/agent
  - ⚠️ **SMS**: Send booking notification SMS to property owner/host
  - ⚠️ **Email**: Send booking notification Email to property owner/host
- **Recipients**: 
  - User/Agent: Phone & Email
  - Property Owner/Host: Phone & Email
- **Message Content**: Order ID, Property name, Check-in/out dates, Amount, Payment link

#### 2.2 Payment Success (Booking Confirmed)
- **Location**: `server/src/controllers/userController/payment.controller.js`
- **Function**: `verifyPayment()` (Line ~586)
- **Current Status**: ❌ No notifications
- **Action Required**:
  - ⚠️ **SMS**: Send booking confirmation SMS to user/agent
  - ⚠️ **Email**: Send booking confirmation Email to user/agent (with booking details PDF)
  - ⚠️ **SMS**: Send booking confirmation SMS to property owner/host
  - ⚠️ **Email**: Send booking confirmation Email to property owner/host
- **Recipients**: 
  - User/Agent: Phone & Email
  - Property Owner/Host: Phone & Email
- **Message Content**: Booking number, Property details, Check-in/out, Guest details, Total amount, Booking confirmation

#### 2.3 Payment Failed
- **Location**: `server/src/controllers/payment/webhook.controller.js`
- **Function**: `handlePaymentFailed()` (Line ~301)
- **Current Status**: ❌ No notifications
- **Action Required**:
  - ⚠️ **SMS**: Send payment failure SMS to user/agent
  - ⚠️ **Email**: Send payment failure Email to user/agent
- **Recipients**: User/Agent: Phone & Email
- **Message Content**: Order ID, Failure reason, Retry payment link, Support contact

#### 2.4 Payment Webhook - Payment Captured
- **Location**: `server/src/controllers/payment/webhook.controller.js`
- **Function**: `handlePaymentCaptured()` (Line ~375)
- **Current Status**: ❌ No notifications
- **Action Required**:
  - ⚠️ **SMS**: Send booking confirmation SMS (same as 2.2)
  - ⚠️ **Email**: Send booking confirmation Email (same as 2.2)
- **Note**: This is backup notification in case frontend verification fails

---

### ✅ **3. CANCELLATION REQUESTS**

#### 3.1 Cancellation Request Submitted
- **Location**: `server/src/controllers/cancellationRequest/cancellationRequest.controller.js`
- **Function**: `createCancellationRequest()` (Line ~94)
- **Current Status**: ❌ No notifications
- **Action Required**:
  - ⚠️ **SMS**: Send notification SMS to Admin
  - ⚠️ **Email**: Send notification Email to Admin (with request details)
  - ⚠️ **SMS**: Send acknowledgment SMS to requester (user/agent/host)
  - ⚠️ **Email**: Send acknowledgment Email to requester
- **Recipients**: 
  - Admin: Phone & Email
  - Requester: Phone & Email
- **Message Content**: 
  - Admin: Booking details, Requester info, Reason, Contact number
  - Requester: Request submitted confirmation, Request ID

#### 3.2 Cancellation Request Approved
- **Location**: `server/src/controllers/cancellationRequest/cancellationRequest.controller.js`
- **Function**: `approveCancellationRequest()` (Line ~300+)
- **Current Status**: ❌ No notifications
- **Action Required**:
  - ⚠️ **SMS**: Send approval SMS to requester (user/agent/host)
  - ⚠️ **Email**: Send approval Email to requester (with refund details)
  - ⚠️ **SMS**: Send notification SMS to property owner (if cancelled by user/agent)
  - ⚠️ **Email**: Send notification Email to property owner
- **Recipients**: 
  - Requester: Phone & Email
  - Property Owner: Phone & Email (if applicable)
- **Message Content**: 
  - Requester: Cancellation approved, Refund amount, Refund timeline
  - Property Owner: Booking cancelled notification, Guest details

#### 3.3 Cancellation Request Rejected
- **Location**: `server/src/controllers/cancellationRequest/cancellationRequest.controller.js`
- **Function**: `rejectCancellationRequest()` (Line ~400+)
- **Current Status**: ❌ No notifications
- **Action Required**:
  - ⚠️ **SMS**: Send rejection SMS to requester
  - ⚠️ **Email**: Send rejection Email to requester (with admin notes/reason)
- **Recipients**: Requester: Phone & Email
- **Message Content**: Cancellation rejected, Reason, Contact support info

---

### ✅ **4. BOOKING STATUS UPDATES**

#### 4.1 Booking Cancelled (by Admin)
- **Location**: `server/src/components/shared/bookingList/bookingList.jsx` (Frontend)
- **Backend**: Need to check admin cancellation endpoint
- **Current Status**: ❌ No notifications
- **Action Required**:
  - ⚠️ **SMS**: Send cancellation SMS to user/agent
  - ⚠️ **Email**: Send cancellation Email to user/agent
  - ⚠️ **SMS**: Send notification SMS to property owner
  - ⚠️ **Email**: Send notification Email to property owner
- **Recipients**: 
  - User/Agent: Phone & Email
  - Property Owner: Phone & Email
- **Message Content**: Booking cancelled, Refund details (if applicable)

#### 4.2 Booking Completed
- **Location**: Need to identify where booking status changes to "completed"
- **Current Status**: ❌ No notifications
- **Action Required**:
  - ⚠️ **SMS**: Send completion SMS to user/agent (thank you message)
  - ⚠️ **Email**: Send completion Email with review request
  - ⚠️ **SMS**: Send completion SMS to property owner
  - ⚠️ **Email**: Send completion Email to property owner
- **Recipients**: 
  - User/Agent: Phone & Email
  - Property Owner: Phone & Email
- **Message Content**: 
  - User: Thank you, Review request link
  - Owner: Booking completed, Guest details

---

### ✅ **5. ADDITIONAL SCENARIOS (OPTIONAL)**

#### 5.1 Review Submitted
- **Location**: `server/src/controllers/ReviewController/review.controller.js`
- **Function**: `createReview()` or `updateReview()`
- **Current Status**: ❌ No notifications
- **Action Required**:
  - ⚠️ **Email**: Send notification Email to property owner (new review received)
- **Recipients**: Property Owner: Email
- **Message Content**: New review received, Rating, Review text

#### 5.2 Agent Status Changed (Approved/Rejected/Suspended)
- **Location**: `server/src/controllers/agentController/travelAgent.controller.js`
- **Function**: `updateAgentStatus()` (Line ~109)
- **Current Status**: ❌ No notifications
- **Action Required**:
  - ⚠️ **SMS**: Send status update SMS to agent
  - ⚠️ **Email**: Send status update Email to agent (with reason if rejected/suspended)
- **Recipients**: Agent: Phone & Email
- **Message Content**: Status change, Reason (if applicable), Next steps

#### 5.3 Password Reset (if implemented)
- **Location**: Need to check if password reset exists
- **Current Status**: ❌ Not implemented
- **Action Required**:
  - ⚠️ **SMS**: Send OTP for password reset
  - ⚠️ **Email**: Send password reset link/OTP

---

## 📊 **SUMMARY BY PRIORITY**

### 🔴 **HIGH PRIORITY** (Critical for user experience)
1. ✅ Booking Confirmation (Payment Success) - User/Agent & Host
2. ✅ Payment Failed Notification - User/Agent
3. ✅ Cancellation Request Approved/Rejected - Requester
4. ✅ Cancellation Request Submitted - Admin notification

### 🟡 **MEDIUM PRIORITY** (Important for operations)
5. ✅ Order Created (Payment Initiated) - User/Agent & Host
6. ✅ Booking Cancelled by Admin - User/Agent & Host
7. ✅ Booking Completed - User/Agent & Host

### 🟢 **LOW PRIORITY** (Nice to have)
8. ⚠️ Review Submitted - Property Owner
9. ⚠️ Agent Status Changed - Agent
10. ⚠️ Login Notifications - User/Agent

---

## 🔧 **IMPLEMENTATION NOTES**

### **Message Templates Needed**
1. **OTP Messages** (SMS & Email)
2. **Booking Confirmation** (SMS & Email)
3. **Payment Success** (SMS & Email)
4. **Payment Failed** (SMS & Email)
5. **Cancellation Request Submitted** (SMS & Email)
6. **Cancellation Approved** (SMS & Email)
7. **Cancellation Rejected** (SMS & Email)
8. **Booking Cancelled** (SMS & Email)
9. **Booking Completed** (SMS & Email)

### **Data Required from Database**
- User: `phone`, `email`, `firstname`, `lastname`
- Agent: `phone`, `email`, `firstName`, `lastName`
- Host: `phone`, `email` (from Property owner)
- Admin: `phone`, `email` (for cancellation notifications)
- Booking: `bookingNumber`, `checkIn`, `checkOut`, `totalAmount`, `status`
- Property: `title`, `address`, `ownerHostId`

### **Error Handling**
- If SMS fails, log error but don't fail the main operation
- If Email fails, log error but don't fail the main operation
- Use try-catch blocks around all notification calls
- Log all notification attempts (success/failure) for debugging

### **Testing Strategy**
1. Test with mock provider first
2. Test with Twilio (SMS) and Nodemailer (Email) in development
3. Verify all templates render correctly
4. Test error scenarios (invalid phone/email, provider failures)
5. Test with real bookings in staging environment

---

## 📝 **NEXT STEPS**

1. ✅ Create communication service providers (Twilio & Nodemailer) - **DONE**
2. ⚠️ Create message template utility/service
3. ⚠️ Integrate into payment controller (booking confirmation)
4. ⚠️ Integrate into cancellation request controller
5. ⚠️ Integrate into payment webhook handler
6. ⚠️ Test all integrations
7. ⚠️ Add error handling and logging
8. ⚠️ Create admin dashboard for notification logs (optional)

---

**Last Updated**: [Current Date]
**Status**: Ready for implementation

