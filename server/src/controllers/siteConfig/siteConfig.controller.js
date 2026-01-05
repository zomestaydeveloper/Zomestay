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

      if (!siteConfig) {
  return sendSuccess(res, {
    id: null,
    logo: null,
    phoneNumber: null,
    bannerImages: [],
    heroTitle: null,
    heroSubtitle: null,
    siteName: null,
    supportEmail: null,
    supportPhone: null,
    address: null,
    socialMedia: {},
    createdAt: null,
    updatedAt: null
  }, 'Site configuration not set');
}


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
    /* ----------------------------------
       1️⃣ Handle uploads
    ---------------------------------- */
    let uploadedBannerUrls = [];
    let logoUrl;

    if (req.files?.logo?.length > 0) {
      logoUrl = req.files.logo[0].url;
    }

    if (req.files?.bannerImages?.length > 0) {
      uploadedBannerUrls = req.files.bannerImages.map(f => f.url);
    }

    /* ----------------------------------
       2️⃣ Read frontend FINAL banner list
    ---------------------------------- */
    let frontendBannerImages = [];

    if (req.body.bannerImages) {
      try {
        frontendBannerImages =
          typeof req.body.bannerImages === 'string'
            ? JSON.parse(req.body.bannerImages)
            : req.body.bannerImages;
      } catch {
        frontendBannerImages = [];
      }
    }

    
    // FINAL desired state
    const finalBannerImages = [
      ...frontendBannerImages,
      ...uploadedBannerUrls
    ];

    /* ----------------------------------
       3️⃣ Fetch existing config
    ---------------------------------- */
    const existingConfig = await prisma.siteConfig.findFirst({
      where: { isDeleted: false }
    });

    let existingBannerImages = [];
    if (existingConfig?.bannerImages) {
      existingBannerImages = JSON.parse(existingConfig.bannerImages);
    }

    /* ----------------------------------
       4️⃣ DELETE removed images
    ---------------------------------- */
    const imagesToDelete = existingBannerImages.filter(
      img => !finalBannerImages.includes(img)
    );

    imagesToDelete.forEach(deleteOldFile);

    // Delete old logo if replaced
    if (logoUrl && existingConfig?.logo) {
      deleteOldFile(existingConfig.logo);
    }

    /* ----------------------------------
       5️⃣ Parse social media
    ---------------------------------- */
    let socialMediaData;
    if (req.body.socialMedia !== undefined) {
      try {
        socialMediaData =
          typeof req.body.socialMedia === 'string'
            ? JSON.parse(req.body.socialMedia)
            : req.body.socialMedia;
      } catch {
        socialMediaData = {};
      }
    }

    /* ----------------------------------
       6️⃣ Prepare DB payload
    ---------------------------------- */
    const data = {
      logo: logoUrl ?? existingConfig?.logo ?? null,
      phoneNumber: req.body.phoneNumber ?? null,
      heroTitle: req.body.heroTitle ?? null,
      heroSubtitle: req.body.heroSubtitle ?? null,
      siteName: req.body.siteName ?? null,
      supportEmail: req.body.supportEmail ?? null,
      supportPhone: req.body.supportPhone ?? null,
      address: req.body.address ?? null,
      bannerImages:
        finalBannerImages.length > 0
          ? JSON.stringify(finalBannerImages)
          : null,
      socialMedia:
        socialMediaData && Object.keys(socialMediaData).length > 0
          ? JSON.stringify(socialMediaData)
          : null
    };

    /* ----------------------------------
       7️⃣ Save
    ---------------------------------- */
    const savedConfig = existingConfig
      ? await prisma.siteConfig.update({
          where: { id: existingConfig.id },
          data
        })
      : await prisma.siteConfig.create({ data });

    /* ----------------------------------
       8️⃣ Response
    ---------------------------------- */
    return sendSuccess(
      res,
      {
        id: savedConfig.id,
        logo: savedConfig.logo,
        phoneNumber: savedConfig.phoneNumber,
        bannerImages: finalBannerImages,
        heroTitle: savedConfig.heroTitle,
        heroSubtitle: savedConfig.heroSubtitle,
        siteName: savedConfig.siteName,
        supportEmail: savedConfig.supportEmail,
        supportPhone: savedConfig.supportPhone,
        address: savedConfig.address,
        socialMedia: savedConfig.socialMedia
          ? JSON.parse(savedConfig.socialMedia)
          : {},
        createdAt: savedConfig.createdAt,
        updatedAt: savedConfig.updatedAt
      },
      'Site configuration updated successfully'
    );
  } catch (error) {
    console.error('Update Site Config Error:', error);
    return sendError(res, 'Failed to update site configuration', 500);
  }
}

};

module.exports = siteConfigController;


