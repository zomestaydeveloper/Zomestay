// Load environment variables FIRST
process.env.TZ = 'Asia/Kolkata';
require('./src/config/env');

const express = require('express');
const { PrismaClient } = require('@prisma/client');
const cors = require('cors');
const path = require('path');
const { createFrontDeskHoldCleanup } = require('./src/utils/frontdeskHoldCleanup');
const { registerRoutes } = require('./src/routes/routeRegistry');

// Initialize app
const app = express();
const port = process.env.PORT || 5000;

// Prisma
const prisma = new PrismaClient();

// Cleanup
const HOLD_CLEANUP_INTERVAL_MS = parseInt(
  process.env.FRONTDESK_HOLD_CLEANUP_INTERVAL_MS || '60000',
  10
);
const frontDeskHoldCleanup = createFrontDeskHoldCleanup(prisma);

// CORS
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://techiconnect.shop',
    'https://www.techiconnect.shop',
    'https://api.techiconnect.shop',
  ],
  credentials: true,
}));

// Logging middleware
const loggingMiddleware = (req, res, next) => {
  console.log(`[${req.method}] ${req.url}`);
  next();
};

// ================= ROUTES =================
const routeManager = registerRoutes(app, loggingMiddleware);

// Webhooks first (raw body)
routeManager.registerWebhooks();

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Other routes
routeManager.registerAll();

// ================= ERROR HANDLER =================
app.use((err, req, res, next) => {
  console.error('Error:', err);

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

  if (err.message?.includes('Only image files are allowed')) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// ================= START SERVER =================
async function startServer() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected');

    await frontDeskHoldCleanup.start(HOLD_CLEANUP_INTERVAL_MS);

    app.listen(port, () => {
      console.log(`🚀 Server running on http://localhost:${port}`);
    });
  } catch (err) {
    console.error('❌ Startup failed:', err);
    process.exit(1);
  }
}

startServer();

// ================= GRACEFUL SHUTDOWN =================
const shutdown = async () => {
  console.log('🛑 Shutting down...');
  frontDeskHoldCleanup.stop();
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
