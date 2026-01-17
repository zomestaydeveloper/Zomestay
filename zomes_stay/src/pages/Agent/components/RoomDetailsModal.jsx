import React from 'react';
import { X } from 'lucide-react';

const RoomDetailsModal = ({ isOpen, onClose, selectedBooking }) => {
    if (!isOpen || !selectedBooking) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 bg-opacity-50 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto my-auto">
                {/* Modal Header */}
                <div className="sticky top-0 bg-white border-b border-gray-200 p-4 sm:p-6 flex items-center justify-between z-10">
                    <div>
                        <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
                            Room Details
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                            Booking: {selectedBooking.bookingNumber || selectedBooking.id}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 p-1 transition-colors"
                        aria-label="Close modal"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-4 sm:p-6">
                    {selectedBooking.roomSelections && selectedBooking.roomSelections.length > 0 ? (
                        <div className="space-y-4">
                            {selectedBooking.roomSelections.map((selection, idx) => (
                                <div
                                    key={idx}
                                    className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <h4 className="text-base font-semibold text-gray-900">
                                                {selection.roomType || "Room Type"}
                                            </h4>
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
                    ) : (
                        <div className="text-center py-8 text-gray-500">
                            No room details available
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 sm:p-6 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RoomDetailsModal;
