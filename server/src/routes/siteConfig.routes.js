/**
 * Site Configuration Routes
 */

const express = require('express');
const router = express.Router();
const { extractRole } = require('../middleware/extractRole.middleware');
const { requireAdmin } = require('../utils/auth.utils');
const { uploadSiteConfig } = require('../config/multer');
const siteConfigController = require('../controllers/siteConfig/siteConfig.controller');

/**
 * @route   GET /api/site-config
 * @desc    Get site configuration (logo, banner images, phone, etc.)
 * @access  Public
 */
router.get('/', siteConfigController.getSiteConfig);

/**
 * @route   POST /api/site-config
 * @desc    Create site configuration (Admin only)
 * @access  Admin
 * @files   logo (single), bannerImages (multiple)
 */
router.post(
  '/',
  extractRole,
  (req, res, next) => {
    const error = requireAdmin(req.user, res);
    if (error) return;
    next();
  },
  uploadSiteConfig.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'bannerImages', maxCount: 10 }
  ]),
  siteConfigController.createSiteConfig
);

/**
 * @route   PATCH /api/site-config
 * @desc    Update site configuration (Admin only)
 * @access  Admin
 * @files   logo (single), bannerImages (multiple)
 */
router.patch(
  '/',
  extractRole,
  (req, res, next) => {
    const error = requireAdmin(req.user, res);
    if (error) return;
    next();
  },
  uploadSiteConfig.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'bannerImages', maxCount: 10 }
  ]),
  siteConfigController.updateSiteConfig
);

module.exports = router;

