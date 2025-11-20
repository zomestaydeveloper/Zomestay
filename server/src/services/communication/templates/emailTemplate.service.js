/**
 * Email Template Service
 * Provides HTML email templates with consistent styling
 * All templates return HTML content ready to send
 */

/**
 * Base HTML wrapper with ZomesStay branding
 * @param {string} content - Main content HTML
 * @param {string} title - Email title (for <title> tag)
 * @returns {string} - Complete HTML email
 */
const getBaseEmailTemplate = (content, title = 'ZomesStay') => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333333;
      background-color: #f4f4f4;
      margin: 0;
      padding: 0;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .email-header {
      background: linear-gradient(135deg, #004AAD 0%, #0066CC 100%);
      padding: 30px 20px;
      text-align: center;
    }
    .email-header h1 {
      color: #ffffff;
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    .email-body {
      padding: 40px 30px;
    }
    .email-footer {
      background-color: #f8f9fa;
      padding: 20px 30px;
      text-align: center;
      font-size: 12px;
      color: #666666;
      border-top: 1px solid #e9ecef;
    }
    .button {
      display: inline-block;
      padding: 12px 30px;
      background-color: #004AAD;
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 5px;
      font-weight: 600;
      margin: 20px 0;
    }
    .button:hover {
      background-color: #0066CC;
    }
    .info-box {
      background-color: #f8f9fa;
      border-left: 4px solid #004AAD;
      padding: 15px;
      margin: 20px 0;
    }
    .success-box {
      background-color: #d4edda;
      border-left: 4px solid #28a745;
      padding: 15px;
      margin: 20px 0;
    }
    .error-box {
      background-color: #f8d7da;
      border-left: 4px solid #dc3545;
      padding: 15px;
      margin: 20px 0;
    }
    .warning-box {
      background-color: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 15px;
      margin: 20px 0;
    }
    .details-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    .details-table td {
      padding: 10px;
      border-bottom: 1px solid #e9ecef;
    }
    .details-table td:first-child {
      font-weight: 600;
      color: #666666;
      width: 40%;
    }
    .details-table td:last-child {
      color: #333333;
    }
    .otp-code {
      font-size: 32px;
      font-weight: bold;
      color: #004AAD;
      letter-spacing: 5px;
      text-align: center;
      padding: 20px;
      background-color: #f8f9fa;
      border-radius: 5px;
      margin: 20px 0;
    }
    @media only screen and (max-width: 600px) {
      .email-body {
        padding: 30px 20px;
      }
      .email-header {
        padding: 20px 15px;
      }
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header">
      <h1>ZomesStay</h1>
    </div>
    <div class="email-body">
      ${content}
    </div>
    <div class="email-footer">
      <p>© ${new Date().getFullYear()} ZomesStay. All rights reserved.</p>
      <p>This is an automated email. Please do not reply to this message.</p>
      <p>For support, contact us at support@zomesstay.com</p>
    </div>
  </div>
</body>
</html>
  `.trim();
};

/**
 * Email Template Service
 */
const emailTemplateService = {
  /**
   * OTP Email Template
   * @param {Object} data - { otp: string, userName?: string, expiresIn?: number }
   * @returns {string} - HTML email content
   */
  otp: ({ otp, userName = 'User', expiresIn = 5 }) => {
    const content = `
      <h2>Your OTP Code</h2>
      <p>Hello ${userName},</p>
      <p>Your One-Time Password (OTP) for ZomesStay is:</p>
      <div class="otp-code">${otp}</div>
      <p>This OTP is valid for <strong>${expiresIn} minutes</strong>. Please do not share this code with anyone.</p>
      <div class="warning-box">
        <strong>Security Notice:</strong> ZomesStay will never ask for your OTP. If you didn't request this code, please ignore this email.
      </div>
    `;
    return getBaseEmailTemplate(content, 'OTP Verification - ZomesStay');
  },

  /**
   * Booking Confirmation Email Template
   * @param {Object} data - Booking details
   * @returns {string} - HTML email content
   */
  bookingConfirmation: ({
    bookingNumber,
    guestName,
    propertyName,
    propertyAddress,
    checkIn,
    checkOut,
    nights,
    guests,
    children = 0,
    totalAmount,
    roomDetails = [],
    paymentMethod = 'Online Payment'
  }) => {
    const formatDate = (date) => {
      if (!date) return 'N/A';
      const d = new Date(date);
      return d.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    };

    const formatCurrency = (amount) => {
      if (!amount) return '₹0';
      return `₹${Number(amount).toLocaleString('en-IN')}`;
    };

    const content = `
      <h2>Booking Confirmed! 🎉</h2>
      <p>Dear ${guestName},</p>
      <p>Your booking has been confirmed. We're excited to host you!</p>
      
      <div class="success-box">
        <strong>Booking Number:</strong> ${bookingNumber || 'N/A'}<br>
        <strong>Status:</strong> Confirmed
      </div>

      <h3>Booking Details</h3>
      <table class="details-table">
        <tr>
          <td>Property</td>
          <td><strong>${propertyName || 'N/A'}</strong></td>
        </tr>
        <tr>
          <td>Address</td>
          <td>${propertyAddress || 'N/A'}</td>
        </tr>
        <tr>
          <td>Check-in</td>
          <td><strong>${formatDate(checkIn)}</strong></td>
        </tr>
        <tr>
          <td>Check-out</td>
          <td><strong>${formatDate(checkOut)}</strong></td>
        </tr>
        <tr>
          <td>Duration</td>
          <td>${nights || 0} night(s)</td>
        </tr>
        <tr>
          <td>Guests</td>
          <td>${guests || 0} ${children > 0 ? `(${children} children)` : ''}</td>
        </tr>
        <tr>
          <td>Total Amount</td>
          <td><strong>${formatCurrency(totalAmount)}</strong></td>
        </tr>
        <tr>
          <td>Payment Method</td>
          <td>${paymentMethod}</td>
        </tr>
      </table>

      ${roomDetails.length > 0 ? `
        <h3>Room Details</h3>
        ${roomDetails.map(room => `
          <div class="info-box">
            <strong>${room.roomTypeName || 'Room'}</strong><br>
            Rooms: ${room.rooms || 1}<br>
            ${room.mealPlan ? `Meal Plan: ${room.mealPlan}<br>` : ''}
            Price: ${formatCurrency(room.price)}
          </div>
        `).join('')}
      ` : ''}

      <div class="info-box">
        <strong>Important Information:</strong><br>
        • Please arrive at the property on your check-in date<br>
        • Keep your booking number handy for reference<br>
        • Contact the property directly for any special requests<br>
        • Review our cancellation policy in your booking details
      </div>

      <p>We look forward to welcoming you!</p>
      <p>Best regards,<br><strong>ZomesStay Team</strong></p>
    `;
    return getBaseEmailTemplate(content, 'Booking Confirmation - ZomesStay');
  },

  /**
   * Payment Failed Email Template
   * @param {Object} data - Payment failure details
   * @returns {string} - HTML email content
   */
  paymentFailed: ({
    guestName,
    orderId,
    amount,
    reason = 'Payment could not be processed',
    retryLink = null
  }) => {
    const formatCurrency = (amount) => {
      if (!amount) return '₹0';
      return `₹${Number(amount).toLocaleString('en-IN')}`;
    };

    const content = `
      <h2>Payment Failed</h2>
      <p>Dear ${guestName},</p>
      <p>We were unable to process your payment for the following booking:</p>
      
      <div class="error-box">
        <strong>Order ID:</strong> ${orderId || 'N/A'}<br>
        <strong>Amount:</strong> ${formatCurrency(amount)}<br>
        <strong>Reason:</strong> ${reason}
      </div>

      ${retryLink ? `
        <p style="text-align: center;">
          <a href="${retryLink}" class="button">Retry Payment</a>
        </p>
      ` : ''}

      <div class="info-box">
        <strong>What to do next:</strong><br>
        • Check your payment method and try again<br>
        • Ensure sufficient funds are available<br>
        • Contact your bank if the issue persists<br>
        • Contact our support team for assistance
      </div>

      <p>If you continue to experience issues, please contact our support team.</p>
      <p>Best regards,<br><strong>ZomesStay Team</strong></p>
    `;
    return getBaseEmailTemplate(content, 'Payment Failed - ZomesStay');
  },

  /**
   * Cancellation Request Submitted Email Template
   * @param {Object} data - Cancellation request details
   * @returns {string} - HTML email content
   */
  cancellationRequestSubmitted: ({
    guestName,
    bookingNumber,
    propertyName,
    checkIn,
    checkOut,
    requestId,
    reason
  }) => {
    const formatDate = (date) => {
      if (!date) return 'N/A';
      const d = new Date(date);
      return d.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    };

    const content = `
      <h2>Cancellation Request Received</h2>
      <p>Dear ${guestName},</p>
      <p>We have received your cancellation request. Our team will review it shortly.</p>
      
      <div class="info-box">
        <strong>Request ID:</strong> ${requestId || 'N/A'}<br>
        <strong>Booking Number:</strong> ${bookingNumber || 'N/A'}<br>
        <strong>Property:</strong> ${propertyName || 'N/A'}<br>
        <strong>Check-in:</strong> ${formatDate(checkIn)}<br>
        <strong>Check-out:</strong> ${formatDate(checkOut)}<br>
        <strong>Reason:</strong> ${reason || 'N/A'}
      </div>

      <div class="warning-box">
        <strong>Please Note:</strong><br>
        • Your cancellation request is under review<br>
        • You will receive an update within 24-48 hours<br>
        • Refund (if applicable) will be processed after approval<br>
        • Booking remains active until cancellation is approved
      </div>

      <p>We'll notify you once your request has been reviewed.</p>
      <p>Best regards,<br><strong>ZomesStay Team</strong></p>
    `;
    return getBaseEmailTemplate(content, 'Cancellation Request Received - ZomesStay');
  },

  /**
   * Cancellation Approved Email Template
   * @param {Object} data - Cancellation approval details
   * @returns {string} - HTML email content
   */
  cancellationApproved: ({
    guestName,
    bookingNumber,
    propertyName,
    refundAmount,
    refundTimeline = '5-7 business days'
  }) => {
    const formatCurrency = (amount) => {
      if (!amount) return '₹0';
      return `₹${Number(amount).toLocaleString('en-IN')}`;
    };

    const content = `
      <h2>Cancellation Approved ✅</h2>
      <p>Dear ${guestName},</p>
      <p>Your cancellation request has been approved.</p>
      
      <div class="success-box">
        <strong>Booking Number:</strong> ${bookingNumber || 'N/A'}<br>
        <strong>Property:</strong> ${propertyName || 'N/A'}<br>
        <strong>Refund Amount:</strong> ${formatCurrency(refundAmount)}<br>
        <strong>Refund Timeline:</strong> ${refundTimeline}
      </div>

      <div class="info-box">
        <strong>Refund Information:</strong><br>
        • Refund will be processed to your original payment method<br>
        • Processing time: ${refundTimeline}<br>
        • You will receive a confirmation once refund is initiated<br>
        • Contact support if you don't receive refund within the timeline
      </div>

      <p>We hope to serve you again in the future!</p>
      <p>Best regards,<br><strong>ZomesStay Team</strong></p>
    `;
    return getBaseEmailTemplate(content, 'Cancellation Approved - ZomesStay');
  },

  /**
   * Cancellation Rejected Email Template
   * @param {Object} data - Cancellation rejection details
   * @returns {string} - HTML email content
   */
  cancellationRejected: ({
    guestName,
    bookingNumber,
    propertyName,
    adminNotes,
    contactSupport = 'support@zomesstay.com'
  }) => {
    const content = `
      <h2>Cancellation Request Declined</h2>
      <p>Dear ${guestName},</p>
      <p>We regret to inform you that your cancellation request has been declined.</p>
      
      <div class="error-box">
        <strong>Booking Number:</strong> ${bookingNumber || 'N/A'}<br>
        <strong>Property:</strong> ${propertyName || 'N/A'}<br>
        ${adminNotes ? `<strong>Reason:</strong> ${adminNotes}` : ''}
      </div>

      <div class="info-box">
        <strong>What this means:</strong><br>
        • Your booking remains active<br>
        • Standard cancellation policy applies<br>
        • You can contact support for further assistance<br>
        • Support Email: ${contactSupport}
      </div>

      <p>If you have any questions or concerns, please don't hesitate to contact our support team.</p>
      <p>Best regards,<br><strong>ZomesStay Team</strong></p>
    `;
    return getBaseEmailTemplate(content, 'Cancellation Request Declined - ZomesStay');
  },

  /**
   * Booking Notification to Host Email Template
   * @param {Object} data - Booking details for host
   * @returns {string} - HTML email content
   */
  bookingNotificationToHost: ({
    hostName,
    bookingNumber,
    propertyName,
    guestName,
    guestEmail,
    guestPhone,
    checkIn,
    checkOut,
    nights,
    guests,
    children = 0,
    totalAmount,
    roomDetails = []
  }) => {
    const formatDate = (date) => {
      if (!date) return 'N/A';
      const d = new Date(date);
      return d.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    };

    const formatCurrency = (amount) => {
      if (!amount) return '₹0';
      return `₹${Number(amount).toLocaleString('en-IN')}`;
    };

    const content = `
      <h2>New Booking Received! 🎉</h2>
      <p>Dear ${hostName},</p>
      <p>You have received a new booking for your property.</p>
      
      <div class="success-box">
        <strong>Booking Number:</strong> ${bookingNumber || 'N/A'}<br>
        <strong>Property:</strong> ${propertyName || 'N/A'}<br>
        <strong>Status:</strong> Confirmed
      </div>

      <h3>Guest Information</h3>
      <table class="details-table">
        <tr>
          <td>Guest Name</td>
          <td><strong>${guestName || 'N/A'}</strong></td>
        </tr>
        <tr>
          <td>Email</td>
          <td>${guestEmail || 'N/A'}</td>
        </tr>
        <tr>
          <td>Phone</td>
          <td>${guestPhone || 'N/A'}</td>
        </tr>
      </table>

      <h3>Booking Details</h3>
      <table class="details-table">
        <tr>
          <td>Check-in</td>
          <td><strong>${formatDate(checkIn)}</strong></td>
        </tr>
        <tr>
          <td>Check-out</td>
          <td><strong>${formatDate(checkOut)}</strong></td>
        </tr>
        <tr>
          <td>Duration</td>
          <td>${nights || 0} night(s)</td>
        </tr>
        <tr>
          <td>Guests</td>
          <td>${guests || 0} ${children > 0 ? `(${children} children)` : ''}</td>
        </tr>
        <tr>
          <td>Total Amount</td>
          <td><strong>${formatCurrency(totalAmount)}</strong></td>
        </tr>
      </table>

      ${roomDetails.length > 0 ? `
        <h3>Room Details</h3>
        ${roomDetails.map(room => `
          <div class="info-box">
            <strong>${room.roomTypeName || 'Room'}</strong><br>
            Rooms: ${room.rooms || 1}<br>
            ${room.mealPlan ? `Meal Plan: ${room.mealPlan}<br>` : ''}
            Price: ${formatCurrency(room.price)}
          </div>
        `).join('')}
      ` : ''}

      <div class="info-box">
        <strong>Action Required:</strong><br>
        • Prepare the property for guest arrival<br>
        • Contact guest if you need any additional information<br>
        • Ensure all amenities are ready<br>
        • Review guest details in your dashboard
      </div>

      <p>Thank you for being a part of ZomesStay!</p>
      <p>Best regards,<br><strong>ZomesStay Team</strong></p>
    `;
    return getBaseEmailTemplate(content, 'New Booking - ZomesStay');
  },

  /**
   * Admin Cancellation Request Notification Email Template
   * @param {Object} data - Cancellation request details for admin
   * @returns {string} - HTML email content
   */
  adminCancellationRequestNotification: ({
    bookingNumber,
    propertyName,
    requesterName,
    requesterRole,
    requesterEmail,
    requesterPhone,
    checkIn,
    checkOut,
    reason,
    customReason,
    requestId
  }) => {
    const formatDate = (date) => {
      if (!date) return 'N/A';
      const d = new Date(date);
      return d.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    };

    const content = `
      <h2>New Cancellation Request ⚠️</h2>
      <p>Dear Admin,</p>
      <p>A new cancellation request requires your review.</p>
      
      <div class="warning-box">
        <strong>Request ID:</strong> ${requestId || 'N/A'}<br>
        <strong>Booking Number:</strong> ${bookingNumber || 'N/A'}<br>
        <strong>Property:</strong> ${propertyName || 'N/A'}<br>
        <strong>Requester:</strong> ${requesterName || 'N/A'} (${requesterRole || 'N/A'})
      </div>

      <h3>Requester Contact Information</h3>
      <table class="details-table">
        <tr>
          <td>Email</td>
          <td>${requesterEmail || 'N/A'}</td>
        </tr>
        <tr>
          <td>Phone</td>
          <td>${requesterPhone || 'N/A'}</td>
        </tr>
      </table>

      <h3>Booking Details</h3>
      <table class="details-table">
        <tr>
          <td>Check-in</td>
          <td><strong>${formatDate(checkIn)}</strong></td>
        </tr>
        <tr>
          <td>Check-out</td>
          <td><strong>${formatDate(checkOut)}</strong></td>
        </tr>
      </table>

      <h3>Cancellation Reason</h3>
      <div class="info-box">
        <strong>Reason:</strong> ${reason || 'N/A'}<br>
        ${customReason ? `<strong>Additional Details:</strong> ${customReason}` : ''}
      </div>

      <div class="info-box">
        <strong>Action Required:</strong><br>
        • Review the cancellation request in admin dashboard<br>
        • Contact requester if needed: ${requesterPhone || requesterEmail || 'N/A'}<br>
        • Approve or reject based on cancellation policy<br>
        • Process refund if approved
      </div>

      <p>Please review this request at your earliest convenience.</p>
      <p>Best regards,<br><strong>ZomesStay System</strong></p>
    `;
    return getBaseEmailTemplate(content, 'Cancellation Request - Admin Review Required');
  },

  /**
   * Admin Booking Notification Email Template
   * @param {Object} data - Booking details for admin
   * @returns {string} - HTML email content
   */
  adminBookingNotification: ({
    bookingNumber,
    propertyName,
    guestName,
    guestEmail,
    guestPhone,
    checkIn,
    checkOut,
    nights,
    guests,
    children = 0,
    totalAmount,
    roomDetails = []
  }) => {
    const formatDate = (date) => {
      if (!date) return 'N/A';
      const d = new Date(date);
      return d.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    };

    const formatCurrency = (amount) => {
      if (!amount) return '₹0';
      return `₹${Number(amount).toLocaleString('en-IN')}`;
    };

    const content = `
      <h2>New Booking Confirmed 📋</h2>
      <p>Dear Admin,</p>
      <p>A new booking has been confirmed on the platform.</p>
      
      <div class="success-box">
        <strong>Booking Number:</strong> ${bookingNumber || 'N/A'}<br>
        <strong>Property:</strong> ${propertyName || 'N/A'}<br>
        <strong>Status:</strong> Confirmed
      </div>

      <h3>Guest Information</h3>
      <table class="details-table">
        <tr>
          <td>Guest Name</td>
          <td><strong>${guestName || 'N/A'}</strong></td>
        </tr>
        <tr>
          <td>Email</td>
          <td>${guestEmail || 'N/A'}</td>
        </tr>
        <tr>
          <td>Phone</td>
          <td>${guestPhone || 'N/A'}</td>
        </tr>
      </table>

      <h3>Booking Details</h3>
      <table class="details-table">
        <tr>
          <td>Check-in</td>
          <td><strong>${formatDate(checkIn)}</strong></td>
        </tr>
        <tr>
          <td>Check-out</td>
          <td><strong>${formatDate(checkOut)}</strong></td>
        </tr>
        <tr>
          <td>Duration</td>
          <td>${nights || 0} night(s)</td>
        </tr>
        <tr>
          <td>Guests</td>
          <td>${guests || 0} ${children > 0 ? `(${children} children)` : ''}</td>
        </tr>
        <tr>
          <td>Total Amount</td>
          <td><strong>${formatCurrency(totalAmount)}</strong></td>
        </tr>
      </table>

      ${roomDetails.length > 0 ? `
        <h3>Room Details</h3>
        ${roomDetails.map(room => `
          <div class="info-box">
            <strong>${room.roomTypeName || 'Room'}</strong><br>
            Rooms: ${room.rooms || 1}<br>
            ${room.mealPlan ? `Meal Plan: ${room.mealPlan}<br>` : ''}
            Price: ${formatCurrency(room.price)}
          </div>
        `).join('')}
      ` : ''}

      <div class="info-box">
        <strong>Note:</strong><br>
        • This booking has been automatically confirmed<br>
        • Payment has been successfully processed<br>
        • Host and guest have been notified<br>
        • Monitor booking status in admin dashboard
      </div>

      <p>Best regards,<br><strong>ZomesStay System</strong></p>
    `;
    return getBaseEmailTemplate(content, 'New Booking Confirmed - ZomesStay');
  },

  /**
   * Host Booking Cancellation Notification Email Template
   * @param {Object} data - Booking cancellation details for host
   * @returns {string} - HTML email content
   */
  hostBookingCancellationNotification: ({
    hostName,
    bookingNumber,
    propertyName,
    guestName,
    guestEmail,
    guestPhone,
    checkIn,
    checkOut,
    nights,
    guests,
    children = 0,
    totalAmount,
    refundAmount
  }) => {
    const formatDate = (date) => {
      if (!date) return 'N/A';
      const d = new Date(date);
      return d.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    };

    const formatCurrency = (amount) => {
      if (!amount) return '₹0';
      return `₹${Number(amount).toLocaleString('en-IN')}`;
    };

    const content = `
      <h2>Booking Cancelled ⚠️</h2>
      <p>Dear ${hostName},</p>
      <p>A booking for your property has been cancelled.</p>
      
      <div class="error-box">
        <strong>Booking Number:</strong> ${bookingNumber || 'N/A'}<br>
        <strong>Property:</strong> ${propertyName || 'N/A'}<br>
        <strong>Status:</strong> Cancelled
      </div>

      <h3>Guest Information</h3>
      <table class="details-table">
        <tr>
          <td>Guest Name</td>
          <td><strong>${guestName || 'N/A'}</strong></td>
        </tr>
        <tr>
          <td>Email</td>
          <td>${guestEmail || 'N/A'}</td>
        </tr>
        <tr>
          <td>Phone</td>
          <td>${guestPhone || 'N/A'}</td>
        </tr>
      </table>

      <h3>Booking Details</h3>
      <table class="details-table">
        <tr>
          <td>Check-in</td>
          <td><strong>${formatDate(checkIn)}</strong></td>
        </tr>
        <tr>
          <td>Check-out</td>
          <td><strong>${formatDate(checkOut)}</strong></td>
        </tr>
        <tr>
          <td>Duration</td>
          <td>${nights || 0} night(s)</td>
        </tr>
        <tr>
          <td>Guests</td>
          <td>${guests || 0} ${children > 0 ? `(${children} children)` : ''}</td>
        </tr>
        <tr>
          <td>Original Amount</td>
          <td><strong>${formatCurrency(totalAmount)}</strong></td>
        </tr>
        <tr>
          <td>Refund Amount</td>
          <td><strong>${formatCurrency(refundAmount)}</strong></td>
        </tr>
      </table>

      <div class="info-box">
        <strong>Important Information:</strong><br>
        • This booking has been cancelled<br>
        • Rooms are now available for rebooking<br>
        • Refund has been processed to the guest<br>
        • You can view booking details in your dashboard
      </div>

      <p>If you have any questions, please contact our support team.</p>
      <p>Best regards,<br><strong>ZomesStay Team</strong></p>
    `;
    return getBaseEmailTemplate(content, 'Booking Cancelled - ZomesStay');
  }
};

module.exports = emailTemplateService;

