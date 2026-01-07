import React, { useState, useEffect } from "react";
import { Search, Plus, Edit2, Trash2, DollarSign, Users, Calendar, AlertCircle, Check, X } from "lucide-react";
import { mealPlanService } from "../../../services";
import { useSelector } from "react-redux";


const MEAL_PLAN_KINDS = [
  { label: "European Plan (EP)", value: "EP", description: "Room only" },
  { label: "Continental Plan (CP)", value: "CP", description: "Room + Breakfast" },
  { label: "Modified American Plan (MAP)", value: "MAP", description: "Room + Breakfast + Dinner" },
  { label: "American Plan (AP)", value: "AP", description: "Room + All Meals" },
];

const MealPlans = ({ isAdmin = false, adminProperty = null, propertyId: adminPropertyId = null }) => {
  const [mealPlans, setMealPlans] = useState([]);
  const [filteredPlans, setFilteredPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedKind, setSelectedKind] = useState("");
  const [notification, setNotification] = useState(null);

  // Use admin property ID if in admin mode, otherwise use Redux state
  const { property } = useSelector((state) => state.property);
  console.log(property, 'kk')
  const propertyId = adminPropertyId || property?.id;

  console.log("property", property);
  console.log("isAdmin", isAdmin);
  console.log("adminProperty", adminProperty);
  // Form state
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    kind: "",
    description: "",
  });
  const [formErrors, setFormErrors] = useState({});
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Notification system
  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Validation rules
  const validateForm = () => {
    const errors = {};

    if (!formData.code.trim()) {
      errors.code = "Code is required";
    } else if (!/^[A-Z]{2}\d{3}$/.test(formData.code.trim())) {
      errors.code = "Code must be in format: XX000 (e.g., EP001)";
    } else {
      const isDuplicate = mealPlans.some(plan =>
        plan.code === formData.code.trim() && plan.id !== editing?.id
      );
      if (isDuplicate) {
        errors.code = "Code already exists";
      }
    }

    if (!formData.name.trim()) {
      errors.name = "Name is required";
    } else if (formData.name.trim().length < 3) {
      errors.name = "Name must be at least 3 characters";
    }

    if (!formData.kind) {
      errors.kind = "Plan type is required";
    }



    if (formData.description.length > 200) {
      errors.description = "Description cannot exceed 200 characters";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Fetch data
  const fetchData = async () => {
    setLoading(true);
    try {
      const service = mealPlanService;
      const data = await service.getMealPlans(propertyId);
      setMealPlans(data);
      setFilteredPlans(data);
    } catch (e) {
      showNotification("error", "Failed to load meal plans");
    }
    setLoading(false);
  };


  useEffect(() => {
    if (propertyId) {
      fetchData();
    }
  }, [propertyId, isAdmin]);

  // Filter functionality
  useEffect(() => {
    let filtered = mealPlans;

    if (searchTerm) {
      filtered = filtered.filter(plan =>
        plan.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        plan.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        plan.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedKind) {
      filtered = filtered.filter(plan => plan.kind === selectedKind);
    }

    setFilteredPlans(filtered);
  }, [searchTerm, selectedKind, mealPlans]);

  // Modal handlers
  const openModal = (record = null) => {
    setEditing(record);
    setModalVisible(true);
    if (record) {
      setFormData({ ...record });
    } else {
      setFormData({
        code: "",
        name: "",
        kind: "",
        description: ""
      });
    }
    setFormErrors({});
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditing(null);
    setFormData({
      code: "",
      name: "",
      kind: "",
      description: ""
    });
    setFormErrors({});
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    console.log("submission ")
    const payload = { ...formData, propertyId: propertyId };
    setFormSubmitting(true);
    try {
      const service = mealPlanService;
      if (editing) {
        await service.updateMealPlan(editing.id, payload);
        showNotification("success", "Meal plan updated successfully");
      } else {
        await service.createMealPlan(payload);
        showNotification("success", "Meal plan created successfully");
      }
      closeModal();
      fetchData();
    } catch (e) {
      console.log(e)
      showNotification("error", "Failed to save meal plan");
    }
    setFormSubmitting(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setLoading(true);
    try {
      const service = mealPlanService;
      await service.deleteMealPlan(deleteTarget.id);
      showNotification("success", "Meal plan deleted successfully");
      setDeleteModalVisible(false);
      setDeleteTarget(null);
      fetchData();
    } catch {
      showNotification("error", "Failed to delete meal plan");
    }
    setLoading(false);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const formatPrice = (price) => {
    return `₹${parseFloat(price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  const getKindLabel = (kind) => {
    const option = MEAL_PLAN_KINDS.find(k => k.value === kind);
    return option ? option.label : kind;
  };

  return (
    <div className={`${isAdmin ? 'min-h-0' : 'min-h-screen'} bg-gray-50 p-4`}>
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg flex items-center gap-2 transition-all duration-300 ${notification.type === 'success' ? 'bg-green-500 text-white' :
            notification.type === 'error' ? 'bg-red-500 text-white' :
              'bg-blue-500 text-white'
          }`}>
          {notification.type === 'success' ? <Check size={20} /> :
            notification.type === 'error' ? <X size={20} /> :
              <AlertCircle size={20} />}
          {notification.message}
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Meal Plans</h1>
              <p className="text-gray-600 mt-1">
                {isAdmin
                  ? `Managing meal plans for: ${adminProperty?.name}`
                  : "Manage your property's meal plan offerings"
                }
              </p>
            </div>
            <button
              onClick={() => openModal()}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={20} />
              Add Meal Plan
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search by name, code, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <select
                value={selectedKind}
                onChange={(e) => setSelectedKind(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Plan Types</option>
                {MEAL_PLAN_KINDS.map(kind => (
                  <option key={kind.value} value={kind.value}>{kind.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Loading...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Code</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Name</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Type</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Description</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredPlans.map((plan) => (
                    <tr key={plan.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                          {plan.code}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-gray-900">{plan.name}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${plan.kind === 'EP' ? 'bg-gray-100 text-gray-800' :
                            plan.kind === 'CP' ? 'bg-blue-100 text-blue-800' :
                              plan.kind === 'MAP' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                          }`}>
                          {getKindLabel(plan.kind)}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-gray-600 max-w-xs truncate">
                        {plan.description || "No description"}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openModal(plan)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            title="Edit"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => {
                              setDeleteTarget(plan);
                              setDeleteModalVisible(true);
                            }}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredPlans.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No meal plans found
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {modalVisible && (
        <div className="fixed inset-0 bg-black/40 bg-opacity-50 flex items-center justify-center p-4 z-40">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">
                {editing ? "Edit Meal Plan" : "Add New Meal Plan"}
              </h2>

              <div className="space-y-4">
                {/* Code */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => handleInputChange('code', e.target.value.toUpperCase())}
                    placeholder="e.g., EP001"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${formErrors.code ? 'border-red-500' : 'border-gray-300'
                      }`}
                  />
                  {formErrors.code && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.code}</p>
                  )}
                </div>

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Enter meal plan name"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${formErrors.name ? 'border-red-500' : 'border-gray-300'
                      }`}
                  />
                  {formErrors.name && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>
                  )}
                </div>

                {/* Kind */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Plan Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.kind}
                    onChange={(e) => handleInputChange('kind', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${formErrors.kind ? 'border-red-500' : 'border-gray-300'
                      }`}
                  >
                    <option value="">Select plan type</option>
                    {MEAL_PLAN_KINDS.map(kind => (
                      <option key={kind.value} value={kind.value}>
                        {kind.label} - {kind.description}
                      </option>
                    ))}
                  </select>
                  {formErrors.kind && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.kind}</p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Optional description..."
                    rows={3}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${formErrors.description ? 'border-red-500' : 'border-gray-300'
                      }`}
                  />
                  <div className="flex justify-between items-center mt-1">
                    {formErrors.description && (
                      <p className="text-red-500 text-xs">{formErrors.description}</p>
                    )}
                    <p className="text-gray-400 text-xs ml-auto">
                      {formData.description.length}/200
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    onClick={closeModal}
                    className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={formSubmitting}
                    className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {formSubmitting && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                    {editing ? "Update Plan" : "Create Plan"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalVisible && (
        <div className="fixed inset-0 bg-black/40 bg-opacity-50 flex items-center justify-center p-4 z-40">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Delete Meal Plan</h3>
                  <p className="text-gray-600">This action cannot be undone.</p>
                </div>
              </div>

              {deleteTarget && (
                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <p className="text-sm text-gray-600">
                    You're about to delete:
                  </p>
                  <p className="font-medium text-gray-900">
                    {deleteTarget.name} ({deleteTarget.code})
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setDeleteModalVisible(false);
                    setDeleteTarget(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                  Delete Plan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MealPlans;
