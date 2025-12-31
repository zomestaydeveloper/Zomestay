import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Plus, X, Trash2, Upload, MapPin, User, Home, Camera, AlertTriangle } from "lucide-react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { propertyService, cancellationPolicyService, propertyUpdationService, mediaService } from "../../services";
import ErrorDialog from "../../components/ErrorDialog";
// Import refactored components
import { SuccessDialog, AddItemModal, AddRoomTypeModal } from "../../components/shared/PropertyForm";
import { 
  BasicInformationSection, 
  CancellationPolicySection, 
  FeaturesSection,
  LocationSection,
  RoomTypesSection,
  MediaUploadSection,
  TaxConfigurationSection
} from "../../components/shared/PropertyForm/sections";

const PropertyForm = ({ mode = "create" }) => {
  const navigate = useNavigate();
  const params = useParams();
  const location = useLocation();
  const propertyId = mode === "edit" ? params?.propertyId || "" : "";
  const isEdit = mode === "edit";
  
  // Determine user role for role-based UI visibility
  const adminAuth = useSelector((state) => state.adminAuth);
  const hostAuth = useSelector((state) => state.hostAuth);
  const isAdmin = location.pathname.startsWith('/admin/base') || Boolean(adminAuth?.adminAccessToken);
  const isHost = location.pathname.startsWith('/host/base') || Boolean(hostAuth?.hostAccessToken);

  // Refs for auto-focus
  const mediaRef = useRef(null);
  
  // Title uniqueness check state (for future enhancement - backend validates on submit)
  const [titleCheckLoading, setTitleCheckLoading] = useState(false);
  const [titleUniquenessError, setTitleUniquenessError] = useState("");
  
  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    rulesAndPolicies: "",
    status: "active",
    ownerHostId: "",
    propertyTypeId: "",
    cancellationPolicyId: "",
    commissionPercentage: "",
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
    roomTypes: [],
    taxSlabs: [
      { min: 0, max: 999, rate: 0 },
      { min: 1000, max: 7499, rate: 5 },
      { min: 7500, max: null, rate: 18 }
    ],
    cessRate: ""
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
    tax: false,
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

        // Load existing city icon if available
        const existingCityIcon = property.location?.cityIcon;
        if (existingCityIcon) {
          const iconUrl = mediaService.getMedia(existingCityIcon);
          setCityIconPreview(iconUrl);
          setCityIconFile(null);
        } else {
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
          commissionPercentage: property.commissionPercentage ? String(property.commissionPercentage) : '',
          taxSlabs: property.taxSlabs && Array.isArray(property.taxSlabs) && property.taxSlabs.length > 0
            ? property.taxSlabs
            : prev.taxSlabs,
          cessRate: property.cessRate ? String(property.cessRate) : '',
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
    
    const locationData = { ...formData.location };
    
    if (!cityIconPreview && !cityIconFile) {
      locationData.cityIcon = null;
    }
    
    formDataToSend.append('location', JSON.stringify(locationData));
    
    if (cityIconFile) {
      formDataToSend.append('cityIcon', cityIconFile);
    }
    
    await runSectionSave(
      'location',
      async () => {
        const response = await propertyUpdationService.updateLocation(propertyId, formDataToSend);
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

  const handleSaveTax = async () => {
    // Validate tax slabs before saving
    const taxErrors = {};
    
    if (!formData.taxSlabs || !Array.isArray(formData.taxSlabs) || formData.taxSlabs.length === 0) {
      taxErrors.taxSlabs = "At least one tax slab is required";
    } else {
      formData.taxSlabs.forEach((slab, index) => {
        if (typeof slab.min !== 'number' || slab.min < 0 || !Number.isInteger(slab.min)) {
          taxErrors[`taxSlab_${index}_min`] = `Tax slab ${index + 1}: Min must be a non-negative integer`;
        }
        if (slab.max !== null && (typeof slab.max !== 'number' || slab.max < slab.min || !Number.isInteger(slab.max))) {
          taxErrors[`taxSlab_${index}_max`] = `Tax slab ${index + 1}: Max must be null or >= min`;
        }
        if (typeof slab.rate !== 'number' || slab.rate < 0 || slab.rate > 100) {
          taxErrors[`taxSlab_${index}_rate`] = `Tax slab ${index + 1}: Rate must be between 0 and 100`;
        }
        if (index > 0) {
          const prevSlab = formData.taxSlabs[index - 1];
          const prevMax = prevSlab.max === null ? Infinity : prevSlab.max;
          if (slab.min > prevMax + 1) {
            taxErrors[`taxSlab_${index}_gap`] = `Tax slab ${index + 1}: Gap detected. Min should be <= ${prevMax + 1}`;
          }
          if (slab.min <= prevMax && prevSlab.max !== null) {
            taxErrors[`taxSlab_${index}_overlap`] = `Tax slab ${index + 1}: Overlap detected with previous slab`;
          }
        }
      });
    }
    
    if (formData.cessRate !== "" && formData.cessRate !== null && formData.cessRate !== undefined) {
      const cessNum = Number(formData.cessRate);
      if (isNaN(cessNum) || cessNum < 0 || cessNum > 100) {
        taxErrors.cessRate = "CESS rate must be a number between 0 and 100";
      }
    }
    
    if (Object.keys(taxErrors).length > 0) {
      setErrors(prev => ({ ...prev, ...taxErrors }));
      setErrorDialog({ isOpen: true, message: "Please fix tax configuration errors before saving" });
      return;
    }

    const payload = {
      taxSlabs: formData.taxSlabs,
      cessRate: formData.cessRate ? Number(formData.cessRate) : null,
    };

    await runSectionSave(
      'tax',
      () => propertyUpdationService.updateTax(propertyId, payload),
      'Tax configuration updated successfully.'
    );
  };

  const handleTaxSlabsChange = (updatedSlabs) => {
    setFormData(prev => ({
      ...prev,
      taxSlabs: updatedSlabs
    }));
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
        setErrorDialog({ isOpen: true, message: "Failed to load form data" });
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
    
    clearError(name);
    
    // Clear title uniqueness error when user types
    if (name === 'title') {
      setTitleUniquenessError("");
    }
    
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
    
    setRoomTypeImages(prev => {
      const newImages = { ...prev };
      delete newImages[index];
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
    clearError(`roomType_${index}`);
    clearError(`minOccupancy_${index}`);
    clearError(`occupancy_${index}`);
    clearError(`extraBed_${index}`);
    clearError(`numberOfBeds_${index}`);
    
    setFormData(prev => {
      const updatedRoomTypes = prev.roomTypes.map((rt, i) => 
        i === index ? { ...rt, [field]: value } : rt
      );
      
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
    clearAllErrors();
    
    try {
      await propertyService.createAmenity(data);
      setSuccessDialog({ isOpen: true, message: "Amenity added successfully" });
      
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
    
    // Validate commission percentage if provided
    if (formData.commissionPercentage !== "" && formData.commissionPercentage !== null && formData.commissionPercentage !== undefined) {
      const commissionNum = Number(formData.commissionPercentage);
      if (isNaN(commissionNum) || commissionNum < 0 || commissionNum > 100) {
        newErrors.commissionPercentage = "Commission percentage must be a number between 0 and 100";
      }
    }
    
    // Validate location coordinates if provided
    if (formData.location.coordinates.latitude !== null && formData.location.coordinates.latitude !== undefined && formData.location.coordinates.latitude !== "") {
      const lat = Number(formData.location.coordinates.latitude);
      if (isNaN(lat) || lat < -90 || lat > 90) {
        newErrors.latitude = "Latitude must be between -90 and 90";
      }
    }
    if (formData.location.coordinates.longitude !== null && formData.location.coordinates.longitude !== undefined && formData.location.coordinates.longitude !== "") {
      const lng = Number(formData.location.coordinates.longitude);
      if (isNaN(lng) || lng < -180 || lng > 180) {
        newErrors.longitude = "Longitude must be between -180 and 180";
      }
    }
    
    // Validate tax configuration
    if (!formData.taxSlabs || !Array.isArray(formData.taxSlabs) || formData.taxSlabs.length === 0) {
      newErrors.taxSlabs = "At least one tax slab is required";
    } else {
      formData.taxSlabs.forEach((slab, index) => {
        if (typeof slab.min !== 'number' || slab.min < 0 || !Number.isInteger(slab.min)) {
          newErrors[`taxSlab_${index}_min`] = `Tax slab ${index + 1}: Min must be a non-negative integer`;
        }
        
        if (slab.max !== null && (typeof slab.max !== 'number' || slab.max < slab.min || !Number.isInteger(slab.max))) {
          newErrors[`taxSlab_${index}_max`] = `Tax slab ${index + 1}: Max must be null or >= min`;
        }
        
        if (typeof slab.rate !== 'number' || slab.rate < 0 || slab.rate > 100) {
          newErrors[`taxSlab_${index}_rate`] = `Tax slab ${index + 1}: Rate must be between 0 and 100`;
        }
        
        // Check for gaps/overlaps
        if (index > 0) {
          const prevSlab = formData.taxSlabs[index - 1];
          const prevMax = prevSlab.max === null ? Infinity : prevSlab.max;
          
          if (slab.min > prevMax + 1) {
            newErrors[`taxSlab_${index}_gap`] = `Tax slab ${index + 1}: Gap detected. Min should be <= ${prevMax + 1}`;
          }
          
          if (slab.min <= prevMax && prevSlab.max !== null) {
            newErrors[`taxSlab_${index}_overlap`] = `Tax slab ${index + 1}: Overlap detected with previous slab`;
          }
        }
      });
    }
    
    // Validate CESS rate if provided
    if (formData.cessRate !== "" && formData.cessRate !== null && formData.cessRate !== undefined) {
      const cessNum = Number(formData.cessRate);
      if (isNaN(cessNum) || cessNum < 0 || cessNum > 100) {
        newErrors.cessRate = "CESS rate must be a number between 0 and 100";
      }
    }
    
    // Media and room types validation only for edit mode
    if (isEdit) {
      const activeExistingMediaCount = existingMedia.filter((item) => !item.isDeleted).length;
      if (activeExistingMediaCount === 0 && mediaFiles.length === 0) {
        newErrors.media = "At least one image is required";
      }
    }

    // Validate room types only for edit mode
    if (isEdit) {
      formData.roomTypes.forEach((rt, index) => {
        if (!rt.roomTypeId) newErrors[`roomType_${index}`] = "Room type is required";
        
        if (rt.minOccupancy < 1 || rt.minOccupancy > 10) {
          newErrors[`minOccupancy_${index}`] = "Min occupancy must be between 1 and 10";
        }
        
        if (rt.Occupancy < 1 || rt.Occupancy > 10) {
          newErrors[`occupancy_${index}`] = "Max occupancy must be between 1 and 10";
        }
        
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
    }

    setErrors(newErrors);
    
    if (Object.keys(newErrors).length > 0) {
      setTimeout(() => focusFirstError(Object.keys(newErrors)), 100);
    }
    
    return Object.keys(newErrors).length === 0;
  };

  // Form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
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

      // Only normalize room types for edit mode
      const normalisedRoomTypesForSubmit = isEdit ? formData.roomTypes.map((rt) => ({
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
      })) : [];

      // Prepare tax configuration for submission
      const taxSlabsToSend = formData.taxSlabs && Array.isArray(formData.taxSlabs) && formData.taxSlabs.length > 0
        ? formData.taxSlabs
        : null;
      
      // Simplify CESS rate handling
      const cessRateToSend = formData.cessRate && formData.cessRate !== "" && formData.cessRate !== null && formData.cessRate !== undefined
        ? Number(formData.cessRate)
        : null;

      const submitData = {
        ...formData,
        rulesAndPolicies: rulesString,
        taxSlabs: taxSlabsToSend,
        cessRate: cessRateToSend,
        ...(isEdit && { roomTypes: normalisedRoomTypesForSubmit }),
      };

      const formDataToSend = new FormData();

      // Explicitly handle taxSlabs and cessRate to avoid null stringification issues
      Object.keys(submitData).forEach((key) => {
        if (
          key !== 'mediaFiles' &&
          key !== 'amenityIds' &&
          key !== 'facilityIds' &&
          key !== 'safetyIds' &&
          key !== 'roomTypes' &&
          key !== 'taxSlabs' &&  // Handle separately
          key !== 'cessRate'      // Handle separately
        ) {
          if (typeof submitData[key] === 'object' && submitData[key] !== null && !Array.isArray(submitData[key])) {
            // Handle objects (like location) - but not arrays
            formDataToSend.append(key, JSON.stringify(submitData[key]));
          } else if (Array.isArray(submitData[key])) {
            // Handle arrays explicitly
            formDataToSend.append(key, JSON.stringify(submitData[key]));
          } else if (submitData[key] !== null && submitData[key] !== undefined && submitData[key] !== '') {
            // Handle primitives (strings, numbers, etc.) - skip empty strings
            formDataToSend.append(key, submitData[key]);
          }
          // Skip null/undefined/empty string values
        }
      });

      // Explicitly append taxSlabs if not null (prevent double encoding)
      if (taxSlabsToSend !== null && Array.isArray(taxSlabsToSend) && taxSlabsToSend.length > 0) {
        // Ensure it's not already a string (prevent double encoding)
        const taxSlabsValue = typeof taxSlabsToSend === 'string' ? taxSlabsToSend : JSON.stringify(taxSlabsToSend);
        formDataToSend.append('taxSlabs', taxSlabsValue);
      }
      
      // Explicitly append cessRate if not null
      if (cessRateToSend !== null && cessRateToSend !== undefined) {
        formDataToSend.append('cessRate', String(cessRateToSend));
      }

      submitData.amenityIds.forEach((item) => formDataToSend.append('amenityIds', item.id));
      submitData.facilityIds.forEach((item) => formDataToSend.append('facilityIds', item.id));
      submitData.safetyIds.forEach((item) => formDataToSend.append('safetyIds', item.id));

      // Only append room types and media for edit mode
      if (isEdit) {
        if (submitData.roomTypes && submitData.roomTypes.length > 0) {
          formDataToSend.append('roomtypes', JSON.stringify(submitData.roomTypes));
        }

        mediaFiles.forEach((file) => {
          formDataToSend.append('media', file);
        });

        Object.keys(roomTypeImages).forEach((roomTypeIndex) => {
          const images = roomTypeImages[roomTypeIndex];
          if (images && images.length > 0) {
            images.forEach((file) => {
              formDataToSend.append(`roomTypeImages_${roomTypeIndex}`, file);
            });
          }
        });
      }

      // City icon can be added during creation (for location)
      if (cityIconFile) {
        formDataToSend.append('cityIcon', cityIconFile);
      }

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
        setTimeout(() => {
          navigate('/admin/base/properties');
        }, 2000);
      } else {
        const response = await propertyService.createProperty(formDataToSend);
        const createdPropertyId = response?.data?.data?.id || response?.data?.data?.property?.id;
        setSuccessDialog({ 
          isOpen: true, 
          message: "Property created successfully! Redirecting to edit page to add images and room types..." 
        });
        setTimeout(() => {
          if (createdPropertyId) {
            navigate(`/admin/base/properties/edit/${createdPropertyId}`);
          } else {
            navigate('/admin/base/properties');
          }
        }, 2000);
      }

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
          {/* Basic Information - Now using refactored component */}
          <BasicInformationSection
            formData={formData}
            errors={errors}
            propertyTypes={propertyTypes}
            handleInputChange={handleInputChange}
            onAddPropertyType={() => setShowAddPropertyType(true)}
            isEdit={isEdit}
            onSave={handleSaveBasics}
            isSaving={sectionSaving.basics}
            isAdmin={isAdmin}
            titleUniquenessError={titleUniquenessError}
            titleCheckLoading={titleCheckLoading}
          />

          {/* Cancellation Policy - Now using refactored component */}
          <CancellationPolicySection
            formData={formData}
            errors={errors}
            cancellationPolicies={cancellationPolicies}
            selectedCancellationPolicy={selectedCancellationPolicy}
            handleInputChange={handleInputChange}
          />

          {/* Location - Now using refactored component */}
          <LocationSection
            formData={formData}
            errors={errors}
            handleInputChange={handleInputChange}
            cityIconPreview={cityIconPreview}
            cityIconFile={cityIconFile}
            cityIconError={cityIconError}
            onCityIconChange={(e) => {
              const file = e.target.files[0];
              if (file) {
                if (file.type !== 'image/svg+xml' && !file.name.endsWith('.svg')) {
                  setCityIconError('Please select an SVG file for the city icon');
                  setCityIconFile(null);
                  setCityIconPreview(null);
                  return;
                }
                if (file.size > 2 * 1024 * 1024) {
                  setCityIconError('File size must be less than 2MB');
                  setCityIconFile(null);
                  setCityIconPreview(null);
                  return;
                }
                if (cityIconPreview && cityIconPreview.startsWith('blob:')) {
                  URL.revokeObjectURL(cityIconPreview);
                }
                setCityIconError("");
                setCityIconFile(file);
                const previewUrl = URL.createObjectURL(file);
                setCityIconPreview(previewUrl);
              }
              e.target.value = '';
            }}
            onCityIconRemove={() => {
              if (cityIconPreview && cityIconPreview.startsWith('blob:')) {
                URL.revokeObjectURL(cityIconPreview);
              }
              setCityIconFile(null);
              setCityIconPreview(null);
              setCityIconError("");
            }}
            isEdit={isEdit}
            isSubmitting={isSubmitting}
            onSave={handleSaveLocation}
            isSaving={sectionSaving.location}
          />

          {/* Features - Now using refactored component */}
          <FeaturesSection
            formData={formData}
            amenities={amenities}
            facilities={facilities}
            safetyHygiene={safetyHygiene}
            handleAmenitiesChange={(selected) => setFormData(prev => ({ ...prev, amenityIds: selected }))}
            handleFacilitiesChange={(selected) => setFormData(prev => ({ ...prev, facilityIds: selected }))}
            handleSafetyChange={(selected) => setFormData(prev => ({ ...prev, safetyIds: selected }))}
            onAddAmenity={() => setShowAddAmenity(true)}
            onAddFacility={() => setShowAddFacility(true)}
            onAddSafety={() => setShowAddSafety(true)}
            isEdit={isEdit}
            onSave={handleSaveFeatures}
            isSaving={sectionSaving.features}
          />

          {/* Tax Configuration - Now using refactored component (Admin Only) */}
          {isAdmin && (
            <TaxConfigurationSection
              formData={formData}
              errors={errors}
              handleInputChange={handleInputChange}
              onTaxSlabsChange={handleTaxSlabsChange}
              isEdit={isEdit}
              onSave={handleSaveTax}
              isSaving={sectionSaving.tax}
              isAdmin={isAdmin}
            />
          )}

          {/* Room Types - Only visible in edit mode */}
          {isEdit && (
            <RoomTypesSection
              formData={formData}
              errors={errors}
              roomTypes={roomTypes}
              amenities={amenities}
              roomTypeImages={roomTypeImages}
              roomTypeImageErrors={roomTypeImageErrors}
              isEdit={isEdit}
              onAddRoomType={addRoomType}
              onCreateRoomType={() => setShowAddRoomType(true)}
              onAddNewAmenity={() => setShowAddAmenity(true)}
              updateRoomType={updateRoomType}
              handleRequestRemoveRoomType={handleRequestRemoveRoomType}
              handleRoomTypeAmenityToggle={handleRoomTypeAmenityToggle}
              handleRoomTypeImageChange={handleRoomTypeImageChange}
              handleRoomTypeExistingMediaRemove={handleRoomTypeExistingMediaRemove}
              handleRoomTypeExistingMediaSetPrimary={handleRoomTypeExistingMediaSetPrimary}
              handleRemoveNewRoomTypeImage={handleRemoveNewRoomTypeImage}
              onSave={handleSaveRoomTypes}
              isSaving={sectionSaving.roomTypes}
            />
          )}

          {/* Media Upload - Only visible in edit mode */}
          {isEdit && (
            <MediaUploadSection
              isEdit={isEdit}
              existingMedia={existingMedia}
              mediaFiles={mediaFiles}
              coverSelection={coverSelection}
              errors={errors}
              mediaRef={mediaRef}
              handleMediaChange={handleMediaChange}
              handleExistingPropertyMediaRemove={handleExistingPropertyMediaRemove}
              handleExistingPropertyMediaSetCover={handleExistingPropertyMediaSetCover}
              handleRemoveNewPropertyImage={handleRemoveNewPropertyImage}
              onSave={handleSaveMedia}
              isSaving={sectionSaving.media}
            />
          )}

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

      {/* Modals - Now using refactored components */}
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

      {/* Success Dialog - Now using refactored component */}
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
