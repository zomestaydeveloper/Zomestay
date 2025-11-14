import apiService from "../../api/apiService";
import { FRONT_DESK } from "../../api/apiEndpoints";

const encodeId = (value) => encodeURIComponent(value);

const hostFrontDeskService = {
  getPropertySummary: (hostId) =>
    apiService.get(`${FRONT_DESK.HOST_PROPERTY_SUMMARY}/${encodeId(hostId)}`),
};

export default hostFrontDeskService;

