import React from 'react';
import { Calendar, User, Lock } from 'lucide-react';

/**
 * AgentDashboardTabs
 * Tab navigation component for Agent Dashboard
 * Switches between Bookings, Profile, and Password tabs
 */
const AgentDashboardTabs = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'bookings', label: 'Bookings', icon: Calendar },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'password', label: 'Password', icon: Lock },
  ];

  return (
    <div className="mb-4 sm:mb-6 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="flex border-b border-gray-200">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex-1 px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-center font-medium transition-colors ${
                isActive
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center space-x-1 sm:space-x-2">
                <Icon className="h-4 w-4" />
                <span className="text-xs sm:text-sm md:text-base">{tab.label}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default AgentDashboardTabs;
