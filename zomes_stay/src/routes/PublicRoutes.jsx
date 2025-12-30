import { Routes, Route, Navigate } from "react-router-dom";
import AdminLogin from "../pages/Admin/AdminLogin";
import HostLogin from "../pages/Host/HostLogin";
import UserLoginPage from "../components/UserAgentAuth/UserLoginPage";
import OtpVerified from "../pages/OtpVerified";
import ReduxDebug from "../pages/ReduxDebug";
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
import HostSignup from "../pages/Host/HostRegister";

/**
 * PublicRoutes
 * - All public routes that don't require authentication
 * - Includes login pages, public pages, and property browsing
 */
const PublicRoutes = () => {
  return (
    <Routes>
      {/* Root redirect */}
      <Route path="/" element={<Navigate to="/app/home" replace />} />

      {/* Login Pages */}
      <Route path="/admin" element={<AdminLogin />} />
      <Route path="/host" element={<HostLogin />} />
      <Route path="/host-register" element={<HostSignup />} />
      <Route path="/login" element={<UserLoginPage />} /> 
      <Route path="/otp-verified" element={<OtpVerified />} />
      <Route path="/debug/redux" element={<ReduxDebug />} />

      {/* Public App Routes - No Authentication Required */}
      <Route path="/app" element={<Body />}>
        {/* Public Pages */}
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

export default PublicRoutes;

