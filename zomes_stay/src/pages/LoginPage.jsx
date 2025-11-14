import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Phone, Shield, Lock, Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";
import loginPic from "../assets/loginPage/b18c10d224f45a116197d5ad8fd717cc0bd9661a.png";
import Logo from "../assets/loginPage/logo.png";
import userAuthService from "../services/auth/user_authService";
import NotificationModal from "../components/NotificationModal";
import AgentLoginModal from "../components/AgentLoginModal";
import AgentSignupModal from "../components/AgentSignupModal";

// Country codes list (sorted by popularity/common usage)
const COUNTRY_CODES = [
  { code: "+91", flag: "🇮🇳", name: "India" },
  { code: "+1", flag: "🇺🇸", name: "USA/Canada" },
  { code: "+44", flag: "🇬🇧", name: "UK" },
  { code: "+971", flag: "🇦🇪", name: "UAE" },
  { code: "+966", flag: "🇸🇦", name: "Saudi Arabia" },
  { code: "+65", flag: "🇸🇬", name: "Singapore" },
  { code: "+60", flag: "🇲🇾", name: "Malaysia" },
  { code: "+61", flag: "🇦🇺", name: "Australia" },
  { code: "+64", flag: "🇳🇿", name: "New Zealand" },
  { code: "+81", flag: "🇯🇵", name: "Japan" },
  { code: "+82", flag: "🇰🇷", name: "South Korea" },
  { code: "+86", flag: "🇨🇳", name: "China" },
  { code: "+852", flag: "🇭🇰", name: "Hong Kong" },
  { code: "+886", flag: "🇹🇼", name: "Taiwan" },
  { code: "+66", flag: "🇹🇭", name: "Thailand" },
  { code: "+62", flag: "🇮🇩", name: "Indonesia" },
  { code: "+63", flag: "🇵🇭", name: "Philippines" },
  { code: "+84", flag: "🇻🇳", name: "Vietnam" },
  { code: "+92", flag: "🇵🇰", name: "Pakistan" },
  { code: "+880", flag: "🇧🇩", name: "Bangladesh" },
  { code: "+94", flag: "🇱🇰", name: "Sri Lanka" },
  { code: "+977", flag: "🇳🇵", name: "Nepal" },
  { code: "+975", flag: "🇧🇹", name: "Bhutan" },
  { code: "+33", flag: "🇫🇷", name: "France" },
  { code: "+49", flag: "🇩🇪", name: "Germany" },
  { code: "+39", flag: "🇮🇹", name: "Italy" },
  { code: "+34", flag: "🇪🇸", name: "Spain" },
  { code: "+31", flag: "🇳🇱", name: "Netherlands" },
  { code: "+32", flag: "🇧🇪", name: "Belgium" },
  { code: "+41", flag: "🇨🇭", name: "Switzerland" },
  { code: "+43", flag: "🇦🇹", name: "Austria" },
  { code: "+46", flag: "🇸🇪", name: "Sweden" },
  { code: "+47", flag: "🇳🇴", name: "Norway" },
  { code: "+45", flag: "🇩🇰", name: "Denmark" },
  { code: "+358", flag: "🇫🇮", name: "Finland" },
  { code: "+353", flag: "🇮🇪", name: "Ireland" },
  { code: "+351", flag: "🇵🇹", name: "Portugal" },
  { code: "+30", flag: "🇬🇷", name: "Greece" },
  { code: "+48", flag: "🇵🇱", name: "Poland" },
  { code: "+420", flag: "🇨🇿", name: "Czech Republic" },
  { code: "+36", flag: "🇭🇺", name: "Hungary" },
  { code: "+7", flag: "🇷🇺", name: "Russia" },
  { code: "+90", flag: "🇹🇷", name: "Turkey" },
  { code: "+20", flag: "🇪🇬", name: "Egypt" },
  { code: "+27", flag: "🇿🇦", name: "South Africa" },
  { code: "+234", flag: "🇳🇬", name: "Nigeria" },
  { code: "+254", flag: "🇰🇪", name: "Kenya" },
  { code: "+55", flag: "🇧🇷", name: "Brazil" },
  { code: "+52", flag: "🇲🇽", name: "Mexico" },
  { code: "+54", flag: "🇦🇷", name: "Argentina" },
  { code: "+56", flag: "🇨🇱", name: "Chile" },
  { code: "+57", flag: "🇨🇴", name: "Colombia" },
  { code: "+51", flag: "🇵🇪", name: "Peru" },
];

const LoginPage = () => {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState({
    isOpen: false,
    type: "error", // 'success', 'error', 'info', 'warning'
    title: "",
    message: ""
  });
  const [showAgentLogin, setShowAgentLogin] = useState(false);
  const [showAgentSignup, setShowAgentSignup] = useState(false);

  const showModal = (type, title, message) => {
    setModal({
      isOpen: true,
      type,
      title,
      message
    });
  };

  const closeModal = () => {
    setModal(prev => ({ ...prev, isOpen: false }));
  };

  const handleContinue = async () => {
    // Validation
    if (!phone.trim()) {
      showModal("error", "Validation Error", "Please enter your phone number");
      return;
    }

    // Basic phone validation (should be 10 digits for Indian numbers)
    const cleanPhone = phone.replace(/\s|-/g, "");
    if (cleanPhone.length < 10) {
      showModal("error", "Validation Error", "Please enter a valid phone number");
      return;
    }

    setLoading(true);
    try {
      const response = await userAuthService.sendOTP({
        phone: cleanPhone,
        countryCode: countryCode
      });

      if (response.data.success) {
        // Navigate to OTP verification page with phone
        // OTP is sent via SMS, not included in response
        navigate("/otp", {
          state: {
            phone: cleanPhone,
            countryCode: countryCode
          }
        });
      } else {
        showModal("error", "Failed", response.data.message || "Failed to send OTP");
      }
    } catch (error) {
      console.error("Send OTP Error:", error);
      const errorMessage = error.response?.data?.message || "Failed to send OTP. Please try again.";
      showModal("error", "Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[1.7fr_1fr]">
        {/* Left side */}
        <div className="flex flex-col px-5 sm:px-8 md:px-12 lg:px-16 py-6 relative overflow-hidden">
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-200/20 rounded-full blur-3xl -z-0"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-200/20 rounded-full blur-3xl -z-0"></div>
          
          <div className="relative z-10 flex flex-col h-full">
            {/* Logo */}
            <div className="mb-4">
              <img src={Logo} alt="Zomestays" className="w-40 h-[50px] md:h-[60px] md:w-44 drop-shadow-sm" />
            </div>

            {/* Card (centered vertically) */}
            <div className="flex-1 flex items-center">
              <div className="w-full mx-auto max-w-md sm:max-w-lg lg:max-w-[520px] relative">
                {/* Glowing background effect */}
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 rounded-3xl blur opacity-20 animate-pulse"></div>
                
                {/* Main card */}
                <div className="relative bg-white/95 backdrop-blur-sm border border-gray-100 shadow-2xl rounded-3xl p-7 sm:p-9 lg:p-10">
                  {/* Header with icon */}
                  <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 mb-3 shadow-lg">
                      <Sparkles className="w-7 h-7 text-white" />
                    </div>
                    <h1 className="font-bold text-2xl sm:text-3xl mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      Welcome to Zomestays
                    </h1>
                    <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                      Enter your phone number to receive a secure <span className="font-semibold text-gray-800">One Time Password (OTP)</span>
                    </p>
                  </div>

                  {/* Phone Input with icon */}
                  <div className="mb-5">
                    <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <Phone className="w-4 h-4 text-blue-600" />
                      Phone Number
                    </label>
                    <div className="relative flex w-full h-14 border-2 border-gray-200 rounded-2xl overflow-hidden focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/20 transition-all duration-200 shadow-sm hover:shadow-md">
                      <select
                        id="countryCode"
                        aria-label="Country code"
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                        className="px-3 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700 outline-none border-r-2 border-gray-200 bg-gradient-to-b from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-50 transition-all cursor-pointer min-w-[110px] sm:min-w-[130px]"
                        disabled={loading}
                      >
                        {COUNTRY_CODES.map((country) => (
                          <option key={country.code} value={country.code}>
                            {country.flag} {country.code} {country.name}
                          </option>
                        ))}
                      </select>

                      <input
                        id="phone"
                        type="tel"
                        inputMode="numeric"
                        placeholder="9876543210"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="flex-1 px-5 text-sm text-gray-900 font-medium outline-none placeholder:text-gray-400 bg-white"
                        disabled={loading}
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        <Phone className="w-5 h-5 text-gray-300" />
                      </div>
                    </div>
                  </div>

                  {/* Continue Button */}
                  <button 
                    className="group w-full h-14 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold text-base flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:from-blue-700 hover:to-purple-700 active:scale-[0.98] transition-all duration-200 shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 relative overflow-hidden"
                    onClick={handleContinue}
                    disabled={loading}
                  >
                    <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></span>
                    {loading ? (
                      <span className="relative flex items-center gap-3">
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                        <span>Sending OTP...</span>
                      </span>
                    ) : (
                      <span className="relative flex items-center gap-3">
                        <span>Continue</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </span>
                    )}
                  </button>

                  {/* Trust indicators */}
                  <div className="mt-5 flex items-center justify-center gap-6 text-xs text-gray-500">
                    <div className="flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-green-500" />
                      <span>Secure</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Lock className="w-4 h-4 text-blue-500" />
                      <span>Private</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-purple-500" />
                      <span>Verified</span>
                    </div>
                  </div>

                  {/* Agent Options - Subtle Links */}
                  <div className="mt-6 pt-5 border-t border-gray-200">
                    <p className="text-center text-sm text-gray-500 mb-3 font-medium">
                      Are you a Travel Agent?
                    </p>
                    <div className="flex items-center justify-center gap-6">
                      <button
                        onClick={() => setShowAgentLogin(true)}
                        className="text-sm text-blue-600 hover:text-blue-700 font-semibold transition-colors duration-200 hover:underline underline-offset-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:ring-offset-2 rounded-lg px-3 py-1.5 hover:bg-blue-50"
                      >
                        Agent Login
                      </button>
                      <span className="text-gray-300 font-light">•</span>
                      <button
                        onClick={() => setShowAgentSignup(true)}
                        className="text-sm text-blue-600 hover:text-blue-700 font-semibold transition-colors duration-200 hover:underline underline-offset-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:ring-offset-2 rounded-lg px-3 py-1.5 hover:bg-blue-50"
                      >
                        Agent Sign Up
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right side image */}
        <div className="hidden lg:block h-full overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-purple-600/10 z-10"></div>
          <img src={loginPic} alt="" className="w-full h-full object-cover relative z-0" />
        </div>
      </div>

      {/* Notification Modal */}
      <NotificationModal
        isOpen={modal.isOpen}
        type={modal.type}
        title={modal.title}
        message={modal.message}
        onClose={closeModal}
      />

      {/* Agent Login Modal */}
      <AgentLoginModal
        isOpen={showAgentLogin}
        onClose={() => setShowAgentLogin(false)}
        onSwitchToSignup={() => {
          setShowAgentLogin(false);
          setShowAgentSignup(true);
        }}
      />

      {/* Agent Signup Modal */}
      <AgentSignupModal
        isOpen={showAgentSignup}
        onClose={() => setShowAgentSignup(false)}
        onSwitchToLogin={() => {
          setShowAgentSignup(false);
          setShowAgentLogin(true);
        }}
      />
    </div>
  );
};

export default LoginPage;
