/**
 * Standardized response utilities for consistent API responses
 */

/**
 * Creates a success response
 * @param {any} data - Response data
 * @param {string} message - Success message (optional)
 * @param {number} statusCode - HTTP status code (default: 200)
 * @returns {Object} Standardized success response
 */
const createSuccessResponse = (data, message = null, statusCode = 200) => {
  const response = {
    success: true,
    data,
  };
  
  // Only include message if provided (backward compatible)
  if (message) {
    response.message = message;
  }
  
  // Only include statusCode in development or if explicitly needed
  if (process.env.NODE_ENV === 'development' || statusCode !== 200) {
    response.statusCode = statusCode;
  }
  
  return response;
};

/**
 * Creates an error response
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code (default: 400)
 * @param {any} errors - Additional error details (optional)
 * @returns {Object} Standardized error response
 */
const createErrorResponse = (message, statusCode = 400, errors = null) => {
  const response = {
    success: false,
    message,
  };
  
  // Only include statusCode in development or if non-standard status
  if (process.env.NODE_ENV === 'development' || statusCode !== 400) {
    response.statusCode = statusCode;
  }
  
  // Include errors if provided
  if (errors) {
    response.errors = errors;
  }
  
  // In development, include error stack if available
  if (process.env.NODE_ENV === 'development' && errors?.stack) {
    response.stack = errors.stack;
  }
  
  return response;
};

/**
 * Sends a success response
 * @param {Object} res - Express response object
 * @param {any} data - Response data
 * @param {string} message - Success message (optional)
 * @param {number} statusCode - HTTP status code (default: 200)
 */
const sendSuccess = (res, data, message = null, statusCode = 200) => {
  res.status(statusCode).json(createSuccessResponse(data, message, statusCode));
};

/**
 * Sends an error response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code (default: 400)
 * @param {any} errors - Additional error details
 */
const sendError = (res, message, statusCode = 400, errors = null) => {
  res.status(statusCode).json(createErrorResponse(message, statusCode, errors));
};

/**
 * Handles async controller errors
 * @param {Function} fn - Async controller function
 * @returns {Function} Express middleware function
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  createSuccessResponse,
  createErrorResponse,
  sendSuccess,
  sendError,
  asyncHandler,
};

