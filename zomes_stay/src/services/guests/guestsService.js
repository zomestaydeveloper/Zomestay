import apiService from "../api/apiService";
import { GUESTS } from "../api/apiEndpoints";

const encodeId = (value) => encodeURIComponent(value);

const guestsService = {
  /**
   * Get all guests (Admin only)
   * @returns {Promise} API response
   */
  getAllGuests: () => apiService.get(GUESTS.GET_ALL_GUESTS),

  /**
   * Get guests for a specific property (Host only)
   * @param {string} propertyId - Property ID
   * @returns {Promise} API response
   */
  getPropertyGuests: (propertyId) =>
    apiService.get(GUESTS.GET_PROPERTY_GUESTS.replace(':propertyId', encodeId(propertyId))),

  /**
   * Block a guest
   * @param {string} guestId - Guest ID (userId or guest email)
   * @returns {Promise} API response
   */
  blockGuest: (guestId) =>
    apiService.post(GUESTS.BLOCK_GUEST.replace(':guestId', encodeId(guestId))),

  /**
   * Unblock a guest
   * @param {string} guestId - Guest ID (userId or guest email)
   * @returns {Promise} API response
   */
  unblockGuest: (guestId) =>
    apiService.post(GUESTS.UNBLOCK_GUEST.replace(':guestId', encodeId(guestId))),

  /**
   * Toggle block status of a guest
   * @param {string} guestId - Guest ID (userId or guest email)
   * @returns {Promise} API response
   */
  toggleBlockGuest: (guestId) =>
    apiService.patch(GUESTS.TOGGLE_BLOCK.replace(':guestId', encodeId(guestId))),
};

export default guestsService;

