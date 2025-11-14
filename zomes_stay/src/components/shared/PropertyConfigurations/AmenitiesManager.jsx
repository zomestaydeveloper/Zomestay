import { useEffect, useMemo, useState } from "react";
import { Plus, Edit3, Trash2, Image as ImageIcon, RefreshCw } from "lucide-react";
import propertyService from "../../../services/property/admin/propertyService";
import { mediaService } from "../../../services";
import { CardLoader } from "../../../components/Loader";
import NotificationModal from "../../../components/NotificationModal";

const CATEGORY_OPTIONS = [
  { value: "KITCHEN", label: "Kitchen" },
  { value: "BATHROOM", label: "Bathroom" },
  { value: "ENTERTAINMENT", label: "Entertainment" },
  { value: "COMFORT", label: "Comfort" },
  { value: "SAFETY", label: "Safety" },
  { value: "OUTDOOR", label: "Outdoor" },
  { value: "LAUNDRY", label: "Laundry" },
  { value: "TECHNOLOGY", label: "Technology" },
  { value: "OTHER", label: "Other" },
];

const initialFormState = {
  id: null,
  name: "",
  category: "OTHER",
  isActive: true,
  iconFile: null,
  iconPreview: "",
};

const buildIconUrl = (iconPath) => {
  return mediaService.getMedia(iconPath);
};

const getErrorMessage = (error, fallback = "Unexpected error. Please try again.") => {
  return error?.response?.data?.message || error?.message || fallback;
};

const AmenitiesManager = ({
  title = "Amenities",
  description = "Manage amenity catalog used across properties and room types.",
  allowCreate = true,
  allowEdit = true,
  allowDelete = true,
  allowStatusToggle = true,
  renderSelectionHeader,
  renderSelectionCell,
}) => {
  const [amenities, setAmenities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formState, setFormState] = useState(initialFormState);
  const [formErrors, setFormErrors] = useState({});
  const [feedback, setFeedback] = useState({
    isOpen: false,
    type: "success",
    title: "",
    message: "",
  });

  const refreshList = async () => {
    setIsLoading(true);
    try {
      const response = await propertyService.getAmenities();
      const payload = response?.data;
      if (payload?.success) {
        setAmenities(payload.data || []);
      } else {
        setFeedback({
          isOpen: true,
          type: "error",
          title: "Failed to load amenities",
          message: payload?.message || "Unable to fetch amenities list.",
        });
      }
    } catch (error) {
      setFeedback({
        isOpen: true,
        type: "error",
        title: "Failed to load amenities",
        message: getErrorMessage(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshList();
  }, []);

  const closeModal = () => {
    setIsModalOpen(false);
    setFormState(initialFormState);
    setFormErrors({});
  };

  const openCreateModal = () => {
    if (!allowCreate) return;
    setFormState(initialFormState);
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (amenity) => {
    if (!allowEdit) return;
    setFormState({
      id: amenity.id,
      name: amenity.name || "",
      category: amenity.category || "OTHER",
      isActive: amenity.isActive ?? true,
      iconFile: null,
      iconPreview: buildIconUrl(amenity.icon),
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const validateForm = () => {
    const errors = {};
    if (!formState.name.trim()) {
      errors.name = "Amenity name is required";
    }
    if (!formState.category) {
      errors.category = "Category is required";
    }
    if (!formState.id && !formState.iconFile) {
      errors.icon = "Icon (SVG) is required";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      setFormState((prev) => ({ ...prev, iconFile: null }));
      return;
    }

    if (file.type !== "image/svg+xml") {
      setFormErrors((prev) => ({
        ...prev,
        icon: "Please upload an SVG icon",
      }));
      return;
    }

    setFormErrors((prev) => {
      const next = { ...prev };
      delete next.icon;
      return next;
    });

    const previewUrl = URL.createObjectURL(file);
    setFormState((prev) => ({
      ...prev,
      iconFile: file,
      iconPreview: previewUrl,
    }));
  };

  const handleToggleStatus = async (amenity) => {
    if (!allowStatusToggle) return;
    const formData = new FormData();
    formData.append("isActive", (!amenity.isActive).toString());

    try {
      await propertyService.updateAmenity(amenity.id, formData);
      setFeedback({
        isOpen: true,
        type: "success",
        title: "Amenity updated",
        message: `${amenity.name} is now ${!amenity.isActive ? "active" : "inactive"}.`,
      });
      await refreshList();
    } catch (error) {
      setFeedback({
        isOpen: true,
        type: "error",
        title: "Failed to update amenity",
        message: getErrorMessage(error),
      });
    }
  };

  const handleDelete = async (amenity) => {
    if (!allowDelete) return;
    const confirmed = window.confirm(`Delete amenity "${amenity.name}"?`);
    if (!confirmed) return;

    try {
      await propertyService.deleteAmenity(amenity.id);
      setFeedback({
        isOpen: true,
        type: "success",
        title: "Amenity deleted",
        message: `${amenity.name} has been removed successfully.`,
      });
      await refreshList();
    } catch (error) {
      setFeedback({
        isOpen: true,
        type: "error",
        title: "Failed to delete amenity",
        message: getErrorMessage(error),
      });
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    const formData = new FormData();
    formData.append("name", formState.name.trim());
    formData.append("category", formState.category);
    formData.append("isActive", formState.isActive.toString());
    if (formState.iconFile) {
      formData.append("icon", formState.iconFile);
    }

    try {
      if (formState.id) {
        await propertyService.updateAmenity(formState.id, formData);
        setFeedback({
          isOpen: true,
          type: "success",
          title: "Amenity updated",
          message: "Amenity details were saved successfully.",
        });
      } else {
        await propertyService.createAmenity(formData);
        setFeedback({
          isOpen: true,
          type: "success",
          title: "Amenity created",
          message: "Amenity was added successfully.",
        });
      }

      closeModal();
      await refreshList();
    } catch (error) {
      setFeedback({
        isOpen: true,
        type: "error",
        title: formState.id ? "Failed to update amenity" : "Failed to create amenity",
        message: getErrorMessage(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const categoryLabelMap = useMemo(() => {
    return CATEGORY_OPTIONS.reduce((acc, option) => {
      acc[option.value] = option.label;
      return acc;
    }, {});
  }, []);

  const renderSelectionHeaderContent =
    typeof renderSelectionHeader === "function" ? renderSelectionHeader() : null;

  const renderSelectionCellContent = (amenity) => {
    if (typeof renderSelectionCell === "function") {
      return renderSelectionCell(amenity);
    }
    return null;
  };

  const hasActions = allowEdit || allowDelete;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refreshList}
            className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          {allowCreate && (
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Add Amenity
            </button>
          )}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        {isLoading ? (
          <CardLoader text="Loading amenities..." />
        ) : amenities.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            No amenities found. {allowCreate ? 'Click "Add Amenity" to create your first entry.' : "Please check again later."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Amenity</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Category</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Icon</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
                  {renderSelectionHeaderContent && (
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">
                      {renderSelectionHeaderContent}
                    </th>
                  )}
                  {hasActions && (
                    <th className="px-4 py-3 text-right font-semibold text-gray-600">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {amenities.map((amenity) => (
                  <tr key={amenity.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{amenity.name}</p>
                      <p className="text-xs text-gray-500">ID: {amenity.id}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {categoryLabelMap[amenity.category] || amenity.category}
                    </td>
                    <td className="px-4 py-3">
                      {amenity.icon ? (
                        <img
                          src={buildIconUrl(amenity.icon)}
                          alt={amenity.name}
                          className="h-8 w-8 object-contain"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = "";
                          }}
                        />
                      ) : (
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          <ImageIcon className="h-4 w-4" />
                          No icon
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {allowStatusToggle ? (
                        <button
                          onClick={() => handleToggleStatus(amenity)}
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                            amenity.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {amenity.isActive ? "Active" : "Inactive"}
                        </button>
                      ) : (
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                            amenity.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {amenity.isActive ? "Active" : "Inactive"}
                        </span>
                      )}
                    </td>
                    {renderSelectionHeaderContent && (
                      <td className="px-4 py-3">{renderSelectionCellContent(amenity)}</td>
                    )}
                    {hasActions && (
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          {allowEdit && (
                            <button
                              onClick={() => openEditModal(amenity)}
                              className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                            >
                              <Edit3 className="h-4 w-4" />
                              Edit
                            </button>
                          )}
                          {allowDelete && (
                            <button
                              onClick={() => handleDelete(amenity)}
                              className="inline-flex items-center gap-1 rounded-md border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

  {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
            <form onSubmit={handleSubmit} className="space-y-6 p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {formState.id ? "Edit Amenity" : "Add Amenity"}
                  </h2>
                  <p className="text-xs text-gray-500">
                    Provide the amenity name, category, and SVG icon.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  className="text-sm text-gray-400 hover:text-gray-600"
                >
                  Close
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    Amenity Name
                  </label>
                  <input
                    type="text"
                    value={formState.name}
                    onChange={(event) => {
                      setFormState((prev) => ({ ...prev, name: event.target.value }));
                      setFormErrors((prev) => {
                        const next = { ...prev };
                        delete next.name;
                        return next;
                      });
                    }}
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Enter amenity name"
                    disabled={isSubmitting}
                  />
                  {formErrors.name && (
                    <p className="mt-1 text-xs text-red-600">{formErrors.name}</p>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    Category
                  </label>
                  <select
                    value={formState.category}
                    onChange={(event) => {
                      setFormState((prev) => ({ ...prev, category: event.target.value }));
                      setFormErrors((prev) => {
                        const next = { ...prev };
                        delete next.category;
                        return next;
                      });
                    }}
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    disabled={isSubmitting}
                  >
                    {CATEGORY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {formErrors.category && (
                    <p className="mt-1 text-xs text-red-600">{formErrors.category}</p>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    Icon (SVG)
                  </label>
                  <div className="flex items-center gap-3">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50">
                      <input
                        type="file"
                        accept="image/svg+xml"
                        className="hidden"
                        onChange={handleFileChange}
                        disabled={isSubmitting}
                      />
                      Upload SVG
                    </label>
                    {formState.iconPreview && (
                      <img
                        src={formState.iconPreview}
                        alt="Icon preview"
                        className="h-8 w-8 object-contain"
                      />
                    )}
                  </div>
                  {formErrors.icon && (
                    <p className="mt-1 text-xs text-red-600">{formErrors.icon}</p>
                  )}
                </div>

                <div className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-2">
                  <span className="text-xs font-medium text-gray-700">Active status</span>
                  <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={formState.isActive}
                      onChange={(event) =>
                        setFormState((prev) => ({ ...prev, isActive: event.target.checked }))
                      }
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      disabled={isSubmitting}
                    />
                    <span>{formState.isActive ? "Active" : "Inactive"}</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting ? "Saving..." : formState.id ? "Save changes" : "Create amenity"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <NotificationModal feedback={feedback} setFeedback={setFeedback} />
    </div>
  );
};

export default AmenitiesManager;

