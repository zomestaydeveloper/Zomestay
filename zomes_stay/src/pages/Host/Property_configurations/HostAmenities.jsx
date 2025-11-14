import AmenitiesManager from "../../../components/shared/PropertyConfigurations/AmenitiesManager";

const HostAmenities = () => {
  return (
    <AmenitiesManager
      title="Amenities"
      description="View and add amenities available for your property portfolio."
      allowEdit={false}
      allowDelete={false}
      allowStatusToggle={false}
      renderSelectionHeader={() => "Selected"}
      renderSelectionCell={() => (
        <span className="text-xs text-gray-400 italic">Selection coming soon</span>
      )}
    />
  );
};

export default HostAmenities;

