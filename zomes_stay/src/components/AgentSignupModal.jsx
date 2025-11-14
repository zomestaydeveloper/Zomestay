import React, { useState, useEffect, useRef } from 'react';
import { X, Mail, Lock, Eye, EyeOff, Phone, MapPin, FileText, Upload, CheckCircle, AlertCircle } from 'lucide-react';
import travelAgentAuthService from '../services/property/agent/authService';

const AgentSignupModal = ({ isOpen, onClose, onSwitchToLogin }) => {
  const [formData, setFormData] = useState({
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    agencyName: '',
    licenseNumber: '',
    iataCertificate: null,
    officeAddress: ''
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [generalError, setGeneralError] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const emailRef = useRef(null);
  const fileInputRef = useRef(null);
  const firstErrorRef = useRef(null);

  // Auto-focus on email field when modal opens
  useEffect(() => {
    if (isOpen && emailRef.current) {
      setTimeout(() => emailRef.current.focus(), 100);
    }
  }, [isOpen]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        email: '',
        phoneNumber: '',
        password: '',
        confirmPassword: '',
        firstName: '',
        lastName: '',
        agencyName: '',
        licenseNumber: '',
        iataCertificate: null,
        officeAddress: ''
      });
      setErrors({});
      setShowPassword(false);
      setShowConfirmPassword(false);
      setDragActive(false);
      setSuccessMessage('');
      setGeneralError('');
      setShowSuccessModal(false);
      setShowErrorModal(false);
    }
  }, [isOpen]);

  // Focus on first error field
  useEffect(() => {
    if (firstErrorRef.current && Object.keys(errors).length > 0) {
      firstErrorRef.current.focus();
    }
  }, [errors]);

  const validateForm = () => {
    const newErrors = {};

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Phone number validation
    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone number is required';
    } else if (!/^[\+]?[1-9][\d]{0,15}$/.test(formData.phoneNumber.replace(/\s/g, ''))) {
      newErrors.phoneNumber = 'Please enter a valid phone number';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Office address validation
    if (!formData.officeAddress.trim()) {
      newErrors.officeAddress = 'Office address is required';
    } else if (formData.officeAddress.trim().length < 10) {
      newErrors.officeAddress = 'Please enter a complete office address';
    }

    // IATA certificate validation (optional)
    if (formData.iataCertificate && formData.iataCertificate.size > 5 * 1024 * 1024) {
      newErrors.iataCertificate = 'File size must be less than 5MB';
    }

    setErrors(newErrors);
    
    // Set first error field ref for focus
    const firstErrorField = Object.keys(newErrors)[0];
    if (firstErrorField) {
      firstErrorRef.current = document.getElementById(firstErrorField);
    }
    
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

    // Clear general error when user starts typing
    if (generalError) {
      setGeneralError('');
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        setErrors(prev => ({
          ...prev,
          iataCertificate: 'Please upload a PDF, JPEG, or PNG file'
        }));
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({
          ...prev,
          iataCertificate: 'File size must be less than 5MB'
        }));
        return;
      }

      setFormData(prev => ({
        ...prev,
        iataCertificate: file
      }));

      // Clear error
      if (errors.iataCertificate) {
        setErrors(prev => ({
          ...prev,
          iataCertificate: ''
        }));
      }
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      const file = files[0];
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
      
      if (!allowedTypes.includes(file.type)) {
        setErrors(prev => ({
          ...prev,
          iataCertificate: 'Please upload a PDF, JPEG, or PNG file'
        }));
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({
          ...prev,
          iataCertificate: 'File size must be less than 5MB'
        }));
        return;
      }

      setFormData(prev => ({
        ...prev,
        iataCertificate: file
      }));

      if (errors.iataCertificate) {
        setErrors(prev => ({
          ...prev,
          iataCertificate: ''
        }));
      }
    }
  };

  const removeFile = () => {
    setFormData(prev => ({
      ...prev,
      iataCertificate: null
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    setGeneralError('');
    setSuccessMessage('');

    try {
      // Prepare form data for API
      const formDataToSend = new FormData();
      formDataToSend.append('email', formData.email);
      formDataToSend.append('phone', formData.phoneNumber);
      formDataToSend.append('password', formData.password);
      formDataToSend.append('firstName', formData.firstName || '');
      formDataToSend.append('lastName', formData.lastName || '');
      formDataToSend.append('agencyName', formData.agencyName || '');
      formDataToSend.append('licenseNumber', formData.licenseNumber || '');
      formDataToSend.append('officeAddress', formData.officeAddress);
      
      if (formData.iataCertificate) {
        formDataToSend.append('iataCertificate', formData.iataCertificate);
      }

      // Call registration API
      const response = await travelAgentAuthService.register(formDataToSend);

      console.log("response",response);
      
      if (response.data?.success) {
        setSuccessMessage('Account created successfully! Your account is pending admin approval. You will receive an email notification once approved.');
        setShowSuccessModal(true);
        
        // Reset form
        setFormData({
          email: '',
          phoneNumber: '',
          password: '',
          confirmPassword: '',
          firstName: '',
          lastName: '',
          agencyName: '',
          licenseNumber: '',
          iataCertificate: null,
          officeAddress: ''
        });
      }
    } catch (error) {
      console.error('Signup error:', error);
      
      // Handle different error types
      if (error.response?.data?.message) {
        setGeneralError(error.response.data.message);
      } else if (error.response?.data?.error) {
        setGeneralError(error.response.data.error);
      } else {
        setGeneralError('Registration failed. Please try again.');
      }
      setShowErrorModal(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
    onClose();
  };

  const handleCloseErrorModal = () => {
    setShowErrorModal(false);
    setGeneralError('');
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 bg-opacity-50" />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-auto">
            <div className="p-6 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Success!</h3>
              <p className="text-sm text-gray-600 mb-6">{successMessage}</p>
              <button
                onClick={handleCloseSuccessModal}
                className="w-full bg-green-600 text-white py-2 px-4 rounded-md font-medium hover:bg-green-700 transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {showErrorModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 bg-opacity-50" />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-auto">
            <div className="p-6 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Error</h3>
              <p className="text-sm text-gray-600 mb-6">{generalError}</p>
              <button
                onClick={handleCloseErrorModal}
                className="w-full bg-red-600 text-white py-2 px-4 rounded-md font-medium hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black/40 bg-opacity-50"
          onClick={onClose}
        />
      
      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg mx-auto max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
          <h2 className="text-xl font-semibold text-gray-900">Agent Sign Up</h2>
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
          {generalError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
              {generalError}
            </div>
          )}

          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address *
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
                className={`w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none text-gray-700 focus:ring-2 focus:ring-blue-500 transition-colors ${
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

          {/* Phone Number Field */}
          <div>
            <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Phone size={20} className="text-gray-400" />
              </div>
              <input
                type="tel"
                id="phoneNumber"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleInputChange}
                className={`w-full pl-10 pr-3 py-2 border text-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                  errors.phoneNumber ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter your phone number"
                disabled={isLoading}
              />
            </div>
            {errors.phoneNumber && (
              <p className="mt-1 text-sm text-red-600">{errors.phoneNumber}</p>
            )}
          </div>

          {/* First Name Field */}
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
              First Name
            </label>
            <div className="relative">
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border text-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                  errors.firstName ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter your first name"
                disabled={isLoading}
              />
            </div>
            {errors.firstName && (
              <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>
            )}
          </div>

          {/* Last Name Field */}
          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
              Last Name
            </label>
            <div className="relative">
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border text-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                  errors.lastName ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter your last name"
                disabled={isLoading}
              />
            </div>
            {errors.lastName && (
              <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>
            )}
          </div>

          {/* Agency Name Field */}
          <div>
            <label htmlFor="agencyName" className="block text-sm font-medium text-gray-700 mb-1">
              Agency Name
            </label>
            <div className="relative">
              <input
                type="text"
                id="agencyName"
                name="agencyName"
                value={formData.agencyName}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border text-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                  errors.agencyName ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter your agency name"
                disabled={isLoading}
              />
            </div>
            {errors.agencyName && (
              <p className="mt-1 text-sm text-red-600">{errors.agencyName}</p>
            )}
          </div>

          {/* License Number Field */}
          <div>
            <label htmlFor="licenseNumber" className="block text-sm font-medium text-gray-700 mb-1">
              License Number
            </label>
            <div className="relative">
              <input
                type="text"
                id="licenseNumber"
                name="licenseNumber"
                value={formData.licenseNumber}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border text-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                  errors.licenseNumber ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter your license number"
                disabled={isLoading}
              />
            </div>
            {errors.licenseNumber && (
              <p className="mt-1 text-sm text-red-600">{errors.licenseNumber}</p>
            )}
          </div>

          {/* Password Field */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password *
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
                className={`w-full pl-10 pr-10 py-2 border text-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                  errors.password ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Create a password"
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
            <p className="mt-1 text-xs text-gray-500">
              Must be at least 8 characters with uppercase, lowercase, and number
            </p>
          </div>

          {/* Confirm Password Field */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock size={20} className="text-gray-400" />
              </div>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className={`w-full pl-10 pr-10 py-2 border text-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                  errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Confirm your password"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                disabled={isLoading}
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
            )}
          </div>

          {/* Office Address Field */}
          <div>
            <label htmlFor="officeAddress" className="block text-sm font-medium text-gray-700 mb-1">
              Office Address *
            </label>
            <div className="relative">
              <div className="absolute top-2 left-0 pl-3 flex items-start pointer-events-none">
                <MapPin size={20} className="text-gray-400" />
              </div>
              <textarea
                id="officeAddress"
                name="officeAddress"
                value={formData.officeAddress}
                onChange={handleInputChange}
                rows={3}
                className={`w-full pl-10 pr-3 py-2 border rounded-md text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors resize-none ${
                  errors.officeAddress ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter your complete office address"
                disabled={isLoading}
              />
            </div>
            {errors.officeAddress && (
              <p className="mt-1 text-sm text-red-600">{errors.officeAddress}</p>
            )}
          </div>

          {/* IATA Certificate Field */}
          <div>
            <label htmlFor="iataCertificate" className="block text-sm font-medium text-gray-700 mb-1">
              IATA Certificate (Optional)
            </label>
            
            {formData.iataCertificate ? (
              <div className="border border-gray-300 rounded-md p-3 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FileText size={20} className="text-blue-500" />
                    <span className="text-sm text-gray-700">{formData.iataCertificate.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={removeFile}
                    className="text-red-500 hover:text-red-700 text-sm"
                    disabled={isLoading}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <div
                className={`border-2 border-dashed rounded-md p-4 text-center transition-colors ${
                  dragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
                } ${errors.iataCertificate ? 'border-red-300' : ''}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <Upload size={24} className="mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-600 mb-2">
                  Drag and drop your IATA certificate here, or{' '}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                    disabled={isLoading}
                  >
                    browse files
                  </button>
                </p>
                <p className="text-xs text-gray-500">
                  PDF, JPEG, PNG up to 5MB
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={isLoading}
                />
              </div>
            )}
            {errors.iataCertificate && (
              <p className="mt-1 text-sm text-red-600">{errors.iataCertificate}</p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#004AAD] text-white py-2 px-4 rounded-md font-semibold hover:bg-[#003080] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </button>

          {/* Switch to Login */}
          <div className="text-center pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Already have an agent account?{' '}
              <button
                type="button"
                onClick={onSwitchToLogin}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Sign in here
              </button>
            </p>
          </div>
        </form>
      </div>
      </div>
    </>
  );
};

export default AgentSignupModal;
