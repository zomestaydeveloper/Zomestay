import RoomTypesManager from "../../../components/shared/PropertyConfigurations/RoomTypesManager";

const HostRoomTypes = () => {
  return (
    <RoomTypesManager
      title="Room Types"
      description="Browse existing room types and add new ones for your listings."
      allowEdit={false}
      allowDelete={false}
      renderSelectionHeader={() => "Selected"}
      renderSelectionCell={() => (
        <span className="text-xs text-gray-400 italic">Selection coming soon</span>
      )}
    />
  );
};

export default HostRoomTypes;

