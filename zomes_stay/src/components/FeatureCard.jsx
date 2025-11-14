import React, { useState, useEffect, useRef } from "react";
import { Heart, Star, ArrowRight, MapPin, ChevronLeft, ChevronRight, Users, Bed, Bath } from "lucide-react";

const defaultImages = [
  "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=800&q=80", // Luxury villa
  "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?auto=format&fit=crop&w=800&q=80", // Modern house
  "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80", // Beautiful home
  "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=800&q=80", // Lakeside property
];

const FeatureCard = ({
  images = defaultImages,
  title = "The Grand Opulence",
  location = "Wayanad, Kerala",
  rating = "4.8",
  guests = "12",
  rooms = "6",
  baths = "5",
  price = "45,500",
  originalPrice = "52,000",
  bestRated = true
}) => {
  const [current, setCurrent] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (!isHovered) {
      timeoutRef.current && clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setCurrent((prev) => (prev + 1) % images.length);
      }, 3000);
    }
    return () => clearTimeout(timeoutRef.current);
  }, [current, images.length, isHovered]);

  const nextImage = () => {
    setCurrent((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrent((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer">
      {/* Image Section with Carousel */}
      <div 
        className="relative h-52 group"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <img
          src={images[current]}
          alt={title}
          className="w-full h-full object-cover transition-opacity duration-500"
        />
        
        {/* Navigation Arrows - Show on hover */}
        {images.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                prevImage();
              }}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                nextImage();
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}
        
        {/* Rating Badge */}
        <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
          <span className="text-sm font-semibold text-gray-900">{rating}</span>
          <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
        </div>

        {/* Heart Button */}
        <button 
          onClick={(e) => e.stopPropagation()}
          className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm p-2 rounded-full hover:bg-white transition shadow-sm"
        >
          <Heart className="w-4 h-4 text-gray-600" />
        </button>

        {/* Best Rated Badge */}
        {bestRated && (
          <div className="absolute bottom-4 left-4 bg-black/85 text-white px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1">
            <Star className="w-3 h-3 fill-white text-white" />
            Best Rated
          </div>
        )}

        {/* Carousel Dots */}
        {images.length > 1 && (
          <div className="absolute bottom-4 right-4 flex gap-1">
            {images.map((_, idx) => (
              <button
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrent(idx);
                }}
                className={`w-2 h-2 rounded-full transition-all duration-200 ${
                  current === idx ? "bg-white" : "bg-white/50"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-5">
        {/* Title */}
        <h3 className="font-semibold text-lg text-gray-900 mb-2">{title}</h3>
        
        {/* Location */}
        <p className="text-sm text-gray-600 flex items-center gap-1 mb-3">
          <MapPin className="w-3.5 h-3.5 text-gray-400" />
          {location}
        </p>

        {/* Property Details with Icons */}
        <div className="flex items-center gap-4 mb-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4 text-gray-400" />
            <span>Upto {guests}</span>
          </div>
          <div className="flex items-center gap-1">
            <Bed className="w-4 h-4 text-gray-400" />
            <span>{rooms} Rooms</span>
          </div>
          <div className="flex items-center gap-1">
            <Bath className="w-4 h-4 text-gray-400" />
            <span>{baths} Baths</span>
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
            <p className="text-xs text-gray-500">For Per Night + Taxes</p>
          </div>
          
          <button className="w-11 h-11 border-2 border-gray-900 rounded-lg flex items-center justify-center hover:bg-gray-900 hover:text-white transition-colors">
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default FeatureCard;