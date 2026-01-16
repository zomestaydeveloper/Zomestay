import React from 'react';
import { Building2, LogOut } from 'lucide-react';

/**
 * AgentDashboardHeader
 * Header component for Agent Dashboard
 * Displays branding, agent name, and logout button
 */
const AgentDashboardHeader = ({ agentInfo, onLogout }) => {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
      <div className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
              <Building2 className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 truncate">
                Agent Portal
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 truncate">
                {agentInfo?.firstName || agentInfo?.email || 'Agent'}
              </p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
          >
            <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default AgentDashboardHeader;
