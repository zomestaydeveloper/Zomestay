import React, { useState, useEffect, useRef } from 'react';
import cancellationRequestService from '../../services/cancellationRequest/cancellationRequestService';
import { AlertCircle, X, Clock, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * Pending Cancellation Requests Popup
 * Shows a popup every 1 minute if there are pending cancellation requests
 * Admin can close it, but it will reappear after next check if still pending
 */
const PendingCancellationPopup = () => {
  const [pendingCount, setPendingCount] = useState(0);
  const [showPopup, setShowPopup] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const intervalRef = useRef(null);
  const checkInterval = 60000; // 1 minute in milliseconds

  // Check for pending requests
  const checkPendingRequests = async () => {
    try {
      setLoading(true);
      const res = await cancellationRequestService.getAll({ status: 'pending', page: 1, limit: 1 });
      if (res.data?.success) {
        const count = res.data.data.pagination?.total || 0;
        setPendingCount(count);
        
        // Show popup if there are pending requests
        if (count > 0) {
          setShowPopup(true);
        }
      }
    } catch (error) {
      console.error('Error checking pending cancellation requests:', error);
    } finally {
      setLoading(false);
    }
  };

  // Initial check and set up interval
  useEffect(() => {
    // Check immediately on mount
    checkPendingRequests();

    // Set up interval to check every 1 minute
    intervalRef.current = setInterval(() => {
      checkPendingRequests();
    }, checkInterval);

    // Cleanup interval on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const handleClose = () => {
    setShowPopup(false);
    // Popup will reappear after next check (1 minute) if still pending
  };

  const handleViewRequests = () => {
    navigate('/admin/base/cancellation-requests');
    setShowPopup(false);
  };

  // Don't render if no pending requests or popup is closed
  if (!showPopup || pendingCount === 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto"
        onClick={handleClose}
      />
      
      {/* Popup */}
      <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full pointer-events-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-6 py-4 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Pending Cancellation Requests</h3>
                <p className="text-sm text-white/90">Action required</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-white/90 hover:text-white hover:bg-white/10 rounded-lg p-1.5 transition-colors"
              title="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-yellow-100 p-4 rounded-full">
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="flex-1">
              <div className="text-3xl font-bold text-gray-900">{pendingCount}</div>
              <div className="text-sm text-gray-600">
                {pendingCount === 1 ? 'cancellation request' : 'cancellation requests'} pending review
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-yellow-800">
              <strong>Reminder:</strong> You have pending cancellation requests that require your attention. 
              Please review and take action as soon as possible.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleViewRequests}
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3 rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg"
            >
              View Requests
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={handleClose}
              className="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>

          <div className="mt-4 text-xs text-gray-500 text-center">
            This popup will reappear every minute if requests are still pending
          </div>
        </div>
      </div>
    </div>
  );
};

export default PendingCancellationPopup;


