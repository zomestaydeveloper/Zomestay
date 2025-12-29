import { Routes, Route } from "react-router-dom";
import BaseLayout from "../pages/Admin/BaseLayout";
import HostDashboard from "../pages/Host/HostDashBoard";
import HostFrontDesk from "../pages/Host/HostFrontDesk";
import Host_allbookings from "../pages/Host/Host_allbookings";
import HostRegisteredUsers from "../pages/Host/HostRegisteredUsers";
import HostProperties from "../pages/Host/HostProperties";
import HostEditProperty from "../pages/Host/EditProperty";
import HostPaymentsTransactions from "../pages/Host/HostPayment";
import HostPromotionsDiscounts from "../pages/Host/HostPromotionsDiscounts";
import HostInventoryWrapper from "../pages/Host/HostInventoryWrapper";
import MealPlan from "../pages/Host/MealPlan";
import HostAddRatePlanWrapper from "../pages/Host/HostAddRatePlanWrapper";
import HostAmenities from "../pages/Host/Property_configurations/HostAmenities";
import HostFacilities from "../pages/Host/Property_configurations/HostFacilities";
import HostSafetyFeatures from "../pages/Host/Property_configurations/HostSafetyFeatures";
import HostPropertyTypes from "../pages/Host/Property_configurations/HostPropertyTypes";
import HostRoomTypes from "../pages/Host/Property_configurations/HostRoomTypes";
import Best_rates from "../pages/Host/Best_rates";
import { HostProtectedRoute } from "./ProtectedRoute";

/**
 * HostRoutes
 * - All host-protected routes that require host authentication
 * - Uses HostProtectedRoute to guard access
 */
const HostRoutes = () => {
  return (
    <Routes>
      {/* Host Layout + Protected Child Pages */}
      <Route
        path="/host/base"
        element={
          <HostProtectedRoute redirectTo="/host">
            <BaseLayout />
          </HostProtectedRoute>
        }
      >
        <Route path="dashboard" element={<HostDashboard />} />
        <Route path="host-front-desk" element={<HostFrontDesk />} />
        <Route path="host-properties" element={<HostProperties />} />
        <Route path="host-properties/edit/:propertyId" element={<HostEditProperty />} />
        <Route path="host-amenities" element={<HostAmenities />} />
        <Route path="host-facilities" element={<HostFacilities />} />
        <Route path="host-safety_features" element={<HostSafetyFeatures />} />
        <Route path="host-property_types" element={<HostPropertyTypes />} />
        <Route path="host-room_types" element={<HostRoomTypes />} />
        <Route path="inventory_management" element={<HostInventoryWrapper />} />
        <Route path="add-rate-plan" element={<HostAddRatePlanWrapper />} />
        <Route path="best_available_rates" element={<Best_rates />} />
        <Route path="meal_plans" element={<MealPlan />} />
        <Route path="host-all_bookings" element={<Host_allbookings />} />
        <Route path="host-registred_users" element={<HostRegisteredUsers />} />
        <Route path="host-transactions" element={<HostPaymentsTransactions />} />
        <Route path="host-promotion" element={<HostPromotionsDiscounts />} />
      </Route>
    </Routes>
  );
};

export default HostRoutes;

