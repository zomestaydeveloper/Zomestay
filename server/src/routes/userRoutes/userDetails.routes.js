const express = require('express');
const router = express.Router();
const UserDetailsController = require('../../controllers/userController/userDetials.controller');
const { extractRole } = require('../../middleware/extractRole.middleware');
const { requireAuth } = require('../../utils/auth.utils');
const { uploadImage } = require('../../config/multer');

/**
 * User Profile Routes
 * All routes require authentication (user role)
 */

// Get user profile
router.get('/users/profile', extractRole, (req, res, next) => {
  const error = requireAuth(req.user, res);
  if (error) return;
  
  // Check if user is actually a 'user' role
  if (req.user.role !== 'user') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. User role required.'
    });
  }
  next();
}, UserDetailsController.getUserProfile);

// Update user profile (with optional image upload)
router.put('/users/profile', extractRole, (req, res, next) => {
  const error = requireAuth(req.user, res);
  if (error) return;
  
  // Check if user is actually a 'user' role
  if (req.user.role !== 'user') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. User role required.'
    });
  }
  next();
}, uploadImage.single('profileImage'), UserDetailsController.updateUserProfile);

// Delete user account (soft delete)
router.delete('/users/profile', extractRole, (req, res, next) => {
  const error = requireAuth(req.user, res);
  if (error) return;
  
  // Check if user is actually a 'user' role
  if (req.user.role !== 'user') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. User role required.'
    });
  }
  next();
}, UserDetailsController.deleteUserProfile);

module.exports = router;

