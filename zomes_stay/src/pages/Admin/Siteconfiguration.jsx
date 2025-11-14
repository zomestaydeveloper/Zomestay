import React, { useState, useEffect } from 'react';
import { siteConfigService } from '../../services';
import NotificationModal from '../../components/NotificationModal';
import { Loader2, Save, Settings, Image as ImageIcon, Phone, Mail, MapPin, Globe, Type, MessageSquare } from 'lucide-react';

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
    bannerImages: ['', '', ''],
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
        setFormData({
          logo: config.logo || '',
          phoneNumber: config.phoneNumber || '',
          bannerImages: Array.isArray(config.bannerImages) ? [...config.bannerImages, '', '', ''].slice(0, 3) : ['', '', ''],
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

  const handleBannerImageChange = (index, value) => {
    setFormData(prev => {
      const newBannerImages = [...prev.bannerImages];
      newBannerImages[index] = value;
      return {
        ...prev,
        bannerImages: newBannerImages
      };
    });
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
      
      // Prepare data for API
      const configData = {
        logo: formData.logo || null,
        phoneNumber: formData.phoneNumber || null,
        bannerImages: formData.bannerImages.filter(img => img.trim() !== ''),
        heroTitle: formData.heroTitle || null,
        heroSubtitle: formData.heroSubtitle || null,
        siteName: formData.siteName || null,
        supportEmail: formData.supportEmail || null,
        supportPhone: formData.supportPhone || null,
        address: formData.address || null,
        socialMedia: Object.keys(formData.socialMedia).reduce((acc, key) => {
          if (formData.socialMedia[key]?.trim()) {
            acc[key] = formData.socialMedia[key].trim();
          }
          return acc;
        }, {})
      };

      const response = await siteConfigService.updateSiteConfig(configData);

      if (response?.data?.success) {
        showNotification('success', 'Success', 'Site configuration updated successfully!');
        // Optionally refetch to get latest data
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
                  Logo URL
                </label>
                <input
                  type="text"
                  value={formData.logo}
                  onChange={(e) => handleInputChange('logo', e.target.value)}
                  placeholder="https://example.com/logo.png"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
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
                  Banner Images (URLs)
                </label>
                {formData.bannerImages.map((image, index) => (
                  <div key={index} className="mb-2">
                    <input
                      type="text"
                      value={image}
                      onChange={(e) => handleBannerImageChange(index, e.target.value)}
                      placeholder={`Banner Image ${index + 1} URL`}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                ))}
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

