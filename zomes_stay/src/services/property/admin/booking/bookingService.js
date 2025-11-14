import apiService from '../../../api/apiService';
import { PROPERTY, BOOKING_CANCELLATION } from '../../../api/apiEndpoints';

const bookingService = {
  list: (params, config = {}) =>
    apiService.get(PROPERTY.BOOKINGS, {
      ...config,
      params: {
        ...(config.params || {}),
        ...params,
      },
    }),
  getDetails: (bookingId, config = {}) =>
    apiService.get(`${BOOKING_CANCELLATION.BASE}/${bookingId}`, config),
  cancel: (bookingId, payload, config = {}) =>
    apiService.post(
      `${BOOKING_CANCELLATION.CANCEL}/${bookingId}/cancel`,
      payload,
      config
    ),
  markRefundCompleted: (bookingId, payload, config = {}) =>
    apiService.post(
      `${BOOKING_CANCELLATION.REFUND_COMPLETE}/${bookingId}/refund-complete`,
      payload,
      config
    ),
};

export default bookingService;

