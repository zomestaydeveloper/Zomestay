import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Phone, Mail, User, MessageSquare, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { callbackRequestService } from '../services';

const RequestCallbackModal = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    city: 'Mumbai'
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null); // 'success', 'error'
  const [submitMessage, setSubmitMessage] = useState('');
  const modalRef = useRef(null);
  const firstInputRef = useRef(null);

  // Focus first input when modal opens
  useEffect(() => {
    if (isOpen && firstInputRef.current) {
      const timer = setTimeout(() => {
        firstInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Handle input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ""
      }));
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required";
    } else if (formData.firstName.trim().length < 2) {
      newErrors.firstName = "First name must be at least 2 characters";
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required";
    } else if (formData.lastName.trim().length < 2) {
      newErrors.lastName = "Last name must be at least 2 characters";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!/^[0-9]{10,15}$/.test(formData.phone.replace(/[\s-()]/g, ""))) {
      newErrors.phone = "Please enter a valid phone number (10-15 digits)";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus(null);
    setSubmitMessage('');

    try {
      // Prepare data for API (combine firstName and lastName to name)
      const requestData = {
        name: `${formData.firstName.trim()} ${formData.lastName.trim()}`.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        notes: `City: ${formData.city}`,
        propertyId: null // This modal doesn't have propertyId
      };

      // Call API
      const response = await callbackRequestService.createCallbackRequest(requestData);

      if (response?.data?.success) {
        setSubmitStatus('success');
        setSubmitMessage(response.data.message || "Thank you! We'll contact you within 2 hours.");
        
        // Reset form
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          city: 'Mumbai'
        });
        setErrors({});

        // Close modal after 2 seconds
        setTimeout(() => {
          onClose();
          setSubmitStatus(null);
          setSubmitMessage('');
        }, 2000);
      } else {
        setSubmitStatus('error');
        setSubmitMessage(response?.data?.message || "Something went wrong. Please try again.");
      }
    } catch (error) {
      console.error('Callback request error:', error);
      setSubmitStatus('error');
      setSubmitMessage(
        error?.response?.data?.message || 
        error?.message || 
        "Something went wrong. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle close - memoized to prevent rerenders
  const handleClose = useCallback(() => {
    if (!isSubmitting) {
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        city: 'Mumbai'
      });
      setErrors({});
      onClose();
    }
  }, [isSubmitting, onClose]);

  // Handle backdrop click - memoized to prevent rerenders
  const handleBackdropClick = useCallback((e) => {
    if (e.target === e.currentTarget && !isSubmitting) {
      handleClose();
    }
  }, [isSubmitting, handleClose]);

  // Handle ESC key
  useEffect(() => {
    if (!isOpen) return;
    
    const handleEsc = (e) => {
      if (e.key === 'Escape' && !isSubmitting) {
        handleClose();
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, isSubmitting, handleClose]);

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Modal Container */}
      <div
        ref={modalRef}
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-purple-50 via-indigo-50 to-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-xl shadow-sm">
              <Phone className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 id="modal-title" className="text-sm md:text-xl font-semibold text-gray-900">Request Callback</h2>
              <p className="text-sm text-gray-600 mt-0.5 font-medium">Looking for a perfect stay?</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="px-6 py-6 space-y-5">
            {/* Success Message */}
            <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl">
              <p className="text-sm text-purple-900">
                <span className="font-semibold">Quick response guaranteed!</span> Our team will reach out to you within 2 hours.
              </p>
            </div>

            {/* First Name Field */}
            <div>
              <label
                htmlFor="firstName"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-purple-600" />
                  <span>First Name</span>
                  <span className="text-red-500">*</span>
                </div>
              </label>
              <input
                ref={firstInputRef}
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                placeholder="Enter your first name"
                className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all ${
                  errors.firstName
                    ? "border-red-300 bg-red-50"
                    : "border-gray-300 bg-white hover:border-purple-300"
                }`}
                disabled={isSubmitting}
              />
              {errors.firstName && (
                <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                  <span>•</span>
                  {errors.firstName}
                </p>
              )}
            </div>

            {/* Last Name Field */}
            <div>
              <label
                htmlFor="lastName"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-purple-600" />
                  <span>Last Name</span>
                  <span className="text-red-500">*</span>
                </div>
              </label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                placeholder="Enter your last name"
                className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all ${
                  errors.lastName
                    ? "border-red-300 bg-red-50"
                    : "border-gray-300 bg-white hover:border-purple-300"
                }`}
                disabled={isSubmitting}
              />
              {errors.lastName && (
                <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                  <span>•</span>
                  {errors.lastName}
                </p>
              )}
            </div>

            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-purple-600" />
                  <span>Email Address</span>
                  <span className="text-red-500">*</span>
                </div>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="your.email@example.com"
                className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all ${
                  errors.email
                    ? "border-red-300 bg-red-50"
                    : "border-gray-300 bg-white hover:border-purple-300"
                }`}
                disabled={isSubmitting}
              />
              {errors.email && (
                <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                  <span>•</span>
                  {errors.email}
                </p>
              )}
            </div>

            {/* Phone Field */}
            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-purple-600" />
                  <span>Phone Number</span>
                  <span className="text-red-500">*</span>
                </div>
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="10-15 digits"
                className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all ${
                  errors.phone
                    ? "border-red-300 bg-red-50"
                    : "border-gray-300 bg-white hover:border-purple-300"
                }`}
                disabled={isSubmitting}
              />
              {errors.phone && (
                <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                  <span>•</span>
                  {errors.phone}
                </p>
              )}
            </div>

            {/* City Field */}
            <div>
              <label
                htmlFor="city"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-purple-600" />
                  <span>City</span>
                  <span className="text-red-500">*</span>
                </div>
              </label>
              <select
                id="city"
                name="city"
                value={formData.city}
                onChange={handleChange}
                className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all ${
                  errors.city
                    ? "border-red-300 bg-red-50"
                    : "border-gray-300 bg-white hover:border-purple-300"
                }`}
                disabled={isSubmitting}
              >
                <option value="Mumbai">Mumbai</option>
                <option value="Delhi">Delhi</option>
                <option value="Bangalore">Bangalore</option>
                <option value="Goa">Goa</option>
                <option value="Pune">Pune</option>
                <option value="Hyderabad">Hyderabad</option>
                <option value="Chennai">Chennai</option>
                <option value="Kolkata">Kolkata</option>
                <option value="Ahmedabad">Ahmedabad</option>
                <option value="Jaipur">Jaipur</option>
              </select>
              {errors.city && (
                <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                  <span>•</span>
                  {errors.city}
                </p>
              )}
            </div>
          </div>

          {/* Submit Status Messages */}
          {submitStatus === 'success' && (
            <div className="px-6 py-4 bg-green-50 border border-green-200 rounded-xl mx-6 mb-4 flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              <p className="text-sm text-green-800 font-medium">{submitMessage}</p>
            </div>
          )}

          {submitStatus === 'error' && (
            <div className="px-6 py-4 bg-red-50 border border-red-200 rounded-xl mx-6 mb-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-800 font-medium">{submitMessage}</p>
            </div>
          )}

          {/* Footer Actions */}
          <div className="px-6 py-5 border-t border-gray-200 bg-gray-50 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed order-2 sm:order-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium rounded-xl hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-purple-500/30 order-1 sm:order-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Phone className="w-4 h-4" />
                  <span>Request Callback</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  // Render modal in portal to prevent z-index issues and ensure it's on top
  return createPortal(modalContent, document.body);
};

export default RequestCallbackModal;

