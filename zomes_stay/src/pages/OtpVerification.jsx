import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useDispatch } from "react-redux";
import loginPic from "../assets/loginPage/b18c10d224f45a116197d5ad8fd717cc0bd9661a.png";
import Logo from "../assets/loginPage/logo.png";
import userAuthService from "../services/auth/user_authService";
import NotificationModal from "../components/NotificationModal";
import UserSignupModal from "../components/UserSignupModal";
import { PageLoader } from "../components/Loader";
import { setUserLogin } from "../store/userAuthSlice";
import { getReturnUrl, clearReturnUrl } from "../utils/bookingStateUtils";

const OtpVerification = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(60); // 60 seconds countdown
  const [canResend, setCanResend] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const inputRefs = useRef([]);
  const timerRef = useRef(null);
  const [modal, setModal] = useState({
    isOpen: false,
    type: "error", // 'success', 'error', 'info', 'warning'
    title: "",
    message: ""
  });

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

  useEffect(() => {
    // Get phone and OTP from location state
    if (location.state) {
      setPhone(location.state.phone || "");
      setCountryCode(location.state.countryCode || "+91");
      
      // Start countdown timer when page loads
      setCanResend(false);
      setResendTimer(60);
    } else {
      // If no state, redirect back to login
      navigate("/");
    }
  }, [location.state, navigate]);

  // Countdown timer effect
  useEffect(() => {
    if (resendTimer > 0 && !canResend) {
      timerRef.current = setTimeout(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [resendTimer, canResend]);

  const handleOtpChange = (index, value) => {
    // Only allow numeric input
    if (value && !/^\d+$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1); // Only take last character
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, 4);
    if (/^\d+$/.test(pastedData)) {
      const newOtp = pastedData.split("").concat(Array(4 - pastedData.length).fill(""));
      setOtp(newOtp.slice(0, 4));
      inputRefs.current[Math.min(pastedData.length, 3)]?.focus();
    }
  };

  const handleVerify = async () => {
    const otpValue = otp.join("");
    
    if (otpValue.length !== 4) {
      showModal("error", "Validation Error", "Please enter the complete OTP");
      return;
    }

    if (!/^\d{4}$/.test(otpValue)) {
      showModal("error", "Validation Error", "OTP should contain only numbers");
      return;
    }

    setLoading(true);
    try {
      const response = await userAuthService.verifyOTP({
        phone: phone,
        otp: otpValue
      });

      if (response.data.success) {
        const responseData = response.data.data;

        // Check if user doesn't exist (needs signup)
        if (responseData.userDidNotExist || responseData.isNewUser) {
          // Show signup modal
          setShowSignupModal(true);
          setLoading(false);
        } else {
          // User exists - store in Redux and navigate to home
          const userData = responseData.user;
          const token = responseData.token;

          // Map user data to Redux format
          dispatch(setUserLogin({
            email: userData.email || '',
            phone: userData.phone || phone,
            first_name: userData.firstname || userData.firstName || userData.first_name || '',
            last_name: userData.lastname || userData.lastName || userData.last_name || '',
            id: userData.id,
            userAccessToken: token,
            profileImage: userData.profileImage || ''
          }));

          // Redirect to return URL if available, otherwise go to home
          const returnUrl = getReturnUrl();
          if (returnUrl) {
            clearReturnUrl();
            navigate(returnUrl, { replace: true });
          } else {
            navigate("/app/home", { replace: true });
          }
        }
      } else {
        showModal("error", "Verification Failed", response.data.message || "Failed to verify OTP. Please try again.");
        setOtp(["", "", "", ""]);
        inputRefs.current[0]?.focus();
      }
    } catch (error) {
      console.error("Verify OTP Error:", error);
      showModal("error", "Verification Failed", error.response?.data?.message || "Invalid OTP. Please try again.");
      // Clear OTP on error
      setOtp(["", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleSignupSubmit = async (signupData) => {
    // Don't catch errors here - let UserSignupModal handle error display
    const response = await userAuthService.createUser(signupData);

    if (response.data.success) {
      const userData = response.data.data.user;
      console.log(userData)
      const token = response.data.data.token;

      // Map user data to Redux format
      dispatch(setUserLogin({
        email: userData.email || '',
        phone: userData.phone || phone,
        first_name: userData.firstname || userData.firstName || userData.first_name || '',
        last_name: userData.lastname || userData.lastName || userData.last_name || '',
        id: userData.id,
        userAccessToken: token,
        profileImage: userData.profileImage || ''
      }));

      // Close signup modal
      setShowSignupModal(false);

      // Redirect to return URL if available, otherwise go to home
      const returnUrl = getReturnUrl();
      if (returnUrl) {
        clearReturnUrl();
        navigate(returnUrl, { replace: true });
      } else {
        navigate("/app/home", { replace: true });
      }
    } else {
      // If success is false, throw an error so UserSignupModal can catch it
      const error = new Error(response.data.message || "Failed to create account. Please try again.");
      error.response = { data: response.data };
      throw error;
    }
  };

  const formatPhone = (phone) => {
    // Format phone number for display (e.g., 9876543210 -> 9876 543 210)
    if (phone.length === 10) {
      return `${phone.slice(0, 4)} ${phone.slice(4, 7)} ${phone.slice(7)}`;
    }
    return phone;
  };

  const handleResendOTP = async () => {
    if (!canResend || resendLoading) return;

    setResendLoading(true);
    try {
      const response = await userAuthService.resendOTP({
        phone: phone,
        countryCode: countryCode
      });

      if (response.data.success) {
        // Reset timer
        setCanResend(false);
        setResendTimer(60);
        
        showModal("success", "Success", "OTP resent successfully to your phone number!");
      } else {
        showModal("error", "Failed", response.data.message || "Failed to resend OTP");
      }
    } catch (error) {
      console.error("Resend OTP Error:", error);
      showModal("error", "Error", error.response?.data?.message || "Failed to resend OTP. Please try again.");
    } finally {
      setResendLoading(false);
    }
  };

  // Show full screen loader while verifying
  if (loading && !showSignupModal) {
    return <PageLoader text="Verifying OTP..." />;
  }

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-3">
      {/* Left side (same widths as LoginPage) */}
      <div className="lg:col-span-2 flex flex-col px-5 sm:px-8 md:px-12 lg:px-16 py-6">
        {/* Logo (same sizing) */}
        <img src={Logo} alt="Zomestays" className="w-36 h-[50px] md:w-44" />

        {/* Card (same max widths) */}
        <div className="flex-1 flex items-center">
          <div className="w-full mx-auto max-w-md sm:max-w-lg lg:max-w-[760px] bg-white border border-gray-100 shadow-lg rounded-2xl p-6 sm:p-8">
            <h1 className="text-center font-bold text-xl sm:text-2xl text-gray-800">
              OTP Verification
            </h1>
            <p className="mt-2 text-center text-sm sm:text-base text-gray-500">
              Enter the code sent to <span className="font-semibold text-gray-700">{countryCode} {formatPhone(phone)}</span>
            </p>

            {/* 4 circular inputs */}
            <div className="mt-6 flex justify-center gap-3 sm:gap-4">
              {[0, 1, 2, 3].map((i) => (
                <input
                  key={i}
                  ref={(el) => (inputRefs.current[i] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={otp[i]}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  onPaste={handlePaste}
                  className="w-12 h-12 sm:w-16 sm:h-16 rounded-full border border-gray-300 text-center text-lg sm:text-2xl font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  placeholder="•"
                  disabled={loading}
                />
              ))}
            </div>

            <button
              className="w-full h-12 mt-6 rounded-full bg-[#004ADD] text-white font-medium flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleVerify}
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Verifying...
                </>
              ) : (
                "Verify OTP"
              )}
            </button>

            <p className="mt-4 text-center text-xs sm:text-sm text-gray-500">
              Didn't receive a code?{" "}
              <button 
                className={`font-semibold transition-colors ${
                  canResend && !resendLoading
                    ? "text-[#004ADD] hover:underline cursor-pointer"
                    : "text-gray-400 cursor-not-allowed"
                }`}
                onClick={handleResendOTP}
                disabled={!canResend || resendLoading}
              >
                {resendLoading 
                  ? "Sending..." 
                  : canResend 
                    ? "RESEND" 
                    : `RESEND (${resendTimer}s)`
                }
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* Right side image (same behavior) */}
      <div className="hidden lg:block h-full overflow-hidden">
        <img src={loginPic} alt="" className="w-full h-full object-cover" />
      </div>

      {/* Notification Modal */}
      <NotificationModal
        isOpen={modal.isOpen}
        type={modal.type}
        title={modal.title}
        message={modal.message}
        onClose={closeModal}
      />

      {/* User Signup Modal */}
      <UserSignupModal
        isOpen={showSignupModal}
        onClose={() => {
          setShowSignupModal(false);
          // Clear OTP and redirect to login
          setOtp(["", "", "", ""]);
          navigate("/");
        }}
        phone={phone}
        onSubmit={handleSignupSubmit}
      />
    </div>
  );
};

export default OtpVerification;
