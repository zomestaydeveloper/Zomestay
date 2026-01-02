import { MagnifyingGlassIcon, BellIcon, UserIcon } from "@heroicons/react/24/outline";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import authService from "../../services/auth/authService";
import hostAuthService from "../../services/auth/host_authService";
import { useSelector, useDispatch } from "react-redux";
import { persistor } from "../../store/store";
import { logoutAdmin } from "../../store/adminAuthSlice";
import { logoutHost } from "../../store/hostAuthSlice";
import { setHostProperty } from "../../store/propertySlice";
import { findRoleFromPathname } from "../../utils/findrole";
import { useState } from "react";

const Header = ({ onOpenSidebar }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const location = useLocation();
  const adminAuth = useSelector((state) => state.adminAuth);
  const hostAuth = useSelector((state) => state.hostAuth);

  // Determine role from current pathname
  const role = findRoleFromPathname(location.pathname) || "";

  // Map Redux user slice to unified user object
 const user =
  role === "host"
    ? {
        name: `${hostAuth.first_name || ""} ${hostAuth.last_name || ""}`.trim(),
        avatar: hostAuth.profileImage || null,
      }
    : role === "admin"
    ? {
        name: `${adminAuth.first_name || ""} ${adminAuth.last_name || ""}`.trim(),
        avatar: adminAuth.profileImage || null,
      }
    : null;


      console.log(user,'user nnn')
  // Optional search input state
  const [searchQuery, setSearchQuery] = useState("");

  // Logout handler
  const handleLogout = async () => {
    try {
      if (role === "admin") await authService.logout();
      else if (role === "host") await hostAuthService.logout();
    } catch (error) {
      console.error("Logout API failed:", error);
      toast.error("Logout failed. Try again!");
    } finally {
      if (role === "admin") {
        dispatch(logoutAdmin());
        localStorage.removeItem("persist:adminAuth");
      } else if (role === "host") {
        dispatch(logoutHost());
        dispatch(setHostProperty(null));
        localStorage.removeItem("persist:hostAuth");
        localStorage.removeItem("persist:property");
      }

      // Flush Redux Persist
      await persistor.flush();

      toast.success("Logged out successfully!");
      if (role === "host") navigate("/host", { replace: true });
      else if (role === "admin") navigate("/admin", { replace: true });
    }
  };

  return (
    <header className="w-full shadow-lg h-24 bg-white flex items-center px-6">
      {/* Hamburger for mobile */}
      <button
        type="button"
        className="md:hidden mr-4 inline-flex items-center justify-center rounded-md p-2 text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        aria-label="Open sidebar"
        onClick={onOpenSidebar}
      >
        <svg
          className="h-6 w-6"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="4" y1="6" x2="20" y2="6" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="18" x2="20" y2="18" />
        </svg>
      </button>

      {/* Search bar */}
      <div className="relative w-full max-w-[500px]">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search..."
          className="w-full rounded-lg border border-gray-300 py-2 pl-4 pr-10 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <MagnifyingGlassIcon className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
      </div>

      {/* Right cluster */}
      <div className="ml-auto flex items-center gap-6">
        {/* Notifications */}
        <div className="relative">
          <BellIcon className="h-6 w-6 text-indigo-400 cursor-pointer" />
          <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white"></span>
        </div>

        {/* User info */}
        <div className="flex items-center gap-3">
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt={user.name || "User Avatar"}
              className="h-9 w-9 rounded-full object-cover"
            />
          ) : (
            <div className="h-9 w-9 rounded-full bg-gray-200 flex items-center justify-center">
              <UserIcon className="h-5 w-5 text-gray-400" />
            </div>
          )}

          <div className="leading-tight hidden sm:block">
            <div className="text-sm font-semibold text-gray-800">
              {user?.name || "Unknown User"}
            </div>
            <div className="text-xs text-indigo-400">
              {role === "host" ? "Property Owner" : "Admin"}
            </div>
          </div>
        </div>

        {/* Logout button */}
        <button
          onClick={handleLogout}
          className="text-sm font-semibold text-red-500 hover:text-red-600"
          aria-label="Logout"
        >
          Logout
        </button>
      </div>
    </header>
  );
};

export default Header;
