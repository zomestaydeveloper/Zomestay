import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Eye, X, Info } from "lucide-react";
import { cancellationPolicyService } from "../../../services/property/admin";
import NotificationModal from "../../../components/NotificationModal";
import { CardLoader } from "../../../components/Loader";

const generateId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `temp-${Math.random().toString(36).slice(2, 11)}`;
};

const emptyPolicyTemplate = {
  id: null,
  name: "",
  description: "",
  rules: [
    {
      id: generateId(),
      daysBefore: 7,
      refundPercentage: 100,
      sortOrder: 0,
    },
    {
      id: generateId(),
      daysBefore: 0,
      refundPercentage: 0,
      sortOrder: 1,
    },
  ],
};

const sortRules = (rules) =>
  [...rules].sort((a, b) => b.daysBefore - a.daysBefore).map((rule, index) => ({
    ...rule,
    sortOrder: index,
  }));

const Modal = ({ isOpen, title, children, onClose, width = "max-w-3xl" }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
      <div className={`w-full ${width} rounded-lg bg-white shadow-xl`}>
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
};

const PolicyForm = ({ state, onChange, errors }) => {
  const handleRuleChange = (id, field, value) => {
    onChange({
      ...state,
      rules: state.rules.map((rule) =>
        rule.id === id ? { ...rule, [field]: value } : rule
      ),
    });
  };

  const addRule = () => {
    onChange({
      ...state,
      rules: [
        ...state.rules,
        {
          id: generateId(),
          daysBefore: 0,
          refundPercentage: 0,
          sortOrder: state.rules.length,
        },
      ],
    });
  };

  const removeRule = (id) => {
    if (state.rules.length <= 1) return;
    onChange({
      ...state,
      rules: state.rules.filter((rule) => rule.id !== id),
    });
  };

    return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-600">
            Policy Name*
          </label>
          <input
            type="text"
            value={state.name}
            onChange={(e) => onChange({ ...state, name: e.target.value })}
            placeholder="e.g. Flexible 3-Day"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          {errors.name && (
            <p className="mt-1 text-xs text-red-500">{errors.name}</p>
          )}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-600">
          Description
        </label>
        <textarea
          value={state.description}
          onChange={(e) => onChange({ ...state, description: e.target.value })}
          rows={3}
          placeholder="Short summary describing how refunds are handled."
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
      </div>

        <div>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-900">
              Cancellation Rules
            </h3>
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-[11px] font-medium text-blue-700">
              <Info size={12} /> Ordered by earliest day, last rule is same-day
              cancellation.
            </span>
          </div>
          <button
            type="button"
            onClick={addRule}
            className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-blue-700"
          >
            <Plus size={14} />
            Add Rule
          </button>
        </div>

        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">Days Before Check-in</th>
                <th className="px-4 py-3">Refund %</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {state.rules.map((rule, idx) => (
                <tr key={rule.id}>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min={0}
                      value={rule.daysBefore}
                      onChange={(e) =>
                        handleRuleChange(
                          rule.id,
                          "daysBefore",
                          Number.parseInt(e.target.value, 10) || 0
                        )
                      }
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-200"
                    />
                    {errors[`days-${rule.id}`] && (
                      <p className="mt-1 text-xs text-red-500">
                        {errors[`days-${rule.id}`]}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={rule.refundPercentage}
                      onChange={(e) =>
                        handleRuleChange(
                          rule.id,
                          "refundPercentage",
                          Number.parseInt(e.target.value, 10) || 0
                        )
                      }
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-200"
                    />
                    {errors[`refund-${rule.id}`] && (
                      <p className="mt-1 text-xs text-red-500">
                        {errors[`refund-${rule.id}`]}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => removeRule(rule.id)}
                      className={`rounded-md border px-3 py-1.5 text-xs font-medium transition ${
                        state.rules.length <= 1
                          ? "cursor-not-allowed border-gray-200 text-gray-300"
                          : "border-red-200 text-red-600 hover:bg-red-50"
                      }`}
                      disabled={state.rules.length <= 1}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const CancellationPolicy = () => {
  const [policies, setPolicies] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [formState, setFormState] = useState(emptyPolicyTemplate);
  const [errors, setErrors] = useState({});
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState({
    isOpen: false,
    type: "success",
    title: "",
    message: "",
  });

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    cancellationPolicyService
      .list()
      .then(({ data }) => {
        if (!isMounted) return;
        if (data?.success && Array.isArray(data.data)) {
          const normalised = data.data.map((policy) => ({
            ...policy,
            rules: sortRules(policy.rules || []),
          }));
          setPolicies(normalised);
        } else {
          openNotification({
            type: "error",
            title: "Unable to Fetch Policies",
            message: data?.message || "Failed to load cancellation policies.",
          });
        }
      })
      .catch((error) => {
        if (!isMounted) return;
        console.error("Failed to fetch cancellation policies:", error);
        openNotification({
          type: "error",
          title: "Fetch Failed",
          message:
            error.response?.data?.message ||
            "Failed to load cancellation policies.",
        });
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const openNotification = ({ type, title, message }) => {
    setNotification({
      isOpen: true,
      type,
      title,
      message,
    });
  };

  const closeNotification = () =>
    setNotification((prev) => ({ ...prev, isOpen: false }));

  const openCreate = () => {
    setFormState(emptyPolicyTemplate);
    setErrors({});
    setIsFormOpen(true);
  };

  const openEdit = (policy) => {
    setFormState({
      id: policy.id,
      name: policy.name || "",
      description: policy.description || "",
      rules: (policy.rules || []).map((rule) => ({
        ...rule,
        id: rule.id ?? generateId(),
      })),
    });
    setErrors({});
    setIsFormOpen(true);
  };

  const openView = (policy) => {
    setSelectedPolicy(policy);
    setIsViewOpen(true);
  };

  const openDelete = (policy) => {
    setSelectedPolicy(policy);
    setIsDeleteOpen(true);
  };

  const validateForm = () => {
    const nextErrors = {};

    if (!formState.name.trim()) {
      nextErrors.name = "Policy name is required.";
    }
    if (!Array.isArray(formState.rules) || formState.rules.length === 0) {
      nextErrors.rules = "At least one rule is required.";
    }

    formState.rules.forEach((rule) => {
      if (rule.daysBefore < 0) {
        nextErrors[`days-${rule.id}`] = "Days must be zero or positive.";
      }
      if (
        rule.refundPercentage < 0 ||
        rule.refundPercentage > 100 ||
        Number.isNaN(rule.refundPercentage)
      ) {
        nextErrors[`refund-${rule.id}`] =
          "Refund must be between 0 and 100 percent.";
      }
    });

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    const isEditing = Boolean(formState.id);
    const payload = {
      name: formState.name.trim(),
      description: formState.description?.trim() || null,
      rules: sortRules(
        formState.rules.map((rule) => ({
          daysBefore: Number(rule.daysBefore),
          refundPercentage: Number(rule.refundPercentage),
        }))
      ),
    };

    setIsSubmitting(true);

    try {
      const response = isEditing
        ? await cancellationPolicyService.update(formState.id, payload)
        : await cancellationPolicyService.create(payload);
      const { data } = response;

      if (data?.success && data?.data) {
        const saved = {
          ...data.data,
          rules: sortRules(data.data.rules || []),
        };

        setPolicies((prev) => {
          const withoutCurrent = prev.filter(
            (policy) => policy.id !== saved.id
          );
          return [...withoutCurrent, saved].sort((a, b) =>
            a.name.localeCompare(b.name)
          );
        });

        if (selectedPolicy && selectedPolicy.id === saved.id) {
          setSelectedPolicy(saved);
        }

        setIsFormOpen(false);
        setFormState(emptyPolicyTemplate);
        openNotification({
          type: "success",
          title: isEditing ? "Policy Updated" : "Policy Created",
          message:
            data.message ||
            `Cancellation policy ${
              isEditing ? "updated" : "created"
            } successfully.`,
        });
      } else {
        openNotification({
          type: "error",
          title: isEditing
            ? "Unable to Update Policy"
            : "Unable to Create Policy",
          message:
            data?.message ||
            `Failed to ${isEditing ? "update" : "create"} cancellation policy.`,
        });
      }
    } catch (error) {
      console.error("Failed to save cancellation policy:", error);
      const message =
        error.response?.data?.message ||
        `Failed to ${isEditing ? "update" : "create"} cancellation policy.`;
      openNotification({
        type: "error",
        title: isEditing ? "Update Failed" : "Creation Failed",
        message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedPolicy) return;

    setIsDeleting(true);
    try {
      const { data } = await cancellationPolicyService.remove(
        selectedPolicy.id
      );

      if (data?.success) {
        setPolicies((prev) =>
          prev.filter((policy) => policy.id !== selectedPolicy.id)
        );
        openNotification({
          type: "success",
          title: "Policy Deleted",
          message: data.message || "Cancellation policy deleted successfully.",
        });
        setIsDeleteOpen(false);
        setSelectedPolicy(null);
      } else {
        openNotification({
          type: "error",
          title: "Unable to Delete Policy",
          message: data?.message || "Failed to delete cancellation policy.",
        });
      }
    } catch (error) {
      console.error("Failed to delete cancellation policy:", error);
      const message =
        error.response?.data?.message ||
        "Failed to delete cancellation policy.";
      openNotification({
        type: "error",
        title: "Deletion Failed",
        message,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Cancellation Policies
            </h1>
            <p className="text-sm text-gray-500">
              Configure refund rules that apply when guests cancel their stay.
            </p>
          </div>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
          >
            <Plus size={16} />
            Create Policy
          </button>
        </div>

        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          {isLoading ? (
            <div className="py-12">
              <CardLoader text="Loading cancellation policies..." />
            </div>
          ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="px-6 py-3">Policy</th>
                <th className="px-6 py-3">Rules</th>
                <th className="px-6 py-3">Updated</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {policies.map((policy) => (
                <tr key={policy.id} className="bg-white">
                  <td className="px-6 py-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900">
                            {policy.name}
                          </span>
                        </div>
                        {policy.description && (
                          <p className="mt-1 text-xs text-gray-500">
                            {policy.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-2">
                      {policy.rules
                        .slice()
                        .sort((a, b) => a.sortOrder - b.sortOrder)
                        .map((rule) => (
                          <span
                            key={`${policy.id}-${rule.sortOrder}`}
                            className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-[11px] font-medium text-gray-600"
                          >
                            {rule.daysBefore === 0
                              ? "Same day"
                              : `${rule.daysBefore}d`}{" "}
                            • {rule.refundPercentage}%
                          </span>
                        ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {policy.updatedAt
                      ? new Date(policy.updatedAt).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openView(policy)}
                        className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50"
                      >
                        <Eye size={14} />
                        View
                      </button>
                      <button
                        onClick={() => openEdit(policy)}
                        className="inline-flex items-center gap-1 rounded-md border border-blue-200 px-3 py-1.5 text-xs font-medium text-blue-600 transition hover:bg-blue-50"
                      >
                        <Pencil size={14} />
                        Edit
                      </button>
                      <button
                        onClick={() => openDelete(policy)}
                        className="inline-flex items-center gap-1 rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {policies.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-12 text-center text-sm text-gray-500"
                  >
                    No cancellation policies yet. Create one to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          )}
        </div>
      </div>

      <Modal
        isOpen={isFormOpen}
        title={`${formState.id ? "Edit" : "Create"} Cancellation Policy`}
        onClose={() => setIsFormOpen(false)}
      >
        <div className="space-y-6">
          <PolicyForm
            state={formState}
            onChange={setFormState}
            errors={errors}
          />
          {errors.rules && (
            <p className="text-sm text-red-500">{errors.rules}</p>
          )}
          <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
            <button
              onClick={() => setIsFormOpen(false)}
              className="rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSubmitting}
              className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-white shadow-sm transition ${
                isSubmitting
                  ? "bg-blue-400 cursor-not-allowed opacity-70"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {isSubmitting ? "Saving..." : "Save Policy"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isViewOpen && Boolean(selectedPolicy)}
        title="Policy Details"
        onClose={() => setIsViewOpen(false)}
        width="max-w-2xl"
      >
        {selectedPolicy && (
          <div className="space-y-5">
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedPolicy.name}
                </h3>
              </div>
              {selectedPolicy.description && (
                <p className="mt-2 text-sm text-gray-600">
                  {selectedPolicy.description}
                </p>
              )}
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900">
                Refund Rules
              </h4>
              <ul className="mt-3 space-y-2">
                {selectedPolicy.rules
                  .slice()
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((rule) => (
                    <li
                      key={`${selectedPolicy.id}-view-${rule.sortOrder}`}
                      className="flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700"
                    >
                      <span>
                        {rule.daysBefore === 0
                          ? "Cancellation on check-in day"
                          : `Cancellation ${rule.daysBefore} day${
                              rule.daysBefore > 1 ? "s" : ""
                            } before check-in`}
                      </span>
                      <span className="font-semibold text-gray-900">
                        {rule.refundPercentage}% refund
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
            <div className="flex flex-col gap-1 text-xs text-gray-500">
              <span>
                Created:{" "}
                {selectedPolicy.createdAt
                  ? new Date(selectedPolicy.createdAt).toLocaleString()
                  : "—"}
              </span>
              <span>
                Updated:{" "}
                {selectedPolicy.updatedAt
                  ? new Date(selectedPolicy.updatedAt).toLocaleString()
                  : "—"}
              </span>
              <span>Policy ID: {selectedPolicy.id}</span>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={isDeleteOpen && Boolean(selectedPolicy)}
        title="Delete Policy"
        onClose={() => setIsDeleteOpen(false)}
        width="max-w-lg"
      >
        {selectedPolicy && (
          <div className="space-y-5">
            <p className="text-sm text-gray-600">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-gray-900">
                {selectedPolicy.name}
              </span>
              ?
            </p>
            <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
              <button
                onClick={() => setIsDeleteOpen(false)}
                className="rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-white shadow-sm transition ${
                  isDeleting
                    ? "bg-red-400 cursor-not-allowed opacity-70"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                <Trash2 size={14} />
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        )}
      </Modal>
      <NotificationModal
        isOpen={notification.isOpen}
        type={notification.type}
        title={notification.title}
        message={notification.message}
        onClose={closeNotification}
      />
    </div>
  );
};

export default CancellationPolicy;