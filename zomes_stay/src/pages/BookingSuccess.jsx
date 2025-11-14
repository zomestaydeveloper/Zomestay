import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaCheckCircle, FaHome, FaReceipt } from 'react-icons/fa';
import { MdEmail, MdPhone } from 'react-icons/md';

const BookingSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [bookingDetails, setBookingDetails] = useState(null);

  useEffect(() => {
    // Get booking details from location state
    if (location.state) {
      setBookingDetails(location.state);
    } else {
      // If no state, redirect to home
      navigate('/');
    }
  }, [location.state, navigate]);

  const handleGoHome = () => {
    navigate('/');
  };

  const handleViewBooking = () => {
    // Navigate to booking details or booking history
    navigate('/my-bookings');
  };

  if (!bookingDetails) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
            <FaCheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Booking Confirmed!
          </h1>
          <p className="text-lg text-gray-600">
            Your payment has been processed successfully
          </p>
        </div>

        {/* Booking Details Card */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Booking Details
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Payment Information */}
            <div className="space-y-4">
              <div className="flex items-center">
                <FaReceipt className="h-5 w-5 text-blue-600 mr-3" />
                <div>
                  <p className="text-sm text-gray-500">Booking Number</p>
                  <p className="font-medium text-gray-900">
                    {bookingDetails.bookingNumber || 'N/A'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center">
                <FaReceipt className="h-5 w-5 text-blue-600 mr-3" />
                <div>
                  <p className="text-sm text-gray-500">Payment ID</p>
                  <p className="font-medium text-gray-900">
                    {bookingDetails.paymentId || 'N/A'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center">
                <FaReceipt className="h-5 w-5 text-blue-600 mr-3" />
                <div>
                  <p className="text-sm text-gray-500">Total Amount</p>
                  <p className="font-medium text-gray-900">
                    ₹{bookingDetails.totalPrice?.toLocaleString() || 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <div className="flex items-center">
                <MdEmail className="h-5 w-5 text-blue-600 mr-3" />
                <div>
                  <p className="text-sm text-gray-500">Confirmation Email</p>
                  <p className="font-medium text-gray-900">
                    Sent to your email address
                  </p>
                </div>
              </div>
              
              <div className="flex items-center">
                <MdPhone className="h-5 w-5 text-blue-600 mr-3" />
                <div>
                  <p className="text-sm text-gray-500">Support</p>
                  <p className="font-medium text-gray-900">
                    +91 9876543210
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Next Steps */}
        <div className="bg-blue-50 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">
            What's Next?
          </h3>
          <ul className="space-y-2 text-blue-800">
            <li>• You'll receive a confirmation email shortly</li>
            <li>• Check-in details will be sent 24 hours before arrival</li>
            <li>• Contact us if you have any questions</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={handleViewBooking}
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ease-in-out"
          >
            <FaReceipt className="h-5 w-5 mr-2" />
            View Booking Details
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

export default BookingSuccess;
