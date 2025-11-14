import apiService from "../../api/apiService";
import { PROPERTY } from "../../api/apiEndpoints";

const encodeId = (value) => encodeURIComponent(value);

const multipartConfig = {
  headers: { "Content-Type": "multipart/form-data" },
};

const propertyUpdationService = {
  updateBasics: (propertyId, payload) =>
    apiService.patch(
      `${PROPERTY.PROPERTY}/${encodeId(propertyId)}/basics`,
      payload
    ),

  updateLocation: (propertyId, payload) =>
    apiService.patch(
      `${PROPERTY.PROPERTY}/${encodeId(propertyId)}/location`,
      payload
    ),

  updateFeatures: (propertyId, payload) =>
    apiService.patch(
      `${PROPERTY.PROPERTY}/${encodeId(propertyId)}/features`,
      payload
    ),

  updateRoomTypes: (propertyId, payload, config) =>
    apiService.patch(
      `${PROPERTY.PROPERTY}/${encodeId(propertyId)}/room-types`,
      payload,
      config ?? multipartConfig
    ),

  updateGallery: (propertyId, payload, config) =>
    apiService.patch(
      `${PROPERTY.PROPERTY}/${encodeId(propertyId)}/gallery`,
      payload,
      config ?? multipartConfig
    ),

  deleteRoomType: (propertyId, propertyRoomTypeId) =>
    apiService.delete(
      `${PROPERTY.PROPERTY}/${encodeId(propertyId)}/room-types/${encodeId(propertyRoomTypeId)}`
    ),
};

export default propertyUpdationService;

