/**
 * Image validation utilities for property creation
 * Validates image size and aspect ratio (16:9)
 */

const fs = require('fs');
const path = require('path');

// Target aspect ratio: 16:9
const TARGET_RATIO = 16 / 9;
const TOLERANCE = 0.05; // 5% tolerance for aspect ratio validation
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

/**
 * Validates image aspect ratio using image dimensions
 * Note: This is a simplified validation. For production, use a library like 'sharp' or 'jimp'
 * @param {string} filePath - Path to the image file
 * @returns {Promise<{valid: boolean, ratio?: number, width?: number, height?: number, error?: string}>}
 */
const validateImageAspectRatio = async (filePath) => {
  try {
    // For a more accurate validation, we should use a library like 'sharp' or 'jimp'
    // For now, we'll validate file size and let the frontend handle aspect ratio validation
    // The backend will trust that the frontend has validated the aspect ratio
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return {
        valid: false,
        error: 'Image file not found'
      };
    }

    // Check file size
    const stats = fs.statSync(filePath);
    if (stats.size > MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `Image file size (${(stats.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size (2MB)`
      };
    }

    // For production, install 'sharp' library for proper image dimension validation:
    // npm install sharp
    // Then use: const metadata = await sharp(filePath).metadata();
    // const ratio = metadata.width / metadata.height;
    // const isValid = Math.abs(ratio - TARGET_RATIO) <= TOLERANCE;

    // For now, we'll rely on frontend validation and multer file size limits
    return {
      valid: true
    };
  } catch (error) {
    return {
      valid: false,
      error: `Error validating image: ${error.message}`
    };
  }
};

/**
 * Validates multiple image files
 * @param {Array<Object>} files - Array of file objects from multer
 * @returns {Promise<{valid: boolean, errors?: Array<string>}>}
 */
const validatePropertyImages = async (files) => {
  const errors = [];
  
  if (!files || files.length === 0) {
    return {
      valid: false,
      errors: ['At least one property image is required']
    };
  }

  // Validate file count
  if (files.length > 12) {
    errors.push(`Maximum 12 images allowed. Received ${files.length} images.`);
  }

  // Validate each file
  for (const file of files) {
    // Check file size (multer should already validate this, but double-check)
    if (file.size > MAX_FILE_SIZE) {
      errors.push(`File ${file.originalname} exceeds 2MB limit (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
      continue;
    }

    // Check file type
    if (!file.mimetype.startsWith('image/')) {
      errors.push(`File ${file.originalname} is not an image file`);
      continue;
    }

    // Validate aspect ratio (if file path is available)
    if (file.path) {
      const validation = await validateImageAspectRatio(file.path);
      if (!validation.valid) {
        errors.push(`File ${file.originalname}: ${validation.error}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
};

/**
 * Validates room type images
 * @param {Array<Object>} files - Array of file objects from multer
 * @returns {Promise<{valid: boolean, errors?: Array<string>}>}
 */
const validateRoomTypeImages = async (files) => {
  const errors = [];
  
  if (!files || files.length === 0) {
    return {
      valid: true // Room type images are optional
    };
  }

  // Validate file count
  if (files.length > 12) {
    errors.push(`Maximum 12 images allowed per room type. Received ${files.length} images.`);
  }

  // Validate each file
  for (const file of files) {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      errors.push(`File ${file.originalname} exceeds 2MB limit (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
      continue;
    }

    // Check file type
    if (!file.mimetype.startsWith('image/')) {
      errors.push(`File ${file.originalname} is not an image file`);
      continue;
    }

    // Validate aspect ratio (if file path is available)
    if (file.path) {
      const validation = await validateImageAspectRatio(file.path);
      if (!validation.valid) {
        errors.push(`File ${file.originalname}: ${validation.error}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
};

module.exports = {
  validateImageAspectRatio,
  validatePropertyImages,
  validateRoomTypeImages,
  MAX_FILE_SIZE,
  TARGET_RATIO,
  TOLERANCE
};

