import { Plus, Trash2 } from "lucide-react";
import { mediaService } from "../../../../services";

const RoomTypesSection = ({
  formData,
  errors,
  roomTypes,
  amenities,
  roomTypeImages,
  roomTypeImageErrors,
  isEdit,
  onAddRoomType,
  onCreateRoomType,
  onAddNewAmenity,
  updateRoomType,
  handleRequestRemoveRoomType,
  handleRoomTypeAmenityToggle,
  handleRoomTypeImageChange,
  handleRoomTypeExistingMediaRemove,
  handleRoomTypeExistingMediaSetPrimary,
  handleRemoveNewRoomTypeImage,
  onSave,
  isSaving,
}) => {
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="border-b border-gray-200 px-6 py-3">
        <div className="flex justify-between items-center">
          <h2 className="text-sm font-semibold text-gray-900">Room Types</h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCreateRoomType}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-lg shadow-sm text-white bg-green-600 hover:bg-green-700"
            >
              <Plus className="h-3 w-3 mr-1" />
              Create Room Type
            </button>
            <button
              type="button"
              onClick={onAddRoomType}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Room Type
            </button>
          </div>
        </div>
      </div>
      <div className="p-6">
        {formData.roomTypes.length === 0 ? (
          <p className="text-gray-500 text-xs">No room types added yet. Click "Add Room Type" to get started.</p>
        ) : (
          <div className="space-y-4">
            {formData.roomTypes.map((roomType, index) => (
              <div key={index} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-sm font-medium text-gray-800">Room Type {index + 1}</h4>
                  <button
                    type="button"
                    onClick={() => handleRequestRemoveRoomType(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  <div className="lg:col-span-4">
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      Room Type *
                    </label>
                    <select
                      value={roomType.roomTypeId}
                      onChange={(e) => updateRoomType(index, 'roomTypeId', e.target.value)}
                      className="block w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select Room Type</option>
                      {roomTypes.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.name}
                        </option>
                      ))}
                    </select>
                    {errors[`roomType_${index}`] && (
                      <p className="text-red-500 text-xs mt-1">{errors[`roomType_${index}`]}</p>
                    )}
                  </div>

                  <div className="lg:col-span-4">
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      Min Occupancy (1-10) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={roomType.minOccupancy}
                      onChange={(e) => updateRoomType(index, 'minOccupancy', parseInt(e.target.value))}
                      className="block w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    {errors[`minOccupancy_${index}`] && (
                      <p className="text-red-500 text-xs mt-1">{errors[`minOccupancy_${index}`]}</p>
                    )}
                  </div>

                  <div className="lg:col-span-4">
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      Occupancy (1-10) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={roomType.Occupancy}
                      onChange={(e) => updateRoomType(index, 'Occupancy', parseInt(e.target.value))}
                      className="block w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    {errors[`occupancy_${index}`] && (
                      <p className="text-red-500 text-xs mt-1">{errors[`occupancy_${index}`]}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-4">
                  <div className="lg:col-span-4">
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      Extra Bed Capacity (0-5)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="5"
                      value={roomType.extraBedCapacity}
                      onChange={(e) => updateRoomType(index, 'extraBedCapacity', parseInt(e.target.value))}
                      className="block w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {errors[`extraBed_${index}`] && (
                      <p className="text-red-500 text-xs mt-1">{errors[`extraBed_${index}`]}</p>
                    )}
                  </div>

                  <div className="lg:col-span-4">
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      Number of Beds (1-10) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={roomType.numberOfBeds ?? 1}
                      onChange={(e) => updateRoomType(index, 'numberOfBeds', parseInt(e.target.value, 10) || 1)}
                      className="block w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    {errors[`numberOfBeds_${index}`] && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors[`numberOfBeds_${index}`]}
                      </p>
                    )}
                  </div>

                  <div className="lg:col-span-4">
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      Bed Type
                    </label>
                    <select
                      value={roomType.bedType || 'DOUBLE'}
                      onChange={(e) => updateRoomType(index, 'bedType', e.target.value)}
                      className="block w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="SINGLE">Single</option>
                      <option value="DOUBLE">Double</option>
                      <option value="QUEEN">Queen</option>
                      <option value="KING">King</option>
                      <option value="TWIN">Twin</option>
                      <option value="FULL">Full</option>
                      <option value="SOFA_BED">Sofa Bed</option>
                      <option value="BUNK_BED">Bunk Bed</option>
                      <option value="MURPHY_BED">Murphy Bed</option>
                      <option value="WATER_BED">Water Bed</option>
                      <option value="AIR_BED">Air Bed</option>
                      <option value="CUSTOM">Custom</option>
                    </select>
                    {errors[`bedType_${index}`] && (
                      <p className="text-red-500 text-xs mt-1">{errors[`bedType_${index}`]}</p>
                    )}
                  </div>
                </div>

                {/* Amenities Section */}
                <div className="mt-4">
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs font-medium text-gray-700">
                      Amenities
                    </label>
                    {onAddNewAmenity && (
                      <button
                        type="button"
                        onClick={onAddNewAmenity}
                        className="text-blue-600 hover:text-blue-800 text-xs"
                      >
                        + Add New Amenity
                      </button>
                    )}
                  </div>
                  <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-lg p-2">
                    {amenities.map((amenity) => {
                      const isSelected = roomType.amenityIds?.some(item => item.id === amenity.id) || false;
                      return (
                        <div
                          key={amenity.id}
                          className="flex items-center gap-2 p-1 hover:bg-gray-50 cursor-pointer"
                          onClick={() => handleRoomTypeAmenityToggle(index, amenity)}
                        >
                          <input type="checkbox" checked={isSelected} readOnly />
                          <span className="text-xs">{amenity.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Room Type Images Section */}
                <div className="mt-4">
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Room Type Images (16:9 aspect ratio, max 2MB each, up to 12 images)
                  </label>

                  {isEdit && roomType.media && roomType.media.some((item) => !item.isDeleted) && (
                    <div className="mb-3">
                      <h5 className="text-xs font-semibold text-gray-600 mb-2">
                        Existing Images
                      </h5>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {roomType.media
                          .filter((mediaItem) => !mediaItem.isDeleted)
                          .map((mediaItem, mediaIdx) => (
                            <div
                              key={mediaItem.id || `${roomType.id}-${mediaIdx}`}
                              className="relative border border-gray-200 rounded-lg overflow-hidden"
                            >
                              <img
                                src={mediaService.getMedia(mediaItem.url)}
                                alt={`Room type ${index + 1} image ${mediaIdx + 1}`}
                                className="w-full h-20 object-cover bg-gray-100"
                              />
                              <div className="absolute inset-0 flex flex-col justify-between p-1">
                                <div className="flex justify-between items-start">
                                  {mediaItem.isFeatured && (
                                    <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-blue-600 text-white rounded">
                                      Primary
                                    </span>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleRoomTypeExistingMediaRemove(index, mediaItem.id)}
                                    className="px-1.5 py-0.5 text-[10px] font-semibold bg-red-500 text-white rounded hover:bg-red-600"
                                  >
                                    Remove
                                  </button>
                                </div>
                                {!mediaItem.isFeatured && (
                                  <button
                                    type="button"
                                    onClick={() => handleRoomTypeExistingMediaSetPrimary(index, mediaItem.id)}
                                    className="self-center px-2 py-0.5 text-[10px] font-semibold bg-white/80 text-gray-700 rounded hover:bg-white"
                                  >
                                    Set Primary
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => handleRoomTypeImageChange(index, e)}
                    className="block w-full text-xs text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-lg file:border-0
                      file:text-xs file:font-semibold
                      file:bg-blue-50 file:text-blue-700
                      hover:file:bg-blue-100"
                  />
                  
                  {roomTypeImageErrors[index] && roomTypeImageErrors[index].length > 0 && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                      <ul className="text-red-600 text-xs">
                        {roomTypeImageErrors[index].map((error, errorIndex) => (
                          <li key={errorIndex}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {roomTypeImages[index] && roomTypeImages[index].length > 0 && (
                    <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2">
                      {roomTypeImages[index].map((file, fileIndex) => (
                        <div key={fileIndex} className="relative">
                          <img
                            src={URL.createObjectURL(file)}
                            alt={`Room Type ${index + 1} Preview ${fileIndex + 1}`}
                            className="w-full h-20 object-cover rounded-lg border border-gray-200"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveNewRoomTypeImage(index, fileIndex)}
                            className="absolute top-1 right-1 px-1.5 py-0.5 text-[10px] font-semibold bg-red-500 text-white rounded hover:bg-red-600"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        {errors.roomTypes && <p className="text-red-500 text-xs mt-1">{errors.roomTypes}</p>}
        {isEdit && (
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={onSave}
              disabled={isSaving}
              className="inline-flex items-center px-4 py-2 text-xs font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Update Room Types"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RoomTypesSection;

