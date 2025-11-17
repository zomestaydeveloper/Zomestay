// Test setup file
const { PrismaClient } = require('@prisma/client');

// Use test database
process.env.DATABASE_URL = process.env.DATABASE_URL || 'mysql://root:password@localhost:3306/zomes_stay_test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';
process.env.NODE_ENV = 'test';

const prisma = new PrismaClient();

// Global test setup
beforeAll(async () => {
  try {
    // Connect to test database
    await prisma.$connect();
    console.log('✅ Test database connected successfully');
  } catch (error) {
    console.error('❌ Test database connection failed:', error);
  }
});

afterAll(async () => {
  try {
    // Cleanup after all tests
    await prisma.$disconnect();
    console.log('✅ Test database disconnected');
  } catch (error) {
    console.error('❌ Error disconnecting from test database:', error);
  }
});

// Clean up after each test
afterEach(async () => {
  try {
    // Clean up test data
    await prisma.travelAgent.deleteMany({
      where: {
        email: {
          contains: 'test'
        }
      }
    });
  } catch (error) {
    console.error('❌ Error cleaning up test data:', error);
  }
});
