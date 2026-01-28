import { Routes, Route } from "react-router-dom";
import BaseLayout from "../pages/Admin/BaseLayout";
import Dashboard from "../pages/Admin/DashBoard";
import AdminFrontDesk from "../pages/Admin/FrontDesk/AdminFrontDesk";
import Agents from "../pages/Admin/Agents";
import Agent_list from "../pages/Admin/Agent_list";
import Properties from "../pages/Admin/Properties";
import AddProperty from "../pages/Admin/AddProperty";
import EditProperty from "../pages/Admin/EditProperty";
import Amenities from "../pages/Admin/Property_configurations/Amenities";
import Facilities from "../pages/Admin/Property_configurations/Facilities";
import SafetyFeatures from "../pages/Admin/Property_configurations/SafetyFeatures";
import PropertyTypes from "../pages/Admin/Property_configurations/PropertyTypes";
import RoomTypes from "../pages/Admin/Property_configurations/RoomTypes";
import Admin_inventory from "../pages/Admin/Admin_inventory";
import AdminAddRatePlan from "../pages/Admin/AddRatePlan";
import Best_rates from "../pages/Host/Best_rates";
import MealPlan from "../pages/Host/MealPlan";
import AllBookings from "../pages/Admin/AllBookings";
import RegisteredUsers from "../pages/Admin/RegisteredUsers";
import PaymentsTransactions from "../pages/Admin/Payment";
import PromotionsDiscounts from "../pages/Admin/PromotionsDiscounts";
import CancellationPolicy from "../pages/Admin/cancellation_policy/cancellation_policy";
import SiteConfiguration from "../pages/Admin/Siteconfiguration";
import CallbackRequests from "../pages/Admin/CallbackRequests";
import CancellationRequests from "../pages/Admin/CancellationRequests";
import HostList from "../pages/Admin/HostList";
import { AdminProtectedRoute } from "./ProtectedRoute";

/**
 * AdminRoutes
 * - All admin-protected routes that require admin authentication
 * - Uses AdminProtectedRoute to guard access
 */
const AdminRoutes = () => {
  return (
    <Routes>
      {/* Admin Layout + Protected Child Pages */}
      <Route
        path="/admin/base"
        element={
          <AdminProtectedRoute redirectTo="/admin">
            <BaseLayout />
          </AdminProtectedRoute>
        }
      >
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="front-desk" element={<AdminFrontDesk />} />
        <Route path="travel_agents_rate" element={<Agents />} />
        <Route path="travel_agents_list" element={<Agent_list />} />
        <Route path="properties" element={<Properties />} />
        <Route path="properties/add" element={<AddProperty />} />
        <Route path="properties/edit/:propertyId" element={<EditProperty />} />
        <Route path="amenities" element={<Amenities />} />
        <Route path="facilities" element={<Facilities />} />
        <Route path="safety_features" element={<SafetyFeatures />} />
        <Route path="property_types" element={<PropertyTypes />} />
        <Route path="room_types" element={<RoomTypes />} />
        <Route path="inventory_management" element={<Admin_inventory />} />
        <Route path="add-rate-plan" element={<AdminAddRatePlan />} />
        <Route path="best_available_rates" element={<Best_rates />} />
        <Route path="meal_plans" element={<MealPlan />} />
        <Route path="all_bookings" element={<AllBookings />} />
        <Route path="registred_users" element={<RegisteredUsers />} />
        <Route path="hosts" element={<HostList />} />
        <Route path="transactions" element={<PaymentsTransactions />} />
        <Route path="promotion" element={<PromotionsDiscounts />} />
        <Route path="cancellation_policies" element={<CancellationPolicy />} />
        <Route path="site-configuration" element={<SiteConfiguration />} />
        <Route path="callback-requests" element={<CallbackRequests />} />
        <Route path="cancellation-requests" element={<CancellationRequests />} />
      </Route>
    </Routes>
  );
};

export default AdminRoutes;

