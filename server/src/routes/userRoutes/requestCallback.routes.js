const express = require('express');
const router = express.Router();
const RequestCallbackController = require('../../controllers/userController/requestcallbackcontroller');
const { extractRole } = require('../../middleware/extractRole.middleware');
const { requireAdmin } = require('../../utils/auth.utils');

// Public endpoint - Create callback request
router.post('/', RequestCallbackController.createCallbackRequest);

// Protected endpoints (for admin)
router.get('/', extractRole, (req, res, next) => {
  const error = requireAdmin(req.user, res);
  if (error) return;
  next();
}, RequestCallbackController.getAllCallbackRequests);

router.get('/:id', extractRole, (req, res, next) => {
  const error = requireAdmin(req.user, res);
  if (error) return;
  next();
}, RequestCallbackController.getCallbackRequestById);

router.patch('/:id/status', extractRole, (req, res, next) => {
  const error = requireAdmin(req.user, res);
  if (error) return;
  next();
}, RequestCallbackController.updateCallbackRequestStatus);

router.delete('/:id', extractRole, (req, res, next) => {
  const error = requireAdmin(req.user, res);
  if (error) return;
  next();
}, RequestCallbackController.deleteCallbackRequest);

module.exports = router;

