import React from 'react';
import { Search } from 'lucide-react';

const BookingFilters = ({ searchQuery, setSearchQuery, bookingFilter, setBookingFilter }) => {
    return (
        <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 md:p-6 border border-gray-200">
            <div className="flex flex-col gap-3 sm:gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search bookings..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-2 border border-gray-300 rounded-md sm:rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                    />
                </div>
                {/* Booking Category Filter */}
                <div className="flex gap-2">
                    <button
                        onClick={() => setBookingFilter('all')}
                        className={`flex-1 px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${bookingFilter === 'all'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        All Bookings
                    </button>
                    <button
                        onClick={() => setBookingFilter('upcoming')}
                        className={`flex-1 px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${bookingFilter === 'upcoming'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        Upcoming
                    </button>
                    <button
                        onClick={() => setBookingFilter('past')}
                        className={`flex-1 px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${bookingFilter === 'past'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        Past
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BookingFilters;
