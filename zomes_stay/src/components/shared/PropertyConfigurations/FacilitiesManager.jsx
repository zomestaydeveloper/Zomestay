import { useEffect, useMemo, useState } from "react";
import { Plus, Edit3, Trash2, Image as ImageIcon, RefreshCw } from "lucide-react";
import propertyService from "../../../services/property/admin/propertyService";
import { mediaService } from "../../../services";
import { CardLoader } from "../../../components/Loader";
import NotificationModal from "../../../components/NotificationModal";

const buildIconUrl = (iconPath) => {
  return mediaService.getMedia(iconPath);
};

const getErrorMessage = (error, fallback = "Unexpected error. Please try again.") => {
  return error?.response?.data?.message || error?.message || fallback;
};

const initialFormState = {
  id: null,
  name: "",
  isActive: true,
  iconFile: null,
  iconPreview: "",
};

const FacilitiesManager = ({
  title = "Facilities",
  description = "Manage property-level facilities shown to guests and hosts.",
  allowCreate = true,
  allowEdit = true,
  allowDelete = true,
  allowStatusToggle = true,
  renderSelectionHeader,
  renderSelectionCell,
}) => {
  const [facilities, setFacilities] = useState([]);
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
      const response = await propertyService.getFacilities();
      const payload = response?.data;
      if (payload?.success) {
        setFacilities(payload.data || []);
      } else {
        setFeedback({
          isOpen: true,
          type: "error",
          title: "Failed to load facilities",
          message: payload?.message || "Unable to fetch facilities list.",
        });
      }
    } catch (error) {
      setFeedback({
        isOpen: true,
        type: "error",
        title: "Failed to load facilities",
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

  const openEditModal = (facility) => {
    if (!allowEdit) return;
    setFormState({
      id: facility.id,
      name: facility.name || "",
      isActive: facility.isActive ?? true,
      iconFile: null,
      iconPreview: buildIconUrl(facility.icon),
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const validateForm = () => {
    const errors = {};
    if (!formState.name.trim()) {
      errors.name = "Facility name is required";
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

  const handleToggleStatus = async (facility) => {
    if (!allowStatusToggle) return;
    const formData = new FormData();
    formData.append("isActive", (!facility.isActive).toString());

    try {
      await propertyService.updateFacility(facility.id, formData);
      setFeedback({
        isOpen: true,
        type: "success",
        title: "Facility updated",
        message: `${facility.name} is now ${!facility.isActive ? "active" : "inactive"}.`,
      });
      await refreshList();
    } catch (error) {
      setFeedback({
        isOpen: true,
        type: "error",
        title: "Failed to update facility",
        message: getErrorMessage(error),
      });
    }
  };

  const handleDelete = async (facility) => {
    if (!allowDelete) return;
    const confirmed = window.confirm(`Delete facility "${facility.name}"?`);
    if (!confirmed) return;

    try {
      await propertyService.deleteFacility(facility.id);
      setFeedback({
        isOpen: true,
        type: "success",
        title: "Facility deleted",
        message: `${facility.name} has been removed successfully.`,
      });
      await refreshList();
    } catch (error) {
      setFeedback({
        isOpen: true,
        type: "error",
        title: "Failed to delete facility",
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
    formData.append("isActive", formState.isActive.toString());
    if (formState.iconFile) {
      formData.append("icon", formState.iconFile);
    }

    try {
      if (formState.id) {
        await propertyService.updateFacility(formState.id, formData);
        setFeedback({
          isOpen: true,
          type: "success",
          title: "Facility updated",
          message: "Facility details were saved successfully.",
        });
      } else {
        await propertyService.createFacility(formData);
        setFeedback({
          isOpen: true,
          type: "success",
          title: "Facility created",
          message: "Facility was added successfully.",
        });
      }

      closeModal();
      await refreshList();
    } catch (error) {
      setFeedback({
        isOpen: true,
        type: "error",
        title: formState.id ? "Failed to update facility" : "Failed to create facility",
        message: getErrorMessage(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const categoryLabel = useMemo(() => {
    return (value) => {
      if (!value) return "-";
      return value
        .toLowerCase()
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
    };
  }, []);

  const renderSelectionHeaderContent =
    typeof renderSelectionHeader === "function" ? renderSelectionHeader() : null;

  const renderSelectionCellContent = (facility) => {
    if (typeof renderSelectionCell === "function") {
      return renderSelectionCell(facility);
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
              Add Facility
            </button>
          )}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        {isLoading ? (
          <CardLoader text="Loading facilities..." />
        ) : facilities.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            No facilities found.{" "}
            {allowCreate ? 'Click "Add Facility" to create your first entry.' : "Please check again later."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Facility</th>
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
                {facilities.map((facility) => (
                  <tr key={facility.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{facility.name}</p>
                      <p className="text-xs text-gray-500">ID: {facility.id}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{categoryLabel(facility.category)}</td>
                    <td className="px-4 py-3">
                      {facility.icon ? (
                        <img
                          src={buildIconUrl(facility.icon)}
                          alt={facility.name}
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
                          onClick={() => handleToggleStatus(facility)}
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                            facility.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {facility.isActive ? "Active" : "Inactive"}
                        </button>
                      ) : (
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                            facility.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {facility.isActive ? "Active" : "Inactive"}
                        </span>
                      )}
                    </td>
                    {renderSelectionHeaderContent && (
                      <td className="px-4 py-3">{renderSelectionCellContent(facility)}</td>
                    )}
                    {hasActions && (
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          {allowEdit && (
                            <button
                              onClick={() => openEditModal(facility)}
                              className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                            >
                              <Edit3 className="h-4 w-4" />
                              Edit
                            </button>
                          )}
                          {allowDelete && (
                            <button
                              onClick={() => handleDelete(facility)}
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
                    {formState.id ? "Edit Facility" : "Add Facility"}
                  </h2>
                  <p className="text-xs text-gray-500">Provide the facility name and SVG icon.</p>
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
                  <label className="mb-1 block text-xs font-medium text-gray-700">Facility Name</label>
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
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="e.g., Swimming Pool"
                    disabled={isSubmitting}
                  />
                  {formErrors.name && (
                    <p className="mt-1 text-xs text-red-600">{formErrors.name}</p>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">SVG Icon</label>
                  <input
                    type="file"
                    accept="image/svg+xml"
                    onChange={handleFileChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    disabled={isSubmitting}
                  />
                  {formErrors.icon && (
                    <p className="mt-1 text-xs text-red-600">{formErrors.icon}</p>
                  )}
                  {formState.iconPreview && (
                    <img
                      src={formState.iconPreview}
                      alt="Icon preview"
                      className="mt-2 h-8 w-8 object-contain"
                    />
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
                  {isSubmitting ? "Saving..." : formState.id ? "Save changes" : "Create facility"}
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

export default FacilitiesManager;

