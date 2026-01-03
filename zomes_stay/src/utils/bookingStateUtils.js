/**
 * Utility functions for preserving booking state during login redirect
 * Uses sessionStorage to persist booking data temporarily
 */

const BOOKING_STATE_KEY = 'pending_booking_state';
const RETURN_URL_KEY = 'return_url';

/**
 * Save booking state to sessionStorage
 * @param {Object} bookingState - The booking state to save
 * @param {Date|null} bookingState.checkIn - Check-in date
 * @param {Date|null} bookingState.checkOut - Check-out date
 * @param {Object} bookingState.guests - Guest information { adults, children }
 * @param {number} bookingState.rooms - Number of rooms
 * @param {string} bookingState.propertyId - Property ID
 */
export const saveBookingState = (bookingState) => {
  try {
    const stateToSave = {
      checkIn: bookingState.checkIn ? bookingState.checkIn.toISOString() : null,
      checkOut: bookingState.checkOut ? bookingState.checkOut.toISOString() : null,
      guests: bookingState.guests || { adults: 1, children: 0 },
      rooms: bookingState.rooms || 1,
      propertyId: bookingState.propertyId || null,
      timestamp: Date.now()
    };
    sessionStorage.setItem(BOOKING_STATE_KEY, JSON.stringify(stateToSave));
    return true;
  } catch (error) {
    console.error('Error saving booking state:', error);
    return false;
  }
};

/**
 * Restore booking state from sessionStorage
 * @returns {Object|null} The restored booking state or null if not found/expired
 */
export const restoreBookingState = () => {
  try {
    const savedState = sessionStorage.getItem(BOOKING_STATE_KEY);
    if (!savedState) return null;

    const parsed = JSON.parse(savedState);
    
    // Check if state is expired (older than 1 hour)
    const maxAge = 60 * 60 * 1000; // 1 hour
    if (Date.now() - parsed.timestamp > maxAge) {
      clearBookingState();
      return null;
    }

    // Convert ISO strings back to Date objects
    return {
      checkIn: parsed.checkIn ? new Date(parsed.checkIn) : null,
      checkOut: parsed.checkOut ? new Date(parsed.checkOut) : null,
      guests: parsed.guests || { adults: 1, children: 0 },
      rooms: parsed.rooms || 1,
      propertyId: parsed.propertyId || null
    };
  } catch (error) {
    console.error('Error restoring booking state:', error);
    clearBookingState();
    return null;
  }
};

/**
 * Clear booking state from sessionStorage
 */
export const clearBookingState = () => {
  try {
    sessionStorage.removeItem(BOOKING_STATE_KEY);
    sessionStorage.removeItem(RETURN_URL_KEY);
  } catch (error) {
    console.error('Error clearing booking state:', error);
  }
};

/**
 * Save return URL for redirect after login
 * @param {string} url - The URL to return to after login
 */
export const saveReturnUrl = (url) => {
  try {
    sessionStorage.setItem(RETURN_URL_KEY, url);
    return true;
  } catch (error) {
    console.error('Error saving return URL:', error);
    return false;
  }
};

/**
 * Get return URL from sessionStorage
 * @returns {string|null} The return URL or null if not found
 */
export const getReturnUrl = () => {
  try {
    return sessionStorage.getItem(RETURN_URL_KEY);
  } catch (error) {
    console.error('Error getting return URL:', error);
    return null;
  }
};

/**
 * Clear return URL from sessionStorage
 */
export const clearReturnUrl = () => {
  try {
    sessionStorage.removeItem(RETURN_URL_KEY);
  } catch (error) {
    console.error('Error clearing return URL:', error);
  }
};

