import apiService from "../../api/apiService";
import { PROPERTY_ROOM_TYPES } from "../../api/apiEndpoints";

const propertyRoomTypeService = {

    getPropertyRoomTypes: async (propertyId) => {
        return apiService.get(`${PROPERTY_ROOM_TYPES.PROPERTY_ROOM_TYPES}/${encodeURIComponent(propertyId)}/room-types`);
    }
}


export default propertyRoomTypeService;


