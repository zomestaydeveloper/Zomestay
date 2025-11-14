import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, Phone, Mail, User, MessageSquare, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { callbackRequestService } from "../services";

const CallbackRequestModal = ({ isOpen, onClose, propertyName, propertyId }) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    notes: ""
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
      // Small delay to ensure modal is fully rendered
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

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters";
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

    if (formData.notes.trim().length > 500) {
      newErrors.notes = "Notes must be less than 500 characters";
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
      // Prepare data for API
      const requestData = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        notes: formData.notes.trim() || null,
        propertyId: propertyId || null
      };

      // Call API
      const response = await callbackRequestService.createCallbackRequest(requestData);

      if (response?.data?.success) {
        setSubmitStatus('success');
        setSubmitMessage(response.data.message || "Thank you! We'll contact you within 2 hours.");
        
        // Reset form
        setFormData({
          name: "",
          email: "",
          phone: "",
          notes: ""
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
        name: "",
        email: "",
        phone: "",
        notes: ""
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

  // Handle ESC key - fixed dependency issue
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
              {propertyName && (
                <p className="text-sm text-gray-600 mt-0.5 font-medium">{propertyName}</p>
              )}
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

            {/* Name Field */}
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-purple-600" />
                  <span>Full Name</span>
                  <span className="text-red-500">*</span>
                </div>
              </label>
              <input
                ref={firstInputRef}
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter your full name"
                className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all ${
                  errors.name
                    ? "border-red-300 bg-red-50"
                    : "border-gray-300 bg-white hover:border-purple-300"
                }`}
                disabled={isSubmitting}
              />
              {errors.name && (
                <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                  <span>•</span>
                  {errors.name}
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

            {/* Notes Field */}
            <div>
              <label
                htmlFor="notes"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-purple-600" />
                  <span>Additional Notes</span>
                  <span className="text-xs text-gray-500 font-normal ml-1">
                    (Optional)
                  </span>
                </div>
              </label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Tell us about your requirements, preferred dates, or any special requests..."
                rows={4}
                maxLength={500}
                className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none ${
                  errors.notes
                    ? "border-red-300 bg-red-50"
                    : "border-gray-300 bg-white hover:border-purple-300"
                }`}
                disabled={isSubmitting}
              />
              <div className="flex items-center justify-between mt-1.5">
                {errors.notes ? (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <span>•</span>
                    {errors.notes}
                  </p>
                ) : (
                  <div></div>
                )}
                <p className="text-xs text-gray-500">
                  {formData.notes.length}/500 characters
                </p>
              </div>
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

export default CallbackRequestModal;

