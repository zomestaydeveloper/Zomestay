import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import { Building2, ChevronDown } from "lucide-react";
import FrontDeskBoard from "../../../components/shared/FrontDesk/FrontDeskBoard";
import { propertyService } from "../../../services";

const HostFrontDeskWrapper = () => {
  const hostAuth = useSelector((state) => state.hostAuth);
  const hostId = hostAuth?.id;

  const [properties, setProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (!hostId) return;

    const loadProperties = async () => {
      setLoading(true);
      try {
        const res = await propertyService.getPropertiesList(); // already host-restricted
        if (res.data?.success) {
          const list = res.data.data || [];
          setProperties(list);
          if (list.length > 0) setSelectedProperty(list[0]);
        }
      } catch (err) {
        toast.error("Failed to load your properties");
      } finally {
        setLoading(false);
      }
    };

    loadProperties();
  }, [hostId]);

  const propertyName = useMemo(
    () => selectedProperty?.name || "Your property",
    [selectedProperty]
  );

  return (
    <div className="space-y-6">

      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Front desk</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track availability and bookings for your properties.
          </p>
        </div>

        {/* Property Selector */}
        <div className="relative w-[280px]">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center w-full border px-3 py-2 rounded-lg bg-white"
          >
            <Building2 className="h-4 w-4 text-gray-400 mr-2" />
            <span className="flex-1 text-left">
              {selectedProperty?.name || "Select Property"}
            </span>
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </button>

          {showDropdown && (
            <div className="absolute w-full mt-1 bg-white border rounded-lg shadow z-50">
              {properties.map(p => (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelectedProperty(p);
                    setShowDropdown(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50"
                >
                  <div className="font-medium text-sm">{p.name}</div>
                  <div className="text-xs text-gray-500">{p.location}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {loading ? (
        <div className="rounded-lg border bg-white p-6 text-center text-sm text-gray-500">
          Loading properties…
        </div>
      ) : selectedProperty ? (
        <FrontDeskBoard
          mode="host"
          propertyId={selectedProperty.id}
          propertyName={propertyName}
        />
      ) : (
        <div className="rounded-lg border-dashed border bg-white p-6 text-center text-sm text-gray-500">
          No properties found for this host account.
        </div>
      )}
    </div>
  );
};

export default HostFrontDeskWrapper;
