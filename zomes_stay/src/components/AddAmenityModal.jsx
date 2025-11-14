import React, { useState } from 'react';
import { X, Plus, Image, Upload } from 'lucide-react';
import { propertyService } from '../services';

const AddAmenityModal = ({ isOpen, onClose, onAmenityCreated }) => {
  const [formData, setFormData] = useState({
    name: '',
    icon: null,
    iconFile: null
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [previewUrl, setPreviewUrl] = useState(null);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleIconUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setErrors(prev => ({
          ...prev,
          icon: 'Please select a valid image file'
        }));
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({
          ...prev,
          icon: 'File size must be less than 5MB'
        }));
        return;
      }

      setFormData(prev => ({
        ...prev,
        iconFile: file
      }));

      // Create preview URL
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      
      // Clear any previous errors
      if (errors.icon) {
        setErrors(prev => ({
          ...prev,
          icon: ''
        }));
      }
    }
  };

  const removeIcon = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setFormData(prev => ({
      ...prev,
      iconFile: null
    }));
    setPreviewUrl(null);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Amenity name is required';
    }
    if (!formData.iconFile) {
      newErrors.icon = 'Icon is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      // Create FormData for file upload
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      formDataToSend.append('icon', formData.iconFile);

      console.log('Creating amenity:', formData);
      
      // Call API to create amenity
      const response = await propertyService.createAmenity(formDataToSend);
      
      if (response.data.success) {
        // Call callback to refresh amenities list
        if (onAmenityCreated) {
          await onAmenityCreated();
        }
        
        // Reset form and close modal
        setFormData({ name: '', icon: null, iconFile: null });
        setPreviewUrl(null);
        onClose();
      } else {
        throw new Error(response.data.message || 'Failed to create amenity');
      }
    } catch (error) {
      console.error('Error creating amenity:', error);
      setErrors({ submit: error.response?.data?.message || 'Failed to create amenity' });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Clean up preview URL
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    // Reset form
    setFormData({ name: '', icon: null, iconFile: null });
    setPreviewUrl(null);
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full shadow-xl">
        {/* Header */}
        <div className="border-b border-gray-500 px-6 py-4 rounded-t-lg">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Plus className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Add New Amenity</h2>
                <p className="text-xs text-gray-500">Create a new amenity with icon</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Amenity Name */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              Amenity Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="e.g., Swimming Pool, Spa, Business Center"
              className={`block w-full px-3 py-2 text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.name ? 'border-red-500' : 'border-gray-500'
              }`}
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-600">{errors.name}</p>
            )}
          </div>

          {/* Icon Upload */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              Icon *
            </label>
            
            {/* Upload Area */}
            <div className="border-2 border-dashed border-gray-500 rounded-lg p-4">
              <input
                type="file"
                accept="image/*"
                onChange={handleIconUpload}
                className="hidden"
                id="icon-upload"
              />
              <label
                htmlFor="icon-upload"
                className="cursor-pointer flex flex-col items-center justify-center text-center"
              >
                <Upload className="h-8 w-8 text-gray-400 mb-2" />
                <p className="text-xs text-gray-500 mb-1">Click to upload icon</p>
                <p className="text-xs text-gray-400">SVG, PNG, JPG up to 5MB</p>
              </label>
            </div>

            {/* Icon Preview */}
            {previewUrl && (
              <div className="mt-3">
                <p className="text-xs text-gray-500 mb-2">Icon preview:</p>
                <div className="relative inline-block">
                  <img
                    src={previewUrl}
                    alt="Icon preview"
                    className="w-16 h-16 object-contain border border-gray-200 rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={removeIcon}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}

            {errors.icon && (
              <p className="mt-1 text-xs text-red-600">{errors.icon}</p>
            )}
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs text-red-600">{errors.submit}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-500">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-500 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-xs font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Creating...' : 'Create Amenity'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddAmenityModal;
