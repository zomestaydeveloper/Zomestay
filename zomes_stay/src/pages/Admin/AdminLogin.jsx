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
    <div className="flex flex-col md:flex-row min-h-screen bg-gradient-to-br from-[#f0f4ff] to-[#e6ebfa]">
      {/* Left */}
      <div className="md:w-1/2 flex flex-col items-center md:items-start px-4 md:pl-16 pt-8 md:pt-16">
        <img src={Logo} className="w-70 mb-12" alt="Logo" />
        <div className="hidden sm:flex flex-1 justify-center items-center">
          <TechIllustration />
        </div>
      </div>

      {/* Right */}
      <div className="md:w-1/2 flex items-center justify-center bg-white/95 shadow-2xl px-2 py-8">
        <div className="w-full max-w-[360px] bg-white rounded-2xl shadow-lg px-4 py-8 md:p-10 flex flex-col gap-7">
          <div className="text-center">
            <div className="inline-flex w-14 h-14 bg-[#6a85e6]/20 rounded-full items-center justify-center mb-3">
              <Shield className="text-[#6a85e6]" />
            </div>
            <h2 className="text-[#6a85e6] font-bold text-2xl">
              {step === "PHONE" ? "Admin Login" : "Verify OTP"}
            </h2>
          </div>

          {/* PHONE STEP */}
          {step === "PHONE" && (
            <>
              <div className="flex">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="px-4 py-3 border border-r-0 rounded-l-lg bg-gray-50"
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
                  className="w-full px-4 py-3 border rounded-r-lg"
                />
              </div>

              <button
                onClick={handleSendOTP}
                disabled={loading}
                className="w-full bg-gradient-to-r from-[#6a85e6] to-[#b06ab3] text-white py-3 rounded-lg font-semibold flex justify-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" /> : <Phone />}
                Send OTP
              </button>
            </>
          )}

          {/* OTP STEP */}
          {step === "OTP" && (
            <>
              <button
                onClick={() => {
                  setStep("PHONE");
                  setOtp(["", "", "", ""]);
                }}
                className="flex items-center text-sm text-gray-500"
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
                    className="w-14 h-14 border-2 rounded-xl text-center text-2xl font-bold"
                    autoFocus={i === 0}
                  />
                ))}
              </div>

              <button
                onClick={handleVerifyOTP}
                disabled={loading}
                className="w-full bg-gradient-to-r from-[#6a85e6] to-[#b06ab3] text-white py-3 rounded-lg font-semibold flex justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <CheckCircle2 />
                )}
                Verify OTP
              </button>

              <button
                onClick={handleResendOTP}
                disabled={!canResend}
                className="text-sm text-center"
              >
                {canResend
                  ? "Resend OTP"
                  : `Resend in ${resendTimer}s`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
