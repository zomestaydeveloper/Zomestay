import React, { useState, useEffect } from 'react';
import { X, XCircle, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import cancellationRequestService from '../../services/cancellationRequest/cancellationRequestService';

/**
 * Cancellation Request Modal Component
 * Reusable modal for creating cancellation requests
 */
const CancellationRequestModal = ({
  isOpen,
  onClose,
  booking,
  onSuccess,
  userContactNumber = '', // Pre-fill contact number if available
}) => {
  const [reasons, setReasons] = useState([]);
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [contactNumber, setContactNumber] = useState(userContactNumber);
  const [loading, setLoading] = useState(false);
  const [loadingReasons, setLoadingReasons] = useState(false);
  const [error, setError] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Load default reasons when modal opens
  useEffect(() => {
    if (isOpen && reasons.length === 0) {
      loadReasons();
    }
  }, [isOpen]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedReason('');
      setCustomReason('');
      setContactNumber(userContactNumber);
      setError('');
      setShowSuccessModal(false);
      setShowErrorModal(false);
      setSuccessMessage('');
      setErrorMessage('');
    }
  }, [isOpen, userContactNumber]);

  const loadReasons = async () => {
    setLoadingReasons(true);
    try {
      const response = await cancellationRequestService.getReasons();
      if (response.data?.success) {
        setReasons(response.data.data?.reasons || []);
      }
    } catch (err) {
      console.error('Failed to load cancellation reasons:', err);
      // Set default reasons if API fails
      setReasons([
        'Travel plans changed',
        'Emergency/Medical issue',
        'Found better deal',
        'Property issues',
        'Personal reasons',
        'Weather concerns',
        'Other',
      ]);
    } finally {
      setLoadingReasons(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!selectedReason.trim()) {
      setError('Please select a cancellation reason');
      return;
    }

    if (!contactNumber.trim()) {
      setError('Contact number is required');
      return;
    }

    // Basic phone validation
    const cleanedPhone = contactNumber.replace(/[\s\-+]/g, '');
    if (!/^\d{10,15}$/.test(cleanedPhone)) {
      setError('Please enter a valid contact number (10-15 digits)');
      return;
    }

    if (!booking?.id) {
      setError('Invalid booking information');
      return;
    }

    setLoading(true);
    try {
      const response = await cancellationRequestService.create({
        bookingId: booking.id,
        reason: selectedReason,
        customReason: customReason.trim() || null,
        contactNumber: contactNumber.trim(),
      });

      if (response.data?.success) {
        // Success - show success modal
        setSuccessMessage(
          response.data.message || 
          'Cancellation request submitted successfully. Admin will review your request.'
        );
        setShowSuccessModal(true);
        // Call onSuccess callback
        if (onSuccess) {
          onSuccess(response.data.data);
        }
      } else {
        // Show error modal
        setErrorMessage(response.data?.message || 'Failed to submit cancellation request');
        setShowErrorModal(true);
      }
    } catch (err) {
      console.error('Failed to create cancellation request:', err);
      const errorMsg =
        err.response?.data?.message ||
        err.message ||
        'Failed to submit cancellation request. Please try again.';
      setErrorMessage(errorMsg);
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 sm:p-6 flex items-center justify-between z-10">
          <div className="flex items-center space-x-3 flex-1">
            <div className="p-2 bg-red-100 rounded-full flex-shrink-0">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-red-900 flex-1">
              Request Cancellation
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 p-1 ml-2 flex-shrink-0 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6">
          {/* Booking Info */}
          <div className="mb-6 space-y-2 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-700">
              <span className="font-semibold">Booking:</span>{' '}
              {booking?.bookingNumber || booking?.id || 'N/A'}
            </p>
            {booking?.propertyName && (
              <p className="text-sm text-gray-700">
                <span className="font-semibold">Property:</span> {booking.propertyName}
              </p>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800 flex-1">{error}</p>
            </div>
          )}

          {/* Cancellation Reason */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cancellation Reason <span className="text-red-600">*</span>
            </label>
            {loadingReasons ? (
              <div className="flex items-center justify-center p-4 border border-gray-300 rounded-lg">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                <span className="ml-2 text-sm text-gray-500">Loading reasons...</span>
              </div>
            ) : (
              <select
                value={selectedReason}
                onChange={(e) => setSelectedReason(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                required
              >
                <option value="">Select a reason...</option>
                {reasons.map((reason, idx) => (
                  <option key={idx} value={reason}>
                    {reason}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Custom Reason */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Details (Optional)
            </label>
            <textarea
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="Provide any additional details about your cancellation..."
              rows={3}
              disabled={loading}
              maxLength={1000}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm sm:text-base resize-none disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-gray-500">
              {customReason.length}/1000 characters
            </p>
          </div>

          {/* Contact Number */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contact Number <span className="text-red-600">*</span>
            </label>
            <input
              type="tel"
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value)}
              placeholder="Enter your contact number"
              disabled={loading}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              Admin will contact you on this number regarding your cancellation request
            </p>
          </div>

          {/* Modal Footer */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm sm:text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !selectedReason.trim() || !contactNumber.trim()}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm sm:text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4" />
                  <span>Submit Request</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-green-100 rounded-full flex-shrink-0">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-green-900 flex-1">
                  Success!
                </h3>
              </div>
              <p className="text-sm text-gray-700 mb-6">{successMessage}</p>
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setShowSuccessModal(false);
                    onClose();
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {showErrorModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-red-100 rounded-full flex-shrink-0">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-red-900 flex-1">
                  Error
                </h3>
              </div>
              <p className="text-sm text-gray-700 mb-6">{errorMessage}</p>
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setShowErrorModal(false);
                    setErrorMessage('');
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CancellationRequestModal;

