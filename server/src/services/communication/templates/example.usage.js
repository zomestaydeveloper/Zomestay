/**
 * Example Usage of Email and SMS Templates
 * This file demonstrates how to use templates in controllers
 */

const { emailTemplates, smsTemplates, emailService, smsService } = require('../index');

/**
 * Example 1: Send OTP via SMS and Email
 */
async function sendOTPExample() {
  const otp = '1234';
  const userPhone = '+919876543210';
  const userEmail = 'user@example.com';
  const userName = 'John Doe';

  try {
    // Send SMS
    const smsMessage = smsTemplates.otp({ otp, expiresIn: 5 });
    const smsResult = await smsService.send({
      to: userPhone,
      message: smsMessage
    });

    if (smsResult.success) {
      console.log('✅ OTP SMS sent:', smsResult.messageId);
    } else {
      console.error('❌ OTP SMS failed:', smsResult.error);
    }

    // Send Email (if user has email)
    if (userEmail) {
      const emailContent = emailTemplates.otp({ otp, userName, expiresIn: 5 });
      const emailResult = await emailService.send({
        to: userEmail,
        subject: 'OTP Verification - ZomesStay',
        content: emailContent
      });

      if (emailResult.success) {
        console.log('✅ OTP Email sent:', emailResult.messageId);
      } else {
        console.error('❌ OTP Email failed:', emailResult.error);
      }
    }
  } catch (error) {
    console.error('Error sending OTP:', error);
  }
}

/**
 * Example 2: Send Booking Confirmation
 */
async function sendBookingConfirmationExample() {
  const bookingData = {
    bookingNumber: 'BK123456',
    guestName: 'John Doe',
    guestEmail: 'john@example.com',
    guestPhone: '+919876543210',
    propertyName: 'Sunset Villa',
    propertyAddress: '123 Beach Road, Goa 403001',
    checkIn: '2024-12-25',
    checkOut: '2024-12-28',
    nights: 3,
    guests: 2,
    children: 0,
    totalAmount: 15000,
    roomDetails: [
      {
        roomTypeName: 'Deluxe Room',
        rooms: 1,
        mealPlan: 'Breakfast Included',
        price: 15000
      }
    ],
    paymentMethod: 'Online Payment'
  };

  try {
    // Send to guest
    const guestSMS = smsTemplates.bookingConfirmation({
      bookingNumber: bookingData.bookingNumber,
      guestName: bookingData.guestName,
      propertyName: bookingData.propertyName,
      checkIn: bookingData.checkIn,
      checkOut: bookingData.checkOut,
      totalAmount: bookingData.totalAmount
    });

    const guestEmailHTML = emailTemplates.bookingConfirmation(bookingData);

    // Send SMS to guest
    await smsService.send({
      to: bookingData.guestPhone,
      message: guestSMS
    });

    // Send Email to guest
    await emailService.send({
      to: bookingData.guestEmail,
      subject: 'Booking Confirmation - ZomesStay',
      content: guestEmailHTML
    });

    // Send to property owner/host
    const hostData = {
      hostName: 'Property Owner',
      hostEmail: 'host@example.com',
      hostPhone: '+919876543211',
      ...bookingData
    };

    const hostSMS = smsTemplates.bookingNotificationToHost({
      hostName: hostData.hostName,
      bookingNumber: hostData.bookingNumber,
      propertyName: hostData.propertyName,
      guestName: hostData.guestName,
      guestPhone: hostData.guestPhone,
      checkIn: hostData.checkIn,
      checkOut: hostData.checkOut
    });

    const hostEmailHTML = emailTemplates.bookingNotificationToHost({
      hostName: hostData.hostName,
      bookingNumber: hostData.bookingNumber,
      propertyName: hostData.propertyName,
      guestName: hostData.guestName,
      guestEmail: hostData.guestEmail,
      guestPhone: hostData.guestPhone,
      checkIn: hostData.checkIn,
      checkOut: hostData.checkOut,
      nights: hostData.nights,
      guests: hostData.guests,
      children: hostData.children,
      totalAmount: hostData.totalAmount,
      roomDetails: hostData.roomDetails
    });

    // Send SMS to host
    await smsService.send({
      to: hostData.hostPhone,
      message: hostSMS
    });

    // Send Email to host
    await emailService.send({
      to: hostData.hostEmail,
      subject: 'New Booking Received - ZomesStay',
      content: hostEmailHTML
    });

    console.log('✅ Booking confirmation sent to guest and host');
  } catch (error) {
    console.error('❌ Error sending booking confirmation:', error);
  }
}

/**
 * Example 3: Send Cancellation Request Notifications
 */
async function sendCancellationRequestExample() {
  const cancellationData = {
    requestId: 'CR123456',
    bookingNumber: 'BK123456',
    propertyName: 'Sunset Villa',
    requesterName: 'John Doe',
    requesterRole: 'user',
    requesterEmail: 'john@example.com',
    requesterPhone: '+919876543210',
    checkIn: '2024-12-25',
    checkOut: '2024-12-28',
    reason: 'Travel plans changed',
    customReason: 'Family emergency'
  };

  try {
    // Send to requester (acknowledgment)
    const requesterSMS = smsTemplates.cancellationRequestSubmitted({
      guestName: cancellationData.requesterName,
      bookingNumber: cancellationData.bookingNumber,
      requestId: cancellationData.requestId
    });

    const requesterEmailHTML = emailTemplates.cancellationRequestSubmitted({
      guestName: cancellationData.requesterName,
      bookingNumber: cancellationData.bookingNumber,
      propertyName: cancellationData.propertyName,
      checkIn: cancellationData.checkIn,
      checkOut: cancellationData.checkOut,
      requestId: cancellationData.requestId,
      reason: cancellationData.reason
    });

    await smsService.send({
      to: cancellationData.requesterPhone,
      message: requesterSMS
    });

    await emailService.send({
      to: cancellationData.requesterEmail,
      subject: 'Cancellation Request Received - ZomesStay',
      content: requesterEmailHTML
    });

    // Send to admin (notification)
    const adminEmail = 'admin@zomesstay.com';
    const adminPhone = '+919876543212';

    const adminSMS = smsTemplates.adminCancellationRequestNotification({
      bookingNumber: cancellationData.bookingNumber,
      propertyName: cancellationData.propertyName,
      requesterName: cancellationData.requesterName,
      requesterPhone: cancellationData.requesterPhone,
      requestId: cancellationData.requestId
    });

    const adminEmailHTML = emailTemplates.adminCancellationRequestNotification({
      bookingNumber: cancellationData.bookingNumber,
      propertyName: cancellationData.propertyName,
      requesterName: cancellationData.requesterName,
      requesterRole: cancellationData.requesterRole,
      requesterEmail: cancellationData.requesterEmail,
      requesterPhone: cancellationData.requesterPhone,
      checkIn: cancellationData.checkIn,
      checkOut: cancellationData.checkOut,
      reason: cancellationData.reason,
      customReason: cancellationData.customReason,
      requestId: cancellationData.requestId
    });

    await smsService.send({
      to: adminPhone,
      message: adminSMS
    });

    await emailService.send({
      to: adminEmail,
      subject: 'Cancellation Request - Admin Review Required',
      content: adminEmailHTML
    });

    console.log('✅ Cancellation request notifications sent');
  } catch (error) {
    console.error('❌ Error sending cancellation notifications:', error);
  }
}

/**
 * Example 4: Send Cancellation Approval
 */
async function sendCancellationApprovalExample() {
  const approvalData = {
    guestName: 'John Doe',
    guestEmail: 'john@example.com',
    guestPhone: '+919876543210',
    bookingNumber: 'BK123456',
    propertyName: 'Sunset Villa',
    refundAmount: 12000,
    refundTimeline: '5-7 business days'
  };

  try {
    const smsMessage = smsTemplates.cancellationApproved({
      guestName: approvalData.guestName,
      bookingNumber: approvalData.bookingNumber,
      refundAmount: approvalData.refundAmount,
      refundTimeline: approvalData.refundTimeline
    });

    const emailHTML = emailTemplates.cancellationApproved({
      guestName: approvalData.guestName,
      bookingNumber: approvalData.bookingNumber,
      propertyName: approvalData.propertyName,
      refundAmount: approvalData.refundAmount,
      refundTimeline: approvalData.refundTimeline
    });

    await smsService.send({
      to: approvalData.guestPhone,
      message: smsMessage
    });

    await emailService.send({
      to: approvalData.guestEmail,
      subject: 'Cancellation Approved - ZomesStay',
      content: emailHTML
    });

    console.log('✅ Cancellation approval sent');
  } catch (error) {
    console.error('❌ Error sending cancellation approval:', error);
  }
}

/**
 * Example 5: Send Payment Failed Notification
 */
async function sendPaymentFailedExample() {
  const paymentData = {
    guestName: 'John Doe',
    guestEmail: 'john@example.com',
    guestPhone: '+919876543210',
    orderId: 'ORD123456',
    amount: 15000,
    reason: 'Insufficient funds',
    retryLink: 'https://zomesstay.com/payment/retry/ORD123456'
  };

  try {
    const smsMessage = smsTemplates.paymentFailed({
      guestName: paymentData.guestName,
      orderId: paymentData.orderId,
      amount: paymentData.amount,
      retryLink: paymentData.retryLink
    });

    const emailHTML = emailTemplates.paymentFailed({
      guestName: paymentData.guestName,
      orderId: paymentData.orderId,
      amount: paymentData.amount,
      reason: paymentData.reason,
      retryLink: paymentData.retryLink
    });

    await smsService.send({
      to: paymentData.guestPhone,
      message: smsMessage
    });

    await emailService.send({
      to: paymentData.guestEmail,
      subject: 'Payment Failed - ZomesStay',
      content: emailHTML
    });

    console.log('✅ Payment failed notification sent');
  } catch (error) {
    console.error('❌ Error sending payment failed notification:', error);
  }
}

// Export examples for testing
module.exports = {
  sendOTPExample,
  sendBookingConfirmationExample,
  sendCancellationRequestExample,
  sendCancellationApprovalExample,
  sendPaymentFailedExample
};

