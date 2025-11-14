import { BrowserRouter, Routes, Route } from "react-router-dom";
import Body from "./components/Body";
import HomePage from "./components/HomePage";
import LoginPage from "./pages/LoginPage";
//import SignUp from "./pages/signUp";
import OtpVerification from "./pages/OtpVerification";
import OtpVerified from "./pages/OtpVerified";
import Detials from "./pages/DetialsPage";
import ContactUs from "./pages/ContactUs";
import UserProfile from "./pages/UserProfile";
import LegalInfo from "./pages/LegalInfo";
import FindProperty from "./pages/FindProperty";
import HowToAgent from "./pages/HowToAgent";
import Faq from "./pages/Faq";
import SignAgent from "./pages/SignAgent";
import SignUpAgent from './pages/signUpAgent';
import SignInSuccess from './pages/SignInSucces';
import AboutUs from "./pages/AboutUs";
import AdminLogin from "./pages/Admin/AdminLogin";
import BaseLayout from "./pages/Admin/BaseLayout";
import Dashboard from "./pages/Admin/DashBoard";
import Properties from "./pages/Admin/Properties";
import AddProperty from "./pages/Admin/AddProperty";
import WhishList from "./pages/WhishList";
import AllBookings from "./pages/Admin/AllBookings";
import RegisteredUsers  from "./pages/Admin/RegisteredUsers"
import PaymentsTransactions from "./pages/Admin/Payment";
import PromotionsDiscounts from "./pages/Admin/PromotionsDiscounts";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import HostLogin from "./pages/Host/HostLogin";
import HostDashboard from "./pages/Host/HostDashBoard";
import HostFrontDesk from "./pages/Host/HostFrontDesk";
import HostAllBookings from "./pages/Host/HostAllBookings";
import Host_allbookings from "./pages/Host/Host_allbookings"
import HostRegisteredUsers from "./pages/Host/HostRegisteredUsers";
import HostProperties from "./pages/Host/HostProperties";
import HostEditProperty from "./pages/Host/EditProperty";
import HostPaymentsTransactions from "./pages/Host/HostPayment";
import HostPromotionsDiscounts from "./pages/Host/HostPromotionsDiscounts";
import HostInventoryWrapper from "./pages/Host/HostInventoryWrapper";
import MealPlan from "./pages/Host/MealPlan";
import HostAddRatePlanWrapper from "./pages/Host/HostAddRatePlanWrapper";
import HostAmenities from "./pages/Host/Property_configurations/HostAmenities";
import HostFacilities from "./pages/Host/Property_configurations/HostFacilities";
import HostSafetyFeatures from "./pages/Host/Property_configurations/HostSafetyFeatures";
import HostPropertyTypes from "./pages/Host/Property_configurations/HostPropertyTypes";
import HostRoomTypes from "./pages/Host/Property_configurations/HostRoomTypes";


import AdminFrontDesk from "./pages/Admin/FrontDesk/AdminFrontDesk";
import AdminAddRatePlan from "./pages/Admin/AddRatePlan";
import { SearchProvider } from "./context/SearchContext";
import Best_rates from "./pages/Host/Best_rates";
import BookingSuccess from "./pages/BookingSuccess";
import BookingFailure from "./pages/BookingFailure";
import Agents from "./pages/Admin/Agents";
import Agent_list from "./pages/Admin/Agent_list";
import Admin_inventory from "./pages/Admin/Admin_inventory";
import ProtectedRoute from "./routes/ProtectedRoute";
import AdminProtectedRoute from "./routes/AdminProtectedRoute";
import HostProtectedRoute from "./routes/HostProtectedRoute";
import AgentDashboard from "./pages/Agent/AgentDashboard";
import CancellationPolicy from "./pages/Admin/cancellation_policy/cancellation_policy";
import EditProperty from "./pages/Admin/EditProperty";
import Amenities from "./pages/Admin/Property_configurations/Amenities";
import Facilities from "./pages/Admin/Property_configurations/Facilities";
import SafetyFeatures from "./pages/Admin/Property_configurations/SafetyFeatures";
import PropertyTypes from "./pages/Admin/Property_configurations/PropertyTypes";
import RoomTypes from "./pages/Admin/Property_configurations/RoomTypes";
import SiteConfiguration from "./pages/Admin/Siteconfiguration";
import CallbackRequests from "./pages/Admin/CallbackRequests";
import ReduxDebug from "./pages/ReduxDebug";
//import 'react-datepicker/dist/react-datepicker.css';

export default function App() {
  return (
    <BrowserRouter>
      <SearchProvider>
      <ToastContainer position="top-center" autoClose={5000} />

      <Routes>
        {/* public */}
        <Route path="/" element={<LoginPage />} />
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/host"  element={<HostLogin />} />
        <Route path="/agent/dashboard" element={<AgentDashboard />} />
        <Route path="/otp" element={<OtpVerification />} />
        <Route path="/otp-verified" element={<OtpVerified />} />
        <Route path="/debug/redux" element={<ReduxDebug />} />
        
        {/* User app routes */}
        <Route path="/app" element={<Body />}>
          <Route path="home" element={<HomePage />} />
          <Route path="properties/:id" element={<Detials />} />
          <Route path="user_profile" element={<UserProfile />} />
          <Route path="contact_us" element={<ContactUs />} />
          <Route path="legal_info" element={<LegalInfo />} />
          <Route path="find_a_property" element={<FindProperty />} />
          <Route path="how_to_agent" element={<HowToAgent />} />
          <Route path="faq" element={<Faq />} />
          <Route path="sign_agent" element={<SignAgent />} />
          <Route path="sign_up_agent" element={<SignUpAgent />} />
          <Route path="sign_in_succes" element={<SignInSuccess />} />
          <Route path="about_us" element={<AboutUs />} />
          <Route path="whishList" element={<WhishList/>} />
          <Route path="booking-success" element={<BookingSuccess />} />
          <Route path="booking-failure" element={<BookingFailure />} />
        </Route>

        {/* Agent app routes - duplicate for clarity and correct token selection */}
        <Route path="/app/agent" element={<Body />}>
          <Route path="home" element={<HomePage />} />
          <Route path="properties/:id" element={<Detials />} />
          <Route path="user_profile" element={<UserProfile />} />
          <Route path="contact_us" element={<ContactUs />} />
          <Route path="legal_info" element={<LegalInfo />} />
          <Route path="find_a_property" element={<FindProperty />} />
          <Route path="how_to_agent" element={<HowToAgent />} />
          <Route path="faq" element={<Faq />} />
          <Route path="sign_agent" element={<SignAgent />} />
          <Route path="sign_up_agent" element={<SignUpAgent />} />
          <Route path="sign_in_succes" element={<SignInSuccess />} />
          <Route path="about_us" element={<AboutUs />} />
          <Route path="whishList" element={<WhishList/>} />
          <Route path="booking-success" element={<BookingSuccess />} />
          <Route path="booking-failure" element={<BookingFailure />} />
        </Route>

        {/* ADMIN LAYOUT + CHILD PAGES -> Protected */}
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
          <Route path="travel_agents_list" element={<Agent_list />} />  {/* Travel Agents */}
          <Route path="properties" element={<Properties />} />     {/* All Properties */}
          <Route path="properties/add" element={<AddProperty />} /> {/* Add Property */}
          <Route path="properties/edit/:propertyId" element={<EditProperty />} />
          <Route path="amenities" element={<Amenities />} />
          <Route path="facilities" element={<Facilities />} />
          <Route path="safety_features" element={<SafetyFeatures />} />
          <Route path="property_types" element={<PropertyTypes />} />
          <Route path="room_types" element={<RoomTypes />} />
          <Route path="inventory_management" element={<Admin_inventory/>} />
          <Route path="add-rate-plan" element={<AdminAddRatePlan/>} />
          <Route path="best_available_rates" element={<Best_rates/>} />
          <Route path="meal_plans" element={<MealPlan/>} />
          <Route path="all_bookings" element={<AllBookings />} /> 
          <Route path="registred_users" element={<RegisteredUsers />} /> 
          <Route path="transactions" element={<PaymentsTransactions />} /> 
          <Route path="promotion" element={<PromotionsDiscounts />} /> 
          <Route path="cancellation_policies" element={<CancellationPolicy />} /> 
          <Route path="site-configuration" element={<SiteConfiguration />} /> 
          <Route path="callback-requests" element={<CallbackRequests />} /> 
        </Route>


        <Route 
          path="/host/base" 
          element={
            <HostProtectedRoute redirectTo="/host">
              <BaseLayout />
            </HostProtectedRoute>
          }
        >
          <Route path="dashboard" element={<HostDashboard />} />      {/* Dashboard */}
          <Route path="host-front-desk" element={<HostFrontDesk />} />      {/* Front Desk */}
          <Route path="host-properties" element={<HostProperties />} />     {/* All Properties */}
          <Route path="host-properties/edit/:propertyId" element={<HostEditProperty />} />
          <Route path="host-amenities" element={<HostAmenities />} />
          <Route path="host-facilities" element={<HostFacilities />} />
          <Route path="host-safety_features" element={<HostSafetyFeatures />} />
          <Route path="host-property_types" element={<HostPropertyTypes />} />
          <Route path="host-room_types" element={<HostRoomTypes />} />
          <Route path="inventory_management" element={<HostInventoryWrapper/>} />
          <Route path="add-rate-plan" element={<HostAddRatePlanWrapper/>} />
          <Route path="best_available_rates" element={<Best_rates/>} />
          <Route path="meal_plans" element={<MealPlan/>} />

          <Route path="host-all_bookings" element={<Host_allbookings />} /> 
          <Route path="host-registred_users" element={<HostRegisteredUsers />} /> 
          <Route path="host-transactions" element={<HostPaymentsTransactions />} /> 
          <Route path="host-promotion" element={<HostPromotionsDiscounts />} /> 

         



        
        </Route>
      </Routes>
      </SearchProvider>
    </BrowserRouter>
  );
}