import React, { useState } from "react";

const SignAgent = () => {
  const [form, setForm] = useState({ username: "", password: "" });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    let errs = {};
    if (!form.username.trim()) errs.username = "User name required";
    if (!form.password.trim()) errs.password = "Password required";
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length === 0) {
      setSubmitting(true);
      setTimeout(() => setSubmitting(false), 1200); // Demo only
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center py-12 px-2">
      <div className="w-full max-w-[1200px] flex flex-col md:flex-row md:items-stretch md:justify-center gap-8 md:gap-16">
        {/* Left Panel */}
        <div className="flex-1 flex flex-col justify-center md:justify-start md:pt-6 md:pl-6 max-w-[480px] md:max-w-[480px] p-2">
          <h1 className="font-black text-[#0F172A] text-[2.2rem] sm:text-4xl md:text-5xl lg:text-6xl leading-tight mb-4">
            Welcome to<br />Zomestay
          </h1>
          <p className="text-[#6B7280] text-base md:text-lg mb-6 max-w-[340px]">
            You don’t have an account yet. Please create one and sign in to continue.
          </p>
          <button
            className="rounded-full bg-[#004AAD] hover:bg-blue-800 shadow-sm text-white font-medium px-7 h-12 text-base transition focus:outline-none focus:ring-2 focus:ring-[#004AAD]/40"
            type="button"
          >
            No account yet? Signup
          </button>
        </div>
        {/* Right Panel (Sign-in Card) */}
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-md px-7 py-8 md:py-10 md:px-10 border border-[#F1F5F9] flex flex-col">
            <h2 className="text-lg md:text-xl font-semibold text-[#111827] mb-2 text-center">Sign in as a agent</h2>
            <p className="text-sm text-[#6B7280] mb-6 text-center">So what are you waiting for? Sign in &amp; Explore!</p>
            <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
              {/* Username */}
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-[#374151] mb-1">
                  User Name
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="User name"
                  value={form.username}
                  onChange={handleChange}
                  className={`w-full h-11 rounded-lg border ${errors.username ? "border-red-400" : "border-[#E5E7EB]"} px-3 text-gray-800 placeholder-gray-400 bg-[#F9FAFB] focus:outline-none focus:ring-2 focus:ring-[#004AAD]/40 focus:border-[#004AAD] transition text-base`}
                  aria-invalid={!!errors.username}
                  aria-describedby={errors.username ? "username-error" : undefined}
                  autoComplete="username"
                />
                <div className="min-h-[18px] text-xs text-red-500 mt-1" id="username-error">{errors.username || ""}</div>
              </div>
              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-[#374151] mb-1">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Password"
                  value={form.password}
                  onChange={handleChange}
                  className={`w-full h-11 rounded-lg border ${errors.password ? "border-red-400" : "border-[#E5E7EB]"} px-3 text-gray-800 placeholder-gray-400 bg-[#F9FAFB] focus:outline-none focus:ring-2 focus:ring-[#004AAD]/40 focus:border-[#004AAD] transition text-base`}
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? "password-error" : undefined}
                  autoComplete="current-password"
                />
                <div className="min-h-[18px] text-xs text-red-500 mt-1" id="password-error">{errors.password || ""}</div>
              </div>
              {/* Continue Button */}
              <button
                type="submit"
                className="w-full rounded-full bg-[#004AAD] hover:bg-blue-800 active:scale-95 transition transform h-12 text-white font-bold text-base shadow-sm mt-2 focus:outline-none focus:ring-2 focus:ring-[#004AAD]/40"
                aria-busy={submitting}
                disabled={submitting}
              >
                {submitting ? "Signing in..." : "Continue"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignAgent;