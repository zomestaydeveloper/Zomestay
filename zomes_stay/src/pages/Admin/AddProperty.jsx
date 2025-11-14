import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Plus, X, Trash2, Upload, MapPin, User, Home, Camera, AlertTriangle } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { propertyService, cancellationPolicyService, propertyUpdationService, mediaService } from "../../services";
import ErrorDialog from "../../components/ErrorDialog";

// SuccessDialog Component
const SuccessDialog = ({ isOpen, message, onClose }) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/40 bg-opacity-50 z-[60]" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[70] w-full max-w-md">
        <div className="bg-white rounded-lg shadow-xl p-6 mx-4">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-medium text-gray-900">
                Success
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                {message}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-green-500"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

// MultiSelect Component
const MultiSelect = ({ options, selected, onChange, placeholder, onAddNew, label }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredOptions = options.filter((o) =>
    (o.name || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggleOption = (option) => {
    const isSelected = selected.some((item) => item.id === option.id);
    onChange(
      isSelected
        ? selected.filter((item) => item.id !== option.id)
        : [...selected, option]
    );
  };

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <div
        className="border border-gray-300 rounded p-2 min-h-[40px] cursor-pointer bg-white"
        onClick={() => setIsOpen((s) => !s)}
      >
        {selected.length === 0 ? (
          <span className="text-gray-400 text-sm">{placeholder}</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {selected.map((item) => (
              <span
                key={item.id}
                className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs flex items-center gap-1"
              >
                {item.name}
                <X
                  size={12}
                  className="cursor-pointer hover:text-blue-600"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(selected.filter((s) => s.id !== item.id));
                  }}
                />
              </span>
            ))}
          </div>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded mt-1 z-10 max-h-56 overflow-y-auto">
          <div className="p-2 border-b">
            <input
              type="text"
              placeholder="Search..."
              className="w-full p-1 text-sm border border-gray-300 rounded"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          <div className="max-h-40 overflow-y-auto">
            {filteredOptions.map((option) => {
              const checked = selected.some((s) => s.id === option.id);
              return (
                <div
                  key={option.id}
                  className="p-2 hover:bg-gray-100 cursor-pointer flex items-center gap-2"
                  onClick={() => handleToggleOption(option)}
                >
                  <input type="checkbox" checked={checked} readOnly />
                  <span className="text-sm">{option.name}</span>
                </div>
              );
            })}
          </div>

          {onAddNew && (
            <div className="border-t p-2">
              <button
                type="button"
                onClick={() => {
                  onAddNew();
                  setIsOpen(false);
                }}
                className="w-full text-left text-sm text-blue-600 hover:text-blue-800"
              >
                + Add New {label}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Add Item Modal
const AddItemModal = ({ isOpen, onClose, onAdd, title, needsIcon = true }) => {
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [iconFile, setIconFile] = useState(null);
  const [submitError, setSubmitError] = useState("");
  const [iconError, setIconError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let submitData;
      
      if (needsIcon) {
        // Create FormData for file upload (amenities, facilities, safety)
        submitData = new FormData();
        submitData.append('name', formData.name);
        if (iconFile) {
          submitData.append('icon', iconFile);
        }
      } else {
        // Simple object for room types (no icon needed)
        submitData = { name: formData.name };
      }
      
      await onAdd(submitData);
      setFormData({});
      setIconFile(null);
      setSubmitError("");
      setIconError("");
      onClose();
    } catch (err) {
      console.error(`Error adding ${title}:`, err);
      const message = err?.response?.data?.message || `Failed to add ${title}.`;
      setSubmitError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate SVG file
      if (file.type !== 'image/svg+xml') {
        setIconError('Please select an SVG file for the icon');
        setIconFile(null);
        return;
      }
      setIconError("");
      setIconFile(file);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">Add {title}</h3>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {title} Name
            </label>
            <input
              type="text"
              value={formData.name || ""}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder={`e.g., ${title} Name`}
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          
          {needsIcon && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Icon (SVG File)
              </label>
              <input
                type="file"
                accept=".svg,image/svg+xml"
                onChange={handleFileChange}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
              {iconFile && (
                <p className="text-sm text-green-600 mt-1">
                  Selected: {iconFile.name}
                </p>
              )}
            </div>
          )}
          {iconError && (
            <p className="text-sm text-red-600 mt-2">{iconError}</p>
          )}
          {submitError && (
            <p className="text-sm text-red-600 mt-2">{submitError}</p>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Adding..." : "Add"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Add Room Type Modal (Simplified - No Amenities)
const AddRoomTypeModal = ({ isOpen, onClose, onAdd }) => {
  const [formData, setFormData] = useState({ name: '' });
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const submitData = {
        name: formData.name
      };
      
      await onAdd(submitData);
      setFormData({ name: '' });
      setSubmitError("");
      onClose();
    } catch (err) {
      console.error('Error adding room type:', err);
      const message = err?.response?.data?.message || 'Failed to add room type.';
      setSubmitError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">Add Room Type</h3>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Room Type Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Deluxe Suite"
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          
          {submitError && (
            <p className="text-sm text-red-600 mb-2">{submitError}</p>
          )}
          
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Adding..." : "Add Room Type"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const PropertyForm = ({ mode = "create" }) => {
  const navigate = useNavigate();
  const params = useParams();
  const propertyId = mode === "edit" ? params?.propertyId || "" : "";
  const isEdit = mode === "edit";

  // Refs for auto-focus
  const titleRef = useRef(null);
  const ownerHostIdRef = useRef(null);
  const propertyTypeRef = useRef(null);
  const streetRef = useRef(null);
  const cityRef = useRef(null);
  const stateRef = useRef(null);
  const zipCodeRef = useRef(null);
  const mediaRef = useRef(null);
  
  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    rulesAndPolicies: "",
    status: "active",
    ownerHostId: "",
    propertyTypeId: "",
    cancellationPolicyId: "",
    location: {
      address: {
        street: "",
        city: "",
        state: "",
        country: "India",
        zipCode: "",
        line1: "",
        line2: "",
        area: "",
        postalCode: ""
      },
      coordinates: {
        latitude: null,
        longitude: null,
        lat: null,
        lng: null
      }
    },
    amenityIds: [],
    facilityIds: [],
    safetyIds: [],
    roomTypes: []
  });


  

  // Media state
  const [mediaFiles, setMediaFiles] = useState([]);
  
  // Room type images state
  const [roomTypeImages, setRoomTypeImages] = useState({});
  const [roomTypeImageErrors, setRoomTypeImageErrors] = useState({});

  // City icon state
  const [cityIconFile, setCityIconFile] = useState(null);
  const [cityIconPreview, setCityIconPreview] = useState(null);
  const [cityIconError, setCityIconError] = useState("");

  // Dropdown data
  const [amenities, setAmenities] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [safetyHygiene, setSafetyHygiene] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [propertyTypes, setPropertyTypes] = useState([]);
  const [cancellationPolicies, setCancellationPolicies] = useState([]);

  // Modal states
  const [showAddAmenity, setShowAddAmenity] = useState(false);
  const [showAddFacility, setShowAddFacility] = useState(false);
  const [showAddSafety, setShowAddSafety] = useState(false);
  const [showAddPropertyType, setShowAddPropertyType] = useState(false);
  const [showAddRoomType, setShowAddRoomType] = useState(false);

  // Form state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEdit);
  const [creationDataReady, setCreationDataReady] = useState(false);
  const [errors, setErrors] = useState({});
  
  // Dialog states
  const [errorDialog, setErrorDialog] = useState({ isOpen: false, message: '' });
  const [successDialog, setSuccessDialog] = useState({ isOpen: false, message: '' });
  const [initialLoadError, setInitialLoadError] = useState('');
  const [existingMedia, setExistingMedia] = useState([]);
  const [coverSelection, setCoverSelection] = useState(null);
  const [roomTypeDeleteState, setRoomTypeDeleteState] = useState({
    isOpen: false,
    index: null,
    loading: false,
  });
  const [sectionSaving, setSectionSaving] = useState({
    basics: false,
    location: false,
    features: false,
    roomTypes: false,
    media: false,
  });

  const normaliseRulesFromServer = useCallback((value) => {
    if (!value) return [];

    if (Array.isArray(value)) {
      return value
        .map((rule) => (rule == null ? '' : String(rule).trim()))
        .filter((rule) => rule.length > 0);
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return [];

      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed
            .map((rule) => (rule == null ? '' : String(rule).trim()))
            .filter((rule) => rule.length > 0);
        }
      } catch (err) {
        // not JSON, continue
      }

      return trimmed
        .split(/\r?\n|,/)
        .map((rule) => rule.trim())
        .filter((rule) => rule.length > 0);
    }

    return [];
  }, []);

  const normaliseLocationFromServer = useCallback((location = {}) => {
    const address = location.address || {};
    const coordinates = location.coordinates || {};

    const street = address.street ?? address.line1 ?? "";
    const zipCode = address.zipCode ?? address.postalCode ?? "";

    return {
      address: {
        street,
        city: address.city ?? "",
        state: address.state ?? "",
        country: address.country ?? "India",
        zipCode,
        line1: address.line1 ?? street,
        line2: address.line2 ?? "",
        area: address.area ?? "",
        postalCode: address.postalCode ?? zipCode
      },
      coordinates: {
        latitude: coordinates.latitude ?? coordinates.lat ?? null,
        longitude: coordinates.longitude ?? coordinates.lng ?? null,
        lat: coordinates.lat ?? coordinates.latitude ?? null,
        lng: coordinates.lng ?? coordinates.longitude ?? null
      }
    };
  }, []);
  const fetchPropertyDetails = useCallback(
    async ({ showLoading = true } = {}) => {
      if (!isEdit || !propertyId || !creationDataReady) return;

      if (showLoading) {
        setInitialLoading(true);
        setInitialLoadError('');
      }

      try {
        const response = await propertyService.getPropertyForEdit(propertyId);
        const payload = response?.data;
        const property = payload?.data;
        if (!property) {
          throw new Error('Property not found');
        }

        const propertyAmenities = (property.amenities || []).filter((item) => item?.id);
        const propertyFacilities = (property.facilities || []).filter((item) => item?.id);
        const propertySafeties = (property.safeties || []).filter((item) => item?.id);

        const rulesArray = normaliseRulesFromServer(property.rulesAndPolicies);

        // Load existing city icon if available (only set preview, not file)
        const existingCityIcon = property.location?.cityIcon;
        if (existingCityIcon) {
          const iconUrl = mediaService.getMedia(existingCityIcon);
          setCityIconPreview(iconUrl);
          // Don't set cityIconFile - it's an existing icon, not a new upload
          setCityIconFile(null);
        } else {
          // No existing icon, clear preview
          setCityIconPreview(null);
          setCityIconFile(null);
        }

        const mappedRoomTypes = (property.roomTypes || []).map((rt) => ({
          id: rt.id,
          roomTypeId: rt.roomTypeId,
          roomTypeName: rt.roomTypeName || rt.roomType?.name || '',
          minOccupancy: rt.minOccupancy ?? 1,
          Occupancy: rt.Occupancy ?? rt.maxOccupancy ?? 1,
          maxOccupancy: rt.maxOccupancy ?? rt.Occupancy ?? null,
          extraBedCapacity: rt.extraBedCapacity ?? 0,
          numberOfBeds: rt.numberOfBeds ?? rt.maxOccupancy ?? 1,
          bedType: rt.bedType || 'DOUBLE',
          amenityIds: (rt.amenityIds || []).map((amenity) => ({
            id: amenity.id,
            name: amenity.name,
            category: amenity.category,
            icon: amenity.icon,
          })),
          media: (rt.media || []).map((mediaItem) => ({
            id: mediaItem.id,
            url: mediaItem.url,
            type: mediaItem.type || "image",
            isFeatured: Boolean(mediaItem.isFeatured),
            isDeleted: Boolean(mediaItem.isDeleted),
            order: typeof mediaItem.order === 'number' ? mediaItem.order : 0,
          })),
        }));

        setFormData((prev) => ({
          ...prev,
          title: property.title || '',
          description: property.description || '',
          rulesAndPolicies: rulesArray.join('\n'),
          status: property.status || 'active',
          ownerHostId: property.ownerHostId || prev.ownerHostId || '',
          propertyTypeId: property.propertyTypeId || prev.propertyTypeId || '',
          cancellationPolicyId: property.cancellationPolicyId || prev.cancellationPolicyId || '',
          location: normaliseLocationFromServer(property.location) || prev.location,
          amenityIds: propertyAmenities.map((item) => ({
            id: item.id,
            name: item.name,
          })),
          facilityIds: propertyFacilities.map((item) => ({
            id: item.id,
            name: item.name,
          })),
          safetyIds: propertySafeties.map((item) => ({
            id: item.id,
            name: item.name,
          })),
          roomTypes: mappedRoomTypes.length ? mappedRoomTypes : prev.roomTypes,
        }));

        const mediaItems = (property.media || [])
          .map((item, index) => ({
            id: item.id,
            url: item.url,
            type: item.type || 'image',
            isFeatured: item.isFeatured || false,
            order: typeof item.order === 'number' ? item.order : index,
            isDeleted: Boolean(item.isDeleted),
          }))
          .sort((a, b) => a.order - b.order);

        setExistingMedia(mediaItems);
        if (mediaItems.length > 0) {
          const featuredIndex = mediaItems.findIndex((item) => item.isFeatured);
          setCoverSelection({
            type: 'existing',
            index: featuredIndex >= 0 ? featuredIndex : 0,
          });
        } else {
          setCoverSelection(null);
        }

        setMediaFiles([]);
        setRoomTypeImages({});
        // Don't reset city icon preview if there's an existing one - it's already set above
        setCityIconFile(null);
        setCityIconError("");
      } catch (error) {
        console.error('Error fetching property details:', error);
        setInitialLoadError('Failed to load property details');
        setErrorDialog({
          isOpen: true,
          message: 'Failed to load property details',
        });
      } finally {
        if (showLoading) {
          setInitialLoading(false);
        }
      }
    },
    [
      isEdit,
      propertyId,
      creationDataReady,
      normaliseRulesFromServer,
      normaliseLocationFromServer,
    ]
  );

  const runSectionSave = async (key, action, defaultMessage) => {
    if (!propertyId) {
      setErrorDialog({
        isOpen: true,
        message: 'Missing property identifier. Please reload and try again.',
      });
      return;
    }

    setSectionSaving((prev) => ({ ...prev, [key]: true }));
    try {
      const response = await action();
      const message =
        response?.data?.message ||
        defaultMessage ||
        'Section updated successfully.';
      setSuccessDialog({ isOpen: true, message });
    } catch (error) {
      console.error(`Error saving ${key} section:`, error);
      const message =
        error?.response?.data?.message ||
        `Failed to update ${key.replace(/([A-Z])/g, ' $1').toLowerCase().trim()}.`;
      setErrorDialog({ isOpen: true, message });
    } finally {
      setSectionSaving((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleSaveBasics = async () => {
    const payload = {
      title: formData.title,
      description: formData.description,
      rulesAndPolicies: formData.rulesAndPolicies,
      status: formData.status,
      propertyTypeId: formData.propertyTypeId,
      cancellationPolicyId: formData.cancellationPolicyId,
      ownerHostId: formData.ownerHostId,
    };

    await runSectionSave(
      'basics',
      () => propertyUpdationService.updateBasics(propertyId, payload),
      'Basic information updated successfully.'
    );
  };

  const handleSaveLocation = async () => {
    const formDataToSend = new FormData();
    
    // If city icon preview is cleared (user clicked remove), set cityIcon to null
    const locationData = { ...formData.location };
    
    // If no preview and no new file, it means user removed the icon
    if (!cityIconPreview && !cityIconFile) {
      locationData.cityIcon = null;
    }
    
    formDataToSend.append('location', JSON.stringify(locationData));
    
    // Append city icon file if a new one is selected
    if (cityIconFile) {
      formDataToSend.append('cityIcon', cityIconFile);
    }
    
    await runSectionSave(
      'location',
      async () => {
        const response = await propertyUpdationService.updateLocation(propertyId, formDataToSend);
        // Refresh property details to get updated city icon
        await fetchPropertyDetails({ showLoading: false });
        return response;
      },
      'Location information updated successfully.'
    );
  };

  const handleSaveFeatures = async () => {
    const payload = {
      amenityIds: formData.amenityIds.map((item) => item.id),
      facilityIds: formData.facilityIds.map((item) => item.id),
      safetyIds: formData.safetyIds.map((item) => item.id),
    };

    await runSectionSave(
      'features',
      () => propertyUpdationService.updateFeatures(propertyId, payload),
      'Property features updated successfully.'
    );
  };

  const handleSaveRoomTypes = async () => {
    const submitRoomTypes = formData.roomTypes.map((rt, index) => ({
      id: rt.id || '',
      index,
      roomTypeId: rt.roomTypeId,
      minOccupancy: rt.minOccupancy,
      Occupancy: rt.Occupancy,
      extraBedCapacity: rt.extraBedCapacity,
      numberOfBeds: rt.numberOfBeds,
      bedType: rt.bedType,
      amenityIds: (rt.amenityIds || [])
        .map((item) => {
          if (!item) return null;
          if (typeof item === 'string') return item;
          if (typeof item === 'object') return item.id || item.value || item.amenityId || null;
          return null;
        })
        .filter(Boolean),
      existingMedia: (() => {
        let orderCounter = 0;
        return (rt.media || [])
          .filter((mediaItem) => mediaItem && mediaItem.id)
          .map((mediaItem) => {
            const isDeleted = Boolean(mediaItem.isDeleted);
            const payload = {
              id: mediaItem.id,
              isDeleted,
              isFeatured: !isDeleted && Boolean(mediaItem.isFeatured),
            };
            if (!isDeleted) {
              payload.order = orderCounter;
              orderCounter += 1;
            }
            return payload;
          });
      })(),
    }));

    const formDataToSend = new FormData();
    formDataToSend.append('roomtypes', JSON.stringify(submitRoomTypes));

    Object.entries(roomTypeImages).forEach(([roomTypeIndex, files]) => {
      if (files && files.length) {
        files.forEach((file) => {
          formDataToSend.append(`roomTypeImages_${roomTypeIndex}`, file);
        });
      }
    });

    await runSectionSave(
      'roomTypes',
      async () => {
        const response = await propertyUpdationService.updateRoomTypes(
          propertyId,
          formDataToSend
        );
        await fetchPropertyDetails({ showLoading: false });
        return response;
      },
      'Room types updated successfully.'
    );
  };

  const handleSaveMedia = async () => {
    const activeExistingMedia = existingMedia
      .map((mediaItem, idx) => ({ mediaItem, idx }))
      .filter(({ mediaItem }) => !mediaItem.isDeleted);

    const formDataToSend = new FormData();

    activeExistingMedia.forEach(({ mediaItem, idx }, orderIdx) => {
      const payload = {
        url: mediaItem.url,
        type: mediaItem.type || 'image',
        isFeatured:
          coverSelection?.type === 'existing'
            ? coverSelection.index === idx
            : Boolean(mediaItem.isFeatured),
        order: orderIdx,
      };
      formDataToSend.append('existingMedia', JSON.stringify(payload));
    });

    mediaFiles.forEach((file) => {
      formDataToSend.append('media', file);
    });

    const existingCount = activeExistingMedia.length;
    let coverIndex = 0;

    if (coverSelection) {
      if (coverSelection.type === 'existing') {
        const coverActiveIdx = activeExistingMedia.findIndex(
          ({ idx }) => idx === coverSelection.index
        );
        if (coverActiveIdx >= 0) {
          coverIndex = coverActiveIdx;
        } else if (existingCount > 0) {
          const featuredIdx = activeExistingMedia.findIndex(({ mediaItem }) => mediaItem.isFeatured);
          coverIndex = featuredIdx >= 0 ? featuredIdx : 0;
        } else if (mediaFiles.length > 0) {
          coverIndex = 0;
        }
      } else if (coverSelection.type === 'new') {
        const normalisedNewIndex =
          mediaFiles.length > 0
            ? Math.min(Math.max(coverSelection.index, 0), mediaFiles.length - 1)
            : 0;
        coverIndex = existingCount + normalisedNewIndex;
      }
    } else if (existingCount > 0) {
      const featuredIdx = activeExistingMedia.findIndex(({ mediaItem }) => mediaItem.isFeatured);
      coverIndex = featuredIdx >= 0 ? featuredIdx : 0;
    } else if (mediaFiles.length > 0) {
      coverIndex = 0;
    }

    formDataToSend.append('coverImageIndex', String(Math.max(0, coverIndex)));

    await runSectionSave(
      'media',
      async () => {
        const response = await propertyUpdationService.updateMedia(
          propertyId,
          formDataToSend
        );
        await fetchPropertyDetails({ showLoading: false });
        return response;
      },
      'Property media updated successfully.'
    );
  };

  const selectedCancellationPolicy = useMemo(
    () => cancellationPolicies.find((policy) => policy.id === formData.cancellationPolicyId) || null,
    [cancellationPolicies, formData.cancellationPolicyId]
  );

  // Fetch dropdown data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await propertyService.getCreationFormData();
        const data = response.data.data;
        setAmenities(data.amenities || []);
        setFacilities(data.facilities || []);
        setSafetyHygiene(data.safetyHygiene || []);
        setRoomTypes(data.roomTypes || []);
        setPropertyTypes(data.propertyTypes || []);
      } catch (error) {
        console.error("Error fetching form data:", error);
        toast.error("Failed to load form data");
      } finally {
        setCreationDataReady(true);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const fetchCancellationPolicies = async () => {
      try {
        const response = await cancellationPolicyService.list();
        const payload = response?.data;

        if (payload?.success && Array.isArray(payload.data)) {
          const normalised = payload.data.map((policy) => ({
            ...policy,
            rules: (policy.rules || [])
              .slice()
              .sort((a, b) => a.sortOrder - b.sortOrder),
          }));
          setCancellationPolicies(normalised);
        } else {
          setErrorDialog({
            isOpen: true,
            message: payload?.message || "Failed to load cancellation policies",
          });
        }
      } catch (error) {
        console.error("Error fetching cancellation policies:", error);
        setErrorDialog({
          isOpen: true,
          message: "Failed to load cancellation policies",
        });
      }
    };

    fetchCancellationPolicies();
  }, []);

useEffect(() => {
  fetchPropertyDetails({ showLoading: true });
}, [fetchPropertyDetails]);

  // Clear error when user starts typing
  const clearError = (fieldName) => {
    if (errors[fieldName]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  // Clear all errors
  const clearAllErrors = () => {
    setErrors({});
  };

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Clear error for this field
    clearError(name);
    
    if (name.startsWith('location.')) {
      const [_, parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        location: {
          ...prev.location,
          [parent]: {
            ...prev.location[parent],
            [child]: value
          }
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Handle media upload
  const handleMediaChange = (e) => {
    clearError('media');

    const files = Array.from(e.target.files || []);
    const errors = [];
    const validFiles = [];
    const MAX_FILES = 12;
    const MAX_SIZE = 2 * 1024 * 1024; // 2MB
    const TARGET_RATIO = 16 / 9;
    const TOLERANCE = 0.05;

    if (files.length > MAX_FILES) {
      errors.push(`Maximum ${MAX_FILES} images allowed`);
    }

    files.forEach((file) => {
      if (file.size > MAX_SIZE) {
        errors.push(`File ${file.name} exceeds 2MB limit`);
        return;
      }

      if (!file.type.startsWith('image/')) {
        errors.push(`File ${file.name} must be an image`);
        return;
      }

      validFiles.push(file);
    });

    setMediaFiles(validFiles);

    const hasActiveExisting = existingMedia.some((mediaItem) => !mediaItem.isDeleted);

    if (isEdit && !hasActiveExisting && validFiles.length > 0) {
      setCoverSelection({ type: 'new', index: 0 });
    }

    if (validFiles.length === 0) {
      setErrors((prev) => ({ ...prev, media: errors[0] || "At least one image is required" }));
      return;
    }

    const ratioChecks = validFiles.map(
      (file) =>
        new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            const ratio = img.width / img.height;
            const isValid = Math.abs(ratio - TARGET_RATIO) <= TOLERANCE;
            resolve(
              isValid
                ? null
                : `File ${file.name} must have a 16:9 aspect ratio (${img.width}x${img.height})`
            );
          };
          img.onerror = () => resolve(`File ${file.name} could not be loaded for validation`);
          img.src = URL.createObjectURL(file);
        })
    );

    Promise.all(ratioChecks).then((results) => {
      const ratioErrors = results.filter(Boolean);
      if (errors.length || ratioErrors.length) {
        setErrors((prev) => ({
          ...prev,
          media: [...errors, ...ratioErrors][0],
        }));
      } else {
        clearError('media');
      }
    });
  };

  // Handle room type image upload
  const handleRoomTypeImageChange = (roomTypeIndex, e) => {
    const files = Array.from(e.target.files || []);
    const errors = [];
    const validFiles = [];
    const MAX_FILES = 12;
    const MAX_SIZE = 2 * 1024 * 1024;
    const TARGET_RATIO = 16 / 9;
    const TOLERANCE = 0.05;

    if (files.length > MAX_FILES) {
      errors.push(`Maximum ${MAX_FILES} images allowed`);
    }

    files.forEach((file) => {
      if (file.size > MAX_SIZE) {
        errors.push(`File ${file.name} exceeds 2MB limit`);
        return;
      }

      if (!file.type.startsWith('image/')) {
        errors.push(`File ${file.name} must be an image`);
        return;
      }

      validFiles.push(file);
    });

    if (validFiles.length === 0) {
      setRoomTypeImageErrors((prev) => ({
        ...prev,
        [roomTypeIndex]: errors,
      }));
      return;
    }

    const ratioChecks = validFiles.map(
      (file) =>
        new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            const ratio = img.width / img.height;
            const isValid = Math.abs(ratio - TARGET_RATIO) <= TOLERANCE;
            resolve(
              isValid
                ? null
                : `File ${file.name} must have a 16:9 aspect ratio (${img.width}x${img.height})`
            );
          };
          img.onerror = () =>
            resolve(`File ${file.name} could not be loaded for validation`);
          img.src = URL.createObjectURL(file);
        })
    );

    Promise.all(ratioChecks).then((results) => {
      const ratioErrors = results.filter(Boolean);

      setRoomTypeImageErrors((prev) => ({
        ...prev,
        [roomTypeIndex]: [...errors, ...ratioErrors],
      }));

      if (!errors.length && !ratioErrors.length) {
        setRoomTypeImages((prev) => ({
          ...prev,
          [roomTypeIndex]: validFiles,
        }));
      } else {
        setRoomTypeImages((prev) => ({
          ...prev,
          [roomTypeIndex]: validFiles,
        }));
      }
    });
  };

  // Add room type
  const addRoomType = () => {
    setFormData(prev => ({
      ...prev,
      roomTypes: [...prev.roomTypes, {
        roomTypeId: "",
        minOccupancy: 1,
        Occupancy: 2,
        extraBedCapacity: 0,
        numberOfBeds: 1,
        bedType: "DOUBLE",
        amenityIds: [],
        media: []
      }]
    }));
  };

  // Remove room type locally (no API call)
  const removeRoomTypeLocally = (index) => {
    setFormData(prev => ({
      ...prev,
      roomTypes: prev.roomTypes.filter((_, i) => i !== index)
    }));
    
    // Clean up room type images
    setRoomTypeImages(prev => {
      const newImages = { ...prev };
      delete newImages[index];
      // Shift remaining indices
      const shiftedImages = {};
      Object.keys(newImages).forEach(key => {
        const keyIndex = parseInt(key);
        if (keyIndex > index) {
          shiftedImages[keyIndex - 1] = newImages[key];
        } else {
          shiftedImages[key] = newImages[key];
        }
      });
      return shiftedImages;
    });
    
    setRoomTypeImageErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[index];
      // Shift remaining indices
      const shiftedErrors = {};
      Object.keys(newErrors).forEach(key => {
        const keyIndex = parseInt(key);
        if (keyIndex > index) {
          shiftedErrors[keyIndex - 1] = newErrors[key];
        } else {
          shiftedErrors[key] = newErrors[key];
        }
      });
      return shiftedErrors;
    });
  };

  const handleRequestRemoveRoomType = (index) => {
    const target = formData.roomTypes[index];
    if (!isEdit || !target?.id) {
      removeRoomTypeLocally(index);
      return;
    }
    setRoomTypeDeleteState({
      isOpen: true,
      index,
      loading: false,
    });
  };

  const handleCancelRemoveRoomType = () => {
    setRoomTypeDeleteState({
      isOpen: false,
      index: null,
      loading: false,
    });
  };

  const handleConfirmRemoveRoomType = async () => {
    const { index } = roomTypeDeleteState;
    if (index === null) {
      handleCancelRemoveRoomType();
      return;
    }

    const target = formData.roomTypes[index];

    if (!isEdit || !target?.id) {
      removeRoomTypeLocally(index);
      handleCancelRemoveRoomType();
      return;
    }

    setRoomTypeDeleteState((prev) => ({
      ...prev,
      loading: true,
    }));

    try {
      await propertyUpdationService.deleteRoomType(propertyId, target.id);
      removeRoomTypeLocally(index);
      setRoomTypeDeleteState({
        isOpen: false,
        index: null,
        loading: false,
      });
      setSuccessDialog({ isOpen: true, message: "Room type deleted successfully" });
    } catch (error) {
      console.error("Error deleting property room type:", error);
      const message =
        error?.response?.data?.message ||
        "Failed to delete room type. Please try again later.";
      setErrorDialog({ isOpen: true, message });
      setRoomTypeDeleteState((prev) => ({
        ...prev,
        loading: false,
      }));
    }
  };

  // Update room type
  const updateRoomType = (index, field, value) => {
    // Clear room type errors when user makes changes
    clearError(`roomType_${index}`);
    clearError(`minOccupancy_${index}`);
    clearError(`occupancy_${index}`);
    clearError(`extraBed_${index}`);
    clearError(`numberOfBeds_${index}`);
    
    setFormData(prev => {
      const updatedRoomTypes = prev.roomTypes.map((rt, i) => 
        i === index ? { ...rt, [field]: value } : rt
      );
      
      // Real-time validation: if user fixes the min/max relationship, clear the error
      const updatedRoomType = updatedRoomTypes[index];
      if (updatedRoomType.minOccupancy && updatedRoomType.Occupancy && 
          updatedRoomType.minOccupancy <= updatedRoomType.Occupancy) {
        clearError(`minOccupancy_${index}`);
      }
      
      return {
        ...prev,
        roomTypes: updatedRoomTypes
      };
    });
  };

  const ensureRoomTypeMediaPrimary = (roomTypesArray, roomTypeIndex) => {
    const target = roomTypesArray[roomTypeIndex];
    if (!target) return roomTypesArray;

    const activeMedia = (target.media || []).filter((item) => !item.isDeleted);
    if (activeMedia.length === 0) {
      return roomTypesArray;
    }

    const hasFeatured = activeMedia.some((item) => item.isFeatured);
    if (hasFeatured) {
      return roomTypesArray;
    }

    const primaryId = activeMedia[0].id;
    const updatedMedia = target.media.map((item) =>
      item.id === primaryId ? { ...item, isFeatured: true } : item
    );

    const updatedRoomTypes = [...roomTypesArray];
    updatedRoomTypes[roomTypeIndex] = {
      ...target,
      media: updatedMedia,
    };

    return updatedRoomTypes;
  };

  const handleRoomTypeExistingMediaRemove = (roomTypeIndex, mediaId) => {
    setFormData((prev) => {
      const updatedRoomTypes = prev.roomTypes.map((roomType, idx) => {
        if (idx !== roomTypeIndex) return roomType;
        const updatedMedia = (roomType.media || []).map((mediaItem) =>
          mediaItem.id === mediaId
            ? { ...mediaItem, isDeleted: true, isFeatured: false }
            : mediaItem
        );
        return { ...roomType, media: updatedMedia };
      });

      const normalisedRoomTypes = ensureRoomTypeMediaPrimary(updatedRoomTypes, roomTypeIndex);
      return { ...prev, roomTypes: normalisedRoomTypes };
    });
  };

  const handleRoomTypeExistingMediaSetPrimary = (roomTypeIndex, mediaId) => {
    setFormData((prev) => {
      const updatedRoomTypes = prev.roomTypes.map((roomType, idx) => {
        if (idx !== roomTypeIndex) return roomType;
        const updatedMedia = (roomType.media || []).map((mediaItem) => ({
          ...mediaItem,
          isFeatured: !mediaItem.isDeleted && mediaItem.id === mediaId,
        }));
        return { ...roomType, media: updatedMedia };
      });
      return { ...prev, roomTypes: updatedRoomTypes };
    });
  };

  const handleRemoveNewRoomTypeImage = (roomTypeIndex, fileIndex) => {
    setRoomTypeImages((prev) => {
      const existingFiles = prev[roomTypeIndex] || [];
      const updatedFiles = existingFiles.filter((_, idx) => idx !== fileIndex);
      return {
        ...prev,
        [roomTypeIndex]: updatedFiles,
      };
    });

    setRoomTypeImageErrors((prev) => {
      if (!prev[roomTypeIndex]) return prev;
      const updatedErrors = { ...prev };
      delete updatedErrors[roomTypeIndex];
      return updatedErrors;
    });
  };

  const getActiveExistingMedia = (mediaArray) =>
    mediaArray
      .map((mediaItem, idx) => ({ mediaItem, idx }))
      .filter(({ mediaItem }) => !mediaItem.isDeleted);

  const handleExistingPropertyMediaRemove = (mediaIndex) => {
    const currentCover = coverSelection;
    const currentNewFiles = mediaFiles;

    setExistingMedia((prev) => {
      const updated = prev.map((mediaItem, idx) =>
        idx === mediaIndex
          ? { ...mediaItem, isDeleted: true, isFeatured: false }
          : mediaItem
      );

      const remaining = getActiveExistingMedia(updated);

      if (remaining.length === 0) {
        if (currentNewFiles.length > 0) {
          setCoverSelection({ type: 'new', index: 0 });
        } else {
          setCoverSelection(null);
        }
        return updated;
      }

      const shouldAssignNewCover =
        (currentCover?.type === 'existing' && currentCover.index === mediaIndex) ||
        !remaining.some(({ mediaItem }) => mediaItem.isFeatured);

      if (shouldAssignNewCover) {
        const nextCoverIdx = remaining[0].idx;
        setCoverSelection({ type: 'existing', index: nextCoverIdx });
        return updated.map((mediaItem, idx) => ({
          ...mediaItem,
          isFeatured: !mediaItem.isDeleted && idx === nextCoverIdx,
        }));
      }

      return updated;
    });
  };

  const handleExistingPropertyMediaSetCover = (mediaIndex) => {
    setCoverSelection({ type: 'existing', index: mediaIndex });
    setExistingMedia((prev) =>
      prev.map((mediaItem, idx) => ({
        ...mediaItem,
        isFeatured: !mediaItem.isDeleted && idx === mediaIndex,
      }))
    );
  };

  const handleRemoveNewPropertyImage = (fileIndex) => {
    const currentNewFiles = mediaFiles;
    setMediaFiles((prev) => prev.filter((_, idx) => idx !== fileIndex));

    const remainingCount = currentNewFiles.length - 1;

    if (coverSelection?.type === 'new') {
      if (coverSelection.index === fileIndex) {
        if (remainingCount > 0) {
          const nextIndex = fileIndex >= remainingCount ? remainingCount - 1 : fileIndex;
          setCoverSelection({ type: 'new', index: nextIndex });
        } else {
          const fallbackExisting = existingMedia.findIndex(
            (mediaItem) => !mediaItem.isDeleted
          );
          if (fallbackExisting >= 0) {
            setCoverSelection({ type: 'existing', index: fallbackExisting });
            setExistingMedia((prev) =>
              prev.map((mediaItem, idx) => ({
                ...mediaItem,
                isFeatured: !mediaItem.isDeleted && idx === fallbackExisting,
              }))
            );
          } else {
            setCoverSelection(null);
          }
        }
      } else if (coverSelection.index > fileIndex) {
        setCoverSelection({ type: 'new', index: coverSelection.index - 1 });
      }
    }
  };

  // Handle room type amenity selection
  const handleRoomTypeAmenityToggle = (roomTypeIndex, amenity) => {
    setFormData(prev => {
      const updatedRoomTypes = prev.roomTypes.map((rt, i) => {
        if (i === roomTypeIndex) {
          const isSelected = rt.amenityIds.some(item => item.id === amenity.id);
          return {
            ...rt,
            amenityIds: isSelected
              ? rt.amenityIds.filter(item => item.id !== amenity.id)
              : [...rt.amenityIds, amenity]
          };
        }
        return rt;
      });
      
      return {
        ...prev,
        roomTypes: updatedRoomTypes
      };
    });
  };

  // Add new items with API calls
  const handleAddAmenity = async (data) => {
    // Clear all errors when adding new item
    clearAllErrors();
    
    try {
      await propertyService.createAmenity(data);
      setSuccessDialog({ isOpen: true, message: "Amenity added successfully" });
      
      // Refresh amenities list
      const response = await propertyService.getCreationFormData();
      const formData = response.data.data;
      setAmenities(formData.amenities || []);
    } catch (error) {
      console.error("Error adding amenity:", error);
      const message = error?.response?.data?.message || "Failed to add amenity. Please try again.";
      setErrorDialog({ isOpen: true, message });
    }
  };

  const handleAddFacility = async (data) => {
    clearAllErrors();
    
    try {
      await propertyService.createFacility(data);
      setSuccessDialog({ isOpen: true, message: "Facility added successfully" });
      
      // Refresh facilities list
      const response = await propertyService.getCreationFormData();
      const formData = response.data.data;
      setFacilities(formData.facilities || []);
    } catch (error) {
      console.error("Error adding facility:", error);
      const message = error?.response?.data?.message || "Failed to add facility. Please try again.";
      setErrorDialog({ isOpen: true, message });
    }
  };

  const handleAddSafety = async (data) => {
    clearAllErrors();
    
    try {
      await propertyService.createSafety(data);
      setSuccessDialog({ isOpen: true, message: "Safety feature added successfully" });
      
      // Refresh safety list
      const response = await propertyService.getCreationFormData();
      const formData = response.data.data;
      setSafetyHygiene(formData.safetyHygiene || []);
    } catch (error) {
      console.error("Error adding safety feature:", error);
      const message = error?.response?.data?.message || "Failed to add safety feature. Please try again.";
      setErrorDialog({ isOpen: true, message });
    }
  };

  const handleAddPropertyType = async (data) => {
    clearAllErrors();
    
    try {
      await propertyService.createPropertyType(data);
      setSuccessDialog({ isOpen: true, message: "Property type added successfully" });
      
      // Refresh property types list
      const response = await propertyService.getCreationFormData();
      const formData = response.data.data;
      setPropertyTypes(formData.propertyTypes || []);
    } catch (error) {
      console.error("Error adding property type:", error);
      const message = error?.response?.data?.message || "Failed to add property type. Please try again.";
      setErrorDialog({ isOpen: true, message });
    }
  };

  const handleAddRoomType = async (data) => {
    clearAllErrors();
    
    try {
      await propertyService.createRoomType(data);
      setSuccessDialog({ isOpen: true, message: "Room type added successfully" });
      
      // Refresh room types list
      const response = await propertyService.getCreationFormData();
      const formData = response.data.data;
      setRoomTypes(formData.roomTypes || []);
    } catch (error) {
      console.error("Error adding room type:", error);
      const message = error?.response?.data?.message || "Failed to add room type. Please try again.";
      setErrorDialog({ isOpen: true, message });
    }
  };


  // Auto-focus to first error field
  const focusFirstError = (errorKeys) => {
    const focusOrder = [
      'title', 'ownerHostId', 'propertyTypeId', 'street', 'city', 'state', 'zipCode', 'media', 'roomTypes'
    ];
    
    for (const field of focusOrder) {
      if (errorKeys.includes(field)) {
        const refMap = {
          'title': titleRef,
          'ownerHostId': ownerHostIdRef,
          'propertyTypeId': propertyTypeRef,
          'street': streetRef,
          'city': cityRef,
          'state': stateRef,
          'zipCode': zipCodeRef,
          'media': mediaRef
        };
        
        if (refMap[field]?.current) {
          refMap[field].current.focus();
          break;
        }
      }
    }
  };

  // Client-side validation
  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) newErrors.title = "Title is required";
    if (!formData.ownerHostId.trim()) newErrors.ownerHostId = "Owner Host ID is required";
    if (!formData.propertyTypeId) newErrors.propertyTypeId = "Property type is required";
    if (!formData.location.address.street.trim()) newErrors.street = "Street is required";
    if (!formData.location.address.city.trim()) newErrors.city = "City is required";
    if (!formData.location.address.state.trim()) newErrors.state = "State is required";
    if (!formData.location.address.zipCode.trim()) newErrors.zipCode = "ZIP code is required";
    const activeExistingMediaCount = existingMedia.filter((item) => !item.isDeleted).length;
    if ((!isEdit && mediaFiles.length === 0) || (isEdit && activeExistingMediaCount === 0 && mediaFiles.length === 0)) {
      newErrors.media = "At least one image is required";
    }
    if (!isEdit && formData.roomTypes.length === 0) newErrors.roomTypes = "At least one room type is required";

    // Validate room types
    formData.roomTypes.forEach((rt, index) => {
      if (!rt.roomTypeId) newErrors[`roomType_${index}`] = "Room type is required";
      
      // Validate minOccupancy
      if (rt.minOccupancy < 1 || rt.minOccupancy > 10) {
        newErrors[`minOccupancy_${index}`] = "Min occupancy must be between 1 and 10";
      }
      
      // Validate maxOccupancy (Occupancy)
      if (rt.Occupancy < 1 || rt.Occupancy > 10) {
        newErrors[`occupancy_${index}`] = "Max occupancy must be between 1 and 10";
      }
      
      // Validate that minOccupancy <= maxOccupancy
      if (rt.minOccupancy && rt.Occupancy && rt.minOccupancy > rt.Occupancy) {
        newErrors[`minOccupancy_${index}`] = "Min occupancy cannot be greater than max occupancy";
      }
      
      if (rt.extraBedCapacity < 0 || rt.extraBedCapacity > 5) {
        newErrors[`extraBed_${index}`] = "Extra bed capacity must be between 0 and 5";
      }
      if (rt.numberOfBeds < 1 || rt.numberOfBeds > 10) {
        newErrors[`numberOfBeds_${index}`] = "Number of beds must be between 1 and 10";
      }
    });

    setErrors(newErrors);
    
    // Auto-focus to first error
    if (Object.keys(newErrors).length > 0) {
      setTimeout(() => focusFirstError(Object.keys(newErrors)), 100);
    }
    
    return Object.keys(newErrors).length === 0;
  };

  // Backend validation
  // Form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // First, do client-side validation
    if (!validateForm()) {
      setErrorDialog({ isOpen: true, message: "Please fix the errors before submitting" });
      return;
    }

    if (isEdit && !propertyId) {
      setErrorDialog({ isOpen: true, message: "Missing property identifier. Please reload the page." });
      return;
    }

    setIsSubmitting(true);
    try {
      const rulesArray = formData.rulesAndPolicies
        ? formData.rulesAndPolicies
            .split(/\r?\n|,/)
            .map((rule) => rule.trim())
            .filter(Boolean)
        : [];

      const rulesString = rulesArray.join('\n');

      const normalisedRoomTypesForSubmit = formData.roomTypes.map((rt) => ({
        id: rt.id || '',
        roomTypeId: rt.roomTypeId,
        minOccupancy: rt.minOccupancy,
        Occupancy: rt.Occupancy,
        extraBedCapacity: rt.extraBedCapacity,
        numberOfBeds: rt.numberOfBeds,
        bedType: rt.bedType,
        amenityIds: (rt.amenityIds || [])
          .map((item) => {
            if (!item) return null;
            if (typeof item === 'string') return item;
            if (typeof item === 'object') return item.id || item.value || item.amenityId || null;
            return null;
          })
          .filter((id) => typeof id === 'string' && id.trim().length > 0),
        existingMedia: (() => {
          let orderCounter = 0;
          return (rt.media || [])
            .filter((mediaItem) => mediaItem && mediaItem.id)
            .map((mediaItem) => {
              const isDeleted = Boolean(mediaItem.isDeleted);
              const payload = {
                id: mediaItem.id,
                isDeleted,
                isFeatured: !isDeleted && Boolean(mediaItem.isFeatured),
              };
              if (!isDeleted) {
                payload.order = orderCounter;
                orderCounter += 1;
              }
              return payload;
            });
        })(),
      }));

      const submitData = {
        ...formData,
        rulesAndPolicies: rulesString,
        roomTypes: normalisedRoomTypesForSubmit,
      };

      const formDataToSend = new FormData();

      Object.keys(submitData).forEach((key) => {
        if (
          key !== 'mediaFiles' &&
          key !== 'amenityIds' &&
          key !== 'facilityIds' &&
          key !== 'safetyIds' &&
          key !== 'roomTypes'
        ) {
          if (typeof submitData[key] === 'object') {
            formDataToSend.append(key, JSON.stringify(submitData[key]));
          } else {
            formDataToSend.append(key, submitData[key]);
          }
        }
      });

      submitData.amenityIds.forEach((item) => formDataToSend.append('amenityIds', item.id));
      submitData.facilityIds.forEach((item) => formDataToSend.append('facilityIds', item.id));
      submitData.safetyIds.forEach((item) => formDataToSend.append('safetyIds', item.id));

      formDataToSend.append('roomtypes', JSON.stringify(submitData.roomTypes));

      mediaFiles.forEach((file) => {
        formDataToSend.append('media', file);
      });

      // Append city icon if selected
      if (cityIconFile) {
        formDataToSend.append('cityIcon', cityIconFile);
      }

      Object.keys(roomTypeImages).forEach((roomTypeIndex) => {
        const images = roomTypeImages[roomTypeIndex];
        if (images && images.length > 0) {
          images.forEach((file) => {
            formDataToSend.append(`roomTypeImages_${roomTypeIndex}`, file);
          });
        }
      });

      if (isEdit) {
        const activeExistingMedia = existingMedia
          .map((mediaItem, idx) => ({ mediaItem, idx }))
          .filter(({ mediaItem }) => !mediaItem.isDeleted);

        activeExistingMedia.forEach(({ mediaItem, idx }, orderIdx) => {
          const payload = {
            url: mediaItem.url,
            type: mediaItem.type || 'image',
            isFeatured:
              coverSelection?.type === 'existing'
                ? coverSelection.index === idx
                : Boolean(mediaItem.isFeatured),
            order: orderIdx,
          };
          formDataToSend.append('existingMedia', JSON.stringify(payload));
        });

        const existingCount = activeExistingMedia.length;
        let coverIndex = 0;

        if (coverSelection) {
          if (coverSelection.type === 'existing') {
            const coverActiveIdx = activeExistingMedia.findIndex(
              ({ idx }) => idx === coverSelection.index
            );
            if (coverActiveIdx >= 0) {
              coverIndex = coverActiveIdx;
            } else if (existingCount > 0) {
              const featuredIdx = activeExistingMedia.findIndex(({ mediaItem }) => mediaItem.isFeatured);
              coverIndex = featuredIdx >= 0 ? featuredIdx : 0;
            } else if (mediaFiles.length > 0) {
              coverIndex = 0;
            }
          } else if (coverSelection.type === 'new') {
            const normalisedNewIndex =
              mediaFiles.length > 0
                ? Math.min(Math.max(coverSelection.index, 0), mediaFiles.length - 1)
                : 0;
            coverIndex = existingCount + normalisedNewIndex;
          }
        } else if (existingCount > 0) {
          const featuredIdx = activeExistingMedia.findIndex(({ mediaItem }) => mediaItem.isFeatured);
          coverIndex = featuredIdx >= 0 ? featuredIdx : 0;
        } else if (mediaFiles.length > 0) {
          coverIndex = 0;
        }

        formDataToSend.append('coverImageIndex', String(Math.max(0, coverIndex)));

        submitData.roomTypes.forEach((roomType) => {
          if (roomType.roomTypeId) {
            formDataToSend.append('roomTypeIds', roomType.roomTypeId);
          }
        });
      }

      if (isEdit) {
        await propertyService.updatePropertyDetails(propertyId, formDataToSend);
        setSuccessDialog({ isOpen: true, message: "Property updated successfully" });
      } else {
        await propertyService.createProperty(formDataToSend);
        setSuccessDialog({ isOpen: true, message: "Property created successfully" });
      }

      setTimeout(() => {
        // Navigate to admin properties page after successful creation/update
        navigate('/admin/base/properties');
      }, 2000);

    } catch (error) {
      console.error("Error saving property:", error);

      if (error.response?.data?.message?.includes('Property_ownerHostId_isDeleted_key')) {
        setErrorDialog({
          isOpen: true,
          message: 'This host already has a property. Each host can only have one property.',
        });
      } else {
        setErrorDialog({
          isOpen: true,
          message: isEdit ? "Failed to update property" : "Failed to create property",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormSubmit = isEdit
    ? (e) => {
        e.preventDefault();
      }
    : handleSubmit;

  if (isEdit && initialLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8 text-center text-gray-500">
            {initialLoadError || 'Loading property details...'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200 px-6 py-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Home className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  {isEdit ? 'Edit Property' : 'Add New Property'}
                </h1>
                <p className="text-xs text-gray-500">
                  {isEdit
                    ? 'Update property information, media, and configurations'
                    : 'Create a new property with all required details'}
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {/* Basic Information */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="border-b border-gray-200 px-6 py-3">
              <h2 className="text-sm font-semibold text-gray-900 flex items-center">
                <Home className="h-4 w-4 mr-2 text-blue-600" />
                Basic Information
              </h2>
            </div>
            <div className="p-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Property Title *
                </label>
                <input
                  ref={titleRef}
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Property Type *
                </label>
                <div className="flex gap-2">
                  <select
                    ref={propertyTypeRef}
                    name="propertyTypeId"
                    value={formData.propertyTypeId}
                    onChange={handleInputChange}
                    className="flex-1 px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Property Type</option>
                    {propertyTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowAddPropertyType(true)}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
                    title="Add New Property Type"
                  >
                    <Plus size={14} />
                  </button>
                </div>
                {errors.propertyTypeId && <p className="text-red-500 text-xs mt-1">{errors.propertyTypeId}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Owner Host ID (Email) *
                </label>
                <input
                  ref={ownerHostIdRef}
                  type="email"
                  name="ownerHostId"
                  value={formData.ownerHostId}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                {errors.ownerHostId && <p className="text-red-500 text-xs mt-1">{errors.ownerHostId}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                className="block w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="mt-4">
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Rules and Policies (comma-separated)
              </label>
              <textarea
                name="rulesAndPolicies"
                value={formData.rulesAndPolicies}
                onChange={handleInputChange}
                rows={2}
                className="block w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="No smoking, No pets, Check-in after 2 PM..."
              />
            </div>
            </div>
          </div>

        {/* Policies */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="border-b border-gray-200 px-6 py-3">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center">
              <User className="h-4 w-4 mr-2 text-blue-600" />
              Cancellation Policy
            </h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Select a policy *
              </label>
              <select
                name="cancellationPolicyId"
                value={formData.cancellationPolicyId}
                onChange={handleInputChange}
                className="block w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select Cancellation Policy</option>
                {cancellationPolicies.map((policy) => (
                  <option key={policy.id} value={policy.id}>
                    {policy.name}
                  </option>
                ))}
              </select>
              {errors.cancellationPolicyId && (
                <p className="text-red-500 text-xs mt-1">{errors.cancellationPolicyId}</p>
              )}
            </div>

            <div className="border border-gray-100 rounded-lg bg-gray-50 p-4">
              {selectedCancellationPolicy ? (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {selectedCancellationPolicy.name}
                      </p>
                      {selectedCancellationPolicy.description && (
                        <p className="text-xs text-gray-500 mt-1">
                          {selectedCancellationPolicy.description}
                        </p>
                      )}
                    </div>
                    {selectedCancellationPolicy.isDefault && (
                      <span className="px-2 py-1 text-[10px] font-semibold text-green-700 bg-green-100 rounded-full uppercase tracking-wide">
                        Default
                      </span>
                    )}
                  </div>

                  {selectedCancellationPolicy.rules && selectedCancellationPolicy.rules.length > 0 ? (
                    <div className="space-y-2">
                      {selectedCancellationPolicy.rules
                        .slice()
                        .sort((a, b) => a.sortOrder - b.sortOrder)
                        .map((rule) => (
                          <div
                            key={`${rule.daysBefore}-${rule.sortOrder}`}
                            className="flex items-center justify-between bg-white rounded-md border border-gray-100 px-3 py-2"
                          >
                            <div className="text-xs text-gray-600">
                              {rule.daysBefore === 0
                                ? "On check-in day"
                                : `${rule.daysBefore} day${rule.daysBefore > 1 ? "s" : ""} before`}
                            </div>
                            <div className="text-xs font-semibold text-gray-900">
                              {rule.refundPercentage}% refund
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500">
                      No specific rules defined for this policy.
                    </p>
                  )}
                </>
              ) : (
                <div className="text-xs text-gray-500">
                  Select a cancellation policy to preview its refund rules.
                </div>
              )}
            </div>
            </div>
            {isEdit && (
              <div className="mt-6 flex justify-end pr-5 pb-3">
                <button
                  type="button"
                  onClick={handleSaveBasics}
                  disabled={sectionSaving.basics}
                  className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 disabled:opacity-60"
                >
                  {sectionSaving.basics ? "Saving..." : "Update Basics"}
                </button>
              </div>
            )}
          </div>

          {/* Location */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="border-b border-gray-200 px-6 py-3">
              <h2 className="text-sm font-semibold text-gray-900 flex items-center">
                <MapPin className="h-4 w-4 mr-2 text-blue-600" />
                Location Information
              </h2>
            </div>
            <div className="p-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Street *
                </label>
                <input
                  ref={streetRef}
                  type="text"
                  name="location.address.street"
                  value={formData.location.address.street}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                {errors.street && <p className="text-red-500 text-xs mt-1">{errors.street}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                District *
                </label>
                <input
                  ref={cityRef}
                  type="text"
                  name="location.address.city"
                  value={formData.location.address.city}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  State *
                </label>
                <input
                  ref={stateRef}
                  type="text"
                  name="location.address.state"
                  value={formData.location.address.state}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                {errors.state && <p className="text-red-500 text-xs mt-1">{errors.state}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  ZIP Code *
                </label>
                <input
                  ref={zipCodeRef}
                  type="text"
                  name="location.address.zipCode"
                  value={formData.location.address.zipCode}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                {errors.zipCode && <p className="text-red-500 text-xs mt-1">{errors.zipCode}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Country
                </label>
                <input
                  type="text"
                  name="location.address.country"
                  value={formData.location.address.country}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                  readOnly
                />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Latitude
                </label>
                <input
                  type="number"
                  step="any"
                  name="location.coordinates.latitude"
                  value={formData.location.coordinates.latitude || ""}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Longitude
                </label>
                <input
                  type="number"
                  step="any"
                  name="location.coordinates.longitude"
                  value={formData.location.coordinates.longitude || ""}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* City Icon Upload */}
            <div className="mt-4">
              <label className="block text-xs font-medium text-gray-700 mb-2">
                City Icon (SVG) {isEdit && '(Only one icon allowed)'}
              </label>
              {cityIconPreview && (
                <div className="mb-3 relative inline-block">
                  <div className="max-h-24 max-w-24 border border-gray-300 rounded-md p-2 bg-gray-50 flex items-center justify-center">
                    <img
                      src={cityIconPreview}
                      alt="City icon preview"
                      className="max-h-20 max-w-20 object-contain"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      // Revoke object URL if it's a blob URL (new file)
                      if (cityIconPreview && cityIconPreview.startsWith('blob:')) {
                        URL.revokeObjectURL(cityIconPreview);
                      }
                      setCityIconFile(null);
                      setCityIconPreview(null);
                      setCityIconError("");
                    }}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                    title="Remove city icon"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
              {!cityIconPreview && (
                <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-3 pb-4">
                    <Upload className="w-6 h-6 mb-1 text-gray-500" />
                    <p className="mb-1 text-xs text-gray-500">
                      <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-[10px] text-gray-500">SVG file only (MAX. 2MB)</p>
                  </div>
                  <input
                    type="file"
                    accept=".svg,image/svg+xml"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        // Validate SVG file
                        if (file.type !== 'image/svg+xml' && !file.name.endsWith('.svg')) {
                          setCityIconError('Please select an SVG file for the city icon');
                          setCityIconFile(null);
                          setCityIconPreview(null);
                          return;
                        }
                        // Validate file size (2MB)
                        if (file.size > 2 * 1024 * 1024) {
                          setCityIconError('File size must be less than 2MB');
                          setCityIconFile(null);
                          setCityIconPreview(null);
                          return;
                        }
                        // Revoke previous blob URL if exists
                        if (cityIconPreview && cityIconPreview.startsWith('blob:')) {
                          URL.revokeObjectURL(cityIconPreview);
                        }
                        setCityIconError("");
                        setCityIconFile(file);
                        const previewUrl = URL.createObjectURL(file);
                        setCityIconPreview(previewUrl);
                      }
                    }}
                    className="hidden"
                    disabled={isSubmitting}
                  />
                </label>
              )}
              {cityIconPreview && (
                <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-2 pb-2">
                    <Upload className="w-5 h-5 mb-1 text-gray-500" />
                    <p className="text-xs text-gray-500">
                      <span className="font-semibold">Replace icon</span>
                    </p>
                  </div>
                  <input
                    type="file"
                    accept=".svg,image/svg+xml"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        // Validate SVG file
                        if (file.type !== 'image/svg+xml' && !file.name.endsWith('.svg')) {
                          setCityIconError('Please select an SVG file for the city icon');
                          return;
                        }
                        // Validate file size (2MB)
                        if (file.size > 2 * 1024 * 1024) {
                          setCityIconError('File size must be less than 2MB');
                          return;
                        }
                        // Revoke previous blob URL if exists
                        if (cityIconPreview && cityIconPreview.startsWith('blob:')) {
                          URL.revokeObjectURL(cityIconPreview);
                        }
                        setCityIconError("");
                        setCityIconFile(file);
                        const previewUrl = URL.createObjectURL(file);
                        setCityIconPreview(previewUrl);
                      }
                      // Reset input value to allow selecting the same file again
                      e.target.value = '';
                    }}
                    className="hidden"
                    disabled={isSubmitting}
                  />
                </label>
              )}
              {cityIconError && (
                <p className="text-red-500 text-xs mt-1">{cityIconError}</p>
              )}
            </div>
            {isEdit && (
              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveLocation}
                  disabled={sectionSaving.location}
                  className="inline-flex items-center px-4 py-2 text-xs font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 disabled:opacity-60"
                >
                  {sectionSaving.location ? "Saving..." : "Update Location"}
                </button>
              </div>
            )}
            </div>
          </div>

          {/* Features */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="border-b border-gray-200 px-6 py-3">
              <h2 className="text-sm font-semibold text-gray-900">Property Features</h2>
            </div>
            <div className="p-6">
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <MultiSelect
                options={amenities}
                selected={formData.amenityIds}
                onChange={(selected) => setFormData(prev => ({ ...prev, amenityIds: selected }))}
                placeholder="Select amenities"
                onAddNew={() => setShowAddAmenity(true)}
                label="Amenities"
              />

              <MultiSelect
                options={facilities}
                selected={formData.facilityIds}
                onChange={(selected) => setFormData(prev => ({ ...prev, facilityIds: selected }))}
                placeholder="Select facilities"
                onAddNew={() => setShowAddFacility(true)}
                label="Facilities"
              />

              <MultiSelect
                options={safetyHygiene}
                selected={formData.safetyIds}
                onChange={(selected) => setFormData(prev => ({ ...prev, safetyIds: selected }))}
                placeholder="Select safety features"
                onAddNew={() => setShowAddSafety(true)}
                label="Safety & Hygiene"
              />
            </div>
            {isEdit && (
              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveFeatures}
                  disabled={sectionSaving.features}
                  className="inline-flex items-center px-4 py-2 text-xs font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 disabled:opacity-60"
                >
                  {sectionSaving.features ? "Saving..." : "Update Features"}
                </button>
              </div>
            )}
            </div>
          </div>

          {/* Room Types */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="border-b border-gray-200 px-6 py-3">
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-semibold text-gray-900">Room Types</h2>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddRoomType(true)}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-lg shadow-sm text-white bg-green-600 hover:bg-green-700"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Create Room Type
                  </button>
                  <button
                    type="button"
                    onClick={addRoomType}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Room Type
                  </button>
                </div>
              </div>
            </div>
            <div className="p-6">

            {formData.roomTypes.length === 0 ? (
              <p className="text-gray-500 text-xs">No room types added yet. Click "Add Room Type" to get started.</p>
            ) : (
              <div className="space-y-4">
                {formData.roomTypes.map((roomType, index) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-sm font-medium text-gray-800">Room Type {index + 1}</h4>
                      <button
                        type="button"
                        onClick={() => handleRequestRemoveRoomType(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                      <div className="lg:col-span-4">
                        <label className="block text-xs font-medium text-gray-700 mb-2">
                          Room Type *
                        </label>
                        <select
                          value={roomType.roomTypeId}
                          onChange={(e) => updateRoomType(index, 'roomTypeId', e.target.value)}
                          className="block w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        >
                          <option value="">Select Room Type</option>
                          {roomTypes.map((type) => (
                            <option key={type.id} value={type.id}>
                              {type.name}
                            </option>
                          ))}
                        </select>
                        {errors[`roomType_${index}`] && (
                          <p className="text-red-500 text-xs mt-1">{errors[`roomType_${index}`]}</p>
                        )}
                      </div>

                      <div className="lg:col-span-4">
                        <label className="block text-xs font-medium text-gray-700 mb-2">
                          Min Occupancy (1-10) *
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={roomType.minOccupancy}
                          onChange={(e) => updateRoomType(index, 'minOccupancy', parseInt(e.target.value))}
                          className="block w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                        {errors[`minOccupancy_${index}`] && (
                          <p className="text-red-500 text-xs mt-1">{errors[`minOccupancy_${index}`]}</p>
                        )}
                      </div>

                      <div className="lg:col-span-4">
                        <label className="block text-xs font-medium text-gray-700 mb-2">
                         Occupancy (1-10) *
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={roomType.Occupancy}
                          onChange={(e) => updateRoomType(index, 'Occupancy', parseInt(e.target.value))}
                          className="block w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                        {errors[`occupancy_${index}`] && (
                          <p className="text-red-500 text-xs mt-1">{errors[`occupancy_${index}`]}</p>
                        )}
                      </div>
                      </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                      <div className="lg:col-span-4">
                        <label className="block text-xs font-medium text-gray-700 mb-2">
                          Extra Bed Capacity (0-5)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="5"
                          value={roomType.extraBedCapacity}
                          onChange={(e) => updateRoomType(index, 'extraBedCapacity', parseInt(e.target.value))}
                          className="block w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {errors[`extraBed_${index}`] && (
                          <p className="text-red-500 text-xs mt-1">{errors[`extraBed_${index}`]}</p>
                        )}
                      </div>

                      <div className="lg:col-span-4">
                        <label className="block text-xs font-medium text-gray-700 mb-2">
                          Number of Beds (1-10) *
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={roomType.numberOfBeds ?? 1}
                          onChange={(e) => updateRoomType(index, 'numberOfBeds', parseInt(e.target.value, 10) || 1)}
                          className="block w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                        {errors[`numberOfBeds_${index}`] && (
                          <p className="text-red-500 text-xs mt-1">
                            {errors[`numberOfBeds_${index}`]}
                          </p>
                        )}
                      </div>

                      <div className="lg:col-span-4">
                        <label className="block text-xs font-medium text-gray-700 mb-2">
                          Bed Type
                        </label>
                        <select
                          value={roomType.bedType || 'DOUBLE'}
                          onChange={(e) => updateRoomType(index, 'bedType', e.target.value)}
                          className="block w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="SINGLE">Single</option>
                          <option value="DOUBLE">Double</option>
                          <option value="QUEEN">Queen</option>
                          <option value="KING">King</option>
                          <option value="TWIN">Twin</option>
                          <option value="FULL">Full</option>
                          <option value="SOFA_BED">Sofa Bed</option>
                          <option value="BUNK_BED">Bunk Bed</option>
                          <option value="MURPHY_BED">Murphy Bed</option>
                          <option value="WATER_BED">Water Bed</option>
                          <option value="AIR_BED">Air Bed</option>
                          <option value="CUSTOM">Custom</option>
                        </select>
                        {errors[`bedType_${index}`] && (
                          <p className="text-red-500 text-xs mt-1">{errors[`bedType_${index}`]}</p>
                        )}
                      </div>
                    </div>

                    {/* Amenities Section */}
                    <div className="mt-4">
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-xs font-medium text-gray-700">
                          Amenities
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowAddAmenity(true)}
                          className="text-blue-600 hover:text-blue-800 text-xs"
                        >
                          + Add New Amenity
                        </button>
                      </div>
                      <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-lg p-2">
                        {amenities.map((amenity) => {
                          const isSelected = roomType.amenityIds?.some(item => item.id === amenity.id) || false;
                          return (
                            <div
                              key={amenity.id}
                              className="flex items-center gap-2 p-1 hover:bg-gray-50 cursor-pointer"
                              onClick={() => handleRoomTypeAmenityToggle(index, amenity)}
                            >
                              <input type="checkbox" checked={isSelected} readOnly />
                              <span className="text-xs">{amenity.name}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Room Type Images Section */}
                    <div className="mt-4">
                      <label className="block text-xs font-medium text-gray-700 mb-2">
                        Room Type Images (16:9 aspect ratio, max 2MB each, up to 12 images)
                      </label>

                      {isEdit && roomType.media && roomType.media.some((item) => !item.isDeleted) && (
                        <div className="mb-3">
                          <h5 className="text-xs font-semibold text-gray-600 mb-2">
                            Existing Images
                          </h5>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {roomType.media
                              .filter((mediaItem) => !mediaItem.isDeleted)
                              .map((mediaItem, mediaIdx) => (
                                <div
                                  key={mediaItem.id || `${roomType.id}-${mediaIdx}`}
                                  className="relative border border-gray-200 rounded-lg overflow-hidden"
                                >
                                  <img
                                    src={mediaService.getMedia(mediaItem.url)}
                                    alt={`Room type ${index + 1} image ${mediaIdx + 1}`}
                                    className="w-full h-20 object-cover bg-gray-100"
                                  />
                                  <div className="absolute inset-0 flex flex-col justify-between p-1">
                                    <div className="flex justify-between items-start">
                                      {mediaItem.isFeatured && (
                                        <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-blue-600 text-white rounded">
                                          Primary
                                        </span>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => handleRoomTypeExistingMediaRemove(index, mediaItem.id)}
                                        className="px-1.5 py-0.5 text-[10px] font-semibold bg-red-500 text-white rounded hover:bg-red-600"
                                      >
                                        Remove
                                      </button>
                                    </div>
                                    {!mediaItem.isFeatured && (
                                      <button
                                        type="button"
                                        onClick={() => handleRoomTypeExistingMediaSetPrimary(index, mediaItem.id)}
                                        className="self-center px-2 py-0.5 text-[10px] font-semibold bg-white/80 text-gray-700 rounded hover:bg-white"
                                      >
                                        Set Primary
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(e) => handleRoomTypeImageChange(index, e)}
                        className="block w-full text-xs text-gray-500
                          file:mr-4 file:py-2 file:px-4
                          file:rounded-lg file:border-0
                          file:text-xs file:font-semibold
                          file:bg-blue-50 file:text-blue-700
                          hover:file:bg-blue-100"
                      />
                      
                      {roomTypeImageErrors[index] && roomTypeImageErrors[index].length > 0 && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                          <ul className="text-red-600 text-xs">
                            {roomTypeImageErrors[index].map((error, errorIndex) => (
                              <li key={errorIndex}>{error}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {roomTypeImages[index] && roomTypeImages[index].length > 0 && (
                        <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2">
                          {roomTypeImages[index].map((file, fileIndex) => (
                            <div key={fileIndex} className="relative">
                              <img
                                src={URL.createObjectURL(file)}
                                alt={`Room Type ${index + 1} Preview ${fileIndex + 1}`}
                                className="w-full h-20 object-cover rounded-lg border border-gray-200"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveNewRoomTypeImage(index, fileIndex)}
                                className="absolute top-1 right-1 px-1.5 py-0.5 text-[10px] font-semibold bg-red-500 text-white rounded hover:bg-red-600"
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {errors.roomTypes && <p className="text-red-500 text-xs mt-1">{errors.roomTypes}</p>}
            {isEdit && (
              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveRoomTypes}
                  disabled={sectionSaving.roomTypes}
                  className="inline-flex items-center px-4 py-2 text-xs font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 disabled:opacity-60"
                >
                  {sectionSaving.roomTypes ? "Saving..." : "Update Room Types"}
                </button>
              </div>
            )}
            </div>
          </div>

          {/* Media Upload */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="border-b border-gray-200 px-6 py-3">
              <h2 className="text-sm font-semibold text-gray-900 flex items-center">
                <Camera className="h-4 w-4 mr-2 text-blue-600" />
                Property Images (16:9 aspect ratio, max 2MB each, up to 12 images)
              </h2>
            </div>
            <div className="p-6">
            
            {isEdit && existingMedia.some((mediaItem) => !mediaItem.isDeleted) && (
              <div className="mb-4">
                <h3 className="text-xs font-semibold text-gray-700 mb-2">Existing Images</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {existingMedia.map((mediaItem, index) => {
                    if (mediaItem.isDeleted) {
                      return null;
                    }
                    const isCover =
                      coverSelection?.type === 'existing'
                        ? coverSelection.index === index
                        : mediaItem.isFeatured;
                    return (
        <div
          key={mediaItem.id || mediaItem.url || index}
          className="relative border border-gray-200 rounded-lg overflow-hidden"
        >
          <img
            src={mediaService.getMedia(mediaItem.url)}
            alt={`Existing media ${index + 1}`}
            className="w-full h-32 object-cover bg-gray-100"
          />
                        <div className="absolute inset-0 flex flex-col justify-between p-2">
                          <div className="flex justify-between items-start">
                            {isCover && (
                              <span className="px-2 py-1 text-[10px] font-semibold bg-blue-600 text-white rounded-full uppercase tracking-wide">
                                Cover
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleExistingPropertyMediaRemove(index)}
                              className="px-1.5 py-0.5 text-[10px] font-semibold bg-red-500 text-white rounded hover:bg-red-600"
                            >
                              Remove
                            </button>
                          </div>
                          {!isCover && (
                            <button
                              type="button"
                              onClick={() => handleExistingPropertyMediaSetCover(index)}
                              className="self-center px-2 py-0.5 text-[10px] font-semibold bg-white/80 text-gray-700 rounded hover:bg-white"
                            >
                              Set Cover
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mb-4">
              <input
                ref={mediaRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleMediaChange}
                className="block w-full text-xs text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-lg file:border-0
                  file:text-xs file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100"
              />
            </div>

            {mediaFiles.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {mediaFiles.map((file, index) => (
                  <div key={index} className="relative">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg border border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveNewPropertyImage(index)}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      aria-label="Remove image"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {errors.media && <p className="text-red-500 text-xs mt-1">{errors.media}</p>}
            {isEdit && (
              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveMedia}
                  disabled={sectionSaving.media}
                  className="inline-flex items-center px-4 py-2 text-xs font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 disabled:opacity-60"
                >
                  {sectionSaving.media ? "Saving..." : "Update Media"}
                </button>
              </div>
            )}
            </div>
          </div>

          {/* Submit Button */}
          {!isEdit && (
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 flex items-center"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {"Creating Property..."}
                  </>
                ) : (
                  "Create Property"
                )}
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Room type delete confirmation */}
      {roomTypeDeleteState.isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-gray-900">
                  Remove room type?
                </h3>
                <p className="mt-2 text-sm text-gray-600">
                  Deleting this room type can impact existing and future bookings associated with it.
                  Please confirm that you want to proceed.
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCancelRemoveRoomType}
                disabled={roomTypeDeleteState.loading}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRemoveRoomType}
                disabled={roomTypeDeleteState.loading}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
              >
                {roomTypeDeleteState.loading ? "Removing..." : "Delete room type"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <AddItemModal
        isOpen={showAddAmenity}
        onClose={() => setShowAddAmenity(false)}
        onAdd={handleAddAmenity}
        title="Amenity"
        needsIcon={true}
      />

      <AddItemModal
        isOpen={showAddFacility}
        onClose={() => setShowAddFacility(false)}
        onAdd={handleAddFacility}
        title="Facility"
        needsIcon={true}
      />

      <AddItemModal
        isOpen={showAddSafety}
        onClose={() => setShowAddSafety(false)}
        onAdd={handleAddSafety}
        title="Safety Feature"
        needsIcon={true}
      />

      <AddItemModal
        isOpen={showAddPropertyType}
        onClose={() => setShowAddPropertyType(false)}
        onAdd={handleAddPropertyType}
        title="Property Type"
        needsIcon={false}
      />

      <AddRoomTypeModal
        isOpen={showAddRoomType}
        onClose={() => setShowAddRoomType(false)}
        onAdd={handleAddRoomType}
      />

      {/* Error Dialog */}
      <ErrorDialog
        isOpen={errorDialog.isOpen}
        message={errorDialog.message}
        onClose={() => setErrorDialog({ isOpen: false, message: '' })}
      />

      {/* Success Dialog */}
      <SuccessDialog
        isOpen={successDialog.isOpen}
        message={successDialog.message}
        onClose={() => setSuccessDialog({ isOpen: false, message: '' })}
      />
    </div>
  );
};

const AddProperty = () => <PropertyForm mode="create" />;

export default AddProperty;
export { PropertyForm };