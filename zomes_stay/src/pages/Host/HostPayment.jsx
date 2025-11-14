import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import AllPayments from "../../components/Payments/AllPayments";
import { propertyService } from "../../services";
import { Loader2 } from "lucide-react";

export default function HostPayment() {
  const hostAuth = useSelector((state) => state.hostAuth);
  const hostId = hostAuth?.id;

  const [propertyId, setPropertyId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProperty = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!hostId) {
          setError("Host ID is required");
          return;
        }

        // Fetch host's property
        const response = await propertyService.getHostProperties(hostId);

        if (response?.data?.data) {
          const property = Array.isArray(response.data.data)
            ? response.data.data[0]
            : response.data.data;
          setPropertyId(property?.id || null);
        } else {
          setError("No property found for this host");
        }
      } catch (err) {
        console.error("Error fetching host property:", err);
        setError(err?.response?.data?.message || "Failed to fetch property");
      } finally {
        setLoading(false);
      }
    };

    fetchProperty();
  }, [hostId, hostAuth?.hostAccessToken]);

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
          <p className="text-sm mt-1">{error || "Property ID is required"}</p>
        </div>
      </div>
    );
  }

  return (
    <AllPayments
      propertyId={propertyId}
      isAdmin={false}
      title="Payments & Transactions - Property Payments"
    />
  );
}