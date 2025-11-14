import { Heart } from "lucide-react";


const PropertyCard = ({ image, title, location }) => {
  return (
    <div className=" rounded-2xl overflow-hidden shadow-lg bg-white hover:shadow-xl transition-shadow">
      <div className="relative h-85">
        {/* Background image */}
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover"
        />

        {/* Heart button */}
        <button
          className="absolute top-3 right-3 bg-white/80 p-1.5 rounded-full shadow hover:bg-white transition"
          aria-label="Add to favorites"
        >
          <Heart className="w-5 h-5 text-gray-700" />
        </button>

        {/* Text overlay at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
          <h3 className="font-semibold text-lg text-white">{title}</h3>
          <p className="text-sm text-gray-200">{location}</p>
        </div>
      </div>
    
    </div>
  );
};

export default PropertyCard;
