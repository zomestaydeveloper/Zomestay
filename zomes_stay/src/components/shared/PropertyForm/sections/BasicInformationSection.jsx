import { useRef } from "react";
import { Home, Plus } from "lucide-react";

const BasicInformationSection = ({
  formData,
  errors,
  propertyTypes,
  handleInputChange,
  onAddPropertyType,
  isEdit,
  onSave,
  isSaving,
  isAdmin = true, // Default to true for admin routes
  titleUniquenessError = "",
  titleCheckLoading = false,
}) => {
  const titleRef = useRef(null);
  const ownerHostIdRef = useRef(null);
  const propertyTypeRef = useRef(null);

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="border-b border-gray-200 px-6 py-3">
        <h2 className="text-sm font-semibold text-gray-900 flex items-center">
          <Home className="h-4 w-4 mr-2 text-blue-600" />
          Basic Information
        </h2>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              Property Title *
            </label>
            <input
              ref={titleRef}
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className="block w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
            {titleUniquenessError && <p className="text-red-500 text-xs mt-1">{titleUniquenessError}</p>}
            {titleCheckLoading && <p className="text-gray-500 text-xs mt-1">Checking title availability...</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              Property Type *
            </label>
            <div className="flex gap-2">
              <select
                ref={propertyTypeRef}
                name="propertyTypeId"
                value={formData.propertyTypeId}
                onChange={handleInputChange}
                className="flex-1 px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select Property Type</option>
                {propertyTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={onAddPropertyType}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
                title="Add New Property Type"
              >
                <Plus size={14} />
              </button>
            </div>
            {errors.propertyTypeId && <p className="text-red-500 text-xs mt-1">{errors.propertyTypeId}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              Owner Host ID (Email) *
            </label>
            <input
              ref={ownerHostIdRef}
              type="email"
              name="ownerHostId"
              value={formData.ownerHostId}
              onChange={handleInputChange}
              className="block w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            {errors.ownerHostId && <p className="text-red-500 text-xs mt-1">{errors.ownerHostId}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              className="block w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Commission Percentage - Admin Only */}
          {isAdmin && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Commission Percentage (%)
              </label>
              <input
                type="number"
                name="commissionPercentage"
                value={formData.commissionPercentage}
                onChange={handleInputChange}
                min="0"
                max="100"
                step="0.01"
                placeholder="e.g., 10.50"
                className="block w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Admin commission percentage for bookings (0-100%)
              </p>
              {errors.commissionPercentage && (
                <p className="text-red-500 text-xs mt-1">{errors.commissionPercentage}</p>
              )}
            </div>
          )}
        </div>

        <div className="mt-4">
          <label className="block text-xs font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            rows={3}
            className="block w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="mt-4">
          <label className="block text-xs font-medium text-gray-700 mb-2">
            Rules and Policies (comma-separated)
          </label>
          <textarea
            name="rulesAndPolicies"
            value={formData.rulesAndPolicies}
            onChange={handleInputChange}
            rows={2}
            className="block w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="No smoking, No pets, Check-in after 2 PM..."
          />
        </div>

        {isEdit && (
          <div className="mt-6 flex justify-end pr-5 pb-3">
            <button
              type="button"
              onClick={onSave}
              disabled={isSaving}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Update Basics"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BasicInformationSection;

