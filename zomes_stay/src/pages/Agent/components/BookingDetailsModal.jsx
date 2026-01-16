import React from 'react';
import { X } from 'lucide-react';

const BookingDetailsModal = ({
    isOpen,
    onClose,
    selectedBooking,
    getStatusColor,
    getPaymentStatusColor,
    formatPaymentStatus
}) => {
    if (!isOpen || !selectedBooking) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto my-auto">
                <div className="sticky top-0 bg-white border-b border-gray-200 p-4 sm:p-6 flex items-center justify-between z-10">
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Booking Details</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 p-1"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>
                <div className="p-4 sm:p-6 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <p className="text-xs sm:text-sm text-gray-600 mb-1">Booking Number</p>
                            <p className="font-semibold text-gray-900 text-sm sm:text-base">{selectedBooking.bookingNumber || selectedBooking.id}</p>
                        </div>
                        <div>
                            <p className="text-xs sm:text-sm text-gray-600 mb-1">Status</p>
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedBooking.status)}`}>
                                {selectedBooking.status}
                            </span>
                        </div>
                        <div>
                            <p className="text-xs sm:text-sm text-gray-600 mb-1">Customer Name</p>
                            <p className="font-semibold text-gray-900 text-sm sm:text-base">{selectedBooking.customerName}</p>
                        </div>
                        <div>
                            <p className="text-xs sm:text-sm text-gray-600 mb-1">Customer Email</p>
                            <p className="font-semibold text-gray-900 text-sm sm:text-base">{selectedBooking.customerEmail || '—'}</p>
                        </div>
                        {selectedBooking.customerPhone && (
                            <div>
                                <p className="text-xs sm:text-sm text-gray-600 mb-1">Customer Phone</p>
                                <p className="font-semibold text-gray-900 text-sm sm:text-base">{selectedBooking.customerPhone}</p>
                            </div>
                        )}
                        <div>
                            <p className="text-xs sm:text-sm text-gray-600 mb-1">Property</p>
                            <p className="font-semibold text-gray-900 text-sm sm:text-base">{selectedBooking.propertyName}</p>
                        </div>
                        <div>
                            <p className="text-xs sm:text-sm text-gray-600 mb-1">Check-in</p>
                            <p className="font-semibold text-gray-900 text-sm sm:text-base">{selectedBooking.checkIn || '—'}</p>
                        </div>
                        <div>
                            <p className="text-xs sm:text-sm text-gray-600 mb-1">Check-out</p>
                            <p className="font-semibold text-gray-900 text-sm sm:text-base">{selectedBooking.checkOut || '—'}</p>
                        </div>
                        <div>
                            <p className="text-xs sm:text-sm text-gray-600 mb-1">Nights</p>
                            <p className="font-semibold text-gray-900 text-sm sm:text-base">{selectedBooking.nights || '—'}</p>
                        </div>
                        <div>
                            <p className="text-xs sm:text-sm text-gray-600 mb-1">Total Guests</p>
                            <p className="font-semibold text-gray-900 text-sm sm:text-base">{selectedBooking.guests || '—'}</p>
                        </div>
                        <div>
                            <p className="text-xs sm:text-sm text-gray-600 mb-1">Total Amount</p>
                            <p className="font-semibold text-gray-900 text-base sm:text-lg">₹{typeof selectedBooking.amount === 'number' ? selectedBooking.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : (selectedBooking.amount ? String(selectedBooking.amount).replace(/,/g, '') : '0')}</p>
                        </div>
                        {selectedBooking.paymentStatus && (
                            <div>
                                <p className="text-xs sm:text-sm text-gray-600 mb-1">Payment Status</p>
                                <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(selectedBooking.paymentStatus)}`}>
                                    {formatPaymentStatus(selectedBooking.paymentStatus)}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Room Selections Section */}
                    {selectedBooking.roomSelections && selectedBooking.roomSelections.length > 0 && (
                        <div className="mt-6 pt-6 border-t border-gray-200">
                            <h4 className="text-sm font-semibold text-gray-900 mb-4">Room Details</h4>
                            <div className="space-y-3">
                                {selectedBooking.roomSelections.map((selection, idx) => (
                                    <div
                                        key={idx}
                                        className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div>
                                                <h5 className="text-base font-semibold text-gray-900">
                                                    {selection.roomType || 'Room Type'}
                                                </h5>
                                                <p className="text-sm text-gray-500 mt-1">
                                                    {selection.guests} guest{selection.guests !== 1 ? 's' : ''}
                                                    {selection.children > 0 && `, ${selection.children} child${selection.children !== 1 ? 'ren' : ''}`}
                                                </p>
                                            </div>
                                            {selection.mealPlan && (
                                                <div className="text-right">
                                                    <span className="inline-block px-3 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                                                        {selection.mealPlan.name}
                                                    </span>
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        {selection.mealPlan.kind}
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        {selection.rooms && selection.rooms.length > 0 && (
                                            <div className="mt-3 pt-3 border-t border-gray-200">
                                                <p className="text-sm font-medium text-gray-700 mb-2">
                                                    Rooms ({selection.rooms.length}):
                                                </p>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                    {selection.rooms.map((roomName, roomIdx) => (
                                                        <div
                                                            key={roomIdx}
                                                            className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-md"
                                                        >
                                                            <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                                                            <span className="text-sm text-gray-700">{roomName}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 sm:p-6 flex justify-end">
                    <button
                        onClick={onClose}
                        className="w-full sm:w-auto px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm sm:text-base"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BookingDetailsModal;
