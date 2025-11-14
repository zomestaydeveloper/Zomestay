import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import FrontDeskBoard from "../../../components/shared/FrontDesk/FrontDeskBoard";
import propertyService from "../../../services/property/admin/propertyService";
import adminFrontDeskService from "../../../services/property/frontdesk/adminFrontDeskService";

const AdminFrontDesk = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPropertyId, setSelectedPropertyId] = useState("");

  useEffect(() => {
    let isMounted = true;

    const fetchProperties = async () => {
      setLoading(true);
      try {
        const response = await propertyService.getPropertiesList();
        const list = response?.data?.data || response?.data || [];
        if (isMounted) {
          setProperties(list);
          if (list.length > 0) {
            setSelectedPropertyId(list[0].id);
          }
        }
      } catch (error) {
        console.error("Failed to load properties", error);
        if (isMounted) {
          toast.error(
            error?.response?.data?.message || "Failed to load properties. Please try again."
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchProperties();

    return () => {
      isMounted = false;
    };
  }, []);

  const selectedProperty = useMemo(() => {
    if (!selectedPropertyId) return null;
    return properties.find((property) => property.id === selectedPropertyId) || null;
  }, [properties, selectedPropertyId]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-gray-900">Property front desk</h1>
        <p className="mt-1 text-sm text-gray-500">
          Review availability, bookings, holds and blocks for the selected property.
        </p>
      </header>

      <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400">Select property</p>
            <p className="text-sm text-gray-500">
              Switch between properties to view their respective front desks.
            </p>
          </div>
          <select
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 md:w-56 disabled:opacity-60"
            value={selectedPropertyId}
            onChange={(event) => setSelectedPropertyId(event.target.value)}
            disabled={loading || properties.length === 0}
          >
            {loading && <option>Loading...</option>}
            {!loading && properties.length === 0 && <option>No properties found</option>}
            {!loading &&
              properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.title || property.name || "Untitled property"}
                </option>
              ))}
          </select>
        </div>
      </section>

      {loading ? (
        <div className="rounded-lg border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
          Loading front desk…
        </div>
      ) : selectedProperty ? (
        <FrontDeskBoard
          mode="admin"
          propertyId={selectedProperty.id}
          propertyName={selectedProperty.name}
          apiClient={adminFrontDeskService}
        />
      ) : (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500">
          Select a property to load the front desk view.
        </div>
      )}
    </div>
  );
};

export default AdminFrontDesk;

