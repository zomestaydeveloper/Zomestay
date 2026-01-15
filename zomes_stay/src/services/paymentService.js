const API_BASE_URL = import.meta.env.VITE_BASE_URL;

/**
 * Polling utility for checking booking status
 * @param {string} razorpayOrderId - Razorpay order ID
 * @param {number} maxAttempts - Maximum polling attempts (default: 30)
 * @param {number} intervalMs - Polling interval in milliseconds (default: 2000 = 2 seconds)
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
const pollBookingStatus = async (razorpayOrderId, maxAttempts = 30, intervalMs = 2000) => {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(`${API_BASE_URL}/bookings/order/${razorpayOrderId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // If booking exists, return success
      if (data.success && data.data.booking) {
        return {
          success: true,
          data: data.data,
          attempts: attempt,
        };
      }

      // If order status is FAILED, EXPIRED, or CANCELLED, stop polling
      if (data.success && data.data.orderStatus && 
          ['FAILED', 'EXPIRED', 'CANCELLED'].includes(data.data.orderStatus)) {
        return {
          success: false,
          error: `Order ${data.data.orderStatus.toLowerCase()}`,
          data: data.data,
          attempts: attempt,
        };
      }

      // If last attempt, return pending
      if (attempt === maxAttempts) {
        return {
          success: false,
          error: 'Booking is taking longer than expected. Please check your bookings or contact support.',
          data: data.data,
          attempts: attempt,
        };
      }

      // Wait before next attempt
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    } catch (error) {
      console.error(`Polling attempt ${attempt} failed:`, error);
      
      // If last attempt, return error
      if (attempt === maxAttempts) {
        return {
          success: false,
          error: error.message || 'Failed to check booking status',
          attempts: attempt,
        };
      }

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
  }

  return {
    success: false,
    error: 'Maximum polling attempts reached',
    attempts: maxAttempts,
  };
};

export const paymentService = {
  // Create Razorpay order
  createOrder: async (orderData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  },

  /**
   * Check booking status by Razorpay order ID
   * Used for polling booking status after payment
   * 
   * @param {string} razorpayOrderId - Razorpay order ID
   * @returns {Promise<{success: boolean, data?: object}>}
   */
  getBookingByOrderId: async (razorpayOrderId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/bookings/order/${razorpayOrderId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching booking status:', error);
      throw error;
    }
  },

  /**
   * Poll booking status until booking is confirmed or timeout
   * PRODUCTION: Used after payment to wait for webhook processing
   * 
   * @param {string} razorpayOrderId - Razorpay order ID
   * @param {number} maxAttempts - Maximum polling attempts (default: 30 = 60 seconds)
   * @param {number} intervalMs - Polling interval in milliseconds (default: 2000 = 2 seconds)
   * @returns {Promise<{success: boolean, data?: object, error?: string, attempts: number}>}
   */
  pollBookingStatus,

  /**
   * @deprecated This function is kept temporarily for migration period.
   * After unified webhook system is fully implemented, this will be removed.
   * Use pollBookingStatus() instead - webhooks are the production standard.
   * 
   * Verify payment (direct verification - deprecated)
   */
  verifyPayment: async (paymentData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/verify-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error verifying payment:', error);
      throw error;
    }
  }
};

export default paymentService;
