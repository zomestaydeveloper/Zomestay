import { Link } from "react-router-dom";
import loginPic from "../assets/loginPage/b18c10d224f45a116197d5ad8fd717cc0bd9661a.png";
import Logo from "../assets/loginPage/e3b983f61b4444dcbddadacf89aaecac0378a185 (1).png";

const SignUp = () => {
  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-3">
      {/* Left side */}
      <div className="lg:col-span-2 flex flex-col px-5 sm:px-8 md:px-12 lg:px-16 py-6">
        {/* Logo */}
        <img src={Logo} alt="Zomestays" className="w-36 h-[50px] md:w-44" />

        {/* Card */}
        <div className="flex-1 flex items-center">
          <div className="w-full mx-auto bg-white border border-gray-100 shadow-lg rounded-2xl p-6 sm:p-8 max-w-md sm:max-w-lg lg:max-w-[760px]">
            <div className="space-y-2 mb-6">
              <h1 className="font-bold text-xl sm:text-2xl text-center text-gray-800">
                Create a New Account
              </h1>
              <p className="text-sm sm:text-base text-center text-gray-500">
                We’ll verify your number with a{" "}
                <span className="font-semibold text-gray-700">One Time Password (OTP)</span>.
              </p>
            </div>

            {/* Inputs */}
            <div className="flex flex-col gap-4">
              {/* Username */}
              <div className="flex w-full h-12 border border-gray-300 rounded-full overflow-hidden">
                <input
                  type="text"
                  placeholder="Enter Your User Name"
                  className="flex-1 px-4 text-sm text-gray-700 outline-none"
                  aria-label="User name"
                />
              </div>

              {/* Email */}
              <div className="flex w-full h-12 border border-gray-300 rounded-full overflow-hidden">
                <input
                  type="email"
                  placeholder="Enter Your Email"
                  className="flex-1 px-4 text-sm text-gray-700 outline-none"
                  aria-label="Email"
                />
              </div>

              {/* Phone + Country code */}
              <div className="flex w-full h-12 border border-gray-300 rounded-full overflow-hidden">
                <select
                  aria-label="Country code"
                  className="px-1 sm:px-4 text-sm text-gray-600 outline-none border-r border-gray-300 bg-white"
                  defaultValue="IND"
                >
                  <option value="IND">IND (+91)</option>
                  <option value="USA">USA (+1)</option>
                  <option value="UK">UK (+44)</option>
                </select>
                <input
                  type="tel"
                  inputMode="numeric"
                  placeholder="Enter Your Number"
                  className="flex-1 px-3 sm:px-4 text-sm text-gray-700 outline-none"
                  aria-label="Phone number"
                />
              </div>
            </div>

            {/* Button */}
            <button className="w-full h-12 mt-5 rounded-full bg-[#004ADD] text-white font-medium">
              Continue
            </button>

            <p className="mt-6 text-center text-sm sm:text-base text-gray-500">
              Already have an account?{" "}
              <Link to="/" className="text-[#004ADD] font-medium">
                Login now
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Right side image */}
      <div className="hidden lg:block h-full overflow-hidden">
        <img src={loginPic} alt="" className="w-full h-full object-cover" />
      </div>
    </div>
  );
};

export default SignUp;
