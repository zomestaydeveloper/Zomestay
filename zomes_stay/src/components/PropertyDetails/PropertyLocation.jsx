import React from 'react';

const PropertyLocation = ({ locationDisplay, mapQuery }) => {
    return (
        <div className="p-[20px] md:p-[40px]">
            <h2 className="text-lg font-bold mb-3">Location</h2>
            <p className="text-gray-600 mb-4">{locationDisplay}</p>
            <div className="w-full h-[300px] rounded-xl overflow-hidden shadow">
                <iframe
                    title="Property Location"
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    style={{ border: 0 }}
                    src={`https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed`}
                    allowFullScreen
                ></iframe>
            </div>
        </div>
    );
};

export default PropertyLocation;
