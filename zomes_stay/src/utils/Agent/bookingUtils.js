/**
 * Booking Utility Functions
 * Helper functions for booking status, colors, formatting, etc.
 */

/**
 * Get status badge color classes
 */
export const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'confirmed':
      return 'bg-green-100 text-green-800';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

/**
 * Get payment status badge color classes
 */
export const getPaymentStatusColor = (status) => {
  if (!status) return 'bg-gray-100 text-gray-800';
  const normalized = status.toLowerCase().replace(/_/g, '-');
  switch (normalized) {
    case 'paid':
      return 'bg-green-100 text-green-800';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'failed':
      return 'bg-red-100 text-red-800';
    case 'refund-initiated':
      return 'bg-blue-100 text-blue-800';
    case 'refund-completed':
      return 'bg-green-100 text-green-800';
    case 'refund-failed':
      return 'bg-red-100 text-red-800';
    case 'refund-not-applicable':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

/**
 * Format payment status for display
 */
export const formatPaymentStatus = (status) => {
  if (!status) return 'N/A';
  return status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
};

/**
 * Format date to YYYY-MM-DD
 */
export const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  return date.toISOString().split('T')[0];
};

/**
 * Format currency (Indian Rupees)
 */
export const formatCurrency = (amount) => {
  if (typeof amount === 'number') {
    return amount.toLocaleString('en-IN', { maximumFractionDigits: 2 });
  }
  if (typeof amount === 'string') {
    return amount.replace(/,/g, '');
  }
  return '0';
};

/**
 * Check if booking can show cancellation request button
 * Only allow cancellation request if check-in is today or in the future
 */
export const canShowCancellationRequest = (booking) => {
  if (!booking) return false;

  // Don't show for cancelled or completed bookings
  const status = booking.status?.toLowerCase();
  if (status === 'cancelled' || status === 'completed') return false;

  // Get check-in date from originalData or formatted checkIn
  const checkInDateStr = booking.checkIn || booking.originalData?.checkIn;
  if (!checkInDateStr) return false;

  // Create today's date at midnight UTC for consistent comparison
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  // Parse check-in date - handle both ISO strings and date strings
  let checkInDate;
  if (typeof checkInDateStr === 'string') {
    // If it's already a date string (YYYY-MM-DD), parse it directly
    if (checkInDateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      checkInDate = new Date(checkInDateStr + 'T00:00:00.000Z');
    } else {
      // Otherwise parse as ISO string
      checkInDate = new Date(checkInDateStr);
    }
  } else {
    checkInDate = new Date(checkInDateStr);
  }

  // Set to midnight UTC for comparison
  checkInDate.setUTCHours(0, 0, 0, 0);

  // Validate date
  if (isNaN(checkInDate.getTime())) return false;

  // Show button only if check-in is today or in the future
  return checkInDate >= today;
};

/**
 * Map API booking data to component format
 */
export const mapBookingData = (booking) => {
  return {
    id: booking.id || '',
    bookingNumber: booking.bookingNumber || '',
    customerName: booking.guest?.name || 'N/A',
    customerEmail: booking.guest?.email || '',
    customerPhone: booking.guest?.phone || '',
    propertyName: booking.property?.name || 'N/A',
    propertyId: booking.property?.id || '',
    checkIn: booking.checkIn ? formatDate(booking.checkIn) : '',
    checkOut: booking.checkOut ? formatDate(booking.checkOut) : '',
    nights: booking.nights || 0,
    guests: booking.totalGuests || 0,
    amount: booking.totalAmount || 0,
    status: booking.status || 'pending',
    paymentStatus: booking.paymentStatus || null,
    roomSelections: booking.roomSelections || [],
    // Keep original data for details modal
    originalData: booking,
  };
};
