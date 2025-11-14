import { useState, useCallback } from "react";
import { Star, ArrowRight, MapPin, Bed, Phone } from "lucide-react";
import CallbackRequestModal from "./CallbackRequestModal";

const Card = ({ image, title, location, rating , guests=9, rooms=0 , categories=3, price=7899 , originalPrice=12999, bestRated = false, propertyId = null }) => {
  const [isCallbackModalOpen, setIsCallbackModalOpen] = useState(false);

  // Memoize handlers to prevent unnecessary rerenders
  const handleOpenModal = useCallback((e) => {
    e.stopPropagation();
    setIsCallbackModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsCallbackModalOpen(false);
  }, []);

  return (
    <>
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer">
        {/* Image Section */}
        <div className="relative h-52">
          <img
            src={image}
            alt={title}
            className="w-full h-full object-cover"
          />
          
          {/* Rating Badge - only show if rating exists */}
          {rating && (
            <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
              <span className="text-sm font-semibold text-gray-900">{rating}</span>
              <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
            </div>
          )}

          {/* Best Rated Badge */}
          {bestRated && (
            <div className="absolute bottom-4 left-4 bg-black/85 text-white px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1">
              <Star className="w-3 h-3 fill-white text-white" />
              Best Rated
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="p-5">
          {/* Request Callback Button - Above title */}
          <button 
            onClick={handleOpenModal}
            className="w-full flex items-center justify-end gap-2 mb-3 py-1.5 px-3 rounded-lg bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200/50 hover:from-purple-100 hover:to-indigo-100 hover:border-purple-300 transition-all duration-200 group shadow-sm"
            aria-label="Request callback"
          >
            <Phone className="w-3.5 h-3.5 text-purple-600 group-hover:text-purple-700 transition-colors" />
            <span className="text-xs font-semibold text-purple-700 group-hover:text-purple-800 transition-colors">
              Request Callback
            </span>
          </button>

          {/* Title */}
          <h3 className="font-semibold text-lg text-gray-900 mb-2">{title}</h3>
          
          {/* Location */}
          <p className="text-sm text-gray-600 flex items-center gap-1 mb-3">
            <MapPin className="w-3.5 h-3.5 text-gray-400" />
            {typeof location === 'string' ? location : 'India'}
          </p>

          {/* Property Details with Icons */}
          <div className="flex items-center gap-4 mb-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Bed className="w-4 h-4 text-gray-400" />
              <span>{categories} {categories === 1 ? 'Category' : 'Categories'}</span>
            </div>
            <div className="flex items-center gap-1">
              <Bed className="w-4 h-4 text-gray-400" />
              <span>{rooms} {rooms === 1 ? 'Room' : 'Rooms'}</span>
            </div>
          </div>

          {/* Price and Arrow */}
          <div className="flex items-end justify-between">
            <div>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-xl font-bold text-gray-900">₹{price}</span>
                {originalPrice && (
                  <span className="text-sm text-gray-500 line-through">₹{originalPrice}</span>
                )}
              </div>
              <p className="text-xs text-gray-500">Price starts from</p>
            </div>
            
            <button className="w-11 h-11 border-2 border-gray-900 rounded-lg flex items-center justify-center hover:bg-gray-900 hover:text-white transition-colors">
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Callback Request Modal */}
      {isCallbackModalOpen && (
        <CallbackRequestModal
          isOpen={isCallbackModalOpen}
          onClose={handleCloseModal}
          propertyName={title}
          propertyId={propertyId}
        />
      )}
    </>
  );
};

export default Card;
