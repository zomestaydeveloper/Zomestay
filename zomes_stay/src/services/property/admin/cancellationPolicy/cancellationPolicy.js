import apiService from "../../../api/apiService";
import { PROPERTY } from "../../../api/apiEndpoints";

const cancellationPolicyService = {
  create: (payload) => apiService.post(PROPERTY.CANCELLATION_POLICIES, payload),
  list: (params) => apiService.get(PROPERTY.CANCELLATION_POLICIES, { params }),
  update: (id, payload) =>
    apiService.put(`${PROPERTY.CANCELLATION_POLICIES}/${encodeURIComponent(id)}`, payload),
  remove: (id) =>
    apiService.delete(`${PROPERTY.CANCELLATION_POLICIES}/${encodeURIComponent(id)}`),
};

export default cancellationPolicyService;

