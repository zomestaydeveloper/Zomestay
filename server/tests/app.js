// Test app setup - separate from main index.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

// Initialize express app
const app = express();

// Initialize Prisma client
const prisma = new PrismaClient();

// Enable CORS
app.use(cors({
  origin: ["http://localhost:5173", "https://zomesstay-web.onrender.com"],
  credentials: true
}));

// Parse JSON and URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Import routes
const adminAuthRouter = require('../src/routes/adminRoutes/auth.routes');
const PropertyRouter = require('../src/routes/adminRoutes/property.routes');
const HostRouter = require('../src/routes/adminRoutes/host.routes');
const AvailabilityRouter = require('../src/routes/adminRoutes/avalibility.routes');
const SpecialRateRoute = require("../src/routes/adminRoutes/specialRate.routes");
const MealPlanRouter = require('../src/routes/adminRoutes/mealPlan.routes');
const propertyDetailsRoute = require('../src/routes/userRoutes/propertyDetials.routes');
const specialRateApplicationRoute = require('../src/routes/adminRoutes/specialRateApplication.routes');
const PropertyRoomTypeRoute = require('../src/routes/adminRoutes/propertyRoomTypes.routes');
const PropertycreateRoute = require('../src/routes/adminRoutes/propertycreation.routes');
const RateCalendarRoute = require('../src/routes/adminRoutes/rateCalendar.routes');
const roomtypeMealplanRoute = require('../src/routes/HostRoutes/roomtype_mealplan.routes');
const dailyRateRoute = require('../src/routes/HostRoutes/dailyRate.routes');
const paymentRoute = require('../src/routes/payment.routes');
const roomsRoute = require('../src/routes/userRoutes/rooms.routes');
const agentAuthRoute = require('../src/routes/agentRoutes/auth.routes');

// Mount routes
app.use('/', (req, res, next) => {
  console.log(`Incoming request: ${req.method} ${req.url}`);
  next();
}, AvailabilityRouter);
app.use('/', adminAuthRouter);
app.use('/', PropertyRouter);
app.use('/', HostRouter);
app.use('/', SpecialRateRoute);
app.use('/', MealPlanRouter);
app.use('/', propertyDetailsRoute);
app.use('/', specialRateApplicationRoute);
app.use('/', PropertyRoomTypeRoute);
app.use('/', PropertycreateRoute);
app.use('/', RateCalendarRoute);
app.use('/', roomtypeMealplanRoute);
app.use('/host/daily-rates', dailyRateRoute);
app.use('/api', paymentRoute);
app.use('/api', roomsRoute);
app.use('/api', agentAuthRoute);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  // Handle multer errors specifically
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'File too large. Maximum size is 5MB.'
    });
  }
  
  if (err.message && err.message.includes('Only PDF, JPEG, and PNG files are allowed')) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

module.exports = app;
