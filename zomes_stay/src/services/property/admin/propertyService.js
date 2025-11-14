import apiService from "../../api/apiService";
import { PROPERTY, HOST_PROPERTY } from "../../api/apiEndpoints";

const multipartConfig = {
  headers: { "Content-Type": "multipart/form-data" },
};

const encodeId = (value) => encodeURIComponent(value);

const propertyService = {
  // Lookup + utilities
  getAmenities: (params) => apiService.get(PROPERTY.AMENITIES, { params }),
  getFacilities: (params) => apiService.get(PROPERTY.FACILITIES, { params }),
  getSafeties: (params) => apiService.get(PROPERTY.SAFETIES, { params }),
  getRoomTypes: (params) => apiService.get(PROPERTY.ROOM_TYPES, { params }),
  getRooms: () => apiService.get(PROPERTY.ROOMS),
  getCreationFormData: () => apiService.get(PROPERTY.PROPERTY_UTILS),

  getPropertyTypes: () => apiService.get(PROPERTY.PROPERTY_TYPE),
  getProperties: (params) => apiService.get(PROPERTY.PROPERTY, { params }),
  getPropertiesList: (params) => apiService.get(PROPERTY.PROPERTY_LIST, { params }),
  getHostProperties: (id) => apiService.get(`${HOST_PROPERTY.PROPERTY}/${encodeId(id)}`),
  getPropertyRoomTypes: (id) => apiService.get(`${PROPERTY.PROPERTY_ROOM_TYPES}/${encodeId(id)}`),
  getPropertyByQuery: (query) => apiService.get(`${PROPERTY.PROPERTY_BY_QUERY}/${encodeId(query)}`),
  searchProperties: (params) => apiService.get(PROPERTY.PROPERTY_BY_QUERY, { params }),

  // Amenities
  createAmenity: (formData) => apiService.post(PROPERTY.AMENITIES, formData, multipartConfig),
  updateAmenity: (amenityId, formData) =>
    apiService.patch(`${PROPERTY.AMENITIES}/${encodeId(amenityId)}`, formData, multipartConfig),
  deleteAmenity: (amenityId) => apiService.delete(`${PROPERTY.AMENITIES}/${encodeId(amenityId)}`),

  // Facilities
  createFacility: (formData) => apiService.post(PROPERTY.FACILITIES, formData, multipartConfig),
  updateFacility: (facilityId, formData) =>
    apiService.put(`${PROPERTY.FACILITIES}/${encodeId(facilityId)}`, formData, multipartConfig),
  deleteFacility: (facilityId) => apiService.delete(`${PROPERTY.FACILITIES}/${encodeId(facilityId)}`),

  // Safety & Hygiene
  createSafety: (formData) => apiService.post(PROPERTY.SAFETIES, formData, multipartConfig),
  updateSafety: (safetyId, formData) =>
    apiService.put(`${PROPERTY.SAFETIES}/${encodeId(safetyId)}`, formData, multipartConfig),
  deleteSafety: (safetyId) => apiService.delete(`${PROPERTY.SAFETIES}/${encodeId(safetyId)}`),

  // Property types
  createPropertyType: (payload) => apiService.post(PROPERTY.PROPERTY_TYPE, payload),
  updatePropertyType: (propertyTypeId, payload) =>
    apiService.put(`${PROPERTY.PROPERTY_TYPE}/${encodeId(propertyTypeId)}`, payload),
  deletePropertyType: (propertyTypeId) =>
    apiService.delete(`${PROPERTY.PROPERTY_TYPE}/${encodeId(propertyTypeId)}`),

  // Room types
  createRoomType: (payload) => apiService.post(PROPERTY.ROOM_TYPES, payload),
  updateRoomType: (roomTypeId, payload) =>
    apiService.put(`${PROPERTY.ROOM_TYPES}/${encodeId(roomTypeId)}`, payload),
  deleteRoomType: (roomTypeId) => apiService.delete(`${PROPERTY.ROOM_TYPES}/${encodeId(roomTypeId)}`),

  // Rooms
  createRoom: (propertyId, payload) =>
    apiService.post(`${PROPERTY.ROOMS}/${encodeId(propertyId)}/rooms`, payload),
  updateRoom: (propertyId, roomId, payload) =>
    apiService.put(
      `${PROPERTY.ROOMS}/${encodeId(propertyId)}/rooms/${encodeId(roomId)}`,
      payload
    ),
  deleteRoom: (propertyId, roomId) =>
    apiService.delete(`${PROPERTY.ROOMS}/${encodeId(propertyId)}/rooms/${encodeId(roomId)}`),

  // Properties
  createProperty: (formData) => apiService.post(PROPERTY.PROPERTY_CREATE, formData, multipartConfig),
  getPropertyForEdit: (propertyId) =>
    apiService.get(`${PROPERTY.PROPERTY}/${encodeId(propertyId)}/edit`),
  updatePropertyDetails: (propertyId, formData) =>
    apiService.put(`${PROPERTY.PROPERTY}/${encodeId(propertyId)}/edit`, formData, multipartConfig),
  updatePropertyStatus: (propertyId, payload) =>
    apiService.patch(`${PROPERTY.PROPERTY}/${encodeId(propertyId)}/status`, payload),
  deleteProperty: (propertyId) => apiService.delete(`${PROPERTY.PROPERTY}/${encodeId(propertyId)}`),

  // Room configuration helpers
  getRoomConfigurations: (propertyId) =>
    apiService.get(`${PROPERTY.ROOM_CONFIGURATIONS}/${encodeId(propertyId)}/room-configurations`),
  updateRooms: (propertyId, payload) =>
    apiService.put(`${PROPERTY.UPDATE_ROOMS}/${encodeId(propertyId)}/rooms`, payload),

  // Cancellation policy helper
  createCancellationPolicy: (policy) => apiService.post(PROPERTY.CANCELLATION_POLICIES, policy),

  // Property detail helpers
  getPropertyDetails: (id) => apiService.get(`${PROPERTY.PROPERTY}/${id}`),
  getPropertyAvailability: (id, dates) =>
    apiService.get(`${PROPERTY.PROPERTY}/${id}/availability`, { params: dates }),
  getPropertyRates: (id, dates) =>
    apiService.get(`${PROPERTY.PROPERTY}/${id}/rates`, { params: dates }),
  getPropertyReviews: (id) => apiService.get(`${PROPERTY.PROPERTY}/${id}/reviews`),
};

export default propertyService;
