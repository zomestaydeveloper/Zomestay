// Load environment variables FIRST - before any other code
require('dotenv').config();

process.env.TZ = 'Asia/Kolkata';

const express = require('express');
const { PrismaClient } = require('@prisma/client');
const cors = require('cors');
const path = require('path');
const { createFrontDeskHoldCleanup } = require('./src/utils/frontdeskHoldCleanup');

// Initialize express app
const app = express();
const port = process.env.PORT || 5000;

// Initialize Prisma client
const prisma = new PrismaClient();
const HOLD_CLEANUP_INTERVAL_MS = parseInt(
  process.env.FRONTDESK_HOLD_CLEANUP_INTERVAL_MS || '60000',
  10
);
const frontDeskHoldCleanup = createFrontDeskHoldCleanup(prisma);

// Import routes
let adminAuthRouter;
try {
  adminAuthRouter = require('./src/routes/adminRoutes/auth.routes');
} catch (error) {
  console.error('Error loading routes:', error);
  process.exit(1);
}
const PropertyRouter = require('./src/routes/adminRoutes/property.routes');
const HostRouter = require('./src/routes/adminRoutes/host.routes');
const AvailabilityRouter = require('./src/routes/adminRoutes/avalibility.routes');
const SpecialRateRoute   = require("./src/routes/adminRoutes/specialRate.routes")
const MealPlanRouter = require('./src/routes/adminRoutes/mealPlan.routes');
const propertyDetailsRoute = require('./src/routes/userRoutes/propertyDetials.routes');
const propertySearchRoute = require('./src/routes/userRoutes/propertySearch.routes');
const requestCallbackRoute = require('./src/routes/userRoutes/requestCallback.routes');
const specialRateApplicationRoute = require('./src/routes/adminRoutes/specialRateApplication.routes');
const PropertyRoomTypeRoute = require('./src/routes/adminRoutes/propertyRoomTypes.routes');
const PropertycreateRoute = require('./src/routes/adminRoutes/propertycreation.routes');
const RateCalendarRoute = require('./src/routes/adminRoutes/rateCalendar.routes');
const FrontDeskRoute = require('./src/routes/adminRoutes/frontdesk.routes');
const roomtypeMealplanRoute = require('./src/routes/HostRoutes/roomtype_mealplan.routes');
const dailyRateRoute = require('./src/routes/HostRoutes/dailyRate.routes');
const paymentRoute = require('./src/routes/userRoutes/payment.routes');
const roomsRoute = require('./src/routes/userRoutes/rooms.routes');
const userAuthRoute = require('./src/routes/userRoutes/auth.routes');
const userDetailsRoute = require('./src/routes/userRoutes/userDetails.routes');
const agentAuthRoute = require('./src/routes/agentRoutes/auth.routes');
const TravelAgentRoute = require('./src/routes/agentRoutes/travelAgent.routes');
const PropertyForAgentRoute = require('./src/routes/agentRoutes/propertyForAgent.routes');
const AgentPropertyDiscountRoute = require('./src/routes/agentRoutes/agentPropertyDiscount.routes');
const CancellationPolicyRoute = require('./src/routes/adminRoutes/cancellationPolicy.routes');
const BookingCancellationRoute = require('./src/routes/bookin_cancellationRoute/bookingCancellation.routes');
const AllBookingsRoute = require('./src/routes/allBookings/getallbookings.Routes');
const RazorpayWebhookRoute = require('./src/routes/webhooks/razorpay.routes');
const GuestsRoute = require('./src/routes/adminRoutes/guests.routes');
const PaymentsRoute = require('./src/routes/adminRoutes/payments.routes');
const SiteConfigRoute = require('./src/routes/siteConfig.routes');

// Enable CORS
app.use(cors({
  origin: ["http://localhost:5173", "https://zomesstay-web.onrender.com"],
  credentials: true
}));

// Register webhook routes BEFORE JSON parser (webhook needs raw body for signature verification)
// PRODUCTION: Unified Razorpay webhook handler (handles ALL Razorpay events)
app.use('/webhooks', RazorpayWebhookRoute);

// Parse JSON and URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/', (req, res, next) => {
  console.log(`Incoming request: ${req.method} ${req.url}`);
  next();
}, AvailabilityRouter);
app.use('/', adminAuthRouter);
app.use('/', PropertyRouter);
app.use('/', HostRouter);
app.use('/', SpecialRateRoute)
app.use('/', MealPlanRouter);
app.use('/', FrontDeskRoute);
app.use('/', propertyDetailsRoute);
app.use('/api/search', propertySearchRoute);
app.use('/api/callback-requests', requestCallbackRoute);
app.use('/', specialRateApplicationRoute);
app.use('/', PropertyRoomTypeRoute);
app.use('/', PropertycreateRoute);
app.use('/', RateCalendarRoute);
app.use('/', CancellationPolicyRoute);
app.use('/', AllBookingsRoute);
app.use('/', BookingCancellationRoute);
app.use('/', GuestsRoute);
app.use('/', PaymentsRoute);
app.use('/api/site-config', SiteConfigRoute);
app.use('/', roomtypeMealplanRoute);
app.use('/host/daily-rates', dailyRateRoute);
app.use('/api', paymentRoute);
app.use('/api', roomsRoute);
app.use('/api', userAuthRoute);
app.use('/api', userDetailsRoute);
app.use('/api', agentAuthRoute);
app.use('/api/travel-agents', TravelAgentRoute);
app.use('/api/properties-for-agent', PropertyForAgentRoute);
app.use('/api/agent-discounts', AgentPropertyDiscountRoute);



// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);

  // Handle multer errors specifically
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'File too large. Maximum size is 2MB per file.',
    });
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({
      success: false,
      message: 'Too many files. Maximum 60 files allowed.',
    });
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      success: false,
      message: 'Unexpected file field.',
    });
  }

  // Handle multer file filter errors
  if (err.message && err.message.includes('Only image files are allowed')) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  // Handle other errors
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Connect to database and start server
async function startServer() {
  try {
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');

    // Start periodic cleanup of expired front desk holds
    await frontDeskHoldCleanup.start(HOLD_CLEANUP_INTERVAL_MS);
    
    // Start the server
    app.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error('❌ Failed to connect to the database:', error);
    process.exit(1);
  }
}

// Start the application
startServer().catch(error => {
  console.error('Fatal error during startup:', error);
  process.exit(1);
});

const shutdown = async () => {
  frontDeskHoldCleanup.stop();
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
