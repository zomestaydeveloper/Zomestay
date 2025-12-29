import { useState } from "react";

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

export default AddRoomTypeModal;

