import React, { useState } from 'react';
import { X } from 'lucide-react';

const UserSignupModal = ({
  isOpen,
  onClose,
  phone,
  onSubmit
}) => {
  const [formData, setFormData] = useState({
    email: '',
    firstname: '',
    lastname: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);
    // Clear previous errors
    setErrors({});
    
    try {
      await onSubmit({
        phone: phone,
        email: formData.email.trim(),
        firstname: formData.firstname.trim() || null,
        lastname: formData.lastname.trim() || null
      });
    } catch (error) {
      console.error('Signup error:', error);
      console.error('Error response:', error?.response);
      console.error('Error response data:', error?.response?.data);
      
      // Handle API errors - Extract message from Axios error response
      let errorMessage = 'Failed to create account. Please try again.';
      
      // Check response.data structure (could be direct object or nested)
      if (error?.response?.data) {
        // Try different possible locations for the error message
        errorMessage = error.response.data.message 
          || error.response.data.error 
          || error.response.data.msg
          || (typeof error.response.data === 'string' ? error.response.data : errorMessage);
      } else if (error?.message) {
        // If error was thrown manually (from OtpVerification), use the message
        errorMessage = error.message;
      }
      
      console.log('Extracted error message:', errorMessage);
      
      // Check if error is related to email (case-insensitive check)
      const lowerErrorMessage = errorMessage.toLowerCase();
      if (lowerErrorMessage.includes('email') || 
          lowerErrorMessage.includes('already exists') ||
          lowerErrorMessage.includes('user with this') ||
          lowerErrorMessage.includes('phone or email')) {
        // Show error next to email field
        setErrors({ email: errorMessage });
      } else {
        // For other errors, show general error
        setErrors({ general: errorMessage });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/40 bg-opacity-50 z-[60]"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[70] w-full max-w-md">
        <div className="bg-white rounded-lg border border-gray-300 shadow-xl p-6 mx-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Complete Your Profile</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Phone Display (Read-only) */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <input
              type="text"
              value={phone}
              disabled
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-gray-50 text-gray-600 cursor-not-allowed"
            />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* General Error */}
            {errors.general && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                {errors.general}
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full px-3 py-2 text-sm border rounded-md outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.email ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter your email"
                disabled={loading}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-600">{errors.email}</p>
              )}
            </div>

            {/* First Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name
              </label>
              <input
                type="text"
                name="firstname"
                value={formData.firstname}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your first name"
                disabled={loading}
              />
            </div>

            {/* Last Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name
              </label>
              <input
                type="text"
                name="lastname"
                value={formData.lastname}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your last name"
                disabled={loading}
              />
            </div>

            {/* Submit Button */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-[#004ADD] rounded-md hover:bg-[#0039b3] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </span>
                ) : (
                  'Create Account'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default UserSignupModal;
