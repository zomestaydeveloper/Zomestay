import { Link, useNavigate } from "react-router-dom";
import loginPic from "../assets/loginPage/b18c10d224f45a116197d5ad8fd717cc0bd9661a.png";
import Logo from "../assets/loginPage/logo.png";

const OtpVerified = () => {
  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-3">
      {/* Left side (same widths as LoginPage) */}
      <div className="lg:col-span-2 flex flex-col px-5 sm:px-8 md:px-12 lg:px-16 py-6">
        {/* Logo (same sizing) */}
        <img src={Logo} alt="Zomestays" className="w-36 h-[50px] md:w-44" />

        {/* Card (same max widths) */}
        <div className="flex-1 flex items-center">
          <div className="w-full mx-auto max-w-md sm:max-w-lg lg:max-w-[760px] bg-white border border-gray-100 shadow-lg rounded-2xl p-6 sm:p-8">
            <div className="mx-auto mb-4 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-blue-100 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-6 h-6 text-[#004ADD]" fill="currentColor">
                <path d="M12 2l7 3v6c0 5-3.4 9.4-7 11-3.6-1.6-7-6-7-11V5l7-3zM11 14.6l5.3-5.3-1.4-1.4L11 11.8 9.1 9.9 7.7 11.3 11 14.6z"/>
              </svg>
            </div>

            <h1 className="text-center font-bold text-xl sm:text-2xl text-gray-800">
              Phone Number Verified
            </h1>
            <p className="mt-2 text-center text-sm sm:text-base text-gray-500">
              Congratulations! You have been successfully authenticated.
            </p>

            <Link
              to="/app/home"
              className="block w-full h-12 mt-6 rounded-full bg-[#004ADD] text-white font-medium text-center leading-[48px]"
            >
              Continue
            </Link>
          </div>
        </div>
      </div>

      {/* Right side image (same behavior) */}
      <div className="hidden lg:block h-full overflow-hidden">
        <img src={loginPic} alt="" className="w-full h-full object-cover" />
      </div>
    </div>
  );
};

export default OtpVerified;
