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
import { ChevronLeft, ChevronRight, Filter, ArrowUpDown, X } from "lucide-react";

// City Button Component with icon fallback
const CityButton = ({ city, isSelected, onClick }) => {
  const [iconError, setIconError] = useState(false);

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 px-2 py-1 md:px-4 md:py-2 rounded-2xl transition-colors whitespace-nowrap shadow-sm border ${isSelected
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
      className={`px-4 py-2 rounded-2xl transition-colors whitespace-nowrap shadow-sm border ${isSelected
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
        className={`px-3 py-2 rounded-lg border transition-colors ${hasPrev
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
          className={`px-4 py-2 rounded-lg border transition-colors ${page === currentPage
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
        className={`px-3 py-2 rounded-lg border transition-colors ${hasNext
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

  // Mobile filter modal state
  const [showMobileFilter, setShowMobileFilter] = useState(false);

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
            city: activeSearchParams.city || "",
          };

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
    <div className="w-full flex flex-col justify-center items-center overflow-hidden mt-6">
      {/* Filter Section - Web View (Desktop/Tablet) */}
      <div className="w-full pt-16 md:pt-20 pb-4 px-4 md:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Mobile View - Filter & Sort Icons (Right Side) */}
          <div className="md:hidden flex items-center justify-start gap-2.5 pb-4 px-4">
            <button
              onClick={() => setShowMobileFilter(true)}
              className="relative flex items-center gap-1.5 px-3.5 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors shadow-sm"
            >
              <Filter size={18} className="text-gray-600" />
              <span className="text-sm font-medium">Filter</span>
              {(selectedCity || selectedPropertyType) && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-600 rounded-full border-2 border-white"></span>
              )}
            </button>
           
          </div>

          {/* Desktop/Tablet View - Two Halves Side by Side */}
          <div className="hidden md:flex gap-6">
            {/* Locations - First Half (50%) */}
            <div className="w-1/2">
              <label className="block text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">
                Location
              </label>
              <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                <button
                  onClick={() => handleCityClick("all")}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${selectedCity === null
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                >
                  All
                </button>

                {citiesLoading ? (
                  <div className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-500">
                    <div className="w-3 h-3 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                    <span>Loading...</span>
                  </div>
                ) : (
                  uniqueCities.map((city, index) => {
                    const isSelected = selectedCity && selectedCity.toLowerCase().trim() === city.name.toLowerCase().trim();
                    return (
                      <button
                        key={index}
                        onClick={() => handleCityClick(city.name)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${isSelected
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                      >
                        {city.icon && (
                          <img
                            src={city.icon}
                            alt={city.name}
                            className="w-3.5 h-3.5 object-contain"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        )}
                        {!city.icon && <span className="text-xs">📍</span>}
                        <span>{city.name}</span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Property Types - Second Half (50%) */}
            <div className="w-1/2">
              <label className="block text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">
                Property Type
              </label>
              <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                <button
                  onClick={() => handlePropertyTypeClick(null)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${selectedPropertyType === null
                      ? "bg-emerald-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                >
                  All
                </button>

                {propertyTypesLoading ? (
                  <div className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-500">
                    <div className="w-3 h-3 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                    <span>Loading...</span>
                  </div>
                ) : (
                  propertyTypes.map((type) => {
                    const isSelected = selectedPropertyType === type.id;
                    return (
                      <button
                        key={type.id}
                        onClick={() => handlePropertyTypeClick(type.id)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${isSelected
                            ? "bg-emerald-600 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                      >
                        {type.name}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Filter Modal */}
      {showMobileFilter && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowMobileFilter(false)}
          />

          {/* Filter Drawer */}
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl max-h-[85vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between z-10">
              <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
              <button
                onClick={() => setShowMobileFilter(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} className="text-gray-600" />
              </button>
            </div>

            {/* Filter Content */}
            <div className="p-4 space-y-6">
              {/* Locations Section */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  Location
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      handleCityClick("all");
                      setShowMobileFilter(false);
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedCity === null
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                  >
                    All
                  </button>

                  {citiesLoading ? (
                    <div className="flex items-center gap-2 px-4 py-2 text-sm text-gray-500">
                      <div className="w-3 h-3 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                      <span>Loading...</span>
                    </div>
                  ) : (
                    uniqueCities.map((city, index) => {
                      const isSelected = selectedCity && selectedCity.toLowerCase().trim() === city.name.toLowerCase().trim();
                      return (
                        <button
                          key={index}
                          onClick={() => {
                            handleCityClick(city.name);
                            setShowMobileFilter(false);
                          }}
                          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isSelected
                              ? "bg-blue-600 text-white"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                        >
                          {city.icon && (
                            <img
                              src={city.icon}
                              alt={city.name}
                              className="w-4 h-4 object-contain"
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                          )}
                          {!city.icon && <span className="text-xs">📍</span>}
                          <span>{city.name}</span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Property Types Section */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  Property Type
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      handlePropertyTypeClick(null);
                      setShowMobileFilter(false);
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedPropertyType === null
                        ? "bg-emerald-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                  >
                    All
                  </button>

                  {propertyTypesLoading ? (
                    <div className="flex items-center gap-2 px-4 py-2 text-sm text-gray-500">
                      <div className="w-3 h-3 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                      <span>Loading...</span>
                    </div>
                  ) : (
                    propertyTypes.map((type) => {
                      const isSelected = selectedPropertyType === type.id;
                      return (
                        <button
                          key={type.id}
                          onClick={() => {
                            handlePropertyTypeClick(type.id);
                            setShowMobileFilter(false);
                          }}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isSelected
                              ? "bg-emerald-600 text-white"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                        >
                          {type.name}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-4 py-4 flex gap-3">
              <button
                onClick={() => {
                  setSelectedCity(null);
                  setSelectedPropertyType(null);
                  setShowMobileFilter(false);
                }}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Clear All
              </button>
              <button
                onClick={() => setShowMobileFilter(false)}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Simple Results Count */}
      {!loading && (
        <div className="w-full px-4 md:px-6 lg:px-8 mb-4">
          <div className="max-w-7xl mx-auto">
            <p className="text-sm text-gray-600">
              {total > 0 ? (
                <>
                  Showing <span className="font-semibold">{properties.length}</span> of{' '}
                  <span className="font-semibold">{total}</span> properties
                </>
              ) : (
                <span>No properties found</span>
              )}
            </p>
          </div>
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
