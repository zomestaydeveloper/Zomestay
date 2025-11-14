import { useEffect, useState } from "react";
import { Plus, Edit3, Trash2, RefreshCw } from "lucide-react";
import propertyService from "../../../services/property/admin/propertyService";
import { CardLoader } from "../../../components/Loader";
import NotificationModal from "../../../components/NotificationModal";

const getErrorMessage = (error, fallback = "Unexpected error. Please try again.") => {
  return error?.response?.data?.message || error?.message || fallback;
};

const initialFormState = {
  id: null,
  name: "",
};

const PropertyTypesManager = ({
  title = "Property Types",
  description = "Define the property categories available when creating new listings.",
  allowCreate = true,
  allowEdit = true,
  allowDelete = true,
  renderSelectionHeader,
  renderSelectionCell,
}) => {
  const [items, setItems] = useState([]);
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
      const response = await propertyService.getPropertyTypes();
      const payload = response?.data;
      if (payload?.success) {
        setItems(payload.data || []);
      } else {
        setFeedback({
          isOpen: true,
          type: "error",
          title: "Failed to load property types",
          message: payload?.message || "Unable to fetch property types.",
        });
      }
    } catch (error) {
      setFeedback({
        isOpen: true,
        type: "error",
        title: "Failed to load property types",
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

  const openEditModal = (item) => {
    if (!allowEdit) return;
    setFormState({ id: item.id, name: item.name || "" });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const validateForm = () => {
    const errors = {};
    if (!formState.name.trim()) {
      errors.name = "Property type name is required";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleDelete = async (item) => {
    if (!allowDelete) return;
    const confirmed = window.confirm(`Delete property type "${item.name}"?`);
    if (!confirmed) return;

    try {
      await propertyService.deletePropertyType(item.id);
      setFeedback({
        isOpen: true,
        type: "success",
        title: "Property type deleted",
        message: `${item.name} has been removed successfully.`,
      });
      await refreshList();
    } catch (error) {
      setFeedback({
        isOpen: true,
        type: "error",
        title: "Failed to delete property type",
        message: getErrorMessage(error),
      });
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    const payload = { name: formState.name.trim() };

    try {
      if (formState.id) {
        await propertyService.updatePropertyType(formState.id, payload);
        setFeedback({
          isOpen: true,
          type: "success",
          title: "Property type updated",
          message: "Property type name was updated successfully.",
        });
      } else {
        await propertyService.createPropertyType(payload);
        setFeedback({
          isOpen: true,
          type: "success",
          title: "Property type created",
          message: "Property type was added successfully.",
        });
      }

      closeModal();
      await refreshList();
    } catch (error) {
      setFeedback({
        isOpen: true,
        type: "error",
        title: formState.id ? "Failed to update property type" : "Failed to create property type",
        message: getErrorMessage(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderSelectionHeaderContent =
    typeof renderSelectionHeader === "function" ? renderSelectionHeader() : null;

  const renderSelectionCellContent = (item) => {
    if (typeof renderSelectionCell === "function") {
      return renderSelectionCell(item);
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
              Add Property Type
            </button>
          )}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        {isLoading ? (
          <CardLoader text="Loading property types..." />
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            No property types found.{" "}
            {allowCreate ? 'Click "Add Property Type" to create one.' : "Please check again later."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Name</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Created</th>
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
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{item.name}</p>
                      <p className="text-xs text-gray-500">ID: {item.id}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "-"}
                    </td>
                    {renderSelectionHeaderContent && (
                      <td className="px-4 py-3">{renderSelectionCellContent(item)}</td>
                    )}
                    {hasActions && (
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          {allowEdit && (
                            <button
                              onClick={() => openEditModal(item)}
                              className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                            >
                              <Edit3 className="h-4 w-4" />
                              Edit
                            </button>
                          )}
                          {allowDelete && (
                            <button
                              onClick={() => handleDelete(item)}
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
          <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
            <form onSubmit={handleSubmit} className="space-y-5 p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {formState.id ? "Edit Property Type" : "Add Property Type"}
                  </h2>
                  <p className="text-xs text-gray-500">
                    Enter a descriptive name for the property type.
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

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Property Type Name
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
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="e.g., Resort, Villa, Homestay"
                  disabled={isSubmitting}
                />
                {formErrors.name && (
                  <p className="mt-1 text-xs text-red-600">{formErrors.name}</p>
                )}
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
                >
                  {isSubmitting ? (
                    <>
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Saving...
                    </>
                  ) : formState.id ? (
                    "Save Changes"
                  ) : (
                    "Create Property Type"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <NotificationModal
        isOpen={feedback.isOpen}
        type={feedback.type}
        title={feedback.title}
        message={feedback.message}
        onClose={() => setFeedback((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

export default PropertyTypesManager;

