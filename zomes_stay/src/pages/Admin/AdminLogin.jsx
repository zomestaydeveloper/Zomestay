import React, { useState, useEffect, useRef } from "react";
import Logo from "../../assets/loginPage/logo.png";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useDispatch } from "react-redux";
import { Shield, Phone, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import { setAdminLogin } from "../../store/adminAuthSlice";
import { authService } from "../../services";
import { persistor } from "../../store/store";
import { COUNTRY_CODES } from "../../data/countryCodes";

/* ---------- Illustration ---------- */
const TechIllustration = () => (
  <svg
    className="w-[320px] max-w-[90%]"
    viewBox="0 0 350 250"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect x="40" y="40" width="270" height="170" rx="20" fill="#e6e9f7" />
    <rect x="70" y="70" width="90" height="50" rx="8" fill="#b06ab3" />
    <rect x="180" y="70" width="90" height="50" rx="8" fill="#6a85e6" />
    <rect x="70" y="130" width="200" height="30" rx="6" fill="#d7d8ef" />
    <circle cx="100" cy="145" r="8" fill="#b06ab3" />
    <circle cx="130" cy="145" r="8" fill="#6a85e6" />
    <circle cx="160" cy="145" r="8" fill="#b06ab3" />
    <rect x="220" y="120" width="40" height="15" rx="4" fill="#6a85e6" />
    <rect x="100" y="180" width="150" height="12" rx="4" fill="#b06ab3" />
  </svg>
);

/* ---------- Component ---------- */
const AdminLogin = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [step, setStep] = useState("PHONE"); // PHONE | OTP
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const inputRefs = useRef([]);
  const timerRef = useRef(null);

  /* ---------- Timer ---------- */
  useEffect(() => {
    if (step === "OTP" && resendTimer > 0 && !canResend) {
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
    return () => timerRef.current && clearTimeout(timerRef.current);
  }, [step, resendTimer, canResend]);

  /* ---------- OTP Inputs ---------- */
  const handleOtpChange = (index, value) => {
    if (value && !/^\d+$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    if (value && index < 3) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  /* ---------- Send OTP ---------- */
  const handleSendOTP = async () => {
    if (!phone || phone.length < 10) {
      toast.error("Enter a valid phone number");
      return;
    }

    setLoading(true);
    try {
      const response = await authService.sendOTP({
        phone: phone.replace(/\D/g, ""),
        countryCode,
        role: "admin",
      });

      if (response.data.success) {
        setStep("OTP");
        setResendTimer(60);
        setCanResend(false);
        toast.success("OTP sent successfully");
      } else {
        toast.error(response.data.message || "Failed to send OTP");
      }
    } catch {
      toast.error("Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  /* ---------- Verify OTP ---------- */
  const handleVerifyOTP = async () => {
    const otpValue = otp.join("");
    if (!/^\d{4}$/.test(otpValue)) {
      toast.error("Enter valid 4-digit OTP");
      return;
    }

    setLoading(true);
    try {
      const response = await authService.verifyOTP({
        phone: phone.replace(/\D/g, ""),
        otp: otpValue,
        role: "admin",
      });

      if (response.data.success) {
        const { admin, token } = response.data.data;

        dispatch(
          setAdminLogin({
            id: admin.id,
            email: admin.email,
            first_name: admin.firstName,
            last_name: admin.lastName,
            profileImage: admin.profileImage,
            adminAccessToken: token,
          })
        );

        await persistor.flush();
        navigate("/admin/base/dashboard", { replace: true });
      } else {
        throw new Error("Invalid OTP");
      }
    } catch {
      toast.error("Invalid OTP");
      setOtp(["", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  /* ---------- Resend OTP ---------- */
  const handleResendOTP = async () => {
    if (!canResend) return;

    setLoading(true);
    try {
      const response = await authService.resendOTP({
        phone: phone.replace(/\D/g, ""),
        countryCode,
        role: "admin",
      });

      if (response.data.success) {
        setResendTimer(60);
        setCanResend(false);
        toast.success("OTP resent successfully");
      }
    } catch {
      toast.error("Failed to resend OTP");
    } finally {
      setLoading(false);
    }
  };

  /* ---------- UI ---------- */
  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-gradient-to-br from-[#f0f4ff] to-[#e6ebfa]">

      {/* LEFT – Branding / Illustration */}
      <div className="hidden lg:flex w-1/2 items-center justify-center relative bg-gradient-to-br from-[#6a85e6] via-[#5b6fe0] to-[#4a5ed0] p-16">

        {/* Decorative blobs */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl"></div>

        <div className="relative z-10 max-w-md text-white space-y-8">
          <img src={Logo} className="w-40 mb-6" alt="Logo" />

          <h1 className="text-4xl font-extrabold leading-tight">
            Admin Portal
          </h1>
          <p className="text-blue-100 text-lg leading-relaxed">
            Securely manage platform operations, users, and system settings from one place.
          </p>

          <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl shadow-2xl">
            <TechIllustration />
          </div>
        </div>
      </div>

      {/* RIGHT – LOGIN CARD */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-4 py-12">
        <div
          className="
          w-full max-w-lg
          min-h-[600px]
          bg-white/95
          backdrop-blur-sm
          rounded-2xl
          shadow-[0_20px_60px_rgba(0,0,0,0.15)]
          border border-gray-100
          p-10
          flex flex-col justify-center
        "
        >
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex w-16 h-16 bg-[#6a85e6]/20 rounded-full items-center justify-center mb-4">
              <Shield className="text-[#6a85e6] w-7 h-7" />
            </div>

            <h2 className="text-[#6a85e6] font-bold text-2xl">
              {step === "PHONE" ? "Admin Login" : "Verify OTP"}
            </h2>

            <p className="text-sm text-gray-500 mt-1">
              {step === "PHONE"
                ? "Login using your registered phone number"
                : `OTP sent to ${countryCode} ${phone}`}
            </p>
          </div>

          {/* PHONE STEP */}
          {step === "PHONE" && (
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Phone number
                </label>
                <div className="flex">
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="px-4 py-3 border border-r-0 rounded-l-lg bg-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#6a85e6]/20"
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.code}
                      </option>
                    ))}
                  </select>

                  <input
                    type="tel"
                    placeholder="Enter phone number"
                    value={phone}
                    onChange={(e) =>
                      setPhone(e.target.value.replace(/\D/g, ""))
                    }
                    className="w-full px-4 py-3 rounded-r-lg border border-gray-300 bg-gray-50 text-gray-900 placeholder-gray-400 outline-none transition-all duration-200 focus:bg-white focus:border-[#6a85e6] focus:ring-2 focus:ring-[#6a85e6]/20"
                  />
                </div>
              </div>

              <button
                onClick={handleSendOTP}
                disabled={loading}
                className="w-full bg-gradient-to-r from-[#6a85e6] to-[#b06ab3] text-white py-3 rounded-lg font-semibold flex justify-center items-center gap-2 transition disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" /> : <Phone />}
                Send OTP
              </button>
            </div>
          )}

          {/* OTP STEP */}
          {step === "OTP" && (
            <div className="space-y-6">
              <button
                onClick={() => {
                  setStep("PHONE");
                  setOtp(["", "", "", ""]);
                }}
                className="flex items-center text-sm text-gray-500 hover:text-gray-700"
              >
                <ArrowLeft size={14} className="mr-1" />
                Change phone number
              </button>

              <div className="flex justify-center gap-3">
                {[0, 1, 2, 3].map((i) => (
                  <input
                    key={i}
                    ref={(el) => (inputRefs.current[i] = el)}
                    maxLength={1}
                    value={otp[i]}
                    onChange={(e) =>
                      handleOtpChange(i, e.target.value)
                    }
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    className="w-16 h-16 border-2 border-gray-300 rounded-xl text-center text-3xl font-bold outline-none transition focus:border-[#6a85e6] focus:ring-2 focus:ring-[#6a85e6]/20"
                    autoFocus={i === 0}
                  />
                ))}
              </div>

              <button
                onClick={handleVerifyOTP}
                disabled={loading}
                className="w-full bg-gradient-to-r from-[#6a85e6] to-[#b06ab3] text-white py-3 rounded-lg font-semibold flex justify-center items-center gap-2 transition disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
                Verify OTP
              </button>

              <button
                onClick={handleResendOTP}
                disabled={!canResend}
                className={`w-full text-sm font-medium ${canResend
                    ? "text-[#6a85e6] hover:underline"
                    : "text-gray-400 cursor-not-allowed"
                  }`}
              >
                {canResend
                  ? "Resend OTP"
                  : `Resend in ${resendTimer}s`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
