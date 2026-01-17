const app = require('./app');
const prisma = require('./config/prisma');
const { createFrontDeskHoldCleanup } = require('./utils/frontdeskHoldCleanup');

const port = process.env.PORT || 5000;

const HOLD_INTERVAL = parseInt(
  process.env.FRONTDESK_HOLD_CLEANUP_INTERVAL_MS || '60000',
  10
);

const frontDeskHoldCleanup = createFrontDeskHoldCleanup(prisma);

async function startServer() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected');

    await frontDeskHoldCleanup.start(HOLD_INTERVAL);

    app.listen(port, () => {
      console.log(`🚀 Server running on http://localhost:${port}`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

const shutdown = async () => {
  console.log('🛑 Graceful shutdown...');
  frontDeskHoldCleanup.stop();
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

module.exports = startServer;
