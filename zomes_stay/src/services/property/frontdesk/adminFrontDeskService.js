import frontdeskCommon from "./frontdeskcommon";

const adminFrontDeskService = {
  fetchSnapshot: (params) => frontdeskCommon.fetchSnapshot(params),
};

export default adminFrontDeskService;

