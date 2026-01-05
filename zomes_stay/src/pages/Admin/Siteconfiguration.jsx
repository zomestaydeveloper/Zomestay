import React, { useState, useEffect } from 'react';
import { siteConfigService } from '../../services';
import NotificationModal from '../../components/NotificationModal';
import { Loader2, Save, Settings, Image as ImageIcon, Phone, Mail, MapPin, Globe, Type, MessageSquare, X, Upload, Trash2 } from 'lucide-react';

const SiteConfiguration = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState({
    isOpen: false,
    type: 'success',
    title: '',
    message: ''
  });

  // Form state
  const [formData, setFormData] = useState({
    logo: '',
    phoneNumber: '',
    bannerImages: [],
    heroTitle: '',
    heroSubtitle: '',
    siteName: '',
    supportEmail: '',
    supportPhone: '',
    address: '',
    socialMedia: {
      facebook: '',
      instagram: '',
      twitter: ''
    }
  });

  // File state for uploads
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [bannerFiles, setBannerFiles] = useState([]);
  const [bannerPreviews, setBannerPreviews] = useState([]);
  const [existingBannerUrls, setExistingBannerUrls] = useState([]); // Track existing banner URLs from server

  // Fetch existing config on mount
  useEffect(() => {
    fetchSiteConfig();
  }, []);

  const fetchSiteConfig = async () => {
    try {
      setLoading(true);
      const response = await siteConfigService.getSiteConfig();
      
      if (response?.data?.success && response?.data?.data) {
        const config = response.data.data;
        
        // Get base URL for images
        const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
        
        setFormData({
          logo: config.logo || '',
          phoneNumber: config.phoneNumber || '',
          bannerImages: Array.isArray(config.bannerImages) ? config.bannerImages : [],
          heroTitle: config.heroTitle || '',
          heroSubtitle: config.heroSubtitle || '',
          siteName: config.siteName || '',
          supportEmail: config.supportEmail || '',
          supportPhone: config.supportPhone || '',
          address: config.address || '',
          socialMedia: config.socialMedia || {
            facebook: '',
            instagram: '',
            twitter: ''
          }
        });
        
        // Set previews for existing images
        if (config.logo) {
          const logoUrl = config.logo.startsWith('/uploads') ? `${baseURL}${config.logo}` : config.logo;
          setLogoPreview(logoUrl);
        }
        
        if (Array.isArray(config.bannerImages) && config.bannerImages.length > 0) {
          const bannerUrls = config.bannerImages.map(img => 
            img.startsWith('/uploads') ? `${baseURL}${img}` : img
          );
          setBannerPreviews(bannerUrls);
          setExistingBannerUrls(config.bannerImages); // Store original URLs
        }
      }
    } catch (error) {
      console.error('Failed to fetch site configuration:', error);
      showNotification('error', 'Error', 'Failed to load site configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle logo file selection
  const handleLogoSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validate SVG file
    if (file.type !== 'image/svg+xml') {
      showNotification('error', 'Invalid File', 'Please select an SVG file for the logo');
      return;
    }
    
    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      showNotification('error', 'File Too Large', 'Logo file must be less than 5MB');
      return;
    }
    
    setLogoFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Handle banner image selection
  const handleBannerSelect = (e) => {
    const files = Array.from(e.target.files);
    
    // Validate total count (max 5)
    const totalBanners = bannerPreviews.length + files.length;
    if (totalBanners > 5) {
      showNotification('error', 'Too Many Images', 'Maximum 5 banner images allowed');
      return;
    }
    
    // Validate file types and sizes
    const validFiles = [];
    files.forEach(file => {
      if (!file.type.startsWith('image/')) {
        showNotification('error', 'Invalid File', `${file.name} is not an image file`);
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        showNotification('error', 'File Too Large', `${file.name} must be less than 5MB`);
        return;
      }
      validFiles.push(file);
    });
    
    if (validFiles.length === 0) return;
    
    // Add to banner files
    setBannerFiles(prev => [...prev, ...validFiles]);
    
    // Create previews
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBannerPreviews(prev => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });
    
    // Reset input
    e.target.value = '';
  };

  // Remove banner image
  const handleRemoveBanner = (index) => {
    // Check if removing an existing image (from server) or a newly uploaded file
    const isExistingImage = index < existingBannerUrls.length;
    
    if (isExistingImage) {
      // Remove from existing URLs
      setExistingBannerUrls(prev => prev.filter((_, i) => i !== index));
    } else {
      // Remove from newly uploaded files (adjust index for existing images)
      const fileIndex = index - existingBannerUrls.length;
      setBannerFiles(prev => prev.filter((_, i) => i !== fileIndex));
    }
    
    // Remove from previews
    setBannerPreviews(prev => prev.filter((_, i) => i !== index));
  };

  // Remove logo
  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    setFormData(prev => ({ ...prev, logo: '' }));
  };

  const handleSocialMediaChange = (platform, value) => {
    setFormData(prev => ({
      ...prev,
      socialMedia: {
        ...prev.socialMedia,
        [platform]: value
      }
    }));
  };

  const showNotification = (type, title, message) => {
    setNotification({
      isOpen: true,
      type,
      title,
      message
    });
  };

  const closeNotification = () => {
    setNotification(prev => ({ ...prev, isOpen: false }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      
      // Create FormData for file uploads
      const formDataToSend = new FormData();
      
      // Add logo file if selected
      if (logoFile) {
        formDataToSend.append('logo', logoFile);
      }
      
      // Add banner images if selected
      bannerFiles.forEach((file) => {
        formDataToSend.append('bannerImages', file);
      });
      
      // Handle banner images logic:
      // - If we have remaining existing banners AND new files, merge them
      // - If we only have new files (no existing), replace all
      // - If we only have existing (no new files), keep them (backend handles this)
      
      // Note: If all existing banners were removed and we have new files,
      // backend will replace (keepExistingBanners not set)
      // If no new files and we have existing, backend keeps them by default
      
      // Add text fields
      if (formData.phoneNumber) formDataToSend.append('phoneNumber', formData.phoneNumber);
      if (formData.heroTitle) formDataToSend.append('heroTitle', formData.heroTitle);
      if (formData.heroSubtitle) formDataToSend.append('heroSubtitle', formData.heroSubtitle);
      if (formData.siteName) formDataToSend.append('siteName', formData.siteName);
      if (formData.supportEmail) formDataToSend.append('supportEmail', formData.supportEmail);
      if (formData.supportPhone) formDataToSend.append('supportPhone', formData.supportPhone);
      if (formData.address) formDataToSend.append('address', formData.address);
      
      // Add social media
      const socialMediaData = Object.keys(formData.socialMedia).reduce((acc, key) => {
        if (formData.socialMedia[key]?.trim()) {
          acc[key] = formData.socialMedia[key].trim();
        }
        return acc;
      }, {});
      if (Object.keys(socialMediaData).length > 0) {
        formDataToSend.append('socialMedia', JSON.stringify(socialMediaData));
      }
      formDataToSend.append(
           'bannerImages',
         JSON.stringify(existingBannerUrls)
         );
      const response = await siteConfigService.updateSiteConfig(formDataToSend);

      if (response?.data?.success) {
        showNotification('success', 'Success', 'Site configuration updated successfully!');
        // Reset file states
        setLogoFile(null);
        setBannerFiles([]);
        // Refetch to get latest data
        setTimeout(() => {
          fetchSiteConfig();
        }, 1000);
      } else {
        showNotification('error', 'Error', response?.data?.message || 'Failed to update site configuration');
      }
    } catch (error) {
      console.error('Failed to update site configuration:', error);
      showNotification('error', 'Error', error?.response?.data?.message || 'Failed to update site configuration. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Settings className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Site Configuration</h1>
        </div>
        <p className="text-gray-600">Manage your site settings, branding, and contact information</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 sm:p-6 space-y-6">
          {/* Logo Section */}
          <div className="border-b border-gray-200 pb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-blue-600" />
              Logo & Branding
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Logo (SVG only)
                </label>
                {logoPreview ? (
                  <div className="relative inline-block">
                    <div className="w-32 h-32 border-2 border-gray-300 rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center">
                      <img 
                        src={logoPreview} 
                        alt="Logo preview" 
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                      aria-label="Remove logo"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-2 text-gray-400" />
                      <p className="mb-2 text-sm text-gray-500">
                        <span className="font-semibold">Click to upload</span> SVG logo
                      </p>
                      <p className="text-xs text-gray-500">SVG files only</p>
                    </div>
                    <input
                      type="file"
                      accept="image/svg+xml"
                      onChange={handleLogoSelect}
                      className="hidden"
                    />
                  </label>
                )}
                {logoPreview && (
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.querySelector('input[type="file"][accept="image/svg+xml"]');
                      if (input) input.click();
                    }}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Change Logo
                  </button>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Site Name
                </label>
                <input
                  type="text"
                  value={formData.siteName}
                  onChange={(e) => handleInputChange('siteName', e.target.value)}
                  placeholder="ZomesStay"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Hero Section */}
          <div className="border-b border-gray-200 pb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Type className="h-5 w-5 text-blue-600" />
              Hero Section
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hero Title
                </label>
                <input
                  type="text"
                  value={formData.heroTitle}
                  onChange={(e) => handleInputChange('heroTitle', e.target.value)}
                  placeholder="Explore! Discover! Live!"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hero Subtitle
                </label>
                <input
                  type="text"
                  value={formData.heroSubtitle}
                  onChange={(e) => handleInputChange('heroSubtitle', e.target.value)}
                  placeholder="Best Resort For Your Vacation"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Banner Images (Max 5)
                </label>
                {/* Existing/Selected Banner Previews */}
                {bannerPreviews.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-4">
                    {bannerPreviews.map((preview, index) => (
                      <div key={index} className="relative group">
                        <div className="w-full aspect-video border-2 border-gray-300 rounded-lg overflow-hidden bg-gray-50">
                          <img 
                            src={preview} 
                            alt={`Banner ${index + 1}`} 
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveBanner(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                          aria-label="Remove banner"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Upload Button */}
                {bannerPreviews.length < 5 && (
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-2 text-gray-400" />
                      <p className="mb-2 text-sm text-gray-500">
                        <span className="font-semibold">Click to upload</span> banner images
                      </p>
                      <p className="text-xs text-gray-500">
                        {bannerPreviews.length} / 5 images selected
                      </p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleBannerSelect}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="border-b border-gray-200 pb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Phone className="h-5 w-5 text-blue-600" />
              Contact Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={formData.phoneNumber}
                  onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                  placeholder="+91 9167 928 471"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Support Phone
                </label>
                <input
                  type="text"
                  value={formData.supportPhone}
                  onChange={(e) => handleInputChange('supportPhone', e.target.value)}
                  placeholder="+91 9167 928 471"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Support Email
                </label>
                <input
                  type="email"
                  value={formData.supportEmail}
                  onChange={(e) => handleInputChange('supportEmail', e.target.value)}
                  placeholder="support@zomesstay.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="123 Main Street, City, State 12345"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Social Media */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Globe className="h-5 w-5 text-blue-600" />
              Social Media Links
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Facebook
                </label>
                <input
                  type="url"
                  value={formData.socialMedia.facebook}
                  onChange={(e) => handleSocialMediaChange('facebook', e.target.value)}
                  placeholder="https://facebook.com/zomesstay"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Instagram
                </label>
                <input
                  type="url"
                  value={formData.socialMedia.instagram}
                  onChange={(e) => handleSocialMediaChange('instagram', e.target.value)}
                  placeholder="https://instagram.com/zomesstay"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Twitter
                </label>
                <input
                  type="url"
                  value={formData.socialMedia.twitter}
                  onChange={(e) => handleSocialMediaChange('twitter', e.target.value)}
                  placeholder="https://twitter.com/zomesstay"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="px-4 sm:px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => fetchSiteConfig()}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Reset
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Configuration
              </>
            )}
          </button>
        </div>
      </form>

      {/* Notification Modal */}
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

export default SiteConfiguration;

