import React from 'react';
import { Calendar, Building2, Users, AlertCircle } from 'lucide-react';

const BookingMobileList = ({
    bookings,
    loading,
    error,
    handleViewBooking,
    handleRequestCancellation,
    canShowCancellationRequest,
    handleViewRoomDetails,
    formatPaymentStatus,
    getPaymentStatusColor,
    getStatusColor
}) => {
    if (loading || error) return null; // Logic handled in parent or Table component for global loading/error

    return (
        <div className="md:hidden divide-y divide-gray-200">
            {bookings.length === 0 ? (
                <div className="p-6 text-center text-gray-500 text-sm">
                    No bookings found
                </div>
            ) : (
                bookings.map((booking) => (
                    <div key={booking.id} className="p-3 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0 pr-2">
                                <div className="flex items-center flex-wrap gap-1.5 mb-1">
                                    <span className="text-xs font-semibold text-gray-900 truncate">{booking.bookingNumber || booking.id}</span>
                                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${getStatusColor(booking.status)} whitespace-nowrap`}>
                                        {booking.status}
                                    </span>
                                    {booking.paymentStatus && (
                                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${getPaymentStatusColor(booking.paymentStatus)} whitespace-nowrap`}>
                                            {formatPaymentStatus(booking.paymentStatus)}
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs font-medium text-gray-900 truncate mb-0.5">{booking.customerName}</p>
                                <p className="text-xs text-gray-600 truncate">{booking.propertyName}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                                <div className="text-xs font-semibold text-gray-900">₹{typeof booking.amount === 'number' ? booking.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : booking.amount || '0'}</div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mb-2 text-xs text-gray-600">
                            <div className="flex items-center">
                                <Calendar className="h-3 w-3 mr-1.5 flex-shrink-0" />
                                <span className="truncate">{booking.checkIn || '—'}</span>
                            </div>
                            <div className="flex items-center">
                                <Calendar className="h-3 w-3 mr-1.5 flex-shrink-0" />
                                <span className="truncate">{booking.checkOut || '—'}</span>
                            </div>
                            <div className="flex items-center">
                                <Building2 className="h-3 w-3 mr-1.5 flex-shrink-0" />
                                {booking.roomSelections && booking.roomSelections.length > 0 ? (
                                    <button
                                        type="button"
                                        onClick={() => handleViewRoomDetails(booking)}
                                        className="text-blue-600 hover:text-blue-800 font-medium text-[11px]"
                                    >
                                        {booking.roomSelections.length} Room Type{booking.roomSelections.length !== 1 ? 's' : ''}
                                    </button>
                                ) : (
                                    <span className="truncate text-[11px]">—</span>
                                )}
                            </div>
                            <div className="flex items-center">
                                <Users className="h-3 w-3 mr-1.5 flex-shrink-0" />
                                <span>{booking.guests || 0} guests</span>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleViewBooking(booking)}
                                className="flex-1 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-xs font-medium"
                            >
                                View Details
                            </button>
                            {canShowCancellationRequest(booking) && (
                                <button
                                    onClick={() => handleRequestCancellation(booking)}
                                    className="flex-1 px-3 py-1.5 bg-orange-50 text-orange-600 border border-orange-200 rounded-md hover:bg-orange-100 transition-colors text-xs font-medium flex items-center justify-center gap-1"
                                >
                                    <AlertCircle className="h-3.5 w-3.5" />
                                    <span>Request Cancel</span>
                                </button>
                            )}
                        </div>
                    </div>
                ))
            )}
        </div>
    );
};

export default BookingMobileList;
