import React from 'react';
import { Calendar, User, Lock } from 'lucide-react';

const DashboardTabs = ({ activeTab, setActiveTab }) => {
    return (
        <div className="mb-4 sm:mb-6 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="flex border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('bookings')}
                    className={`flex-1 px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-center font-medium transition-colors ${activeTab === 'bookings'
                            ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                        }`}
                >
                    <div className="flex items-center justify-center space-x-1 sm:space-x-2">
                        <Calendar className="h-4 w-4" />
                        <span className="text-xs sm:text-sm md:text-base">Bookings</span>
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab('profile')}
                    className={`flex-1 px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-center font-medium transition-colors ${activeTab === 'profile'
                            ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                        }`}
                >
                    <div className="flex items-center justify-center space-x-1 sm:space-x-2">
                        <User className="h-4 w-4" />
                        <span className="text-xs sm:text-sm md:text-base">Profile</span>
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab('password')}
                    className={`flex-1 px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-center font-medium transition-colors ${activeTab === 'password'
                            ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                        }`}
                >
                    <div className="flex items-center justify-center space-x-1 sm:space-x-2">
                        <Lock className="h-4 w-4" />
                        <span className="text-xs sm:text-sm md:text-base">Password</span>
                    </div>
                </button>
            </div>
        </div>
    );
};

export default DashboardTabs;
