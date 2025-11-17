const express = require('express');

const CancellationPolicyController = require('../../controllers/cancellationPolicy/cancellationPolicy.controller');

const CancellationPolicyRoute = express.Router();

// Create cancellation policy
CancellationPolicyRoute.post(
  '/cancellation-policies',
  CancellationPolicyController.createCancellationPolicy
);

// List cancellation policies
CancellationPolicyRoute.get(
  '/cancellation-policies',
  CancellationPolicyController.getCancellationPolicies
);

// Update cancellation policy
CancellationPolicyRoute.put(
  '/cancellation-policies/:id',
  CancellationPolicyController.updateCancellationPolicy
);

// Delete cancellation policy
CancellationPolicyRoute.delete(
  '/cancellation-policies/:id',
  CancellationPolicyController.deleteCancellationPolicy
);

module.exports = CancellationPolicyRoute;

