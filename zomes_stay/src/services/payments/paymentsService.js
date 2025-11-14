import apiService from "../api/apiService";
import { PAYMENTS } from "../api/apiEndpoints";

const encodeId = (value) => encodeURIComponent(value);

const paymentsService = {
  /**
   * Get all payments (Admin only)
   */
  getAllPayments: () => apiService.get(PAYMENTS.GET_ALL_PAYMENTS),

  /**
   * Get payments for a specific property (Admin or Host)
   * @param {string} propertyId - Property ID
   */
  getPropertyPayments: (propertyId) =>
    apiService.get(PAYMENTS.GET_PROPERTY_PAYMENTS.replace(':propertyId', encodeId(propertyId))),

  /**
   * Update payment status
   * @param {string} paymentId - Payment ID
   * @param {string} status - Payment status (PENDING, PAID, FAILED, REFUND_INITIATED, REFUND_COMPLETED, REFUND_FAILED, REFUND_NOT_APPLICABLE)
   */
  updatePaymentStatus: (paymentId, status) =>
    apiService.patch(
      PAYMENTS.UPDATE_PAYMENT_STATUS.replace(':paymentId', encodeId(paymentId)),
      { status }
    ),

  /**
   * Get all payment statuses (for dropdown)
   */
  getPaymentStatuses: () => apiService.get(PAYMENTS.GET_PAYMENT_STATUSES),
};

export default paymentsService;

