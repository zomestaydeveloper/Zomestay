import MultiSelect from "../MultiSelect";

const FeaturesSection = ({
  formData,
  amenities,
  facilities,
  safetyHygiene,
  handleAmenitiesChange,
  handleFacilitiesChange,
  handleSafetyChange,
  onAddAmenity,
  onAddFacility,
  onAddSafety,
  isEdit,
  onSave,
  isSaving,
}) => {
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="border-b border-gray-200 px-6 py-3">
        <h2 className="text-sm font-semibold text-gray-900">Property Features</h2>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <MultiSelect
            options={amenities}
            selected={formData.amenityIds}
            onChange={handleAmenitiesChange}
            placeholder="Select amenities"
            onAddNew={onAddAmenity}
            label="Amenities"
          />

          <MultiSelect
            options={facilities}
            selected={formData.facilityIds}
            onChange={handleFacilitiesChange}
            placeholder="Select facilities"
            onAddNew={onAddFacility}
            label="Facilities"
          />

          <MultiSelect
            options={safetyHygiene}
            selected={formData.safetyIds}
            onChange={handleSafetyChange}
            placeholder="Select safety features"
            onAddNew={onAddSafety}
            label="Safety & Hygiene"
          />
        </div>
        {isEdit && (
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={onSave}
              disabled={isSaving}
              className="inline-flex items-center px-4 py-2 text-xs font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Update Features"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FeaturesSection;

