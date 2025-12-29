// Load environment variables FIRST - before any other code
require('dotenv').config();

process.env.TZ = 'Asia/Kolkata';

const express = require('express');
const { PrismaClient } = require('@prisma/client');
const cors = require('cors');
const path = require('path');
const { createFrontDeskHoldCleanup } = require('./src/utils/frontdeskHoldCleanup');
const { registerRoutes } = require('./src/routes/routeRegistry');

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

// Enable CORS
app.use(cors({
  origin: [
    "http://localhost:5173",              // Local Dev
    "https://techiconnect.shop",          // Main Domain (Frontend)
    "https://www.techiconnect.shop",      // Optional (WWW)
    "https://api.techiconnect.shop",      // API Subdomain
  ],
  credentials: true
}));

// Request logging middleware
const loggingMiddleware = (req, res, next) => {
  console.log(`Incoming request: ${req.method} ${req.url}`);
  next();
};

// ============================================================================
// ROUTE REGISTRATION - Using Route Registry
// ============================================================================
// Routes are now organized by role in routeRegistry.js
// This makes it easy to see which routes belong to which role
const routeManager = registerRoutes(app, loggingMiddleware);

// Register webhooks FIRST (before JSON parser - webhook needs raw body)
routeManager.registerWebhooks();

// Parse JSON and URL-encoded bodies (AFTER webhook routes)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Register all other routes (after JSON parser)
routeManager.registerAll();

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
