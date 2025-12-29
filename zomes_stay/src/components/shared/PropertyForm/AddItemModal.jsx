import { useState } from "react";

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

export default AddItemModal;

