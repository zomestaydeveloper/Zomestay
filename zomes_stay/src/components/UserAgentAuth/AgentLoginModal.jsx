import React, { useState, useEffect, useRef } from 'react';
import { X, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import agentAuthService from '../../services/auth/agent_authService';
import { setAgentLogin } from '../../store/agentAuthSlice';
import { toast } from 'react-toastify';

const AgentLoginModal = ({ isOpen, onClose, onSwitchToSignup, onSuccess }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const emailRef = useRef(null);

  // Auto-focus on email field when modal opens
  useEffect(() => {
    if (isOpen && emailRef.current) {
      setTimeout(() => emailRef.current.focus(), 100);
    }
  }, [isOpen]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({ email: '', password: '' });
      setErrors({});
      setShowPassword(false);
    }
  }, [isOpen]);

  const validateForm = () => {
    const newErrors = {};

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters long';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const response = await agentAuthService.login(formData);
      console.log(response)
      
      // Check if response has the expected structure
      if (response?.data?.data?.agent && response?.data?.data?.token) {
        const { agent, token } = response.data.data;
        
        // Store agent data in Redux using agentAuthSlice
        dispatch(setAgentLogin({
          email: agent.email || '',
          phone: agent.phone || '',
          first_name: agent.firstName || agent.first_name || '',
          last_name: agent.lastName || agent.last_name || '',
          profileImage: agent.profileImage || '',
          id: agent.id || '',
          agentAccessToken: token || '',
          role: 'agent',
          agencyName: agent.agencyName || '',
          licenseNumber: agent.licenseNumber || '',
          officeAddress: agent.officeAddress || ''
        }));
        
        // Success toast
        toast.success('Login successful!');
        
        // Close this modal first
        onClose();
        
        // Call onSuccess callback if provided (to close parent AuthModal)
        if (onSuccess) {
          onSuccess();
        }
        
        // Navigate to agent dashboard after a small delay to ensure modals close
        // Use replace to prevent back button from going to login modal
        setTimeout(() => {
          navigate('/agent/dashboard', { replace: true });
        }, 150);
      } else {
        // Handle case where response structure is unexpected
        const errorMessage = response?.data?.message || response?.data?.error || 'Login failed. Invalid response from server.';
        setErrors({ general: errorMessage });
        toast.error(errorMessage);
      }
    } catch (error) {
      // Handle API errors (network errors, 4xx, 5xx responses)
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'Login failed. Please check your credentials and try again.';
      setErrors({ general: errorMessage });
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 bg-opacity-50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Agent Login</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* General Error */}
          {errors.general && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
              {errors.general}
            </div>
          )}

          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail size={20} className="text-gray-400" />
              </div>
              <input
                ref={emailRef}
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className={`w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                  errors.email ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter your email"
                disabled={isLoading}
              />
            </div>
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email}</p>
            )}
          </div>

          {/* Password Field */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock size={20} className="text-gray-400" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className={`w-full pl-10 pr-10 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                  errors.password ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter your password"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                disabled={isLoading}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password}</p>
            )}
          </div>

          {/* Forgot Password */}
          <div className="text-right">
            <button
              type="button"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              onClick={() => {
                // TODO: Implement forgot password functionality
                toast.info('Forgot password feature coming soon!');
              }}
            >
              Forgot Password?
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#004AAD] text-white py-2 px-4 rounded-md font-semibold hover:bg-[#003080] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </button>

          {/* Switch to Signup */}
          <div className="text-center pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Don't have an agent account?{' '}
              <button
                type="button"
                onClick={onSwitchToSignup}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Sign up here
              </button>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AgentLoginModal;

