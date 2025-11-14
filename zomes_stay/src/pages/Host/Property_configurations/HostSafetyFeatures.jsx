import SafetyFeaturesManager from "../../../components/shared/PropertyConfigurations/SafetyFeaturesManager";

const HostSafetyFeatures = () => {
  return (
    <SafetyFeaturesManager
      title="Safety & Hygiene"
      description="Review safety and hygiene measures. You can add new items for your property listings."
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

export default HostSafetyFeatures;

