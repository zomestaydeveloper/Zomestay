import apiService from "../../api/apiService";
import { FRONT_DESK } from "../../api/apiEndpoints";

const encodeId = (value) => encodeURIComponent(value);

const paymentService = {
  createPaymentLink: ({ propertyId, payload }) => {
    if (!propertyId) {
      throw new Error("Property identifier is required to create a payment link");
    }

    if (!payload || typeof payload !== "object") {
      throw new Error("Payment link payload is required");
    }

    const url = FRONT_DESK.PAYMENT_LINKS.replace(":propertyId", encodeId(propertyId));

    return apiService.post(url, payload);
  },
};

export default paymentService;
