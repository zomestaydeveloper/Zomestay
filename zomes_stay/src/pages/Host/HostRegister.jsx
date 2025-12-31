import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { Phone, Loader2, CheckCircle2, ArrowLeft } from "lucide-react";
import { toast } from "react-toastify";
import { hostAuthService } from "../../services";
import { setHostLogin } from "../../store/hostAuthSlice";
import { persistor } from "../../store/store";
import { COUNTRY_CODES } from "../../data/countryCodes";

const TechIllustration = () => (
    <svg
        className="w-[200px] max-w-[80%]"
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


const HostSignup = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const [step, setStep] = useState("FORM"); // FORM | OTP
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        email: "",
        password: "",
        firstName: "",
        lastName: "",
        phone: "",
    });

    const [countryCode, setCountryCode] = useState("+91");
    const [otp, setOtp] = useState(["", "", "", ""]);
    const inputRefs = useRef([]);

    const [resendTimer, setResendTimer] = useState(60);
    const [canResend, setCanResend] = useState(false);
    const timerRef = useRef(null);

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

    /* ---------------- Input ---------------- */
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((p) => ({ ...p, [name]: value }));
    };

    /* ---------------- OTP Inputs ---------------- */
    const handleOtpChange = (i, value) => {
        if (value && !/^\d+$/.test(value)) return;
        const newOtp = [...otp];
        newOtp[i] = value.slice(-1);
        setOtp(newOtp);
        if (value && i < 3) inputRefs.current[i + 1]?.focus();
    };

    const handleKeyDown = (i, e) => {
        if (e.key === "Backspace" && !otp[i] && i > 0) {
            inputRefs.current[i - 1]?.focus();
        }
    };

    /* ---------------- Send OTP ---------------- */
    const handleSendOTP = async () => {
        const { email, password, firstName, lastName, phone } = formData;

        if (!email || !password || !firstName || !lastName || phone.length < 10) {
            toast.error("All fields are required");
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
                toast.success("OTP sent successfully");
            } else {
                toast.error(res.data.message);
            }
        } catch {
            toast.error("Failed to send OTP");
        } finally {
            setLoading(false);
        }
    };

    /* ---------------- Verify OTP + Create Host ---------------- */
    const handleVerifyAndCreate = async () => {
        const otpValue = otp.join("");
        if (!/^\d{4}$/.test(otpValue)) {
            toast.error("Enter valid OTP");
            return;
        }

        setLoading(true);
        try {
            // 1️⃣ Verify OTP
            const verifyRes = await hostAuthService.registerOTP({
                phone: formData.phone.replace(/\D/g, ""),
                otp: otpValue,
            });

            if (!verifyRes.data.success) {
                throw new Error("OTP verification failed");
            }

            // 2️⃣ Create Host
            const createRes = await hostAuthService.registerHost({
                email: formData.email,
                password: formData.password,
                firstName: formData.firstName,
                lastName: formData.lastName,
                phone: formData.phone,
                isVerified: true,
                isActive: true,
                isDeleted: false,
            });

            if (!createRes.data.success) {
                throw new Error(createRes.data.message);
            }

            console.log(createRes.data, 'data')
            const { host } = createRes.data;
            console.log('here 2', host)
            // 3️⃣ Login automatically
            dispatch(
                setHostLogin({
                    id: host.id,
                    email: host.email,
                    phone: host.phone,
                    first_name: host.firstName,
                    last_name: host.lastName,
                })
            );

            await persistor.flush();
            toast.success("Account created successfully");
            navigate("/host/base/dashboard", { replace: true });
        } catch (error) {
            toast.error(error.message || "Signup failed");
            setOtp(["", "", "", ""]);
            inputRefs.current[0]?.focus();
        } finally {
            setLoading(false);
        }
    };

    /* ---------------- UI ---------------- */
    return (
        <div className="h-[84vh] flex bg-gradient-to-br from-blue-200 to-indigo-200 m-12 p-12 rounded-3xl justify-center">

            {/* LEFT SIDE – Illustration / Branding */}
            <div className="hidden lg:flex items-center justify-center relative bg-gradient-to-bl from-[#002d6b] via-sky-500 to-[#002d6b] p-12 rounded-2xl overflow-hidden">

                {/* Decorative gradient blobs */}
                <div className="absolute -top-24 -left-24 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl"></div>

                {/* Content Card */}
                <div className="relative z-10 text-white max-w-md space-y-2">

                    {/* Heading */}
                    <div>
                        <h1 className="text-4xl italic font-extrabold leading-tight tracking-tight">
                            Become a Host
                        </h1>
                        <p className="mt-4 text-blue-100 text-lg leading-relaxed font-medium">
                            List your property, manage bookings, and grow your business with a
                            trusted platform built for hosts.
                        </p>
                    </div>

                    {/* Feature points */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <span className="w-2 h-2 bg-white rounded-full"></span>
                            <p className="text-sm text-blue-100">
                                Easy property listing & management
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            <span className="w-2 h-2 bg-white rounded-full"></span>
                            <p className="text-sm text-blue-100">
                                Secure payments & real-time bookings
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            <span className="w-2 h-2 bg-white rounded-full"></span>
                            <p className="text-sm text-blue-100">
                                Dedicated host dashboard & analytics
                            </p>
                        </div>
                    </div>

                    {/* Illustration container */}
                    <div className="mt-3">
                        <TechIllustration />
                    </div>
                </div>
            </div>

            {/* RIGHT SIDE – FORM */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-12">
                <div
                    className="
      w-full max-w-lg
      bg-white/95
      backdrop-blur-sm
      rounded-2xl
      shadow-[0_20px_60px_rgba(0,0,0,0.15)]
      bg-gradient-to-br from-[#002d44] via-emerald-300 to-[#002d44]
      p-8
      flex flex-col justify-center
    "
                >


                    {/* Header */}
                    <div className="text-center mb-6">
                        <h2 className="text-2xl font-bold text-white">
                            {step === "FORM" ? "Create Host Account" : "Verify Phone Number"}
                        </h2>
                        <p className="text-sm text-gray-200 mt-1">
                            {step === "FORM"
                                ? "Fill in your details to get started"
                                : `OTP sent to ${countryCode} ${formData.phone}`}
                        </p>
                    </div>

                    {/* FORM STEP */}
                    {step === "FORM" && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <input
                                    name="firstName"
                                    placeholder="First Name"
                                    className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-gray-50 text-gray-900 placeholder-gray-400 outline-none transition-all duration-200 ease-in-out focus:bg-white focus:border-[#004AAD] focus:ring-2 focus:ring-[#004AAD]/20"
                                    onChange={handleChange}
                                />
                                <input
                                    name="lastName"
                                    placeholder="Last Name"
                                    className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-gray-50 text-gray-900 placeholder-gray-400 outline-none transition-all duration-200 ease-in-out focus:bg-white focus:border-[#004AAD] focus:ring-2 focus:ring-[#004AAD]/20"
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <input
                                    name="email"
                                    placeholder="Email address"
                                    type="email"
                                    className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-gray-50 text-gray-900 placeholder-gray-400 outline-none transition-all duration-200 ease-in-out focus:bg-white focus:border-[#004AAD] focus:ring-2 focus:ring-[#004AAD]/20"
                                    onChange={handleChange}
                                />

                                <input
                                    name="password"
                                    placeholder="Password"
                                    type="password"
                                    className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-gray-50 text-gray-900 placeholder-gray-400 outline-none transition-all duration-200 ease-in-out focus:bg-white focus:border-[#004AAD] focus:ring-2 focus:ring-[#004AAD]/20"
                                    onChange={handleChange}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-200 mb-1">
                                    Phone number
                                </label>
                                <div className="flex">
                                    <select
                                        value={countryCode}
                                        onChange={(e) => setCountryCode(e.target.value)}
                                        className="px-4 py-3 rounded-l-lg border border-gray-300 bg-gray-50 text-gray-900 placeholder-gray-400 outline-none transition-all duration-200 ease-in-out focus:bg-white focus:border-[#004AAD] focus:ring-2 focus:ring-[#004AAD]/20"
                                    >
                                        {COUNTRY_CODES.map((c) => (
                                            <option key={c.code} value={c.code}>
                                                {c.flag} {c.code}
                                            </option>
                                        ))}
                                    </select>
                                    <input
                                        name="phone"
                                        placeholder="Enter phone number"
                                        className="w-full px-4 py-3 rounded-r-lg border border-gray-300 bg-gray-50 text-gray-900 placeholder-gray-400 outline-none transition-all duration-200 ease-in-out focus:bg-white focus:border-[#004AAD] focus:ring-2 focus:ring-[#004AAD]/20"
                                        onChange={(e) =>
                                            setFormData((p) => ({
                                                ...p,
                                                phone: e.target.value.replace(/\D/g, ""),
                                            }))
                                        }
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleSendOTP}
                                disabled={loading}
                                className="cursor-pointer bg-white px-3 py-2 rounded-lg hover:bg-[#002d6b] hover:text-white w-full flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : <Phone size={18} />}
                                Send OTP
                            </button>

                            {/* Login redirect */}
                            <p className="text-center text-sm text-gray-300">
                                Already have an account?{" "}
                                <button
                                    onClick={() => navigate("/host/login")}
                                    className="text-white cursor-pointer hover:text-gray-200 font-semibold hover:underline"
                                >
                                    Login
                                </button>
                            </p>
                        </div>
                    )}

                    {/* OTP STEP */}
                    {step === "OTP" && (
                        <div className="space-y-6">
                            <button
                                onClick={() => setStep("FORM")}
                                className="text-sm text-gray-200 flex items-center hover:text-gray-700"
                            >
                                <ArrowLeft size={14} className="mr-1" />
                                Edit details
                            </button>

                            <div className="flex justify-center p-5 gap-3">
                                {[0, 1, 2, 3].map((i) => (
                                    <input
                                        key={i}
                                        ref={(el) => (inputRefs.current[i] = el)}
                                        maxLength={1}
                                        value={otp[i]}
                                        onChange={(e) => handleOtpChange(i, e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(i, e)}
                                        className="w-14 h-14 px-4 py-3 rounded-lg border border-gray-300 bg-gray-50 text-gray-900 placeholder-gray-400 outline-none transition-all duration-200 ease-in-out focus:bg-white focus:border-[#004AAD] focus:ring-2 focus:ring-[#004AAD]/20"
                                        autoFocus={i === 0}
                                    />
                                ))}
                            </div>

                            <button
                                onClick={handleVerifyAndCreate}
                                disabled={loading}
                                 className="cursor-pointer bg-white px-3 py-2 rounded-lg hover:bg-[#002d6b] hover:text-white w-full flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={18} />}
                                Verify & Create Account
                            </button>

                            <p className="text-center text-sm text-gray-300">
                                Didn’t receive the code?
                            </p>

                            <button
                                onClick={() => canResend && handleSendOTP()}
                                disabled={!canResend}
                                className={`block mx-auto text-sm font-medium ${canResend
                                    ? "text-white hover:underline cursor-pointer"
                                    : "text-gray-400 cursor-not-allowed"
                                    }`}
                            >
                                {canResend ? "Resend OTP" : `Resend in ${resendTimer}s`}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default HostSignup;
