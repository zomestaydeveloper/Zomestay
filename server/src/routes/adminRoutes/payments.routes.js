const express = require('express');
const paymentsRouter = express.Router();
const { extractRole } = require('../../middleware/extractRole.middleware');
const { requireAdmin, requireAdminOrHost } = require('../../utils/auth.utils');
const PaymentsController = require('../../controllers/PaymentController/payments.controller');

/**
 * ===================== Payment Management Routes =====================
 * 
 * Admin: Can see all payments from all properties, can update any payment status
 * Host: Can see payments from their own properties, can update only their payment status
 */

// Get all payments (Admin only)
paymentsRouter.get(
  '/payments',
  extractRole,
  (req, res, next) => {
    const error = requireAdmin(req.user, res);
    if (error) return;
    next();
  },
  PaymentsController.getAllPayments
);

// Get payments for a specific property (Admin or Host)
paymentsRouter.get(
  '/payments/property/:propertyId',
  extractRole,
  (req, res, next) => {
    const error = requireAdminOrHost(req.user, res);
    if (error) return;
    next();
  },
  PaymentsController.getPropertyPayments
);

// Update payment status (Admin or Host - but host can only update their own property payments)
paymentsRouter.patch(
  '/payments/:paymentId/status',
  extractRole,
  (req, res, next) => {
    const error = requireAdminOrHost(req.user, res);
    if (error) return;
    next();
  },
  PaymentsController.updatePaymentStatus
);

// Get payment statuses (Admin or Host - for dropdown)
paymentsRouter.get(
  '/payments/statuses',
  extractRole,
  (req, res, next) => {
    const error = requireAdminOrHost(req.user, res);
    if (error) return;
    next();
  },
  PaymentsController.getPaymentStatuses
);

module.exports = paymentsRouter;

