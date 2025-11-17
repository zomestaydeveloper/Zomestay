const express = require('express');
const guestsRouter = express.Router();
const { extractRole } = require('../../middleware/extractRole.middleware');
const { requireAdmin, requireAdminOrHost, requireHost } = require('../../utils/auth.utils');
const GuestsController = require('../../controllers/GuestsController/guests.controller');

/**
 * ===================== Guest Management Routes =====================
 * 
 * Admin: Can see all guests from all properties, can block/unblock any guest
 * Host: Can see guests from their own properties, can block/unblock only their guests
 */

// Get all guests (Admin only)
guestsRouter.get(
  '/guests',
  extractRole,
  (req, res, next) => {
    const error = requireAdmin(req.user, res);
    if (error) return;
    next();
  },
  GuestsController.getAllGuests
);

// Get guests for a specific property (Host only - requires property access verification)
guestsRouter.get(
  '/guests/property/:propertyId',
  extractRole,
  (req, res, next) => {
    const error = requireAdminOrHost(req.user, res);
    if (error) return;
    next();
  },
  GuestsController.getPropertyGuests
);

// Block guest (Admin or Host - but host can only block their own guests)
guestsRouter.post(
  '/guests/:guestId/block',
  extractRole,
  (req, res, next) => {
    const error = requireAdminOrHost(req.user, res);
    if (error) return;
    next();
  },
  GuestsController.blockGuest
);

// Unblock guest (Admin or Host - but host can only unblock their own guests)
guestsRouter.post(
  '/guests/:guestId/unblock',
  extractRole,
  (req, res, next) => {
    const error = requireAdminOrHost(req.user, res);
    if (error) return;
    next();
  },
  GuestsController.unblockGuest
);

// Toggle block status (Admin or Host - but host can only toggle their own guests)
guestsRouter.patch(
  '/guests/:guestId/toggle-block',
  extractRole,
  (req, res, next) => {
    const error = requireAdminOrHost(req.user, res);
    if (error) return;
    next();
  },
  GuestsController.toggleBlockGuest
);

module.exports = guestsRouter;

