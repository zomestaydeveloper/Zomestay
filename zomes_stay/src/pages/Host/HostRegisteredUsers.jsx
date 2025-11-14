import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import AllGuests from "../../components/Guests/AllGuests";
import { propertyService } from "../../services";
import { Loader2 } from "lucide-react";

/**
 * Host RegisteredUsers Page
 * Shows guests from host's property only
 */
export default function HostRegisteredUsers() {
  const hostAuth = useSelector((state) => state.hostAuth);
  const hostId = hostAuth?.id;

  const [propertyId, setPropertyId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch host's property to get propertyId
  useEffect(() => {
    const fetchProperty = async () => {
      if (!hostId) {
        setError("Host ID not found");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await propertyService.getHostProperties(hostId);
        const propertyData = response?.data?.data;

        if (propertyData?.id) {
          setPropertyId(propertyData.id);
        } else {
          setError("No property found for this host");
        }
      } catch (err) {
        console.error("Error fetching host property:", err);
        setError(err?.response?.data?.message || "Failed to load property");
      } finally {
        setLoading(false);
      }
    };

    fetchProperty();
  }, [hostId]);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading property...
        </div>
      </div>
    );
  }

  if (error || !propertyId) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <p className="font-medium">Error loading property</p>
          <p className="text-sm mt-1">{error || "Property ID not found"}</p>
        </div>
      </div>
    );
  }

  return (
    <AllGuests
      propertyId={propertyId}
      isAdmin={false}
      title="Guest Management - Property Guests"
    />
  );
}