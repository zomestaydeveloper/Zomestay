import Banner from "./Banner";
import CardRow from "./CardRow";
import FeatureCardRow from "./FeatureCardRow";
import { useOutletContext } from "react-router-dom";
import { PageLoader } from "./Loader";
import { useState, useEffect, useMemo } from "react";
import { propertyService, mediaService, propertySearchService } from "../services";
import { useSearch } from "../context/SearchContext";
import banner from "../assets/banners/0935992b55432aba0a8696c56c5b0c3f00d9b8b5.png"
import img1 from "../assets/banners/1b6d1e7b93df1bfb92eedff58a32d2e265408692.png";
import img2 from "../assets/banners/685ec65edc35a4ee02667ecfe724f915d09f9fdd.png";
import { ChevronLeft, ChevronRight } from "lucide-react";

// City Button Component with icon fallback
const CityButton = ({ city, isSelected, onClick }) => {
  const [iconError, setIconError] = useState(false);

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 px-2 py-1 md:px-4 md:py-2 rounded-2xl transition-colors whitespace-nowrap shadow-sm border ${
        isSelected
          ? "bg-blue-50 border-blue-500 text-blue-700"
          : "bg-white border-gray-200 hover:bg-blue-50 hover:border-blue-300 text-gray-700"
      }`}
    >
      {city.icon && !iconError ? (
        <img
          src={city.icon}
          alt={city.name}
          className="w-3 h-3 md:w-5 md:h-5 object-contain"
          onError={() => setIconError(true)}
        />
      ) : (
        <span className="text-lg">📍</span>
      )}
      <span className=" text-xs  md:text-sm font-medium">{city.name}</span>
    </button>
  );
};

// Property Type Button Component
const PropertyTypeButton = ({ type, isSelected, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-2xl transition-colors whitespace-nowrap shadow-sm border ${
        isSelected
          ? "bg-green-50 border-green-500 text-green-700"
          : "bg-white border-gray-200 hover:bg-green-50 hover:border-green-300 text-gray-700"
      }`}
    >
      <span className="text-sm font-medium">{type.name}</span>
    </button>
  );
};

// Pagination Component
const Pagination = ({ currentPage, totalPages, hasNext, hasPrev, onPageChange }) => {
  const pages = [];
  const maxVisible = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let endPage = Math.min(totalPages, startPage + maxVisible - 1);

  if (endPage - startPage < maxVisible - 1) {
    startPage = Math.max(1, endPage - maxVisible + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  return (
    <div className="flex items-center justify-center gap-2 mt-8 mb-4">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={!hasPrev}
        className={`px-3 py-2 rounded-lg border transition-colors ${
          hasPrev
            ? "bg-white border-gray-300 hover:bg-gray-50 text-gray-700"
            : "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed"
        }`}
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      {startPage > 1 && (
        <>
          <button
            onClick={() => onPageChange(1)}
            className="px-3 py-2 rounded-lg border bg-white border-gray-300 hover:bg-gray-50 text-gray-700"
          >
            1
          </button>
          {startPage > 2 && <span className="px-2 text-gray-500">...</span>}
        </>
      )}

      {pages.map((page) => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          className={`px-4 py-2 rounded-lg border transition-colors ${
            page === currentPage
              ? "bg-blue-500 border-blue-500 text-white"
              : "bg-white border-gray-300 hover:bg-gray-50 text-gray-700"
          }`}
        >
          {page}
        </button>
      ))}

      {endPage < totalPages && (
        <>
          {endPage < totalPages - 1 && <span className="px-2 text-gray-500">...</span>}
          <button
            onClick={() => onPageChange(totalPages)}
            className="px-3 py-2 rounded-lg border bg-white border-gray-300 hover:bg-gray-50 text-gray-700"
          >
            {totalPages}
          </button>
        </>
      )}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={!hasNext}
        className={`px-3 py-2 rounded-lg border transition-colors ${
          hasNext
            ? "bg-white border-gray-300 hover:bg-gray-50 text-gray-700"
            : "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed"
        }`}
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
};

const HomePage = () => {
  const { searchParams: outletSearchParams } = useOutletContext();
  const { searchParams: contextSearchParams } = useSearch(); // Get search params from context
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCity, setSelectedCity] = useState(null); // null means "All"
  const [selectedPropertyType, setSelectedPropertyType] = useState(null); // null means "All"
  const [uniqueCities, setUniqueCities] = useState([]);
  const [propertyTypes, setPropertyTypes] = useState([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [propertyTypesLoading, setPropertyTypesLoading] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  const [total, setTotal] = useState(0);
  const itemsPerPage = 12; // Number of properties per page
  
  // Use search params from context (set by Header search) if available
  const activeSearchParams = contextSearchParams || null;

  // Fetch unique cities from API
  useEffect(() => {
    const getCities = async () => {
      setCitiesLoading(true);
      try {
        const response = await propertySearchService.getUniqueCities();
        if (response?.data?.success && response?.data?.data) {
          // Transform cities data to include media service URLs
          const citiesWithIcons = response.data.data.map(city => ({
            name: city.name,
            key: city.name.toLowerCase().trim(),
            icon: city.icon ? mediaService.getMedia(city.icon) : null,
          }));
          setUniqueCities(citiesWithIcons);
        }
      } catch (error) {
        console.error("Error fetching cities:", error);
        setUniqueCities([]);
      } finally {
        setCitiesLoading(false);
      }
    };
    getCities();
  }, []);

  // Fetch property types from API
  useEffect(() => {
    const getPropertyTypes = async () => {
      setPropertyTypesLoading(true);
      try {
        const response = await propertySearchService.getPropertyTypes();
        if (response?.data?.success && response?.data?.data) {
          setPropertyTypes(response.data.data);
        }
      } catch (error) {
        console.error("Error fetching property types:", error);
        setPropertyTypes([]);
      } finally {
        setPropertyTypesLoading(false);
      }
    };
    getPropertyTypes();
  }, []);

  // Fetch properties with filters and pagination
  useEffect(() => {
    const getProperties = async () => {
      setLoading(true);
      try {
        let response;
        
        // If user has searched with dates (checkIn/checkOut), use searchProperties API
        // This filters by availability and occupancy
        if (activeSearchParams && activeSearchParams.checkIn && activeSearchParams.checkOut) {
          // Build search params for availability filtering
          const searchParams = {
            checkIn: activeSearchParams.checkIn,
            checkOut: activeSearchParams.checkOut,
            adults: activeSearchParams.adults || 2,
            children: activeSearchParams.children || 0,
            infants: activeSearchParams.infants || 0,
            rooms: activeSearchParams.rooms || 1,
            infantsUseBed: activeSearchParams.infantsUseBed || 0,
          };
          
          console.log('HomePage - Search params:', searchParams);
          response = await propertyService.searchProperties(searchParams);
          
          if (response?.data?.success && response?.data?.data) {
            // searchProperties returns array of objects with structure:
            // [{ property: {...}, totalCapacity, availableRooms, nights }, ...]
            // Extract just the property objects and flatten structure for CardRow
            const propertyData = response.data.data.map(item => {
              // If item has a 'property' field, use it; otherwise use item itself
              const prop = item.property || item;
              
              // Ensure property structure matches what CardRow expects
              // Add any missing fields from the search result
              return {
                ...prop,
                // Preserve search result metadata if needed
                searchResult: {
                  totalCapacity: item.totalCapacity,
                  availableRooms: item.availableRooms,
                  nights: item.nights
                }
              };
            });
            
            console.log('HomePage - Search results from API:', propertyData.length, 'properties');
            
            // Apply city filter on frontend if selected
            let filteredProperties = propertyData;
            if (selectedCity) {
              filteredProperties = propertyData.filter(p => {
                const city = p?.location?.address?.city;
                if (!city) return false;
                return city.toLowerCase().trim() === selectedCity.toLowerCase().trim();
              });
              console.log('HomePage - Applied city filter:', filteredProperties.length, 'of', propertyData.length);
            }
            
            // Apply property type filter on frontend if selected
            if (selectedPropertyType) {
              filteredProperties = filteredProperties.filter(p => {
                const propTypeId = p?.propertyTypeId || p?.propertyType?.id;
                return propTypeId === selectedPropertyType;
              });
              console.log('HomePage - Applied property type filter:', filteredProperties.length);
            }
            
            // For search results, we don't have pagination from backend
            // So we implement client-side pagination
            const startIndex = (currentPage - 1) * itemsPerPage;
            const endIndex = startIndex + itemsPerPage;
            const paginatedProperties = filteredProperties.slice(startIndex, endIndex);
            
            setProperties(paginatedProperties);
            setTotal(filteredProperties.length);
            setTotalPages(Math.ceil(filteredProperties.length / itemsPerPage));
            setHasNext(endIndex < filteredProperties.length);
            setHasPrev(currentPage > 1);
            
            console.log('HomePage - Search results paginated:', {
              total: filteredProperties.length,
              page: currentPage,
              showing: paginatedProperties.length,
              hasNext: endIndex < filteredProperties.length,
              hasPrev: currentPage > 1
            });
          } else {
            console.log('HomePage - No search results found');
            setProperties([]);
            setTotal(0);
            setTotalPages(0);
            setHasNext(false);
            setHasPrev(false);
          }
        } else {
          // No search params - use regular getProperties API
          console.log('HomePage - Using getProperties API (all properties)');
          
          // Build query parameters
          const params = {
            page: currentPage,
            limit: itemsPerPage,
            status: 'active', // Only show active properties
          };

          // Add city filter if selected
          if (selectedCity) {
            params.city = selectedCity;
            console.log('HomePage - Adding city filter:', selectedCity);
          }

          // Add property type filter if selected
          if (selectedPropertyType) {
            params.propertyType = selectedPropertyType;
            console.log('HomePage - Adding property type filter:', selectedPropertyType);
          }

          console.log('HomePage - Fetching properties with params:', params);
          response = await propertyService.getProperties(params);
          
          console.log('HomePage - API Response:', response?.data);
          
          if (response?.data?.success) {
            // Update properties
            if (response?.data?.data) {
              setProperties(response.data.data);
              console.log('HomePage - Properties updated:', response.data.data.length);
            }

            // Update pagination info
            if (response?.data?.pagination) {
              const pagination = response.data.pagination;
              setCurrentPage(pagination.page || 1);
              setTotalPages(pagination.pages || 1);
              setHasNext(pagination.hasNext || false);
              setHasPrev(pagination.hasPrev || false);
              setTotal(pagination.total || 0);
              console.log('HomePage - Pagination updated:', pagination);
            }
          } else {
            console.error('HomePage - API response not successful:', response?.data);
            setProperties([]);
          }
        }
      } catch (error) {
        console.error("HomePage - Error fetching properties:", error);
        console.error("HomePage - Error details:", error.response?.data);
        setProperties([]);
        setTotal(0);
        setTotalPages(0);
        setHasNext(false);
        setHasPrev(false);
      } finally {
        setLoading(false);
      }
    };
    
    getProperties();
  }, [currentPage, selectedCity, selectedPropertyType, activeSearchParams]);

  // Reset to page 1 when filters or search params change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCity, selectedPropertyType, activeSearchParams]);

  const handleCityClick = (cityName) => {
    // If clicking "All", set to null; otherwise set to city name
    const newCity = cityName === "all" ? null : cityName;
    setSelectedCity(newCity);
  };

  const handlePropertyTypeClick = (propertyTypeId) => {
    // If clicking the same type, deselect it; otherwise select it
    const newType = selectedPropertyType === propertyTypeId ? null : propertyTypeId;
    setSelectedPropertyType(newType);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      // Scroll to top when page changes
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="w-full flex flex-col justify-center items-center overflow-hidden">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 w-full px-4 md:px-16 py-8">
        {/* Locations Section */}
        <div className="flex flex-col items-start gap-2 w-full pt-16 md:w-auto">
          
          
          {/* Scrollable Location List */}
          <div className="flex overflow-x-auto gap-4 pb-2 w-full md:w-auto">
            {/* "All" Button */}
            <button
              onClick={() => handleCityClick("all")}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl hover:bg-blue-50 hover:border-blue-300 transition-colors whitespace-nowrap shadow-sm border ${
                selectedCity === null
                  ? "bg-blue-50 border-blue-500 text-blue-700"
                  : "bg-white border-gray-200 text-gray-700"
              }`}
            >
              <span className="text-sm font-medium">All</span>
            </button>

            {/* Dynamic City Buttons */}
            {citiesLoading ? (
              <div className="text-sm text-gray-500">Loading cities...</div>
            ) : (
              uniqueCities.map((city, index) => {
                // Compare selectedCity with city.name (not city.key) since we're sending city.name to backend
                const isSelected = selectedCity && selectedCity.toLowerCase().trim() === city.name.toLowerCase().trim();
                return (
                  <CityButton
                    key={index}
                    city={city}
                    isSelected={isSelected}
                    onClick={() => handleCityClick(city.name)}
                  />
                );
              })
            )}
          </div>
          
         
        </div>

        {/* Property Types Section */}
        <div className="flex flex-col items-start gap-2 w-full md:w-auto">
         
          
          {/* Scrollable Property Type List */}
          <div className="flex overflow-x-auto gap-4 pb-2 w-full md:w-auto">
            {/* "All" Button */}
            <button
              onClick={() => handlePropertyTypeClick(null)}
              className={`px-4 py-2 rounded-2xl transition-colors whitespace-nowrap shadow-sm border ${
                selectedPropertyType === null
                  ? "bg-green-50 border-green-500 text-green-700"
                  : "bg-white border-gray-200 hover:bg-green-50 hover:border-green-300 text-gray-700"
              }`}
            >
              <span className="text-sm font-medium">All</span>
            </button>

            {/* Dynamic Property Type Buttons */}
            {propertyTypesLoading ? (
              <div className="text-sm text-gray-500">Loading types...</div>
            ) : (
              propertyTypes.map((type) => {
                const isSelected = selectedPropertyType === type.id;
                return (
                  <PropertyTypeButton
                    key={type.id}
                    type={type}
                    isSelected={isSelected}
                    onClick={() => handlePropertyTypeClick(type.id)}
                  />
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Results Count */}
      {!loading && (
        <div className="w-full px-4 md:px-16 mb-4">
          <p className="text-sm text-gray-600">
            {total > 0 ? (
              <>Showing {properties.length} of {total} properties</>
            ) : (
              <>No properties found</>
            )}
          </p>
        </div>
      )}

      {/* CardRow Section */}
      <div className="w-full">
        <CardRow properties={properties} loading={loading} />
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          hasNext={hasNext}
          hasPrev={hasPrev}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
};

export default HomePage;
