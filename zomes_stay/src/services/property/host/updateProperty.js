import apiService from "../../api/apiService";
import { HOST_PROPERTY } from "../../api/apiEndpoints";

const multipartConfig = {
  headers: { "Content-Type": "multipart/form-data" },
};

const updatePropertyService = {
  updateBasics: (propertyId, payload) =>
    apiService.patch(
      `${HOST_PROPERTY.UPDATE_HOST_PROPERTY_BASICS}/${propertyId}/basics`,
      payload
    ),

  updateLocation: (propertyId, payload) =>
    apiService.patch(
      `${HOST_PROPERTY.UPDATE_HOST_PROPERTY_LOCATION}/${propertyId}/location`,
      payload
    ),

  updatePolicy: (propertyId, payload) =>
    apiService.patch(
      `${HOST_PROPERTY.UPDATE_HOST_PROPERTY_POLICY}/${propertyId}/policy`,
      payload
    ),

  updateFeatures: (propertyId, payload) =>
    apiService.patch(
      `${HOST_PROPERTY.UPDATE_HOST_PROPERTY_FEATURES}/${propertyId}/features`,
      payload
    ),

  updateGallery: (propertyId, payload, config = multipartConfig) =>
    apiService.patch(
      `${HOST_PROPERTY.UPDATE_HOST_PROPERTY_GALLERY}/${propertyId}/gallery`,
      payload,
      config
    ),

  updateRoomTypes: (propertyId, payload, config = multipartConfig) =>
    apiService.patch(
      `${HOST_PROPERTY.UPDATE_HOST_PROPERTY_ROOM_TYPES}/${propertyId}/room-types`,
      payload,
      config
    ),
};

export default updatePropertyService;