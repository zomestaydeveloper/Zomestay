import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import FrontDeskBoard from "../../../components/shared/FrontDesk/FrontDeskBoard";
import { hostFrontDeskService } from "../../../services/property";

const HostFrontDeskWrapper = () => {
  const hostAuth = useSelector((state) => state.hostAuth);
  const hostId = hostAuth?.id;

  const [propertySummary, setPropertySummary] = useState(null);
  const [loading, setLoading] = useState(true);

  console.log(propertySummary)

  useEffect(() => {
    let isMounted = true;

    const loadPropertySummary = async () => {
      if (!hostId) {
        setPropertySummary(null);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const response = await hostFrontDeskService.getPropertySummary(hostId);
        const summary = response?.data?.data || response?.data || null;
        if (isMounted) {
          setPropertySummary(summary);
        }
      } catch (error) {
        console.error("Failed to load host property summary", error);
        if (isMounted) {
          setPropertySummary(null);
          toast.error(
            error?.response?.data?.message ||
              "Failed to load your property. Please contact support."
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadPropertySummary();

    return () => {
      isMounted = false;
    };
  }, [hostId]);

  const propertyName = useMemo(() => {
    return propertySummary?.title || propertySummary?.name || "Your property";
  }, [propertySummary]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-gray-900">Front desk</h1>
        <p className="mt-1 text-sm text-gray-500">
          Track availability and bookings for your property week by week.
        </p>
      </header>

      {loading ? (
        <div className="rounded-lg border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
          Loading your property…
        </div>
      ) : propertySummary ? (
        <FrontDeskBoard mode="host" propertyId={propertySummary.id} propertyName={propertyName} />
      ) : (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500">
          We could not find a property assigned to your host account.
        </div>
      )}
    </div>
  );
};

export default HostFrontDeskWrapper;

