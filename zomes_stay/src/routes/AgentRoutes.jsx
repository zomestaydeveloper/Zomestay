import { Routes, Route } from "react-router-dom";
import AgentDashboard from "../pages/Agent/AgentDashboard";
import Body from "../components/Body";
import HomePage from "../components/HomePage";
import Detials from "../pages/DetialsPage";
import ContactUs from "../pages/ContactUs";
import LegalInfo from "../pages/LegalInfo";
import FindProperty from "../pages/FindProperty";
import HowToAgent from "../pages/HowToAgent";
import Faq from "../pages/Faq";
import SignAgent from "../pages/SignAgent";
import SignUpAgent from '../pages/signUpAgent';
import SignInSuccess from '../pages/SignInSucces';
import AboutUs from "../pages/AboutUs";
import WhishList from "../pages/WhishList";
import BookingSuccess from "../pages/BookingSuccess";
import BookingFailure from "../pages/BookingFailure";
import { AgentProtectedRoute } from "./ProtectedRoute";

/**
 * AgentRoutes
 * - All agent-protected routes that require agent authentication
 * - Uses AgentProtectedRoute to guard access
 */
const AgentRoutes = () => {
  return (
    <Routes>
      {/* Agent Dashboard - Standalone Protected Route */}
      <Route
        path="/agent/dashboard"
        element={
          <AgentProtectedRoute redirectTo="/login">
            <AgentDashboard />
          </AgentProtectedRoute>
        }
      />

      {/* Agent App Routes - Protected Routes with Body Layout */}
      <Route
        path="/app/agent"
        element={
          <AgentProtectedRoute redirectTo="/login">
            <Body />
          </AgentProtectedRoute>
        }
      >
        {/* Agent can access public pages while logged in */}
        <Route path="home" element={<HomePage />} />
        <Route path="properties/:id" element={<Detials />} />
        <Route path="contact_us" element={<ContactUs />} />
        <Route path="legal_info" element={<LegalInfo />} />
        <Route path="find_a_property" element={<FindProperty />} />
        <Route path="how_to_agent" element={<HowToAgent />} />
        <Route path="faq" element={<Faq />} />
        <Route path="sign_agent" element={<SignAgent />} />
        <Route path="sign_up_agent" element={<SignUpAgent />} />
        <Route path="sign_in_succes" element={<SignInSuccess />} />
        <Route path="about_us" element={<AboutUs />} />
        <Route path="whishList" element={<WhishList />} />
        <Route path="booking-success" element={<BookingSuccess />} />
        <Route path="booking-failure" element={<BookingFailure />} />
      </Route>
    </Routes>
  );
};

export default AgentRoutes;

