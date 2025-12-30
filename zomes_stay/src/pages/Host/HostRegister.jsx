import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { Phone, Loader2, CheckCircle2, ArrowLeft } from "lucide-react";
import { toast } from "react-toastify";
import { hostAuthService } from "../../services";
import { setHostLogin } from "../../store/hostAuthSlice";
import { persistor } from "../../store/store";
import { COUNTRY_CODES } from "../../data/countryCodes";

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
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">

                {/* Header */}
                <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-[#004AAD]">
                        {step === "FORM" ? "Create Host Account" : "Verify Phone Number"}
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        {step === "FORM"
                            ? "Enter your details to get started"
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
                                className="input"
                                onChange={handleChange}
                            />
                            <input
                                name="lastName"
                                placeholder="Last Name"
                                className="input"
                                onChange={handleChange}
                            />
                        </div>

                        <input
                            name="email"
                            placeholder="Email address"
                            type="email"
                            className="input"
                            onChange={handleChange}
                        />

                        <input
                            name="password"
                            placeholder="Password"
                            type="password"
                            className="input"
                            onChange={handleChange}
                        />

                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                                Phone number
                            </label>
                            <div className="flex">
                                <select
                                    value={countryCode}
                                    onChange={(e) => setCountryCode(e.target.value)}
                                    className="px-3 py-2 border border-r-0 rounded-l-lg bg-gray-100 text-sm"
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
                                    className="input rounded-l-none"
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
                            className="btn-primary w-full flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : <Phone size={18} />}
                            Send OTP
                        </button>
                    </div>
                )}

                {/* OTP STEP */}
                {step === "OTP" && (
                    <div className="space-y-6">
                        <button
                            onClick={() => setStep("FORM")}
                            className="text-xs text-gray-500 flex items-center hover:text-gray-700"
                        >
                            <ArrowLeft size={14} className="mr-1" />
                            Edit details
                        </button>

                        <div className="flex justify-center gap-3">
                            {[0, 1, 2, 3].map((i) => (
                                <input
                                    key={i}
                                    ref={(el) => (inputRefs.current[i] = el)}
                                    maxLength={1}
                                    value={otp[i]}
                                    onChange={(e) => handleOtpChange(i, e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(i, e)}
                                    className="w-14 h-14 border-2 border-gray-300 rounded-xl
                           text-center text-2xl font-semibold
                           focus:border-[#004AAD]
                           focus:ring-2 focus:ring-[#004AAD]"
                                    autoFocus={i === 0}
                                />
                            ))}
                        </div>

                        <button
                            onClick={handleVerifyAndCreate}
                            disabled={loading}
                            className="btn-primary w-full flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <Loader2 className="animate-spin" />
                            ) : (
                                <CheckCircle2 size={18} />
                            )}
                            Verify & Create Account
                        </button>

                        <p className="text-center text-sm text-gray-500">
                            Didn’t receive the code?
                        </p>

                        <button
                            onClick={() => canResend && handleSendOTP()}
                            disabled={!canResend}
                            className={`block mx-auto text-sm font-medium ${canResend
                                    ? "text-[#004AAD] hover:underline"
                                    : "text-gray-400 cursor-not-allowed"
                                }`}
                        >
                            {canResend ? "Resend OTP" : `Resend in ${resendTimer}s`}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );

};

export default HostSignup;
