import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaExclamationTriangle, FaHome, FaRedo, FaPhone } from 'react-icons/fa';
import { MdEmail } from 'react-icons/md';

const BookingFailure = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [errorDetails, setErrorDetails] = useState(null);
  
  // Detect if we're in agent context
  const isAgentContext = location.pathname?.startsWith('/app/agent') || location.state?.isAgentContext || false;

  useEffect(() => {
    // Get error details from location state
    if (location.state) {
      setErrorDetails(location.state);
    }
  }, [location.state]);

  const handleGoHome = () => {
    navigate(isAgentContext ? '/app/agent/home' : '/app/home');
  };

  const handleRetryPayment = () => {
    // Navigate back to the property details page to retry payment
    if (errorDetails?.propertyId) {
      const basePath = isAgentContext ? '/app/agent' : '/app';
      navigate(`${basePath}/properties/${errorDetails.propertyId}`);
    } else {
      navigate(isAgentContext ? '/app/agent/home' : '/app/home');
    }
  };

  const handleContactSupport = () => {
    // You can implement contact support functionality here
    window.open('mailto:support@zomesstay.com?subject=Payment Issue', '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Failure Header */}
        <div className="text-center mb-8">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
            <FaExclamationTriangle className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Payment Failed
          </h1>
          <p className="text-lg text-gray-600">
            We couldn't process your payment at this time
          </p>
        </div>

        {/* Error Details Card */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            What Happened?
          </h2>
          
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-red-800">
                {errorDetails?.message || 'Your payment could not be processed. This could be due to insufficient funds, incorrect card details, or network issues.'}
              </p>
            </div>

            {errorDetails?.error && (
              <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                <p className="text-sm text-gray-600">
                  <strong>Error Code:</strong> {errorDetails.error}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Common Solutions */}
        <div className="bg-yellow-50 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-yellow-900 mb-3">
            Common Solutions
          </h3>
          <ul className="space-y-2 text-yellow-800">
            <li>• Check your card details and try again</li>
            <li>• Ensure you have sufficient funds in your account</li>
            <li>• Try using a different payment method</li>
            <li>• Check your internet connection</li>
            <li>• Contact your bank if the issue persists</li>
          </ul>
        </div>

        {/* Support Information */}
        <div className="bg-blue-50 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">
            Need Help?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center">
              <MdEmail className="h-5 w-5 text-blue-600 mr-3" />
              <div>
                <p className="text-sm text-blue-600">Email Support</p>
                <p className="font-medium text-blue-900">support@zomesstay.com</p>
              </div>
            </div>
            
            <div className="flex items-center">
              <FaPhone className="h-5 w-5 text-blue-600 mr-3" />
              <div>
                <p className="text-sm text-blue-600">Phone Support</p>
                <p className="font-medium text-blue-900">+91 9876543210</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={handleRetryPayment}
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ease-in-out"
          >
            <FaRedo className="h-5 w-5 mr-2" />
            Try Again
          </button>
          
          <button
            onClick={handleContactSupport}
            className="inline-flex items-center px-6 py-3 border border-blue-300 text-base font-medium rounded-md text-blue-700 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ease-in-out"
          >
            <FaPhone className="h-5 w-5 mr-2" />
            Contact Support
          </button>
          
          <button
            onClick={handleGoHome}
            className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ease-in-out"
          >
            <FaHome className="h-5 w-5 mr-2" />
            Go to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookingFailure;
