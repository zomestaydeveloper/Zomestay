import FacilitiesManager from "../../../components/shared/PropertyConfigurations/FacilitiesManager";

const HostFacilities = () => {
  return (
    <FacilitiesManager
      title="Facilities"
      description="Review available facilities and add new ones for your properties."
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

export default HostFacilities;

