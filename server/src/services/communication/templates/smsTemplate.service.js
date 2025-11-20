/**
 * SMS Template Service
 * Provides formatted SMS message templates
 * All templates return plain text messages optimized for SMS
 */

/**
 * SMS Template Service
 */
const smsTemplateService = {
  /**
   * Format phone number with country code
   * @param {string} phone - Phone number
   * @param {string} countryCode - Country code (default: +91)
   * @returns {string} - Formatted phone number
   */
  formatPhone: (phone, countryCode = '+91') => {
    if (!phone) return '';
    // Remove spaces, dashes, and existing country code
    const cleaned = phone.replace(/[\s\-+]/g, '');
    // If already starts with country code, return as is
    if (cleaned.startsWith(countryCode.replace('+', ''))) {
      return `+${cleaned}`;
    }
    // Add country code if not present
    return `${countryCode}${cleaned}`;
  },

  /**
   * OTP SMS Template
   * @param {Object} data - { otp: string, expiresIn?: number }
   * @returns {string} - SMS message
   */
  otp: ({ otp, expiresIn = 5 }) => {
    return `Your ZomesStay OTP is ${otp}. Valid for ${expiresIn} minutes. Do not share this OTP with anyone.`;
  },

  /**
   * Booking Confirmation SMS Template
   * @param {Object} data - Booking details
   * @returns {string} - SMS message
   */
  bookingConfirmation: ({
    bookingNumber,
    guestName,
    propertyName,
    checkIn,
    checkOut,
    totalAmount
  }) => {
    const formatDate = (date) => {
      if (!date) return 'N/A';
      const d = new Date(date);
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const formatCurrency = (amount) => {
      if (!amount) return '₹0';
      return `₹${Number(amount).toLocaleString('en-IN')}`;
    };

    return `Dear ${guestName}, your booking is confirmed! Booking No: ${bookingNumber || 'N/A'}, Property: ${propertyName || 'N/A'}, Check-in: ${formatDate(checkIn)}, Check-out: ${formatDate(checkOut)}, Amount: ${formatCurrency(totalAmount)}. Thank you for choosing ZomesStay!`;
  },

  /**
   * Payment Failed SMS Template
   * @param {Object} data - Payment failure details
   * @returns {string} - SMS message
   */
  paymentFailed: ({
    guestName,
    orderId,
    amount,
    retryLink = null
  }) => {
    const formatCurrency = (amount) => {
      if (!amount) return '₹0';
      return `₹${Number(amount).toLocaleString('en-IN')}`;
    };

    let message = `Dear ${guestName}, payment failed for Order ${orderId || 'N/A'}, Amount: ${formatCurrency(amount)}.`;
    
    if (retryLink) {
      message += ` Retry: ${retryLink}`;
    } else {
      message += ' Please try again or contact support.';
    }
    
    message += ' - ZomesStay';
    
    return message;
  },

  /**
   * Cancellation Request Submitted SMS Template
   * @param {Object} data - Cancellation request details
   * @returns {string} - SMS message
   */
  cancellationRequestSubmitted: ({
    guestName,
    bookingNumber,
    requestId
  }) => {
    return `Dear ${guestName}, your cancellation request for Booking ${bookingNumber || 'N/A'} has been received. Request ID: ${requestId || 'N/A'}. We'll review and update you within 24-48 hours. - ZomesStay`;
  },

  /**
   * Cancellation Approved SMS Template
   * @param {Object} data - Cancellation approval details
   * @returns {string} - SMS message
   */
  cancellationApproved: ({
    guestName,
    bookingNumber,
    refundAmount,
    refundTimeline = '5-7 business days'
  }) => {
    const formatCurrency = (amount) => {
      if (!amount) return '₹0';
      return `₹${Number(amount).toLocaleString('en-IN')}`;
    };

    return `Dear ${guestName}, your cancellation for Booking ${bookingNumber || 'N/A'} is approved. Refund: ${formatCurrency(refundAmount)} will be processed in ${refundTimeline} to your original payment method. - ZomesStay`;
  },

  /**
   * Cancellation Rejected SMS Template
   * @param {Object} data - Cancellation rejection details
   * @returns {string} - SMS message
   */
  cancellationRejected: ({
    guestName,
    bookingNumber,
    adminNotes
  }) => {
    let message = `Dear ${guestName}, your cancellation request for Booking ${bookingNumber || 'N/A'} has been declined.`;
    
    if (adminNotes) {
      message += ` Reason: ${adminNotes.substring(0, 50)}${adminNotes.length > 50 ? '...' : ''}.`;
    }
    
    message += ' Contact support for assistance. - ZomesStay';
    
    return message;
  },

  /**
   * Booking Notification to Host SMS Template
   * @param {Object} data - Booking details for host
   * @returns {string} - SMS message
   */
  bookingNotificationToHost: ({
    hostName,
    bookingNumber,
    propertyName,
    guestName,
    guestPhone,
    checkIn,
    checkOut
  }) => {
    const formatDate = (date) => {
      if (!date) return 'N/A';
      const d = new Date(date);
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    };

    return `New booking! Booking No: ${bookingNumber || 'N/A'}, Property: ${propertyName || 'N/A'}, Guest: ${guestName || 'N/A'} (${guestPhone || 'N/A'}), Check-in: ${formatDate(checkIn)}, Check-out: ${formatDate(checkOut)}. Please check your dashboard for details. - ZomesStay`;
  },

  /**
   * Admin Cancellation Request Notification SMS Template
   * @param {Object} data - Cancellation request details for admin
   * @returns {string} - SMS message
   */
  adminCancellationRequestNotification: ({
    bookingNumber,
    propertyName,
    requesterName,
    requesterPhone,
    requestId
  }) => {
    return `New cancellation request! Request ID: ${requestId || 'N/A'}, Booking: ${bookingNumber || 'N/A'}, Property: ${propertyName || 'N/A'}, Requester: ${requesterName || 'N/A'} (${requesterPhone || 'N/A'}). Please review in admin dashboard. - ZomesStay`;
  },

  /**
   * Booking Cancelled SMS Template
   * @param {Object} data - Booking cancellation details
   * @returns {string} - SMS message
   */
  bookingCancelled: ({
    guestName,
    bookingNumber,
    propertyName,
    refundAmount,
    refundTimeline
  }) => {
    const formatCurrency = (amount) => {
      if (!amount) return '';
      return ` Refund: ₹${Number(amount).toLocaleString('en-IN')}${refundTimeline ? ` (${refundTimeline})` : ''}`;
    };

    return `Dear ${guestName}, your booking ${bookingNumber || 'N/A'} for ${propertyName || 'N/A'} has been cancelled.${formatCurrency(refundAmount)} - ZomesStay`;
  },

  /**
   * Booking Completed SMS Template
   * @param {Object} data - Booking completion details
   * @returns {string} - SMS message
   */
  bookingCompleted: ({
    guestName,
    bookingNumber,
    propertyName,
    reviewLink = null
  }) => {
    let message = `Dear ${guestName}, thank you for staying at ${propertyName || 'N/A'}! Booking ${bookingNumber || 'N/A'} completed.`;
    
    if (reviewLink) {
      message += ` Share your experience: ${reviewLink}`;
    } else {
      message += ' We hope you had a great stay!';
    }
    
    message += ' - ZomesStay';
    
    return message;
  }
};

module.exports = smsTemplateService;

