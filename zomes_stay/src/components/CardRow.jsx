import Card from "./Card";
import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { propertyService, mediaService } from "../services";
import { useSearch } from "../context/SearchContext";
import { CardLoader, SkeletonCard } from "./Loader";

export default function CardRow({ properties: propsProperties = null, loading: propsLoading = null }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const { searchParams } = useSearch();
  
  // Determine role context from current URL path (scalable approach)
  // This handles cases where both user and agent are logged in simultaneously
  const isAgentContext = pathname.startsWith('/app/agent') ??false;

  // Use props if provided (from HomePage), otherwise fetch
  const shouldFetch = propsProperties === null && propsLoading === null;

  const getProperties = async () => {
    setLoading(true);
    try {
      const response = await propertyService.getProperties();
      if (response?.data?.data) {
        setProperties(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching properties:", error);
      setProperties([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (shouldFetch) {
      getProperties();
    }
  }, [shouldFetch]);

  // Use props if provided, otherwise use state
  const displayProperties = propsProperties !== null ? propsProperties : properties;
  const displayLoading = propsLoading !== null ? propsLoading : loading;

    const getPropertyDetails = (property) => {
      // Use real data from API response
      const categories = property?.roomInfo?.roomTypes || 0; // Number of room types (categories)
      const rooms = property?.roomInfo?.totalRooms || 0; // Total number of rooms
      const priceRange = property?.priceRange;
      const agentRate = property?.agentRate;
    
    // Get image from API response
    const propertyImage = property?.coverImage || property?.images?.[0]?.url;
    const image_url = mediaService.getMedia(propertyImage);



    // Get location string from the nested address object
    const getLocationString = (location) => {
      // Since we know the API structure, we can directly access it
      if (location?.address) {
        const address = location.address;
        const parts = [];
        if (address.city) parts.push(address.city);
        if (address.state) parts.push(address.state);
        if (address.country) parts.push(address.country);
        return parts.join(', ');
      }
      
    };

    // Get rating from API response
    const rating = property?.rating || property?.avgRating;
    const bestRated = rating && parseFloat(rating) >= 4.5;

    // Handle pricing: if agentRate exists, show discounted price and original price
    // Otherwise, show only normal price
    let price = priceRange?.min || 0;
    let originalPrice = null;
    
    if (agentRate && agentRate.min) {
      // Agent has discount: show discounted price and original price
      price = agentRate.min;
      originalPrice = priceRange?.min || null;
    }

    return {
      image: image_url,
      title: property.title || "Property",
      location: getLocationString(property?.location),
      rating: rating ? parseFloat(rating).toFixed(1) : null,
      categories: categories,
      rooms: rooms,
      price: price,
      originalPrice: originalPrice,
      bestRated: bestRated,
    };
  };

  return (
    <div className="w-full" id="search-results">
      {displayLoading ? (
        <CardLoader text="Loading properties..." />
      ) : (
        <div
          className="
            flex flex-nowrap overflow-x-auto gap-4 px-4 pb-4
            sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 sm:gap-6 sm:px-8 sm:overflow-visible
          "
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }}
        >
          {displayProperties.length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-500">
              <p className="text-lg font-medium">No properties found</p>
              <p className="text-sm mt-2">Try selecting a different destination or clearing filters</p>
            </div>
          ) : (
            displayProperties.map((property, idx) => {
              const propertyDetails = getPropertyDetails(property);
              // Navigate based on current URL context (scalable - respects current role context)
              // If we're in /app/agent/* context, navigate to agent route
              // Otherwise, navigate to user route
              const propertyPath = isAgentContext
                ? `/app/agent/properties/${property.id}`
                : `/app/properties/${property.id}`;
              
              return (
                <div
                  key={property.id || idx}
                  onClick={() => navigate(propertyPath)}
                  className="
                    flex-none w-[280px] sm:w-full cursor-pointer  
                    sm:flex-initial transition-transform hover:scale-105 
                  "
                >
                  <Card {...propertyDetails} propertyId={property.id} />
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
