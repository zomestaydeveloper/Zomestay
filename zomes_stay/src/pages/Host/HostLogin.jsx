import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { Phone, ArrowLeft, ChevronLeft, Shield, CheckCircle2, Loader2 } from "lucide-react";
import { hostAuthService } from "../../services";
import { setHostLogin } from "../../store/hostAuthSlice";
import { COUNTRY_CODES } from "../../data/countryCodes";
import NotificationModal from "../../components/NotificationModal";

const HostLoginPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [step, setStep] = useState("PHONE");
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const inputRefs = useRef([]);
  const timerRef = useRef(null);

  const [notification, setNotification] = useState({
    isOpen: false,
    type: "error",
    title: "",
    message: "",
  });

  /* ---------------- Timer ---------------- */
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

  /* ---------------- Helpers ---------------- */
  const showNotification = (type, title, message) => {
    setNotification({ isOpen: true, type, title, message });
  };

  /* ---------------- Send OTP ---------------- */
  const handleSendOTP = async () => {
    if (!phone || phone.length < 10) {
      showNotification("error", "Validation Error", "Enter a valid phone number");
      return;
    }

    setLoading(true);
    try {
      const response = await hostAuthService.sendOTP({
        phone: phone.replace(/\D/g, ""),
        countryCode,
      });

      if (response.data.success) {
        setStep("OTP");
        setResendTimer(60);
        setCanResend(false);
      } else {
        showNotification("error", "Failed", response.data.message);
      }
    } catch (error) {
      showNotification("error", "Error", "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- Verify OTP ---------------- */
  const handleVerifyOTP = async () => {
    const otpValue = otp.join("");

    if (!/^\d{4}$/.test(otpValue)) {
      showNotification("error", "Validation Error", "Enter valid 4-digit OTP");
      return;
    }

    setLoading(true);
    try {
      const response = await hostAuthService.verifyOTP({
        phone: phone.replace(/\D/g, ""),
        otp: otpValue,
      });

      if (response.data.success) {
        console.log(response.data,'hh')
        const { host, token } = response.data.data;

        dispatch(
          setHostLogin({
            id: host.id,
            email: host.email,
            phone: host.phone,
            first_name: host.firstName,
            last_name: host.lastName,
            profileImage: host.profileImage,
            hostAccessToken: token,
          })
        );

        navigate("/host/base/dashboard", { replace: true });
      } else {
        throw new Error("Invalid OTP");
      }
    } catch (error) {
      showNotification("error", "Verification Failed", "Invalid OTP");
      setOtp(["", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- Resend OTP ---------------- */
  const handleResendOTP = async () => {
    if (!canResend) return;

    setLoading(true);
    try {
      const response = await hostAuthService.resendOTP({
        phone: phone.replace(/\D/g, ""),
        countryCode,
      });

      if (response.data.success) {
        setResendTimer(60);
        setCanResend(false);
        showNotification("success", "Success", "OTP resent successfully");
      }
    } catch {
      showNotification("error", "Error", "Failed to resend OTP");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- OTP Inputs ---------------- */
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

  /* ---------------- UI ---------------- */
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Back */}
        <button
          onClick={() => navigate("/")}
          className="mb-6 flex items-center text-gray-600 hover:text-gray-900"
        >
          <ChevronLeft size={18} />
          <span className="ml-1 text-sm font-medium">Back</span>
        </button>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#004AAD] to-[#00398a] px-8 py-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-4">
              <Shield className="text-white w-8 h-8" />
            </div>
            <h1 className="text-3xl font-bold text-white">
              {step === "PHONE" ? "Host Login" : "Verify OTP"}
            </h1>
            <p className="text-blue-100 mt-2 text-sm">
              {step === "PHONE"
                ? "Login using your phone number"
                : `Code sent to ${countryCode} ${phone}`}
            </p>
          </div>

          {/* Body */}
          <div className="px-8 py-8">
            {step === "OTP" && (
              <button
                onClick={() => {
                  setStep("PHONE");
                  setOtp(["", "", "", ""]);
                }}
                className="mb-6 flex items-center text-sm text-gray-600 hover:text-[#004AAD]"
              >
                <ArrowLeft size={16} className="mr-1" />
                Change phone number
              </button>
            )}

            {/* PHONE */}
            {step === "PHONE" && (
              <div className="space-y-6">
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
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                    placeholder="Enter phone number"
                    className="w-full px-4 py-3 border rounded-r-lg"
                  />
                </div>

                <button
                  onClick={handleSendOTP}
                  disabled={loading}
                  className="w-full bg-[#004AAD] text-white py-3 rounded-lg font-semibold flex justify-center gap-2"
                >
                  {loading ? <Loader2 className="animate-spin" /> : <Phone />}
                  Send OTP
                </button>
              </div>
            )}

            {/* OTP */}
            {step === "OTP" && (
              <div className="space-y-6">
                <div className="flex justify-center gap-3">
                  {[0, 1, 2, 3].map((i) => (
                    <input
                      key={i}
                      ref={(el) => (inputRefs.current[i] = el)}
                      maxLength={1}
                      value={otp[i]}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(i, e)}
                      className="w-16 h-16 border-2 rounded-xl text-center text-3xl font-bold"
                      autoFocus={i === 0}
                    />
                  ))}
                </div>

                <button
                  onClick={handleVerifyOTP}
                  disabled={loading}
                  className="w-full bg-[#004AAD] text-white py-3 rounded-lg font-semibold flex justify-center gap-2"
                >
                  {loading ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
                  Verify OTP
                </button>

                <button
                  onClick={handleResendOTP}
                  disabled={!canResend}
                  className="text-sm text-center w-full"
                >
                  {canResend ? "Resend OTP" : `Resend in ${resendTimer}s`}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <NotificationModal
        isOpen={notification.isOpen}
        type={notification.type}
        title={notification.title}
        message={notification.message}
        onClose={() =>
          setNotification((p) => ({ ...p, isOpen: false }))
        }
      />
    </div>
  );
};

export default HostLoginPage;
