import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Phone, LogOut } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { logoutUser } from '../store/userAuthSlice';
import { logoutAgent } from '../store/agentAuthSlice';
import { persistor } from '../store/store';
import userAuthService from '../services/auth/user_authService';
import agentAuthService from '../services/auth/agent_authService';
import { siteConfigService, mediaService } from '../services';
import { findRoleFromPathname } from '../utils/findrole';

const DefaultHeader = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const userAuth = useSelector((state) => state.userAuth);
  const agentAuth = useSelector((state) => state.agentAuth);
  
  // Site Configuration State
  const [siteConfig, setSiteConfig] = useState({
    logo: null,
    phoneNumber: null
  });
  
  /**
   * Detect role from current route/pathname using utility function
   * This ensures correct role detection even when multiple roles are logged in
   * Priority: /app/agent/* → agent, /app/* → user
   */
  const currentRole = findRoleFromPathname(location.pathname) || 'user';
  
  // Determine if current role is logged in based on route context
  const isUserLoggedIn = currentRole === 'user' && Boolean(userAuth?.userAccessToken);
  const isAgentLoggedIn = currentRole === 'agent' && Boolean(agentAuth?.agentAccessToken);
  const isLoggedIn = isUserLoggedIn || isAgentLoggedIn;

  // Fetch site configuration on mount
  useEffect(() => {
    const fetchSiteConfig = async () => {
      try {
        const response = await siteConfigService.getSiteConfig();
        if (response?.data?.success && response?.data?.data) {
          const config = response.data.data;
          setSiteConfig({
            logo: config.logo ? mediaService.getMedia(config.logo) : null,
            phoneNumber: config.phoneNumber || null
          });
        }
      } catch (error) {
        console.error('Failed to fetch site configuration:', error);
        // Don't set any defaults on error - keep state empty
      }
    };

    fetchSiteConfig();
  }, []);

  // Handle logout based on current role from route
  const handleLogout = async () => {
    try {
      // Call appropriate logout API based on role
      if (currentRole === 'agent') {
        console.log("agent logout");
        try {
          await agentAuthService.logout();
        } catch (error) {
          console.error('Agent logout API error:', error);
        }
      } else {
        console.log("user logout");
        try {
          await userAuthService.logout();
        } catch (error) {
          console.error('User logout API error:', error);
        }
      }
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      // Clear session storage
      sessionStorage.removeItem('authToken');

      // Clear appropriate Redux state based on role
      if (currentRole === 'agent') {
        dispatch(logoutAgent());
        // Navigate to agent login or home
        navigate('/', { replace: true });
      } else {
        dispatch(logoutUser());
        // Navigate to login page
        navigate('/', { replace: true });
      }

      // Flush to ensure the logout action is saved to localStorage
      // DO NOT purge - that would clear all roles' data!
      // Redux Persist will automatically save only the updated slice
      await persistor.flush();
    }
  };
  return (
    <header className="sticky top-0 z-50  bg-white ">
      <div  className="h-20 pl-4 pt-4 sm:h-24 lg:h-[115px] lg:pl-8 lg:pt-8 flex items-center justify-between border border-b border-gray-200">
        {siteConfig.logo && (
          <img 
            src={siteConfig.logo} 
            alt="Logo" 
            className="w-10 md:w-20  pb-3 pl-3 cursor-pointer" 
            onClick={() => {
              // Navigate based on current role
              if (currentRole === 'agent') {
                navigate('/app/agent/home');
              } else {
                navigate('/app/home');
              }
            }} 
          />
        )}
        {/* Hamburger Icon for mobile */}
        <button
          className="md:hidden flex flex-col justify-center items-center w-10 h-10 focus:outline-none"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <span className="block w-6 h-0.5 bg-[#004AAD] mb-1"></span>
          <span className="block w-6 h-0.5 bg-[#004AAD] mb-1"></span>
          <span className="block w-6 h-0.5 bg-[#004AAD]"></span>
        </button>
        {/* Desktop Buttons */}
        <div className="hidden md:flex gap-4 items-center pr-16">
          {/* Show Agent Mode indicator when agent is logged in */}
          {isAgentLoggedIn && (
            <div className="px-3 py-1.5 bg-purple-100 text-purple-800 text-xs font-semibold rounded-full border border-purple-300">
              Agent Mode
            </div>
          )}
          {/* Only show Profile and Logout for USER (based on route) */}
          {isUserLoggedIn && (
            <>
              <button 
                className="bg-white border border-gray-200 shadow-lg w-20 h-10 flex items-center justify-center rounded-full hover:bg-gray-50 transition-colors" 
                onClick={() => navigate('/app/user_profile')}
                title="Profile"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24">
                  <rect y="5" width="24" height="2" rx="1" fill="#004AAD"/>
                  <rect y="11" width="24" height="2" rx="1" fill="#004AAD"/>
                  <rect y="17" width="24" height="2" rx="1" fill="#004AAD"/>
                </svg>
                <svg xmlns="http://www.w3.org/2000/svg" fill="#004AAD" viewBox="0 0 24 24" width="22" height="22">
                  <circle cx="12" cy="8" r="4"/>
                  <path d="M12 14c-4 0-6 2-6 4v2h12v-2c0-2-2-4-6-4z"/>
                </svg>
              </button>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white text-xs px-4 py-2 rounded-full font-semibold hover:bg-red-700 transition-colors flex items-center gap-2"
                title="Logout"
              >
                <LogOut size={14} />
                Logout
              </button>
            </>
          )}
          {/* Show Logout for AGENT (based on route) */}
          {isAgentLoggedIn && (

            <>
            <button 
                className="bg-white border border-gray-200 shadow-lg w-20 h-10 flex items-center justify-center rounded-full hover:bg-gray-50 transition-colors" 
                onClick={() => navigate('/agent/dashboard')}
                title="Profile"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="100" fill="none" viewBox="0 0 24 24">
                  <rect y="5" width="24" height="2" rx="1" fill="#004AAD"/>
                  <rect y="11" width="24" height="2" rx="1" fill="#004AAD"/>
                  <rect y="17" width="24" height="2" rx="1" fill="#004AAD"/>
                </svg>
                <svg xmlns="http://www.w3.org/2000/svg" fill="#004AAD" viewBox="0 0 24 24" width="22" height="22">
                  <circle cx="12" cy="8" r="4"/>
                  <path d="M12 14c-4 0-6 2-6 4v2h12v-2c0-2-2-4-6-4z"/>
                </svg>
              </button>
            <button
              onClick={handleLogout}
              className="bg-red-600 text-white text-xs px-4 py-2 rounded-full font-semibold hover:bg-red-700 transition-colors flex items-center gap-2"
              title="Logout"
            >
              <LogOut size={14} />
              Logout
            </button>
            </>
          )}
        </div>
      </div> 
      {/* Mobile Navigation Drawer */}
      <div className={`fixed inset-0 z-50 md:hidden transition-opacity duration-300 ${menuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black/50"
          onClick={() => setMenuOpen(false)}
        />
        
        {/* Side Menu */}
        <div className={`absolute left-0 top-0 h-full w-80 max-w-[85vw] bg-white shadow-2xl transform transition-transform duration-300 ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            {siteConfig.logo && (
              <img src={siteConfig.logo} alt="Logo" className="h-8 w-auto" />
            )}
            <button
              onClick={() => setMenuOpen(false)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Navigation Items */}
          <div className="p-6 space-y-4 pb-24">
            {/* Show Agent Mode indicator when agent is logged in (mobile) */}
            {isAgentLoggedIn && (
              <div className="px-3 py-2 bg-purple-100 text-purple-800 text-xs font-semibold rounded-lg border border-purple-300 text-center">
                Agent Mode
              </div>
            )}
            {/* Only show Profile for USER (based on route) */}
            {isUserLoggedIn && (
              <button 
                onClick={() => {
                  navigate('/app/user_profile');
                  setMenuOpen(false);
                }}
                className="w-full border border-gray-300 text-gray-700 text-sm h-12 rounded-lg hover:bg-gray-50 transition-colors font-semibold flex items-center justify-center"
              >
                Profile
              </button>
            )}
          </div>
          
          {/* Bottom Section - Logout and Contact Info */}
          <div className="absolute bottom-6 left-6 right-6 space-y-4">
            {/* Logout Button - For USER or AGENT (based on route) */}
            {(isUserLoggedIn || isAgentLoggedIn) && (
              <button
                onClick={() => {
                  handleLogout();
                  setMenuOpen(false);
                }}
                className="w-full bg-red-600 text-white text-sm h-12 rounded-lg hover:bg-red-700 transition-colors font-semibold flex items-center justify-center gap-2"
              >
                <LogOut size={16} />
                Logout
              </button>
            )}
          {/* Contact Info */}
            {siteConfig.phoneNumber && (
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                <Phone size={20} className="text-gray-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Need Help?</p>
                  <p className="text-sm text-gray-600">{siteConfig.phoneNumber}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
export default DefaultHeader;