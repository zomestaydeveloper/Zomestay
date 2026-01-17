import React from 'react';
import { Building2 } from 'lucide-react';

const NewBookingCard = ({ handleContinueBooking }) => {
    return (
        <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 md:p-6 border border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                <div className="flex-1 min-w-0">
                    <h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 mb-0.5 sm:mb-1 md:mb-2">Start New Booking</h3>
                    <p className="text-xs sm:text-sm text-gray-600">Browse properties and create bookings for your clients</p>
                </div>
                <button
                    onClick={handleContinueBooking}
                    className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 bg-blue-600 text-white rounded-md sm:rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center space-x-2 text-sm sm:text-base"
                >
                    <Building2 className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span>Continue Booking</span>
                </button>
            </div>
        </div>
    );
};

export default NewBookingCard;
