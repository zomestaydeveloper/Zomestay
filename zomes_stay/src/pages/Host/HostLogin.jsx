import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import {
  Phone,
  ArrowLeft,
  ChevronLeft,
  ShieldCheck,
  CheckCircle2,
  Loader2,
} from "lucide-react";
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

  const showNotification = (type, title, message) => {
    setNotification({ isOpen: true, type, title, message });
  };

  /* ---------------- Send OTP ---------------- */
  const handleSendOTP = async () => {
    if (!phone || phone.length < 10) {
      showNotification("error", "Invalid number", "Enter a valid phone number");
      return;
    }

    setLoading(true);
    try {
      const res = await hostAuthService.sendOTP({
        phone: phone.replace(/\D/g, ""),
        countryCode,
      });

      if (res.data.success) {
        setStep("OTP");
        setResendTimer(60);
        setCanResend(false);
      } else {
        showNotification("error", "Failed", res.data.message);
      }
    } catch {
      showNotification("error", "Error", "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- Verify OTP ---------------- */
  const handleVerifyOTP = async () => {
    const otpValue = otp.join("");
    if (!/^\d{4}$/.test(otpValue)) {
      showNotification("error", "Invalid OTP", "Enter 4-digit OTP");
      return;
    }

    setLoading(true);
    try {
      const res = await hostAuthService.verifyOTP({
        phone: phone.replace(/\D/g, ""),
        otp: otpValue,
      });

      if (!res.data.success) throw new Error();

      const { host, token } = res.data.data;
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
    } catch {
      showNotification("error", "Verification failed", "Invalid OTP");
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
      await hostAuthService.resendOTP({
        phone: phone.replace(/\D/g, ""),
        countryCode,
      });
      setResendTimer(60);
      setCanResend(false);
      showNotification("success", "OTP sent", "A new OTP has been sent");
    } catch {
      showNotification("error", "Error", "Resend failed");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- OTP Input ---------------- */
  const handleOtpChange = (i, v) => {
    if (v && !/^\d+$/.test(v)) return;
    const next = [...otp];
    next[i] = v.slice(-1);
    setOtp(next);
    if (v && i < 3) inputRefs.current[i + 1]?.focus();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f8fafc] via-[#f1f5f9] to-[#e2e8f0] px-4">
      <div className="w-full max-w-md">

        {/* Back */}
        <button
          onClick={() => navigate("/")}
          className="mb-6 flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
        >
          <ChevronLeft size={16} />
          Back
        </button>

        {/* Card */}
        <div className="relative rounded-2xl bg-white/80 backdrop-blur-xl shadow-[0_20px_60px_-15px_rgba(79,70,229,0.35)] border border-white/60">

          {/* Header */}
          <div className="px-8 pt-10 pb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 shadow-lg">
              <ShieldCheck className="text-white" />
            </div>

            <h1 className="text-2xl font-semibold text-slate-900">
              {step === "PHONE" ? "Host Login" : "Verify OTP"}
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              {step === "PHONE"
                ? "Secure access for verified hosts"
                : `Code sent to ${countryCode} ${phone}`}
            </p>
          </div>

          {/* Body */}
          <div className="px-8 pb-10 space-y-6">

            {step === "PHONE" && (
              <>
                <div>
                  <label className="text-xs font-medium text-slate-600">
                    Phone number
                  </label>
                  <div className="mt-1 flex">
                    <select
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      className="rounded-l-xl border border-r-0 bg-slate-100 px-3 text-sm focus:outline-none"
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
                      onChange={(e) =>
                        setPhone(e.target.value.replace(/\D/g, ""))
                      }
                      placeholder="Enter phone number"
                      className="w-full rounded-r-xl border px-4 py-3 text-sm bg-slate-50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition"
                    />
                  </div>
                </div>

                <button
                  onClick={handleSendOTP}
                  disabled={loading}
                  className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-3 text-white font-semibold shadow-lg shadow-indigo-600/30 hover:brightness-110 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="animate-spin" /> : <Phone />}
                  Send OTP
                </button>
              </>
            )}

            {step === "OTP" && (
              <>
                <button
                  onClick={() => setStep("PHONE")}
                  className="flex items-center text-sm text-slate-600 hover:text-indigo-600"
                >
                  <ArrowLeft size={14} className="mr-1" />
                  Change number
                </button>

                <div className="flex justify-center gap-3">
                  {otp.map((v, i) => (
                    <input
                      key={i}
                      ref={(el) => (inputRefs.current[i] = el)}
                      value={v}
                      maxLength={1}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      className="h-14 w-14 rounded-xl border bg-white/70 text-center text-2xl font-semibold focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/30 transition"
                    />
                  ))}
                </div>

                <button
                  onClick={handleVerifyOTP}
                  disabled={loading}
                  className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-3 text-white font-semibold shadow-lg shadow-indigo-600/30 hover:brightness-110 transition flex justify-center items-center gap-2"
                >
                  {loading ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
                  Verify OTP
                </button>

                <button
                  onClick={handleResendOTP}
                  disabled={!canResend}
                  className={`w-full text-sm ${
                    canResend
                      ? "text-indigo-600 hover:underline"
                      : "text-slate-400"
                  }`}
                >
                  {canResend ? "Resend OTP" : `Resend in ${resendTimer}s`}
                </button>
              </>
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
