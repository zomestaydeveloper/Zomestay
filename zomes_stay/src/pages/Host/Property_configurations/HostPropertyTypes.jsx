import PropertyTypesManager from "../../../components/shared/PropertyConfigurations/PropertyTypesManager";

const HostPropertyTypes = () => {
  return (
    <PropertyTypesManager
      title="Property Types"
      description="Browse and create property type categories for your listings."
      allowEdit={false}
      allowDelete={false}
      renderSelectionHeader={() => "Selected"}
      renderSelectionCell={() => (
        <span className="text-xs text-gray-400 italic">Selection coming soon</span>
      )}
    />
  );
};

export default HostPropertyTypes;

