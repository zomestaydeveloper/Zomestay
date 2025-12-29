import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { Phone, ArrowLeft, ChevronLeft, Shield, CheckCircle2, Loader2 } from 'lucide-react';
import userAuthService from "../../services/auth/user_authService";
import { setUserLogin } from "../../store/userAuthSlice";
import { COUNTRY_CODES } from "../../data/countryCodes";
import AgentLoginModal from "./AgentLoginModal";
import AgentSignupModal from "./AgentSignupModal";
import UserSignupModal from "../UserSignupModal";
import NotificationModal from "../NotificationModal";

const UserLoginPage = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const [step, setStep] = useState('PHONE'); // PHONE | OTP
    const [loading, setLoading] = useState(false);
    const [phone, setPhone] = useState("");
    const [countryCode, setCountryCode] = useState("+91");
    const [otp, setOtp] = useState(["", "", "", ""]);
    const [resendTimer, setResendTimer] = useState(60);
    const [canResend, setCanResend] = useState(false);
    const inputRefs = useRef([]);
    const timerRef = useRef(null);

    const [showUserSignup, setShowUserSignup] = useState(false);
    const [showAgentLogin, setShowAgentLogin] = useState(false);
    const [showAgentSignup, setShowAgentSignup] = useState(false);

    const [notification, setNotification] = useState({
        isOpen: false,
        type: "error",
        title: "",
        message: ""
    });

    useEffect(() => {
        if (step === 'OTP' && resendTimer > 0 && !canResend) {
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
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [resendTimer, canResend, step]);

    const showNotification = (type, title, message) => {
        setNotification({ isOpen: true, type, title, message });
    };

    const handleSendOTP = async () => {
        if (!phone.trim() || phone.replace(/\s|-/g, "").length < 10) {
            showNotification("error", "Validation Error", "Please enter a valid phone number");
            return;
        }

        setLoading(true);
        const cleanPhone = phone.replace(/\s|-/g, "");

        try {
            const response = await userAuthService.sendOTP({
                phone: cleanPhone,
                countryCode: countryCode
            });

            if (response.data.success) {
                setStep('OTP');
                setResendTimer(60);
                setCanResend(false);
            } else {
                showNotification("error", "Failed", response.data.message || "Failed to send OTP");
            }
        } catch (error) {
            showNotification("error", "Error", error.response?.data?.message || "Failed to send OTP");
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async () => {
        const otpValue = otp.join("");
        if (otpValue.length !== 4 || !/^\d{4}$/.test(otpValue)) {
            showNotification("error", "Validation Error", "Please enter a valid 4-digit OTP");
            return;
        }

        setLoading(true);
        try {
            const response = await userAuthService.verifyOTP({
                phone: phone.replace(/\s|-/g, ""),
                otp: otpValue
            });

            if (response.data.success) {
                const responseData = response.data.data;

                if (responseData.userDidNotExist || responseData.isNewUser) {
                    setShowUserSignup(true);
                } else {
                    const userData = responseData.user;
                    dispatch(setUserLogin({
                        email: userData.email || '',
                        phone: userData.phone || phone,
                        first_name: userData.firstname || userData.firstName || userData.first_name || '',
                        last_name: userData.lastname || userData.lastName || userData.last_name || '',
                        id: userData.id,
                        userAccessToken: responseData.token,
                        profileImage: userData.profileImage || ''
                    }));

                    navigate("/app/home", { replace: true });
                }
            } else {
                showNotification("error", "Verification Failed", response.data.message || "Invalid OTP");
                setOtp(["", "", "", ""]);
                inputRefs.current[0]?.focus();
            }
        } catch (error) {
            showNotification("error", "Verification Failed", error.response?.data?.message || "Invalid OTP");
            setOtp(["", "", "", ""]);
            inputRefs.current[0]?.focus();
        } finally {
            setLoading(false);
        }
    };

    const handleResendOTP = async () => {
        if (!canResend) return;
        setLoading(true);
        try {
            const response = await userAuthService.resendOTP({
                phone: phone.replace(/\s|-/g, ""),
                countryCode: countryCode
            });
            if (response.data.success) {
                setResendTimer(60);
                setCanResend(false);
                showNotification("success", "Success", "OTP resent successfully");
            } else {
                showNotification("error", "Failed", response.data.message);
            }
        } catch (error) {
            showNotification("error", "Error", "Failed to resend OTP");
        } finally {
            setLoading(false);
        }
    };

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

    const handleUserSignupSubmit = async (signupData) => {
        try {
            const response = await userAuthService.createUser(signupData);
            if (response.data.success) {
                const userData = response.data.data.user;
                const token = response.data.data.token;

                dispatch(setUserLogin({
                    email: userData.email || '',
                    phone: userData.phone || phone,
                    first_name: userData.firstname || userData.firstName || userData.first_name || '',
                    last_name: userData.lastname || userData.lastName || userData.last_name || '',
                    id: userData.id,
                    userAccessToken: token,
                    profileImage: userData.profileImage || ''
                }));

                setShowUserSignup(false);
                navigate("/app/home", { replace: true });
            } else {
                const error = new Error(response.data.message || "Failed to create account");
                error.response = { data: response.data };
                throw error;
            }
        } catch (error) {
            throw error;
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center py-8 px-4 relative overflow-hidden">
            {/* Decorative Background Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
            </div>

            <div className="w-full max-w-md relative z-10">
                {/* Back Button */}
                <button
                    onClick={() => navigate("/app/home")}
                    className="mb-6 flex items-center text-gray-600 hover:text-gray-900 transition-all duration-200 group"
                >
                    <ChevronLeft size={20} className="mr-1 group-hover:-translate-x-1 transition-transform" />
                    <span className="text-sm font-medium">Back to Home</span>
                </button>

                {/* Login Card */}
                <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden backdrop-blur-sm">
                    {/* Header Section with Gradient */}
                    <div className="bg-gradient-to-r from-[#004AAD] to-[#00398a] px-8 pt-8 pb-6">
                        <div className="text-center mb-2">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-4 backdrop-blur-sm">
                                <Shield className="w-8 h-8 text-white" />
                            </div>
                            <h1 className="text-3xl font-bold text-white mb-2">
                                {step === 'PHONE' ? 'Welcome Back' : 'Verify OTP'}
                            </h1>
                            <p className="text-blue-100 text-sm">
                                {step === 'PHONE'
                                    ? "Enter your phone number to continue"
                                    : `Code sent to ${countryCode} ${phone}`
                                }
                            </p>
                        </div>
                    </div>

                    <div className="px-8 py-8">
                        {/* Back Button for OTP Step */}
                        {step === 'OTP' && (
                            <button
                                onClick={() => {
                                    setStep('PHONE');
                                    setOtp(["", "", "", ""]);
                                }}
                                className="mb-6 flex items-center text-sm text-gray-600 hover:text-[#004AAD] transition-all duration-200 group"
                            >
                                <ArrowLeft size={16} className="mr-1 group-hover:-translate-x-1 transition-transform" />
                                <span className="font-medium">Change phone number</span>
                            </button>
                        )}

                        {/* Phone Step */}
                        {step === 'PHONE' && (
                            <div className="space-y-6 animate-fadeIn">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                                        Phone Number
                                    </label>
                                    <div className="flex shadow-sm">
                                        <select
                                            value={countryCode}
                                            onChange={(e) => setCountryCode(e.target.value)}
                                            className="px-4 py-3.5 border border-r-0 border-gray-300 rounded-l-lg bg-gray-50 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#004AAD] focus:border-[#004AAD] transition-all cursor-pointer hover:bg-gray-100"
                                        >
                                            {COUNTRY_CODES.map((country) => (
                                                <option key={country.code} value={country.code}>
                                                    {country.flag} {country.code}
                                                </option>
                                            ))}
                                        </select>
                                        <div className="relative flex-1">
                                            <input
                                                type="tel"
                                                placeholder="Enter your phone number"
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                                                className="w-full px-4 py-3.5 pr-12 border border-gray-300 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-[#004AAD] focus:border-[#004AAD] transition-all text-gray-900 placeholder-gray-400"
                                                maxLength={15}
                                                autoFocus
                                            />
                                            <Phone className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                                        </div>
                                    </div>
                                    {phone && phone.replace(/\s|-/g, "").length < 10 && (
                                        <p className="mt-2 text-xs text-red-500">Please enter a valid phone number</p>
                                    )}
                                </div>

                                <button
                                    onClick={handleSendOTP}
                                    disabled={loading || !phone.trim() || phone.replace(/\s|-/g, "").length < 10}
                                    className="w-full bg-gradient-to-r from-[#004AAD] to-[#00398a] text-white py-3.5 px-4 rounded-lg font-semibold hover:from-[#00398a] hover:to-[#002d6b] focus:outline-none focus:ring-2 focus:ring-[#004AAD] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            <span>Sending OTP...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Phone className="w-5 h-5" />
                                            <span>Send OTP</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        )}

                        {/* OTP Step */}
                        {step === 'OTP' && (
                            <div className="space-y-6 animate-fadeIn">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-4 text-center">
                                        Enter 4-digit OTP
                                    </label>
                                    <div className="flex justify-center gap-3">
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
                                                className="w-16 h-16 border-2 border-gray-300 rounded-xl text-center text-3xl font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#004AAD] focus:border-[#004AAD] transition-all duration-200 hover:border-gray-400"
                                                autoFocus={i === 0}
                                            />
                                        ))}
                                    </div>
                                    <p className="text-center mt-4 text-xs text-gray-500">
                                        We've sent a verification code to your phone
                                    </p>
                                </div>

                                <button
                                    onClick={handleVerifyOTP}
                                    disabled={loading || otp.join("").length !== 4}
                                    className="w-full bg-gradient-to-r from-[#004AAD] to-[#00398a] text-white py-3.5 px-4 rounded-lg font-semibold hover:from-[#00398a] hover:to-[#002d6b] focus:outline-none focus:ring-2 focus:ring-[#004AAD] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            <span>Verifying...</span>
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 className="w-5 h-5" />
                                            <span>Verify OTP</span>
                                        </>
                                    )}
                                </button>

                                <div className="text-center">
                                    <p className="text-sm text-gray-600 mb-2">
                                        Didn't receive code?
                                    </p>
                                    <button
                                        onClick={handleResendOTP}
                                        disabled={!canResend || loading}
                                        className={`font-semibold text-sm transition-all duration-200 ${
                                            canResend
                                                ? "text-[#004AAD] hover:text-[#00398a] hover:underline"
                                                : "text-gray-400 cursor-not-allowed"
                                        }`}
                                    >
                                        {canResend ? (
                                            <span className="flex items-center justify-center gap-1">
                                                <Phone className="w-4 h-4" />
                                                Resend OTP
                                            </span>
                                        ) : (
                                            `Resend in ${resendTimer}s`
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Agent Links */}
                        <div className="mt-8 pt-6 border-t border-gray-200">
                            <p className="text-center text-sm text-gray-600 mb-4 font-medium">
                                Are you a travel agent?
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShowAgentLogin(true)}
                                    className="flex-1 py-2.5 px-4 text-sm text-[#004AAD] hover:bg-blue-50 rounded-lg font-semibold transition-all duration-200 border border-transparent hover:border-blue-200"
                                >
                                    Agent Login
                                </button>
                                <button
                                    onClick={() => setShowAgentSignup(true)}
                                    className="flex-1 py-2.5 px-4 text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg font-semibold transition-all duration-200"
                                >
                                    Agent Signup
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <NotificationModal
                isOpen={notification.isOpen}
                type={notification.type}
                title={notification.title}
                message={notification.message}
                onClose={() => setNotification(prev => ({ ...prev, isOpen: false }))}
            />

            <UserSignupModal
                isOpen={showUserSignup}
                onClose={() => setShowUserSignup(false)}
                phone={phone}
                onSubmit={handleUserSignupSubmit}
            />

            <AgentLoginModal
                isOpen={showAgentLogin}
                onClose={() => setShowAgentLogin(false)}
                onSuccess={() => {
                    setShowAgentLogin(false);
                }}
                onSwitchToSignup={() => {
                    setShowAgentLogin(false);
                    setShowAgentSignup(true);
                }}
            />

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

export default UserLoginPage;
