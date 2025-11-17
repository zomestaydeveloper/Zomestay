/**
 * Site Configuration Controller
 * Manages site-wide settings like logo, banner images, contact info, etc.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { sendSuccess, sendError } = require('../../utils/response.utils');
const fs = require('fs');
const path = require('path');
const { UPLOAD_BASE } = require('../../config/multer');

/**
 * Helper function to delete old files
 */
const deleteOldFile = (filePath) => {
  if (!filePath) return;
  try {
    // Extract the relative path from the URL (e.g., /uploads/images/logo.png)
    // Remove leading slash and 'uploads/' prefix if present
    let relativePath = filePath.startsWith('/uploads/') 
      ? filePath.substring('/uploads/'.length)
      : filePath.startsWith('uploads/')
      ? filePath.substring('uploads/'.length)
      : filePath;
    
    // Remove leading slash if still present
    relativePath = relativePath.startsWith('/') ? relativePath.substring(1) : relativePath;
    
    const fullPath = path.join(UPLOAD_BASE, relativePath);
    
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      console.log(`Deleted old file: ${fullPath}`);
    }
  } catch (error) {
    console.error(`Error deleting file ${filePath}:`, error);
    // Don't throw - file deletion is not critical
  }
};

/**
 * Site Configuration Controller
 */
const siteConfigController = {
  /**
   * Get site configuration
   * GET /api/site-config
   * Returns: logo, banner images, phone number, etc.
   */
  getSiteConfig: async (req, res) => {
    try {
      // Get the first (and should be only) site config record
      let siteConfig = await prisma.siteConfig.findFirst({
        where: {
          isDeleted: false
        }
      });

      // Parse JSON fields if they exist
      const formattedConfig = {
        id: siteConfig.id,
        logo: siteConfig.logo || null,
        phoneNumber: siteConfig.phoneNumber || null,
        bannerImages: siteConfig.bannerImages ? 
          (typeof siteConfig.bannerImages === 'string' ? JSON.parse(siteConfig.bannerImages) : siteConfig.bannerImages) : 
          [],
        heroTitle: siteConfig.heroTitle || null,
        heroSubtitle: siteConfig.heroSubtitle || null,
        siteName: siteConfig.siteName || null,
        supportEmail: siteConfig.supportEmail || null,
        supportPhone: siteConfig.supportPhone || null,
        address: siteConfig.address || null,
        socialMedia: siteConfig.socialMedia ? 
          (typeof siteConfig.socialMedia === 'string' ? JSON.parse(siteConfig.socialMedia) : siteConfig.socialMedia) : 
          {},
        createdAt: siteConfig.createdAt,
        updatedAt: siteConfig.updatedAt
      };

      return sendSuccess(res, formattedConfig, 'Site configuration retrieved successfully');
    } catch (error) {
      console.error('Get Site Config Error:', error);
      return sendError(res, 'Failed to retrieve site configuration', 500);
    }
  },

  /**
   * Create site configuration
   * POST /api/site-config
   * Admin only
   */
  createSiteConfig: async (req, res) => {
    try {
      // Handle file uploads
      let logoUrl = null;
      let bannerImageUrls = [];

      if (req.files) {
        // Handle logo upload (single file)
        if (req.files.logo && req.files.logo.length > 0) {
          logoUrl = req.files.logo[0].url;
        }

        // Handle banner images (multiple files)
        if (req.files.bannerImages && req.files.bannerImages.length > 0) {
          bannerImageUrls = req.files.bannerImages.map(file => file.url);
        }
      }

      // Get form data
      const {
        phoneNumber,
        heroTitle,
        heroSubtitle,
        siteName,
        supportEmail,
        supportPhone,
        address,
        socialMedia
      } = req.body;

      // Check if config already exists
      const existingConfig = await prisma.siteConfig.findFirst({
        where: {
          isDeleted: false
        }
      });

      if (existingConfig) {
        // Delete uploaded files if config already exists
        if (logoUrl) deleteOldFile(logoUrl);
        bannerImageUrls.forEach(url => deleteOldFile(url));
        
        return sendError(res, 'Site configuration already exists. Use PATCH to update.', 400);
      }

      // Parse social media if it's a string
      let socialMediaData = {};
      if (socialMedia) {
        try {
          socialMediaData = typeof socialMedia === 'string' ? JSON.parse(socialMedia) : socialMedia;
        } catch (e) {
          socialMediaData = {};
        }
      }

      // Create new site config
      const siteConfig = await prisma.siteConfig.create({
        data: {
          logo: logoUrl || null,
          phoneNumber: phoneNumber || null,
          bannerImages: bannerImageUrls.length > 0 ? JSON.stringify(bannerImageUrls) : null,
          heroTitle: heroTitle || null,
          heroSubtitle: heroSubtitle || null,
          siteName: siteName || null,
          supportEmail: supportEmail || null,
          supportPhone: supportPhone || null,
          address: address || null,
          socialMedia: Object.keys(socialMediaData).length > 0 ? JSON.stringify(socialMediaData) : null
        }
      });

      // Format response
      const formattedConfig = {
        id: siteConfig.id,
        logo: siteConfig.logo,
        phoneNumber: siteConfig.phoneNumber,
        bannerImages: siteConfig.bannerImages ? JSON.parse(siteConfig.bannerImages) : [],
        heroTitle: siteConfig.heroTitle,
        heroSubtitle: siteConfig.heroSubtitle,
        siteName: siteConfig.siteName,
        supportEmail: siteConfig.supportEmail,
        supportPhone: siteConfig.supportPhone,
        address: siteConfig.address,
        socialMedia: siteConfig.socialMedia ? JSON.parse(siteConfig.socialMedia) : {},
        createdAt: siteConfig.createdAt,
        updatedAt: siteConfig.updatedAt
      };

      return sendSuccess(res, formattedConfig, 'Site configuration created successfully', 201);
    } catch (error) {
      console.error('Create Site Config Error:', error);
      return sendError(res, 'Failed to create site configuration', 500);
    }
  },

  /**
   * Update site configuration
   * PATCH /api/site-config
   * Admin only
   */
  updateSiteConfig: async (req, res) => {
    try {
      // Handle file uploads
      let logoUrl = undefined;
      let bannerImageUrls = undefined;

      if (req.files) {
        // Handle logo upload (single file)
        if (req.files.logo && req.files.logo.length > 0) {
          logoUrl = req.files.logo[0].url;
        }

        // Handle banner images (multiple files)
        if (req.files.bannerImages && req.files.bannerImages.length > 0) {
          bannerImageUrls = req.files.bannerImages.map(file => file.url);
        }
      }

      // Get form data
      const {
        phoneNumber,
        heroTitle,
        heroSubtitle,
        siteName,
        supportEmail,
        supportPhone,
        address,
        socialMedia,
        keepExistingBanners // Flag to keep existing banners when new ones are uploaded
      } = req.body;

      // Find existing config
      let existingConfig = await prisma.siteConfig.findFirst({
        where: {
          isDeleted: false
        }
      });

      // Parse existing banner images
      let existingBannerImages = [];
      if (existingConfig && existingConfig.bannerImages) {
        try {
          existingBannerImages = typeof existingConfig.bannerImages === 'string' 
            ? JSON.parse(existingConfig.bannerImages) 
            : existingConfig.bannerImages;
        } catch (e) {
          existingBannerImages = [];
        }
      }

      // Handle banner images: if new ones uploaded, replace or merge based on keepExistingBanners flag
      let finalBannerImages = undefined;
      if (bannerImageUrls !== undefined) {
        if (keepExistingBanners === 'true' && existingBannerImages.length > 0) {
          // Merge: keep existing and add new
          finalBannerImages = [...existingBannerImages, ...bannerImageUrls];
        } else {
          // Replace: use only new images
          finalBannerImages = bannerImageUrls;
        }
      }

      // Delete old files if new ones are uploaded
      if (logoUrl && existingConfig && existingConfig.logo) {
        deleteOldFile(existingConfig.logo);
      }

      // Delete old banner images if replacing
      if (finalBannerImages !== undefined && !keepExistingBanners && existingBannerImages.length > 0) {
        existingBannerImages.forEach(url => deleteOldFile(url));
      }

      // Parse social media if it's a string
      let socialMediaData = undefined;
      if (socialMedia !== undefined) {
        try {
          socialMediaData = typeof socialMedia === 'string' ? JSON.parse(socialMedia) : socialMedia;
        } catch (e) {
          socialMediaData = {};
        }
      }

      // If no config exists, create one
      if (!existingConfig) {
        existingConfig = await prisma.siteConfig.create({
          data: {
            logo: logoUrl || null,
            phoneNumber: phoneNumber || null,
            bannerImages: finalBannerImages && finalBannerImages.length > 0 ? JSON.stringify(finalBannerImages) : null,
            heroTitle: heroTitle || null,
            heroSubtitle: heroSubtitle || null,
            siteName: siteName || null,
            supportEmail: supportEmail || null,
            supportPhone: supportPhone || null,
            address: address || null,
            socialMedia: socialMediaData && Object.keys(socialMediaData).length > 0 ? JSON.stringify(socialMediaData) : null
          }
        });
      } else {
        // Prepare update data
        const updateData = {};

        if (logoUrl !== undefined) updateData.logo = logoUrl;
        if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
        if (finalBannerImages !== undefined) {
          updateData.bannerImages = finalBannerImages.length > 0 ? JSON.stringify(finalBannerImages) : null;
        }
        if (heroTitle !== undefined) updateData.heroTitle = heroTitle;
        if (heroSubtitle !== undefined) updateData.heroSubtitle = heroSubtitle;
        if (siteName !== undefined) updateData.siteName = siteName;
        if (supportEmail !== undefined) updateData.supportEmail = supportEmail;
        if (supportPhone !== undefined) updateData.supportPhone = supportPhone;
        if (address !== undefined) updateData.address = address;
        if (socialMediaData !== undefined) {
          updateData.socialMedia = Object.keys(socialMediaData).length > 0 ? JSON.stringify(socialMediaData) : null;
        }

        // Update existing config
        existingConfig = await prisma.siteConfig.update({
          where: {
            id: existingConfig.id
          },
          data: updateData
        });
      }

      // Format response
      const formattedConfig = {
        id: existingConfig.id,
        logo: existingConfig.logo,
        phoneNumber: existingConfig.phoneNumber,
        bannerImages: existingConfig.bannerImages ? JSON.parse(existingConfig.bannerImages) : [],
        heroTitle: existingConfig.heroTitle,
        heroSubtitle: existingConfig.heroSubtitle,
        siteName: existingConfig.siteName,
        supportEmail: existingConfig.supportEmail,
        supportPhone: existingConfig.supportPhone,
        address: existingConfig.address,
        socialMedia: existingConfig.socialMedia ? JSON.parse(existingConfig.socialMedia) : {},
        createdAt: existingConfig.createdAt,
        updatedAt: existingConfig.updatedAt
      };

      return sendSuccess(res, formattedConfig, 'Site configuration updated successfully');
    } catch (error) {
      console.error('Update Site Config Error:', error);
      return sendError(res, 'Failed to update site configuration', 500);
    }
  }
};

module.exports = siteConfigController;


