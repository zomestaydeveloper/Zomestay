import React, { useState } from "react";
import Logo from "../../assets/loginPage/logo.png";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useDispatch } from "react-redux";
import { setAdminLogin } from "../../store/adminAuthSlice";
import { authService } from "../../services";
import { persistor } from "../../store/store";

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

const AdminLogin = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const validateForm = () => {
    const newErrors = {};
    if (!formData.email) newErrors.email = "Email is required";
    if (!formData.password) newErrors.password = "Password is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const response = await authService.login({
        ...formData    
        });
   
      const data = response?.data?.data;
      
      // Store admin login data in Redux
      dispatch(setAdminLogin({
        email: data.admin.email,
        first_name: data.admin.firstName,
        last_name: data.admin.lastName,
        profileImage: data.admin.profileImage,
        id: data.admin.id,
        adminAccessToken: data.token
       }));
      
      // Flush Redux Persist to ensure token is saved to localStorage immediately
      // This ensures the axios interceptor can find the token when making API calls
      await persistor.flush();
      
      console.log("✅ Login successful, token saved. Redirecting to dashboard...");
      navigate("/admin/base/dashboard", { replace: true });
    } catch (error) {
      let errorMessage = "Login failed. Please try again.";
      if (error.response) {
        errorMessage = error.response.data?.message || errorMessage;
        if (error.response.status === 401) {
          errorMessage = "Invalid email or password";
        } else if (error.response.status === 403) {
          errorMessage = "Access denied. Admin privileges required.";
        }
      }
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gradient-to-br from-[#f0f4ff] to-[#e6ebfa]">
      {/* Left: Logo + Illustration */}
      <div className="md:w-1/2 flex flex-col items-center md:items-start justify-start px-4 md:pl-16 pt-8 md:pt-16 bg-transparent">
        <div className="flex items-center gap-2 mb-10 md:mb-16 w-full">
          <img src={Logo} className="w-70" alt="Logo" />
        </div>
        <div className="hidden sm:flex w-full flex-1 justify-center items-center">
          <TechIllustration />
        </div>
      </div>

      {/* Right: Login Form */}
      <div className="md:w-1/2 flex items-center justify-center bg-white/95 shadow-2xl px-2 py-8 md:py-0">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-[360px] bg-white rounded-2xl shadow-lg px-4 py-8 md:p-10 flex flex-col gap-7"
        >
          <h2 className="text-center text-[#6a85e6] font-bold text-2xl mb-1">
            Login
          </h2>

          {/* Email */}
          <div className="relative mb-2">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6a85e6]">
              <svg width="18" height="18" fill="none">
                <path
                  d="M9 9a3 3 0 100-6 3 3 0 000 6zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
                  fill="#6a85e6"
                />
              </svg>
            </span>
            <input
              name="email"
              className="w-full pl-11 pr-3 py-3 border border-gray-200 rounded-lg bg-[#f7f9fc] focus:border-[#6a85e6] focus:bg-white outline-none text-base transition"
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              autoComplete="username"
            />
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">{errors.email}</p>
            )}
          </div>

          {/* Password */}
          <div className="relative mb-2">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6a85e6]">
              <svg width="18" height="18" fill="none">
                <path
                  d="M12 8V6a4 4 0 10-8 0v2a2 2 0 00-2 2v6a2 2 0 002 2h8a2 2 0 002-2v-6a2-2 0 00-2-2zm-6-2a2 2 0 114 0v2H6V6zm8 10H2v-6h12v6z"
                  fill="#6a85e6"
                />
              </svg>
            </span>
            <input
              name="password"
              className="w-full pl-11 pr-3 py-3 border border-gray-200 rounded-lg bg-[#f7f9fc] focus:border-[#6a85e6] focus:bg-white outline-none text-base transition"
              type="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              autoComplete="current-password"
            />
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">{errors.password}</p>
            )}
          </div>

          <div className="text-right mb-2">
            <a
              href="#"
              className="text-[#6a85e6] text-sm hover:text-[#b06ab3] transition"
            >
              Forgot password?
            </a>
          </div>

          {/* Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-[#6a85e6] to-[#b06ab3] text-white rounded-lg text-lg font-semibold py-3 mt-2 shadow-md hover:from-[#b06ab3] hover:to-[#6a85e6] transition disabled:opacity-50"
          >
            {loading ? "Logging in..." : "Login"}
          </button>

          <div className="text-center mt-4 text-gray-500 text-base">
            Don&apos;t have an account?
            <a
              href="#"
              className="text-[#6a85e6] underline hover:text-[#b06ab3] ml-1 transition"
            >
              Register Here
            </a>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
