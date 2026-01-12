import React, { useState } from 'react';
import { Clock } from 'lucide-react';
import AmenitiesList from '../AmenitiesList';
import SafetyHygieneList from '../SafetyHygieneList';

const PropertyHeader = ({
    title,
    description,
    checkIn,
    checkOut,
    amenities,
    facilities,
    safetyAndHygiene,
    error,
    requiredRooms
}) => {
    const [showHighlights, setShowHighlights] = useState(false);
    console.log(facilities, 'kk')

    return (
        <div className="w-full border rounded-lg shadow-lg px-4 py-4 border-gray-200 md:w-[60%] md:border-none md:shadow-none flex flex-col gap-2">
            <div className="flex flex-col md:flex-row md:items-baseline justify-start gap-8 border-b pb-4 mb-4 relative">
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 leading-tight tracking-tight">
                    {title}
                </h1>
                <div className="relative">
                    <button
                        className="flex-shrink-0 px-4 py-1.5 bg-violet-100 text-violet-700 text-xs md:text-sm font-bold rounded-full uppercase tracking-wider hover:bg-violet-200 transition-colors duration-200 cursor-pointer"
                        onMouseEnter={() => setShowHighlights(true)}
                        onMouseLeave={() => setShowHighlights(false)}
                        onClick={() => setShowHighlights(!showHighlights)}
                    >
                        highlights
                    </button>

                    {showHighlights && (
                        <div
                            className="absolute top-full right-0 md:left-1/2 md:right-auto md:-translate-x-1/2 mt-3 w-72 max-w-[calc(100vw-2.5rem)] bg-white rounded-xl shadow-xl border border-gray-100 z-50 p-4 animate-in fade-in zoom-in-95 duration-200"
                            onMouseEnter={() => setShowHighlights(true)}
                            onMouseLeave={() => setShowHighlights(false)}
                        >
                            <div className="absolute -top-2 right-6 md:left-1/2 md:-ml-2 w-4 h-4 bg-white rotate-45 border-t border-l border-gray-100" />

                            <h3 className="text-violet-900 font-bold text-sm mb-2 uppercase tracking-wide">
                                Main Attractions
                            </h3>

                            {/* Empty state */}
                            {!facilities || facilities.length === 0 ? (
                                <p className="text-sm text-gray-400">No highlights available</p>
                            ) : (
                                <ul className="space-y-2">
                                    {facilities.map((facility) => (
                                        <li
                                            key={facility.id}
                                            className="flex items-start gap-2 text-sm text-gray-600"
                                        >
                                            <span className="text-violet-500">★</span>
                                            <span>{facility.title}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {description && (
                <p className="text-gray-600 text-[12px] md:text-[16px] leading-relaxed">{description}</p>
            )}

            <div className="flex flex-wrap gap-6 text-sm text-gray-600 mt-2">
                <div className="flex items-center gap-2">
                    <Clock size={16} className="text-gray-500" />
                    <span>
                        Check-in: <span className="font-medium text-gray-800">{checkIn}</span>
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <Clock size={16} className="text-gray-500" />
                    <span>
                        Check-out: <span className="font-medium text-gray-800">{checkOut}</span>
                    </span>
                </div>
            </div>

            <h2 className="text-[18px] lg:text-[22px] font-bold text-[#484848] mt-2">Amenities</h2>
            <AmenitiesList items={amenities} />

            <h2 className="text-[18px] lg:text-[22px] font-bold text-[#484848] mt-2">Safety and Hygiene</h2>
            <SafetyHygieneList items={safetyAndHygiene} />

            {error && (
                <div className="mt-2 p-3 rounded bg-red-50 text-red-700 text-sm border border-red-200">
                    <div className="font-semibold mb-1">Booking Not Available</div>
                    <div>{error}</div>
                    {error.includes('unavailable dates') && (
                        <div className="mt-2 text-xs text-red-600">
                            💡 Try selecting different dates or check availability for individual dates
                        </div>
                    )}
                    {error.includes('Insufficient rooms') && (
                        <div className="mt-2 text-xs text-red-600">
                            💡 Try selecting fewer rooms or different dates. You need {requiredRooms} room{requiredRooms > 1 ? 's' : ''} for your party.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default PropertyHeader;
