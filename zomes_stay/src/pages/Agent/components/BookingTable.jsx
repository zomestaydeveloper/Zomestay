import React from 'react';
import { Eye, AlertCircle } from 'lucide-react';

const BookingTable = ({
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
    if (loading) {
        return (
            <div className="p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-4 text-sm text-gray-600">Loading bookings...</p>
            </div>
        );
    }

    if (error) {
        // Error handling is done in parent, but we can render nothing or a specific state here if needed
        // The parent renders the error message div above this table usually, 
        // but in the original code, the error div replaces the table content or sits above?
        // In original: !bookingsLoading && bookingsError && ( ... )
        // !bookingsLoading && !bookingsError && ( ... table ... )
        // So this component should probably only be rendered if !loading && !error.
        // However, if passed, we can just return null.
        return null;
    }

    return (
        <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Booking #</th>
                        <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                        <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property</th>
                        <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Room Details</th>
                        <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check-in</th>
                        <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check-out</th>
                        <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nights</th>
                        <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Guests</th>
                        <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                        <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Status</th>
                        <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {bookings.length === 0 ? (
                        <tr>
                            <td colSpan="12" className="px-6 py-8 text-center text-gray-500">
                                No bookings found
                            </td>
                        </tr>
                    ) : (
                        bookings.map((booking) => (
                            <tr key={booking.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {booking.bookingNumber || booking.id}
                                </td>
                                <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                    <div className="flex flex-col">
                                        <span className="font-medium">{booking.customerName}</span>
                                        <span className="text-xs text-gray-500">{booking.customerEmail}</span>
                                        {booking.customerPhone && (
                                            <span className="text-xs text-gray-500">{booking.customerPhone}</span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-4 lg:px-6 py-4 text-sm text-gray-700 max-w-[150px]">
                                    <div className="truncate" title={booking.propertyName}>
                                        {booking.propertyName}
                                    </div>
                                </td>
                                <td className="px-4 lg:px-6 py-4 text-sm text-gray-700">
                                    {booking.roomSelections && booking.roomSelections.length > 0 ? (
                                        <button
                                            type="button"
                                            onClick={() => handleViewRoomDetails(booking)}
                                            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
                                        >
                                            <Eye className="h-4 w-4" />
                                            <span>{booking.roomSelections.length} Room Type{booking.roomSelections.length !== 1 ? 's' : ''}</span>
                                        </button>
                                    ) : (
                                        <span>—</span>
                                    )}
                                </td>
                                <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                    {booking.checkIn || '—'}
                                </td>
                                <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                    {booking.checkOut || '—'}
                                </td>
                                <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                    {booking.nights || '—'}
                                </td>
                                <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                    {booking.guests || '—'}
                                </td>
                                <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                                    ₹{typeof booking.amount === 'number' ? booking.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : (booking.amount ? String(booking.amount).replace(/,/g, '') : '0')}
                                </td>
                                <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(booking.paymentStatus)}`}>
                                        {formatPaymentStatus(booking.paymentStatus)}
                                    </span>
                                </td>
                                <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                                        {booking.status}
                                    </span>
                                </td>
                                <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm">
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => handleViewBooking(booking)}
                                            className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
                                        >
                                            View
                                        </button>
                                        {canShowCancellationRequest(booking) && (
                                            <button
                                                onClick={() => handleRequestCancellation(booking)}
                                                className="text-orange-600 hover:text-orange-800 font-medium flex items-center gap-1 transition-colors text-xs"
                                                title="Request Cancellation"
                                            >
                                                <AlertCircle className="h-3.5 w-3.5" />
                                                <span>Request Cancel</span>
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default BookingTable;
