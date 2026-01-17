import React from 'react';
import { X, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';

const CancellationModal = ({
    isOpen,
    onClose,
    selectedBooking,
    cancellationReason,
    setCancellationReason,
    cancellationNotes,
    setCancellationNotes,
    loading,
    confirmCancellation
}) => {
    if (!isOpen || !selectedBooking) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                <div className="p-4 sm:p-6">
                    {/* Modal Header */}
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3 flex-1">
                            <div className="p-2 bg-red-100 rounded-full flex-shrink-0">
                                <XCircle className="h-6 w-6 text-red-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-red-900 flex-1">
                                Cancel Booking
                            </h3>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 p-1 ml-2 flex-shrink-0"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Modal Body */}
                    <div className="mb-6 space-y-4">
                        <div>
                            <p className="text-sm text-gray-700 mb-2">
                                Booking ID: <span className="font-semibold">{selectedBooking.id}</span>
                            </p>
                            <p className="text-sm text-gray-700 mb-2">
                                Property: <span className="font-semibold">{selectedBooking.propertyName}</span>
                            </p>
                            <p className="text-sm text-gray-700">
                                Customer: <span className="font-semibold">{selectedBooking.customerName}</span>
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Cancellation Reason <span className="text-red-600">*</span>
                            </label>
                            <textarea
                                value={cancellationReason}
                                onChange={(e) => setCancellationReason(e.target.value)}
                                placeholder="Please provide a reason for cancellation..."
                                rows={3}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm sm:text-base resize-none"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Additional Notes (Optional)
                            </label>
                            <textarea
                                value={cancellationNotes}
                                onChange={(e) => setCancellationNotes(e.target.value)}
                                placeholder="Any additional notes..."
                                rows={2}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm sm:text-base resize-none"
                            />
                        </div>
                    </div>

                    {/* Modal Footer */}
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            disabled={loading}
                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm sm:text-base font-medium disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={confirmCancellation}
                            disabled={loading || !cancellationReason.trim()}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm sm:text-base font-medium disabled:opacity-50 flex items-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    <span>Cancelling...</span>
                                </>
                            ) : (
                                <>
                                    <XCircle className="h-4 w-4" />
                                    <span>Confirm Cancellation</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CancellationModal;
