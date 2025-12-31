import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useSelector } from "react-redux";

/**
 * Custom hook to determine the front desk actor (admin/host) based on current route
 */
export const useFrontDeskActor = () => {
  const location = useLocation();
  const adminAuth = useSelector((state) => state.adminAuth);
  const hostAuth = useSelector((state) => state.hostAuth);

  const frontdeskActor = useMemo(() => {
    const buildActor = (auth, roleLabel) => {
      if (!auth) return null;
      const identifier = auth.id || auth.email || auth.phone;
      if (!identifier) return null;
      const nameParts = [auth.first_name, auth.last_name].filter(Boolean);
      const name =
        nameParts.join(" ").trim() ||
        auth.email ||
        auth.phone ||
        auth.id ||
        roleLabel;
      const contact = auth.email || auth.phone || "";
      const label =
        contact && contact !== name
          ? `${roleLabel}: ${name} (${contact})`
          : `${roleLabel}: ${name}`;
      return {
        role: roleLabel.toLowerCase(),
        id: identifier,
        name,
        contact,
        label,
        reason: `${roleLabel} hold`,
      };
    };

    const path = (location?.pathname || "").toLowerCase();

    if (path.startsWith("/host") || path.includes("/host/")) {
      return buildActor(hostAuth, "Host") || buildActor(adminAuth, "Admin") || null;
    }

    if (path.startsWith("/admin") || path.includes("/admin/")) {
      return buildActor(adminAuth, "Admin") || buildActor(hostAuth, "Host") || null;
    }

    return buildActor(adminAuth, "Admin") || buildActor(hostAuth, "Host") || null;
  }, [location?.pathname, adminAuth, hostAuth]);

  return frontdeskActor;
};

