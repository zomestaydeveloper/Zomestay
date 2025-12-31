const express = require('express');
const adminAuthRouter = express.Router();
const { uploadImage } = require('../../config/multer');
const AuthController = require('../../controllers/adminController/auth.controller');

// Signup route
adminAuthRouter.post('/signup', uploadImage.single('profileImage'), AuthController.signup);
adminAuthRouter.post('/login', AuthController.login);
adminAuthRouter.post('/send-otp', AuthController.sendOTP);
adminAuthRouter.post('/resend-otp', AuthController.resendOTP);
adminAuthRouter.post('/verify-otp', AuthController.verifyOTP);
adminAuthRouter.post('/logout', AuthController.logout);
adminAuthRouter.get('/test', (req, res) => {
  const authHeader = req.headers['authorization']; // or req.get('authorization')
  
  // Bearer - <token>
  const token = authHeader && authHeader.split(' ')[1];

  console.log("Authorization Header:", authHeader);
  console.log("Extracted Token:", token);

  res.status(200).json({
    success: true,
    message: 'Test endpoint hit successfully',
    token: token // just to confirm
  });
});

 


// Export the router
module.exports = adminAuthRouter;


