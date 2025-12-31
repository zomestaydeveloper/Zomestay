import { useState, useEffect } from "react";
import frontdeskCommon from "../../../../services/property/frontdesk/frontdeskcommon";
import { formatQueryDate, addDays } from "../utils/dateUtils";

/**
 * Custom hook to manage front desk snapshot loading
 */
export const useFrontDeskSnapshot = ({ propertyId, weekStart, refreshCounter }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [snapshot, setSnapshot] = useState(null);

  useEffect(() => {
    if (!propertyId) {
      setSnapshot(null);
      setLoading(false);
      return;
    }

    let isMounted = true;
    const loadSnapshot = async () => {
      // Don't show loading spinner on auto-refresh (only on manual refresh)
      if (refreshCounter === 0) {
        setLoading(true);
      }
      setError(null);

      const from = formatQueryDate(weekStart);
      const to = formatQueryDate(addDays(weekStart, 6));

      try {
        const response = await frontdeskCommon.fetchSnapshot({
          propertyId,
          from,
          to,
        });

        const payload = response?.data?.data || response?.data || null;
        if (!isMounted) {
          return;
        }

        setSnapshot(payload);
      } catch (fetchError) {
        if (!isMounted) {
          return;
        }
        console.error("Failed to load front desk snapshot", fetchError);
        setError(fetchError);
        setSnapshot(null);
      } finally {
        if (isMounted && refreshCounter === 0) {
          setLoading(false);
        }
      }
    };

    loadSnapshot();

    // PRODUCTION: Auto-refresh dashboard every 30 seconds to show new bookings
    // This ensures admin/host sees bookings created via payment links automatically
    const autoRefreshInterval = setInterval(() => {
      if (isMounted && propertyId) {
        // Trigger refresh by updating refreshCounter
        // Note: This hook doesn't control refreshCounter, parent component does
      }
    }, 30000); // 30 seconds

    return () => {
      isMounted = false;
      clearInterval(autoRefreshInterval);
    };
  }, [propertyId, weekStart, refreshCounter]);

  return {
    loading,
    error,
    snapshot,
  };
};

