import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import {
  CheckCircle,
  Home,
  Image as ImageIcon,
  Loader2,
  Save,
  Shield,
  Upload,
  User,
  X,
} from "lucide-react";
import {
  propertyService,
  cancellationPolicyService,
  mediaService,
  updatePropertyService,
} from "../../services";
import NotificationModal from "../../components/NotificationModal";
import { useDispatch } from "react-redux";
import { setHostProperty } from "../../store/propertySlice";

const defaultLocation = {
  line1: "",
  line2: "",
  area: "",
  city: "",
  state: "",
  postalCode: "",
  country: "India",
  latitude: "",
  longitude: "",
};

const resolveMediaUrl = (src) => {
  if (!src) return "";
  if (src.startsWith("http://") || src.startsWith("https://")) return src;
  return mediaService.getMedia(src);
};

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
};

const SelectionGrid = ({ title, options, selectedIds, onToggle }) => {
  const selectedLabels = useMemo(
    () =>
      options.filter((option) => selectedIds.includes(option.id)).map((opt) => opt.name),
    [options, selectedIds]
  );

  return (
    <section className="bg-white border border-gray-200 rounded-lg shadow-sm">
      <header className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        <span className="text-xs text-gray-400">{selectedIds.length} selected</span>
      </header>
      <div className="space-y-3 p-4">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
          {options.map((option) => {
            const isSelected = selectedIds.includes(option.id);
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onToggle(option.id)}
                className={`flex items-center justify-between rounded-md border px-3 py-2 text-xs transition ${
                  isSelected
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300"
                }`}
              >
                <span className="truncate">{option.name}</span>
                {isSelected && <CheckCircle className="ml-2 h-4 w-4 shrink-0" />}
              </button>
            );
          })}
        </div>
        {selectedLabels.length > 0 && (
          <div className="rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-600">
            <span className="font-medium text-gray-700">Selected:</span>{" "}
            {selectedLabels.join(", ")}
          </div>
        )}
      </div>
    </section>
  );
};

const GalleryManager = ({
  existingMedia,
  newMediaFiles,
  onUpload,
  onRemoveExisting,
  onRemoveNew,
  coverSelection,
  onSetCover,
}) => {
  const hasImages =
    existingMedia.some((media) => !media.isDeleted) || newMediaFiles.length > 0;

  return (
    <section className="bg-white border border-gray-200 rounded-lg shadow-sm">
      <header className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-800">Property gallery</h3>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-blue-500 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50">
          <Upload className="h-4 w-4" />
          Add images
          <input type="file" accept="image/*" multiple className="hidden" onChange={onUpload} />
        </label>
      </header>

      <div className="space-y-4 p-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {existingMedia.map((media) => {
            if (media.isDeleted) return null;
            const isCover = coverSelection?.type === "existing" && coverSelection.id === media.id;
            return (
              <div
                key={media.id}
                className="relative overflow-hidden rounded-lg border border-gray-200 bg-gray-50"
              >
                <img
                  src={resolveMediaUrl(media.displayUrl || media.url)}
                  alt={media.caption || "Property media"}
                  className="h-32 w-full object-cover"
                />
                <div className="absolute inset-0 flex flex-col justify-between p-2">
                  <div className="flex justify-between">
                    {isCover ? (
                      <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                        Cover
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onSetCover({ type: "existing", id: media.id })}
                        className="rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-medium text-gray-600 hover:bg-white"
                      >
                        Set cover
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onRemoveExisting(media.id)}
                      className="rounded-full bg-red-500 p-1 text-white shadow hover:bg-red-600"
                      aria-label="Remove image"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="rounded-full bg-white/90 px-2 py-0.5 text-[10px] text-gray-500">
                    {media.order != null ? `Order ${media.order + 1}` : "Existing"}
                  </div>
                </div>
              </div>
            );
          })}

          {newMediaFiles.map((file, index) => {
            const previewUrl = URL.createObjectURL(file);
            const isCover = coverSelection?.type === "new" && coverSelection.index === index;
            return (
              <div
                key={index}
                className="relative overflow-hidden rounded-lg border border-dashed border-gray-300 bg-gray-50"
              >
                <img src={previewUrl} alt={file.name} className="h-32 w-full object-cover" />
                <div className="absolute inset-0 flex flex-col justify-between p-2">
                  <div className="flex justify-between">
                    {isCover ? (
                      <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                        Cover
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onSetCover({ type: "new", index })}
                        className="rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-medium text-gray-600 hover:bg-white"
                      >
                        Set cover
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onRemoveNew(index)}
                      className="rounded-full bg-red-500 p-1 text-white shadow hover:bg-red-600"
                      aria-label="Remove image"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="rounded-full bg-white/90 px-2 py-0.5 text-[10px] text-gray-500">
                    New upload
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {!hasImages && (
          <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center">
            <ImageIcon className="h-12 w-12 text-gray-300" />
            <p className="mt-3 text-sm font-medium text-gray-600">
              No images uploaded yet
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Upload high quality images with a 16:9 aspect ratio to showcase your property.
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

const HostPropertyDetails = () => {
  const hostAuth = useSelector((state) => state.hostAuth);
  const hostId = hostAuth?.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const dispatch = useDispatch();


  const [property, setProperty] = useState(null);
  const [formState, setFormState] = useState({
    title: "",
    description: "",
    rulesAndPolicies: "",
    status: "active",
    propertyTypeId: "",
    cancellationPolicyId: "",
    checkInTime: "14:00",
    checkOutTime: "11:00",
  });

  const [locationState, setLocationState] = useState(defaultLocation);
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [selectedFacilities, setSelectedFacilities] = useState([]);
  const [selectedSafeties, setSelectedSafeties] = useState([]);

  const [existingMedia, setExistingMedia] = useState([]);
  const [newMediaFiles, setNewMediaFiles] = useState([]);
  const [coverSelection, setCoverSelection] = useState(null);

  // City icon state
  const [cityIconFile, setCityIconFile] = useState(null);
  const [cityIconPreview, setCityIconPreview] = useState(null);
  const [cityIconError, setCityIconError] = useState("");

  const [amenityOptions, setAmenityOptions] = useState([]);
  const [facilityOptions, setFacilityOptions] = useState([]);
  const [safetyOptions, setSafetyOptions] = useState([]);
  const [propertyTypes, setPropertyTypes] = useState([]);
  const [cancellationPolicies, setCancellationPolicies] = useState([]);
  const [roomTypesState, setRoomTypesState] = useState([]);
  const [roomTypeOptions, setRoomTypeOptions] = useState([]);
  const [feedbackModal, setFeedbackModal] = useState({
    isOpen: false,
    type: "success",
    title: "",
    message: "",
  });
  const [sectionSaving, setSectionSaving] = useState({
    basics: false,
    location: false,
    policy: false,
    features: false,
    gallery: false,
    roomTypes: false,
  });

  const activeExistingMedia = useMemo(
    () => existingMedia.filter((media) => !media.isDeleted),
    [existingMedia]
  );

  const appliedCancellationPolicy = useMemo(() => {
    if (!formState.cancellationPolicyId) return null;
    return (
      cancellationPolicies.find((policy) => policy.id === formState.cancellationPolicyId) || null
    );
  }, [formState.cancellationPolicyId, cancellationPolicies]);

  const populateState = (propertyData) => {
    setProperty(propertyData);
    setFormState({
      title: propertyData.title || "",
      description: propertyData.description || "",
      rulesAndPolicies: propertyData.rulesAndPolicies || "",
      status: propertyData.status || "active",
      propertyTypeId: propertyData.propertyTypeId || "",
      cancellationPolicyId: propertyData.cancellationPolicyId || "",
      checkInTime: propertyData.checkInTime || "14:00",
      checkOutTime: propertyData.checkOutTime || "11:00",
    });

    const address = propertyData.location?.address || {};
    const coordinates = propertyData.location?.coordinates || {};
    setLocationState({
      line1: address.line1 || address.street || "",
      line2: address.line2 || "",
      area: address.area || "",
      city: address.city || "",
      state: address.state || "",
      postalCode: address.postalCode || address.zipCode || "",
      country: address.country || "India",
      latitude: coordinates.lat ?? coordinates.latitude ?? "",
      longitude: coordinates.lng ?? coordinates.longitude ?? "",
    });

    setSelectedAmenities(
      (propertyData.amenities || [])
        .map((item) => item.amenity?.id)
        .filter(Boolean)
    );
    setSelectedFacilities(
      (propertyData.facilities || [])
        .map((item) => item.facility?.id)
        .filter(Boolean)
    );
    setSelectedSafeties(
      (propertyData.safeties || [])
        .map((item) => item.safety?.id)
        .filter(Boolean)
    );

    const mediaList = (propertyData.media || []).map((media, index) => ({
      ...media,
      order: media.order ?? index,
      isDeleted: false,
    }));
    setExistingMedia(mediaList);
    setNewMediaFiles([]);

    // Load existing city icon if available (only set preview, not file)
    const existingCityIcon = propertyData.location?.cityIcon;
    if (existingCityIcon) {
      const iconUrl = resolveMediaUrl(existingCityIcon);
      setCityIconPreview(iconUrl);
      // Don't set cityIconFile - it's an existing icon, not a new upload
      setCityIconFile(null);
    } else {
      // No existing icon, clear preview
      setCityIconPreview(null);
      setCityIconFile(null);
    }
    setCityIconError("");

    const featuredMedia = mediaList.find((media) => media.isFeatured);
    if (featuredMedia) {
      setCoverSelection({ type: "existing", id: featuredMedia.id });
    } else if (mediaList.length) {
      setCoverSelection({ type: "existing", id: mediaList[0].id });
    } else {
      setCoverSelection(null);
    }

    setRoomTypesState(
      (propertyData.roomTypes || []).map((roomType) => {
        const roomAmenities = (roomType.amenities || []).map((link) => link.amenity?.id).filter(Boolean);
        const media = (roomType.media || []).map((mediaItem, index) => ({
          ...mediaItem,
          order: mediaItem.order ?? index,
          isDeleted: false,
        }));
        return {
          id: roomType.id || null,
          roomTypeId: roomType.roomTypeId || "",
          minOccupancy: roomType.minOccupancy ?? 1,
          maxOccupancy: roomType.maxOccupancy ?? roomType.Occupancy ?? 1,
          extraBedCapacity: roomType.extraBedCapacity ?? 0,
          numberOfBeds: roomType.numberOfBeds ?? 1,
          bedType: roomType.bedType || "DOUBLE",
          isActive: roomType.isActive ?? true,
          amenities: roomAmenities,
          media,
          newMedia: [],
        };
      })
    );
  };

  const resolveOwnerIdentifier = () =>
    property?.ownerHostId ||
    property?.ownerHost?.id ||
    property?.ownerHost?.email ||
    hostAuth?.id ||
    hostAuth?.email ||
    "";

  const openFeedbackModal = (type, title, message) => {
    setFeedbackModal({
      isOpen: true,
      type,
      title,
      message,
    });
  };

  const fetchPropertyDetails = async (currentHostId) => {
    if (!currentHostId) return;
    setLoading(true);
    setError("");
    try {
      const [propertyResponse, creationResponse, cancellationResponse] = await Promise.all([
        propertyService.getHostProperties(currentHostId),
        propertyService.getCreationFormData(),
        cancellationPolicyService.list(),
      ]);

      const propertyData = propertyResponse?.data?.data;
      if (!propertyData) {
        setError("No property found for this host.");
        setProperty(null);
        dispatch(setHostProperty(null));
      } else {
        populateState(propertyData);
        dispatch(setHostProperty(propertyData));
      }

      const creationPayload = creationResponse?.data?.data || {};
      setAmenityOptions(creationPayload.amenities || []);
      setFacilityOptions(creationPayload.facilities || []);
      setSafetyOptions(creationPayload.safetyHygiene || []);
      setPropertyTypes(creationPayload.propertyTypes || []);
       setRoomTypeOptions(creationPayload.roomTypes || []);

      const cancellationPayload = cancellationResponse?.data;
      if (cancellationPayload?.success) {
        setCancellationPolicies(
          (cancellationPayload.data || []).map((policy) => ({
            ...policy,
            rules: (policy.rules || []).slice().sort((a, b) => a.sortOrder - b.sortOrder),
          }))
        );
      }
    } catch (err) {
      console.error("Failed to load property details:", err);
      setError(err?.response?.data?.message || "Failed to load property details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPropertyDetails(hostId);
  }, [hostId]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleLocationChange = (event) => {
    const { name, value } = event.target;
    setLocationState((prev) => ({ ...prev, [name]: value }));
  };

  const toggleSelection = (setter) => (id) => {
    setter((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const handleMediaUpload = (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    setNewMediaFiles((prev) => [...prev, ...files]);

    if (!coverSelection && files.length > 0) {
      setCoverSelection({ type: "new", index: 0 });
    }
  };

  const handleRemoveExistingMedia = (mediaId) => {
    setExistingMedia((prev) =>
      prev.map((media) =>
        media.id === mediaId
          ? { ...media, isDeleted: true, isFeatured: false }
          : media
      )
    );

    if (coverSelection?.type === "existing" && coverSelection.id === mediaId) {
      const remainingExisting = activeExistingMedia.filter((media) => media.id !== mediaId);
      if (remainingExisting.length > 0) {
        setCoverSelection({ type: "existing", id: remainingExisting[0].id });
      } else if (newMediaFiles.length > 0) {
        setCoverSelection({ type: "new", index: 0 });
      } else {
        setCoverSelection(null);
      }
    }
  };

  const handleRemoveNewMedia = (index) => {
    setNewMediaFiles((prev) => {
      const next = prev.filter((_, idx) => idx !== index);
      if (coverSelection?.type === "new") {
        if (coverSelection.index === index) {
          if (next.length > 0) {
            setCoverSelection({ type: "new", index: 0 });
          } else if (activeExistingMedia.length > 0) {
            setCoverSelection({ type: "existing", id: activeExistingMedia[0].id });
          } else {
            setCoverSelection(null);
          }
        } else if (coverSelection.index > index) {
          setCoverSelection({ type: "new", index: coverSelection.index - 1 });
        }
      }
      return next;
    });
  };

  const handleRoomTypeFieldChange = (index, field, value) => {
    setRoomTypesState((prev) =>
      prev.map((roomType, idx) =>
        idx === index ? { ...roomType, [field]: value } : roomType
      )
    );
  };

  const handleRoomTypeAmenityToggle = (index, amenityId) => {
    setRoomTypesState((prev) =>
      prev.map((roomType, idx) => {
        if (idx !== index) return roomType;
        const alreadySelected = roomType.amenities.includes(amenityId);
        return {
          ...roomType,
          amenities: alreadySelected
            ? roomType.amenities.filter((id) => id !== amenityId)
            : [...roomType.amenities, amenityId],
        };
      })
    );
  };

  const handleRoomTypeImageUpload = (index, event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setRoomTypesState((prev) =>
      prev.map((roomType, idx) =>
        idx === index
          ? { ...roomType, newMedia: [...roomType.newMedia, ...files] }
          : roomType
      )
    );
    event.target.value = "";
  };

  const handleRoomTypeExistingImageRemove = (index, mediaId) => {
    setRoomTypesState((prev) =>
      prev.map((roomType, idx) => {
        if (idx !== index) return roomType;
        return {
          ...roomType,
          media: roomType.media.map((media) =>
            media.id === mediaId ? { ...media, isDeleted: true, isFeatured: false } : media
          ),
        };
      })
    );
  };

  const handleRoomTypeNewImageRemove = (index, fileIndex) => {
    setRoomTypesState((prev) =>
      prev.map((roomType, idx) => {
        if (idx !== index) return roomType;
        return {
          ...roomType,
          newMedia: roomType.newMedia.filter((_, i) => i !== fileIndex),
        };
      })
    );
  };

  const runSectionSave = async (key, action, successMeta = {}) => {
    setSectionSaving((prev) => ({ ...prev, [key]: true }));
    const {
      successTitle = "Changes saved",
      successMessage = "Your updates have been saved successfully.",
    } = successMeta;
    try {
      const result = await action();
      openFeedbackModal("success", successTitle, successMessage);
      return result;
    } catch (err) {
      console.error(`Failed to update ${key}:`, err);
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to update section. Please try again.";
      openFeedbackModal("error", "Update failed", message);
      return null;
    } finally {
      setSectionSaving((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleSaveBasics = () =>
    runSectionSave(
      "basics",
      async () => {
        if (!property?.id) {
          throw new Error("Property reference is missing.");
        }
        const ownerIdentifier = resolveOwnerIdentifier();
        if (!ownerIdentifier) {
          throw new Error("Unable to resolve host identifier.");
        }

        const payload = {
          ownerHostId: ownerIdentifier,
          title: formState.title,
          description: formState.description,
          rulesAndPolicies: formState.rulesAndPolicies,
          status: formState.status,
          propertyTypeId: formState.propertyTypeId || null,
          cancellationPolicyId: formState.cancellationPolicyId || null,
          checkInTime: formState.checkInTime,
          checkOutTime: formState.checkOutTime,
        };

        const response = await updatePropertyService.updateBasics(property.id, payload);
        const responseData = response?.data;
        if (!responseData?.success) {
          throw new Error(responseData?.message || "Failed to update property basics.");
        }
        if (responseData?.data) {
          populateState(responseData.data);
        }
        return responseData?.data;
      },
      {
        successTitle: "Basics updated",
        successMessage: "Core property details saved successfully.",
      }
    );

  const handleSaveLocation = () =>
    runSectionSave(
      "location",
      async () => {
        if (!property?.id) {
          throw new Error("Property reference is missing.");
        }
        const ownerIdentifier = resolveOwnerIdentifier();
        if (!ownerIdentifier) {
          throw new Error("Unable to resolve host identifier.");
        }

        const parsedLatitude =
          locationState.latitude !== "" ? Number(locationState.latitude) : null;
        const parsedLongitude =
          locationState.longitude !== "" ? Number(locationState.longitude) : null;

        const locationPayload = {
          address: {
            line1: locationState.line1 || "",
            line2: locationState.line2 || "",
            area: locationState.area || "",
            city: locationState.city || "",
            state: locationState.state || "",
            postalCode: locationState.postalCode || "",
            zipCode: locationState.postalCode || "",
            country: locationState.country || "India",
          },
          coordinates: {
            lat: parsedLatitude,
            lng: parsedLongitude,
            latitude: parsedLatitude,
            longitude: parsedLongitude,
          },
        };

        const formDataToSend = new FormData();
        formDataToSend.append("ownerHostId", ownerIdentifier);
        
        // If city icon preview is cleared (user clicked remove), set cityIcon to null
        if (!cityIconPreview && !cityIconFile) {
          locationPayload.cityIcon = null;
        }
        
        formDataToSend.append("location", JSON.stringify(locationPayload));
        
        // Append city icon file if a new one is selected
        if (cityIconFile) {
          formDataToSend.append("cityIcon", cityIconFile);
        }

        const response = await updatePropertyService.updateLocation(property.id, formDataToSend);
        const responseData = response?.data;
        if (!responseData?.success) {
          throw new Error(responseData?.message || "Failed to update property location.");
        }
        if (responseData?.data) {
          populateState(responseData.data);
          // Refresh city icon preview from updated data
          const updatedCityIcon = responseData.data.location?.cityIcon;
          if (updatedCityIcon) {
            setCityIconPreview(resolveMediaUrl(updatedCityIcon));
            setCityIconFile(null);
          } else {
            setCityIconPreview(null);
            setCityIconFile(null);
          }
        }
        return responseData?.data;
      },
      {
        successTitle: "Address updated",
        successMessage: "Location details saved successfully.",
      }
    );

  const handleSavePolicy = () =>
    runSectionSave(
      "policy",
      async () => {
        if (!property?.id) {
          throw new Error("Property reference is missing.");
        }
        const ownerIdentifier = resolveOwnerIdentifier();
        if (!ownerIdentifier) {
          throw new Error("Unable to resolve host identifier.");
        }

        const response = await updatePropertyService.updatePolicy(property.id, {
          ownerHostId: ownerIdentifier,
          cancellationPolicyId: formState.cancellationPolicyId || null,
        });
        const responseData = response?.data;
        if (!responseData?.success) {
          throw new Error(responseData?.message || "Failed to update cancellation policy.");
        }
        if (responseData?.data) {
          populateState(responseData.data);
        }
        return responseData?.data;
      },
      {
        successTitle: "Policy updated",
        successMessage: "Cancellation policy saved successfully.",
      }
    );

  const handleSaveFeatures = () =>
    runSectionSave(
      "features",
      async () => {
        if (!property?.id) {
          throw new Error("Property reference is missing.");
        }
        const ownerIdentifier = resolveOwnerIdentifier();
        if (!ownerIdentifier) {
          throw new Error("Unable to resolve host identifier.");
        }

        const response = await updatePropertyService.updateFeatures(property.id, {
          ownerHostId: ownerIdentifier,
          amenityIds: selectedAmenities,
          facilityIds: selectedFacilities,
          safetyIds: selectedSafeties,
        });
        const responseData = response?.data;
        if (!responseData?.success) {
          throw new Error(responseData?.message || "Failed to update property features.");
        }
        if (responseData?.data) {
          populateState(responseData.data);
        }
        return responseData?.data;
      },
      {
        successTitle: "Features updated",
        successMessage: "Amenities, facilities, and safety features saved successfully.",
      }
    );

  const handleSaveGallery = () =>
    runSectionSave(
      "gallery",
      async () => {
        if (!property?.id) {
          throw new Error("Property reference is missing.");
        }
        const ownerIdentifier = resolveOwnerIdentifier();
        if (!ownerIdentifier) {
          throw new Error("Unable to resolve host identifier.");
        }

        const activeExistingMedia = existingMedia
          .filter((media) => !media.isDeleted)
          .slice()
          .sort((a, b) => {
            const orderDiff = (a.order ?? 0) - (b.order ?? 0);
            if (orderDiff !== 0) return orderDiff;
            const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return aTime - bTime;
          });

        if (activeExistingMedia.length === 0 && newMediaFiles.length === 0) {
          throw new Error("Please keep at least one image in the property gallery.");
        }

        let coverIndex = null;
        if (coverSelection?.type === "existing") {
          const matchIndex = activeExistingMedia.findIndex(
            (media) => media.id === coverSelection.id
          );
          if (matchIndex >= 0) {
            coverIndex = matchIndex;
          }
        } else if (
          coverSelection?.type === "new" &&
          typeof coverSelection.index === "number"
        ) {
          coverIndex = activeExistingMedia.length + coverSelection.index;
        }

        if (coverIndex === null) {
          coverIndex = 0;
        }

        const formData = new FormData();
        formData.append("ownerHostId", ownerIdentifier);
        formData.append("coverImageIndex", String(coverIndex));
        
        // Append city icon if selected
        if (cityIconFile) {
          formData.append("cityIcon", cityIconFile);
        }

        activeExistingMedia.forEach((media, index) => {
          const payload = {
            url: media.url,
            type: media.type || "image",
            isFeatured: coverIndex === index,
            order: typeof media.order === "number" ? media.order : index,
          };
          formData.append("existingMedia", JSON.stringify(payload));
        });

        newMediaFiles.forEach((file) => {
          formData.append("media", file);
        });

        const response = await updatePropertyService.updateGallery(property.id, formData);
        const responseData = response?.data;
        if (!responseData?.success) {
          throw new Error(responseData?.message || "Failed to update property gallery.");
        }
        if (responseData?.data) {
          populateState(responseData.data);
        }
        return responseData?.data;
      },
      {
        successTitle: "Gallery updated",
        successMessage: "Property gallery saved successfully.",
      }
    );

  const handleSaveRoomTypes = () =>
    runSectionSave(
      "roomTypes",
      async () => {
        if (!property?.id) {
          throw new Error("Property reference is missing.");
        }
        const ownerIdentifier = resolveOwnerIdentifier();
        if (!ownerIdentifier) {
          throw new Error("Unable to resolve host identifier.");
        }

        const preparedRoomTypes = roomTypesState.map((roomType) => {
          const minOccupancy = Number(roomType.minOccupancy) || 1;
          const maxOccupancy =
            Number(roomType.maxOccupancy) || Number(roomType.Occupancy) || minOccupancy;

          return {
            id: roomType.id || null,
            roomTypeId: roomType.roomTypeId || "",
            minOccupancy,
            maxOccupancy,
            Occupancy: maxOccupancy,
            extraBedCapacity: Number(roomType.extraBedCapacity) || 0,
            numberOfBeds: Number(roomType.numberOfBeds) || 1,
            bedType: roomType.bedType || "DOUBLE",
            isActive: Boolean(roomType.isActive),
            amenities: roomType.amenities || [],
            existingMedia: (roomType.media || []).map((media, index) => ({
              id: media.id,
              isDeleted: Boolean(media.isDeleted),
              isFeatured: Boolean(media.isFeatured),
              order: typeof media.order === "number" ? media.order : index,
            })),
          };
        });

        const formData = new FormData();
        formData.append("ownerHostId", ownerIdentifier);
        formData.append("roomTypes", JSON.stringify(preparedRoomTypes));

        roomTypesState.forEach((roomType, index) => {
          (roomType.newMedia || []).forEach((file) => {
            formData.append(`roomTypeImages_${index}`, file);
          });
        });

        const response = await updatePropertyService.updateRoomTypes(property.id, formData);
        const responseData = response?.data;
        if (!responseData?.success) {
          throw new Error(responseData?.message || "Failed to update room types.");
        }
        if (responseData?.data) {
          populateState(responseData.data);
        }
        return responseData?.data;
      },
      {
        successTitle: "Room types updated",
        successMessage: "Room type changes saved successfully.",
      }
    );

  const handleAddRoomType = () => {
    setRoomTypesState((prev) => [
      ...prev,
      {
        id: null,
        roomTypeId: "",
        minOccupancy: 1,
        maxOccupancy: 1,
        extraBedCapacity: 0,
        numberOfBeds: 1,
        bedType: "DOUBLE",
        isActive: true,
        amenities: [],
        media: [],
        newMedia: [],
      },
    ]);
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading property details…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl rounded-lg border border-red-200 bg-red-50 px-4 py-5 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (!property) {
    return (
      <div className="mx-auto max-w-3xl rounded-lg border border-gray-200 bg-white px-6 py-12 text-center text-sm text-gray-500">
        No property found for this host account.
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <header className="flex flex-col gap-3 border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            {formState.title || property.title || "Property details"}
          </h1>
          <p className="text-sm text-gray-500">
            Review and update the core information about your property. Changes take effect
            immediately after saving.
          </p>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="rounded-lg bg-blue-50 p-2">
              <Home className="h-4 w-4 text-blue-600" />
            </span>
            <div>
              <p className="text-sm font-semibold text-gray-800">{property.title}</p>
              <p className="text-xs text-gray-500">{property.propertyType?.name || "—"}</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-gray-500">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-gray-400">Status</p>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  formState.status === "active"
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {formState.status}
              </span>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-gray-400">Created</p>
              <p>{formatDate(property.createdAt)}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-gray-400">Check-in</p>
              <p>{formState.checkInTime || "—"}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-gray-400">Check-out</p>
              <p>{formState.checkOutTime || "—"}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="rounded-lg bg-purple-50 p-2">
              <User className="h-4 w-4 text-purple-600" />
            </span>
            <div>
              <p className="text-sm font-semibold text-gray-800">
                Host information
              </p>
              <p className="text-xs text-gray-500">
                {property.ownerHost?.firstName || property.ownerHost?.lastName
                  ? `${property.ownerHost?.firstName || ""} ${property.ownerHost?.lastName || ""}`.trim()
                  : "—"}
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-gray-500">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-gray-400">Email</p>
              <p>{property.ownerHost?.email || "—"}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-gray-400">Phone</p>
              <p>{property.ownerHost?.phone || "—"}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-gray-400">Verification</p>
              <p>{property.ownerHost?.isVerified ? "Verified" : "Pending"}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-gray-400">Host since</p>
              <p>{formatDate(property.ownerHost?.createdAt)}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-800">Basic details</h2>
          <div className="grid gap-3">
            <div className="grid gap-1">
              <label className="text-xs font-medium text-gray-600">Title</label>
              <input
                type="text"
                name="title"
                value={formState.title}
                onChange={handleInputChange}
                className="rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="grid gap-1">
              <label className="text-xs font-medium text-gray-600">Description</label>
              <textarea
                name="description"
                value={formState.description}
                onChange={handleInputChange}
                rows={3}
                className="rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="grid gap-1">
              <label className="text-xs font-medium text-gray-600">Rules &amp; policies</label>
              <textarea
                name="rulesAndPolicies"
                value={formState.rulesAndPolicies}
                onChange={handleInputChange}
                rows={2}
                className="rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="List important rules separated by commas"
              />
            </div>
            <div className="grid gap-1">
              <label className="text-xs font-medium text-gray-600">Status</label>
              <select
                name="status"
                value={formState.status}
                onChange={handleInputChange}
                className="rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="active">Active</option>
                {/* Note: Hosts can only set 'active' status. Only admins can set 'blocked' status. */}
                {/* 'inactive' is not a valid PropertyStatus enum value - removed for consistency */}
              </select>
            </div>
            <div className="grid gap-1">
              <label className="text-xs font-medium text-gray-600">Property type</label>
              <select
                name="propertyTypeId"
                value={formState.propertyTypeId}
                onChange={handleInputChange}
                className="rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Select property type</option>
                {propertyTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1">
                <label className="text-xs font-medium text-gray-600">Check-in</label>
                <input
                  type="time"
                  name="checkInTime"
                  value={formState.checkInTime}
                  onChange={handleInputChange}
                  className="rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="grid gap-1">
                <label className="text-xs font-medium text-gray-600">Check-out</label>
                <input
                  type="time"
                  name="checkOutTime"
                  value={formState.checkOutTime}
                  onChange={handleInputChange}
                  className="rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleSaveBasics}
              disabled={sectionSaving.basics}
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
            >
              {sectionSaving.basics ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Save className="h-3 w-3" />
              )}
              {sectionSaving.basics ? "Saving…" : "Update Basics"}
            </button>
          </div>
          </div>
        </div>

        <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-800">Address</h2>
          <div className="grid gap-3">
            <div className="grid gap-1">
              <label className="text-xs font-medium text-gray-600">Address line 1</label>
              <input
                name="line1"
                value={locationState.line1}
                onChange={handleLocationChange}
                className="rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="grid gap-1">
              <label className="text-xs font-medium text-gray-600">Address line 2</label>
              <input
                name="line2"
                value={locationState.line2}
                onChange={handleLocationChange}
                className="rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1">
                <label className="text-xs font-medium text-gray-600">Area / locality</label>
                <input
                  name="area"
                  value={locationState.area}
                  onChange={handleLocationChange}
                  className="rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="grid gap-1">
                <label className="text-xs font-medium text-gray-600">District</label>
                <input
                  name="city"
                  value={locationState.city}
                  onChange={handleLocationChange}
                  className="rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1">
                <label className="text-xs font-medium text-gray-600">State</label>
                <input
                  name="state"
                  value={locationState.state}
                  onChange={handleLocationChange}
                  className="rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="grid gap-1">
                <label className="text-xs font-medium text-gray-600">Postal code</label>
                <input
                  name="postalCode"
                  value={locationState.postalCode}
                  onChange={handleLocationChange}
                  className="rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1">
                <label className="text-xs font-medium text-gray-600">Latitude</label>
                <input
                  name="latitude"
                  value={locationState.latitude}
                  onChange={handleLocationChange}
                  className="rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="grid gap-1">
                <label className="text-xs font-medium text-gray-600">Longitude</label>
                <input
                  name="longitude"
                  value={locationState.longitude}
                  onChange={handleLocationChange}
                  className="rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* City Icon Upload */}
            <div className="grid gap-1">
              <label className="text-xs font-medium text-gray-600">City Icon (SVG) (Only one icon allowed)</label>
              {cityIconPreview && (
                <div className="mb-2 relative inline-block">
                  <div className="max-h-20 max-w-20 border border-gray-300 rounded-md p-2 bg-gray-50 flex items-center justify-center">
                    <img
                      src={cityIconPreview}
                      alt="City icon preview"
                      className="max-h-16 max-w-16 object-contain"
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
                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                    aria-label="Remove city icon"
                    title="Remove city icon"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
              {!cityIconPreview && (
                <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-2 pb-2">
                    <Upload className="w-5 h-5 mb-1 text-gray-500" />
                    <p className="mb-0.5 text-xs text-gray-500">
                      <span className="font-semibold">Click to upload</span>
                    </p>
                    <p className="text-[10px] text-gray-500">SVG (MAX. 2MB)</p>
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
                      // Reset input value to allow selecting the same file again
                      e.target.value = '';
                    }}
                    className="hidden"
                  />
                </label>
              )}
              {cityIconPreview && (
                <label className="flex flex-col items-center justify-center w-full h-16 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-1 pb-1">
                    <Upload className="w-4 h-4 mb-0.5 text-gray-500" />
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
                  />
                </label>
              )}
              {cityIconError && (
                <p className="text-red-500 text-xs mt-1">{cityIconError}</p>
              )}
            </div>
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleSaveLocation}
              disabled={sectionSaving.location}
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
            >
              {sectionSaving.location ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Save className="h-3 w-3" />
              )}
              {sectionSaving.location ? "Saving…" : "Update Address"}
            </button>
          </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-800">Cancellation policy</h2>
          <div className="grid gap-3">
            <select
              name="cancellationPolicyId"
              value={formState.cancellationPolicyId || ""}
              onChange={handleInputChange}
              className="rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select cancellation policy</option>
              {cancellationPolicies.map((policy) => (
                <option key={policy.id} value={policy.id}>
                  {policy.name}
                </option>
              ))}
            </select>

            {appliedCancellationPolicy ? (
              <div className="rounded-md border border-gray-100 bg-gray-50 p-3 text-xs text-gray-600">
                <p className="text-sm font-medium text-gray-700">
                  {appliedCancellationPolicy.name}
                </p>
                {appliedCancellationPolicy.description && (
                  <p className="mt-1">{appliedCancellationPolicy.description}</p>
                )}
                <div className="mt-3 space-y-2">
                  {appliedCancellationPolicy.rules?.map((rule) => (
                    <div
                      key={`${rule.daysBefore}-${rule.sortOrder}`}
                      className="flex items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2"
                    >
                      <span className="text-[11px] uppercase tracking-wide text-gray-400">
                        {rule.daysBefore === 0
                          ? "On check-in day"
                          : `${rule.daysBefore} day${rule.daysBefore > 1 ? "s" : ""} before`}
                      </span>
                      <span className="text-sm font-semibold text-gray-700">
                        {rule.refundPercentage}% refund
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="rounded-md border border-dashed border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-500">
                Select a cancellation policy to see the refund rules associated with bookings.
              </p>
            )}
          </div>
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleSavePolicy}
              disabled={sectionSaving.policy}
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
            >
              {sectionSaving.policy ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Save className="h-3 w-3" />
              )}
              {sectionSaving.policy ? "Saving…" : "Update Policy"}
            </button>
          </div>
        </div>

        <SelectionGrid
          title="Safety features"
          options={safetyOptions}
          selectedIds={selectedSafeties}
          onToggle={toggleSelection(setSelectedSafeties)}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <SelectionGrid
          title="Amenities"
          options={amenityOptions}
          selectedIds={selectedAmenities}
          onToggle={toggleSelection(setSelectedAmenities)}
        />
        <SelectionGrid
          title="Facilities"
          options={facilityOptions}
          selectedIds={selectedFacilities}
          onToggle={toggleSelection(setSelectedFacilities)}
        />
      </section>
      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={handleSaveFeatures}
          disabled={sectionSaving.features}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
        >
          {sectionSaving.features ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Save className="h-3 w-3" />
          )}
          {sectionSaving.features ? "Saving…" : "Update Features"}
        </button>
      </div>

      <GalleryManager
        existingMedia={existingMedia}
        newMediaFiles={newMediaFiles}
        onUpload={handleMediaUpload}
        onRemoveExisting={handleRemoveExistingMedia}
        onRemoveNew={handleRemoveNewMedia}
        coverSelection={coverSelection}
        onSetCover={setCoverSelection}
      />
      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={handleSaveGallery}
          disabled={sectionSaving.gallery}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
        >
          {sectionSaving.gallery ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Save className="h-3 w-3" />
          )}
          {sectionSaving.gallery ? "Saving…" : "Update Gallery"}
        </button>
      </div>

      <section className="space-y-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <span className="rounded-lg bg-orange-50 p-2">
              <Shield className="h-4 w-4 text-orange-600" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-gray-800">Room types</h2>
              <p className="text-xs text-gray-500">
                Manage room type details, amenities, and media assets.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleAddRoomType}
            className="inline-flex items-center gap-2 rounded-md border border-blue-500 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50"
          >
            + Add room type
          </button>
        </div>

        {roomTypesState.length ? (
          <div className="space-y-4">
            {roomTypesState.map((roomType, index) => {
              const visibleMedia = roomType.media.filter((media) => !media.isDeleted);
              return (
                <div
                  key={roomType.id ?? `room-type-${index}`}
                  className="rounded-md border border-gray-200 bg-gray-50 p-4"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="grid flex-1 gap-3 md:grid-cols-2">
                      <div className="grid gap-1">
                        <label className="text-xs font-medium text-gray-600">Room type</label>
                        <select
                          value={roomType.roomTypeId}
                          onChange={(event) =>
                            handleRoomTypeFieldChange(index, "roomTypeId", event.target.value)
                          }
                          className="rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="">Select room type</option>
                          {roomTypeOptions.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="grid gap-1">
                        <label className="text-xs font-medium text-gray-600">Status</label>
                        <select
                          value={roomType.isActive ? "true" : "false"}
                          onChange={(event) =>
                            handleRoomTypeFieldChange(index, "isActive", event.target.value === "true")
                          }
                          className="rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="true">Active</option>
                          <option value="false">Inactive</option>
                        </select>
                      </div>
                      <div className="grid gap-1">
                        <label className="text-xs font-medium text-gray-600">Min occupancy</label>
                        <input
                          type="number"
                          min={1}
                          value={roomType.minOccupancy}
                          onChange={(event) =>
                            handleRoomTypeFieldChange(index, "minOccupancy", event.target.value)
                          }
                          className="rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div className="grid gap-1">
                        <label className="text-xs font-medium text-gray-600">Max occupancy</label>
                        <input
                          type="number"
                          min={1}
                          value={roomType.maxOccupancy}
                          onChange={(event) =>
                            handleRoomTypeFieldChange(index, "maxOccupancy", event.target.value)
                          }
                          className="rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div className="grid gap-1">
                        <label className="text-xs font-medium text-gray-600">Extra bed capacity</label>
                        <input
                          type="number"
                          min={0}
                          value={roomType.extraBedCapacity}
                          onChange={(event) =>
                            handleRoomTypeFieldChange(index, "extraBedCapacity", event.target.value)
                          }
                          className="rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div className="grid gap-1">
                        <label className="text-xs font-medium text-gray-600">Number of beds</label>
                        <input
                          type="number"
                          min={1}
                          value={roomType.numberOfBeds}
                          onChange={(event) =>
                            handleRoomTypeFieldChange(index, "numberOfBeds", event.target.value)
                          }
                          className="rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div className="grid gap-1">
                        <label className="text-xs font-medium text-gray-600">Bed type</label>
                        <select
                          value={roomType.bedType}
                          onChange={(event) =>
                            handleRoomTypeFieldChange(index, "bedType", event.target.value)
                          }
                          className="rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className="text-xs font-medium text-gray-600">Amenities</p>
                    {amenityOptions.length ? (
                      <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-3">
                        {amenityOptions.map((amenity) => {
                          const checked = roomType.amenities.includes(amenity.id);
                          return (
                            <label
                              key={amenity.id}
                              className={`flex items-center gap-2 rounded-md border px-2 py-1 text-xs ${
                                checked
                                  ? "border-blue-500 bg-blue-50 text-blue-700"
                                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                              }`}
                            >
                              <input
                                type="checkbox"
                                className="h-3 w-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                checked={checked}
                                onChange={() => handleRoomTypeAmenityToggle(index, amenity.id)}
                              />
                              <span className="truncate">{amenity.name}</span>
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-gray-500">No amenity catalogue available.</p>
                    )}
                  </div>

                  <div className="mt-4 space-y-3">
                    <div>
                      <p className="text-xs font-medium text-gray-600">Existing images</p>
                      {visibleMedia.length ? (
                        <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
                          {visibleMedia.map((media) => (
                            <div key={media.id} className="relative">
                              <img
                                src={resolveMediaUrl(media.url)}
                                alt="Room type media"
                                className="h-20 w-full rounded border object-cover"
                              />
                              <button
                                type="button"
                                onClick={() => handleRoomTypeExistingImageRemove(index, media.id)}
                                className="absolute top-1 right-1 rounded-full bg-red-500 p-1 text-white shadow hover:bg-red-600"
                                aria-label="Remove image"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-2 text-xs italic text-gray-500">No images yet.</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-blue-500 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50">
                        <Upload className="h-4 w-4" />
                        Add images
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={(event) => handleRoomTypeImageUpload(index, event)}
                        />
                      </label>
                      {roomType.newMedia.length > 0 && (
                        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                          {roomType.newMedia.map((file, fileIndex) => (
                            <div key={`${file.name}-${fileIndex}`} className="relative">
                              <img
                                src={URL.createObjectURL(file)}
                                alt={file.name}
                                className="h-20 w-full rounded border object-cover"
                              />
                              <button
                                type="button"
                                onClick={() => handleRoomTypeNewImageRemove(index, fileIndex)}
                                className="absolute top-1 right-1 rounded-full bg-red-500 p-1 text-white shadow hover:bg-red-600"
                                aria-label="Remove new image"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-gray-200 bg-gray-50 px-3 py-6 text-center text-xs text-gray-500">
            No room types configured yet. Click “Add room type” to get started.
          </div>
        )}
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={handleSaveRoomTypes}
            disabled={sectionSaving.roomTypes}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
          >
            {sectionSaving.roomTypes ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Save className="h-3 w-3" />
            )}
            {sectionSaving.roomTypes ? "Saving…" : "Update Room Types"}
          </button>
        </div>
      </section>

      <NotificationModal
        isOpen={feedbackModal.isOpen}
        type={feedbackModal.type}
        title={feedbackModal.title}
        message={feedbackModal.message}
        onClose={() => setFeedbackModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

export default HostPropertyDetails;

