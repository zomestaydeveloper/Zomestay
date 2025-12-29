import { useRef } from "react";
import { MapPin, Upload, X } from "lucide-react";

const LocationSection = ({
  formData,
  errors,
  handleInputChange,
  cityIconPreview,
  cityIconFile,
  cityIconError,
  onCityIconChange,
  onCityIconRemove,
  isEdit,
  isSubmitting,
  onSave,
  isSaving,
}) => {
  const streetRef = useRef(null);
  const cityRef = useRef(null);
  const stateRef = useRef(null);
  const zipCodeRef = useRef(null);

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="border-b border-gray-200 px-6 py-3">
        <h2 className="text-sm font-semibold text-gray-900 flex items-center">
          <MapPin className="h-4 w-4 mr-2 text-blue-600" />
          Location Information
        </h2>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              Street *
            </label>
            <input
              ref={streetRef}
              type="text"
              name="location.address.street"
              value={formData.location.address.street}
              onChange={handleInputChange}
              className="block w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            {errors.street && <p className="text-red-500 text-xs mt-1">{errors.street}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              City *
            </label>
            <input
              ref={cityRef}
              type="text"
              name="location.address.city"
              value={formData.location.address.city}
              onChange={handleInputChange}
              className="block w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              State *
            </label>
            <input
              ref={stateRef}
              type="text"
              name="location.address.state"
              value={formData.location.address.state}
              onChange={handleInputChange}
              className="block w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            {errors.state && <p className="text-red-500 text-xs mt-1">{errors.state}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              ZIP Code *
            </label>
            <input
              ref={zipCodeRef}
              type="text"
              name="location.address.zipCode"
              value={formData.location.address.zipCode}
              onChange={handleInputChange}
              className="block w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            {errors.zipCode && <p className="text-red-500 text-xs mt-1">{errors.zipCode}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              Country
            </label>
            <input
              type="text"
              name="location.address.country"
              value={formData.location.address.country}
              onChange={handleInputChange}
              className="block w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
              readOnly
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              Latitude
            </label>
            <input
              type="number"
              step="any"
              name="location.coordinates.latitude"
              value={formData.location.coordinates.latitude || ""}
              onChange={handleInputChange}
              min="-90"
              max="90"
              className={`block w-full px-3 py-2 text-xs border rounded-lg focus:outline-none focus:ring-2 ${
                errors.latitude ? 'border-red-300 focus:ring-red-500' : 'border-gray-200 focus:ring-blue-500'
              }`}
            />
            {errors.latitude && <p className="text-red-500 text-xs mt-1">{errors.latitude}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              Longitude
            </label>
            <input
              type="number"
              step="any"
              name="location.coordinates.longitude"
              value={formData.location.coordinates.longitude || ""}
              onChange={handleInputChange}
              min="-180"
              max="180"
              className={`block w-full px-3 py-2 text-xs border rounded-lg focus:outline-none focus:ring-2 ${
                errors.longitude ? 'border-red-300 focus:ring-red-500' : 'border-gray-200 focus:ring-blue-500'
              }`}
            />
            {errors.longitude && <p className="text-red-500 text-xs mt-1">{errors.longitude}</p>}
          </div>
        </div>

        {/* City Icon Upload */}
        <div className="mt-4">
          <label className="block text-xs font-medium text-gray-700 mb-2">
            City Icon (SVG) {isEdit && '(Only one icon allowed)'}
          </label>
          {cityIconPreview && (
            <div className="mb-3 relative inline-block">
              <div className="max-h-24 max-w-24 border border-gray-300 rounded-md p-2 bg-gray-50 flex items-center justify-center">
                <img
                  src={cityIconPreview}
                  alt="City icon preview"
                  className="max-h-20 max-w-20 object-contain"
                />
              </div>
              <button
                type="button"
                onClick={onCityIconRemove}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                title="Remove city icon"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
          {!cityIconPreview && (
            <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
              <div className="flex flex-col items-center justify-center pt-3 pb-4">
                <Upload className="w-6 h-6 mb-1 text-gray-500" />
                <p className="mb-1 text-xs text-gray-500">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-[10px] text-gray-500">SVG file only (MAX. 2MB)</p>
              </div>
              <input
                type="file"
                accept=".svg,image/svg+xml"
                onChange={onCityIconChange}
                className="hidden"
                disabled={isSubmitting}
              />
            </label>
          )}
          {cityIconPreview && (
            <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
              <div className="flex flex-col items-center justify-center pt-2 pb-2">
                <Upload className="w-5 h-5 mb-1 text-gray-500" />
                <p className="text-xs text-gray-500">
                  <span className="font-semibold">Replace icon</span>
                </p>
              </div>
              <input
                type="file"
                accept=".svg,image/svg+xml"
                onChange={onCityIconChange}
                className="hidden"
                disabled={isSubmitting}
              />
            </label>
          )}
          {cityIconError && (
            <p className="text-red-500 text-xs mt-1">{cityIconError}</p>
          )}
        </div>
        {isEdit && (
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={onSave}
              disabled={isSaving}
              className="inline-flex items-center px-4 py-2 text-xs font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Update Location"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LocationSection;

