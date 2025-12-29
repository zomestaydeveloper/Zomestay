const express = require('express');
const TravelAgentAuthController = require('../../controllers/agentController/auth.controller');
const { uploadCertificate, uploadImage } = require('../../config/multer');
const { authenticateTravelAgent } = require('../../middleware/auth.middleware');

const router = express.Router();

// Travel Agent Registration (with file upload)
router.post('/travel-agent/register', uploadCertificate.single('iataCertificate'), TravelAgentAuthController.register);

// Travel Agent Login
router.post('/travel-agent/login', TravelAgentAuthController.login);

// Get Travel Agent Profile (requires authentication)
router.get('/travel-agent/profile', authenticateTravelAgent, TravelAgentAuthController.getProfile);

// Update Travel Agent Profile (requires authentication, with optional profile image upload)
router.put('/travel-agent/profile/update', authenticateTravelAgent, uploadImage.single('profileImage'), TravelAgentAuthController.updateProfile);

// Change Travel Agent Password (requires authentication)
router.put('/travel-agent/password/change', authenticateTravelAgent, TravelAgentAuthController.changePassword);

// Travel Agent Logout (optional authentication - allows logout even with expired tokens)
router.post('/travel-agent/logout', TravelAgentAuthController.logout);

module.exports = router;
