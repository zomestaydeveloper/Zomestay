const request = require('supertest');
const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');

// Import test app
const app = require('./app.js');

const prisma = new PrismaClient();

describe('Travel Agent Integration Tests', () => {
  const testEmail = 'integration@test.com';
  const testPhone = '+1234567890';

  beforeEach(async () => {
    // Clean up test data
    await prisma.travelAgent.deleteMany({
      where: {
        email: testEmail
      }
    });
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.travelAgent.deleteMany({
      where: {
        email: testEmail
      }
    });
  });

  describe('Complete Travel Agent Registration Flow', () => {
    it('should complete end-to-end registration process', async () => {
      // Step 1: Register new travel agent
      const registrationData = {
        email: testEmail,
        phone: testPhone,
        password: 'TestPass123',
        firstName: 'John',
        lastName: 'Doe',
        agencyName: 'Test Travel Agency',
        licenseNumber: 'LIC123456',
        officeAddress: '123 Test Street, Test City, TC 12345'
      };

      const registrationResponse = await request(app)
        .post('/api/travel-agent/register')
        .field('email', registrationData.email)
        .field('phone', registrationData.phone)
        .field('password', registrationData.password)
        .field('firstName', registrationData.firstName)
        .field('lastName', registrationData.lastName)
        .field('agencyName', registrationData.agencyName)
        .field('licenseNumber', registrationData.licenseNumber)
        .field('officeAddress', registrationData.officeAddress)
        .expect(201);

      // Verify API response
      expect(registrationResponse.body.success).toBe(true);
      expect(registrationResponse.body.data.agent.email).toBe(testEmail);
      expect(registrationResponse.body.data.agent.status).toBe('pending');

      // Step 2: Verify data in database
      const savedAgent = await prisma.travelAgent.findUnique({
        where: { email: testEmail }
      });

      expect(savedAgent).toBeTruthy();
      expect(savedAgent.firstName).toBe('John');
      expect(savedAgent.lastName).toBe('Doe');
      expect(savedAgent.agencyName).toBe('Test Travel Agency');
      expect(savedAgent.licenseNumber).toBe('LIC123456');
      expect(savedAgent.officeAddress).toBe('123 Test Street, Test City, TC 12345');
      expect(savedAgent.status).toBe('pending');
      expect(savedAgent.password).not.toBe('TestPass123'); // Should be hashed

      // Step 3: Approve agent for login testing
      await prisma.travelAgent.update({
        where: { email: testEmail },
        data: { status: 'approved' }
      });

      // Step 4: Test login with approved agent
      const loginResponse = await request(app)
        .post('/api/travel-agent/login')
        .send({
          email: testEmail,
          password: 'TestPass123'
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.data.token).toBeDefined();
      expect(loginResponse.body.data.agent.email).toBe(testEmail);

      // Step 5: Test profile access with token
      const profileResponse = await request(app)
        .get('/api/travel-agent/profile')
        .set('Authorization', `Bearer ${loginResponse.body.data.token}`)
        .expect(200);

      expect(profileResponse.body.success).toBe(true);
      expect(profileResponse.body.data.email).toBe(testEmail);
      expect(profileResponse.body.data.firstName).toBe('John');
    });

    it('should handle file upload integration', async () => {
      // Create a test PDF file
      const testFilePath = path.join(__dirname, 'test-certificate.pdf');
      const testFileContent = 'Test PDF content for integration testing';
      fs.writeFileSync(testFilePath, testFileContent);

      try {
        // Register with file upload
        const response = await request(app)
          .post('/api/travel-agent/register')
          .field('email', testEmail)
          .field('phone', testPhone)
          .field('password', 'TestPass123')
          .field('officeAddress', '123 Test Street')
          .attach('iataCertificate', testFilePath)
          .expect(201);

        expect(response.body.success).toBe(true);

        // Verify file was saved in database
        const savedAgent = await prisma.travelAgent.findUnique({
          where: { email: testEmail }
        });

        expect(savedAgent.iataCertificate).toBeTruthy();
        expect(savedAgent.iataCertificate).toContain('agent-');
        expect(savedAgent.iataCertificate).toContain('.pdf');

        // Verify file exists on filesystem
        const filePath = path.join(__dirname, '..', 'uploads', 'agent-certificates', path.basename(savedAgent.iataCertificate)); 
        expect(fs.existsSync(filePath)).toBe(true);

        // Verify file content
        const fileContent = fs.readFileSync(filePath, 'utf8');
        expect(fileContent).toBe(testFileContent);

      } finally {
        // Clean up test file
        if (fs.existsSync(testFilePath)) {
          fs.unlinkSync(testFilePath);
        }
      }
    });

    it('should handle duplicate registration prevention', async () => {
      // First registration
      await request(app)
        .post('/api/travel-agent/register')
        .field('email', testEmail)
        .field('phone', testPhone)
        .field('password', 'TestPass123')
        .field('officeAddress', '123 Test Street')
        .expect(201);

      // Verify first registration in database
      const firstAgent = await prisma.travelAgent.findUnique({
        where: { email: testEmail }
      });
      expect(firstAgent).toBeTruthy();

      // Second registration with same email should fail
      const duplicateResponse = await request(app)
        .post('/api/travel-agent/register')
        .field('email', testEmail)
        .field('phone', '+9876543210')
        .field('password', 'TestPass123')
        .field('officeAddress', '456 Another Street')
        .expect(400);

      expect(duplicateResponse.body.success).toBe(false);
      expect(duplicateResponse.body.message).toContain('already have an account');

      // Verify only one record exists in database
      const agents = await prisma.travelAgent.findMany({
        where: { email: testEmail }
      });
      expect(agents).toHaveLength(1);
    });

    it('should handle authentication flow integration', async () => {
      // Register agent
      await request(app)
        .post('/api/travel-agent/register')
        .field('email', testEmail)
        .field('phone', testPhone)
        .field('password', 'TestPass123')
        .field('officeAddress', '123 Test Street')
        .expect(201);

      // Try to login before approval (should fail)
      const pendingLoginResponse = await request(app)
        .post('/api/travel-agent/login')
        .send({
          email: testEmail,
          password: 'TestPass123'
        })
        .expect(401);

      expect(pendingLoginResponse.body.success).toBe(false);
      expect(pendingLoginResponse.body.message).toContain('pending');

      // Approve agent
      await prisma.travelAgent.update({
        where: { email: testEmail },
        data: { status: 'approved' }
      });

      // Login after approval (should succeed)
      const approvedLoginResponse = await request(app)
        .post('/api/travel-agent/login')
        .send({
          email: testEmail,
          password: 'TestPass123'
        })
        .expect(200);

      expect(approvedLoginResponse.body.success).toBe(true);
      expect(approvedLoginResponse.body.data.token).toBeDefined();

      // Use token to access protected route
      const profileResponse = await request(app)
        .get('/api/travel-agent/profile')
        .set('Authorization', `Bearer ${approvedLoginResponse.body.data.token}`)
        .expect(200);

      expect(profileResponse.body.success).toBe(true);
      expect(profileResponse.body.data.email).toBe(testEmail);
    });

    it('should handle error scenarios integration', async () => {
      // Test missing required fields
      const missingFieldsResponse = await request(app)
        .post('/api/travel-agent/register')
        .field('phone', testPhone)
        .field('password', 'TestPass123')
        .expect(400);

      expect(missingFieldsResponse.body.success).toBe(false);
      expect(missingFieldsResponse.body.message).toContain('Email and password are required');

      // Test invalid file type
      const testFilePath = path.join(__dirname, 'test-certificate.txt');
      fs.writeFileSync(testFilePath, 'Test content');

      try {
        const invalidFileResponse = await request(app)
          .post('/api/travel-agent/register')
          .field('email', testEmail)
          .field('phone', testPhone)
          .field('password', 'TestPass123')
          .field('officeAddress', '123 Test Street')
          .attach('iataCertificate', testFilePath)
          .expect(400);

        expect(invalidFileResponse.body.success).toBe(false);
        expect(invalidFileResponse.body.message).toContain('Only PDF, JPEG, and PNG files are allowed');

      } finally {
        if (fs.existsSync(testFilePath)) {
          fs.unlinkSync(testFilePath);
        }
      }
    });
  });

  describe('Database Integration Tests', () => {
    it('should maintain data consistency across operations', async () => {
      // Register agent
      const registrationResponse = await request(app)
        .post('/api/travel-agent/register')
        .field('email', testEmail)
        .field('phone', testPhone)
        .field('password', 'TestPass123')
        .field('firstName', 'John')
        .field('lastName', 'Doe')
        .field('officeAddress', '123 Test Street')
        .expect(201);

      const agentId = registrationResponse.body.data.agent.id;

      // Verify all fields are correctly stored
      const savedAgent = await prisma.travelAgent.findUnique({
        where: { id: agentId }
      });

      expect(savedAgent.email).toBe(testEmail);
      expect(savedAgent.phone).toBe(testPhone);
      expect(savedAgent.firstName).toBe('John');
      expect(savedAgent.lastName).toBe('Doe');
      expect(savedAgent.officeAddress).toBe('123 Test Street');
      expect(savedAgent.status).toBe('pending');
      expect(savedAgent.createdAt).toBeDefined();
      expect(savedAgent.updatedAt).toBeDefined();

      // Test update operation
      await prisma.travelAgent.update({
        where: { id: agentId },
        data: { status: 'approved' }
      });

      const updatedAgent = await prisma.travelAgent.findUnique({
        where: { id: agentId }
      });

      expect(updatedAgent.status).toBe('approved');
      expect(updatedAgent.updatedAt.getTime()).toBeGreaterThan(savedAgent.updatedAt.getTime());
    });

    it('should handle concurrent operations', async () => {
      // Test concurrent registrations with different emails
      const promises = [];
      
      for (let i = 0; i < 5; i++) {
        promises.push(
          request(app)
            .post('/api/travel-agent/register')
            .field('email', `concurrent${i}@test.com`)
            .field('phone', `+123456789${i}`)
            .field('password', 'TestPass123')
            .field('officeAddress', `123 Test Street ${i}`)
        );
      }

      const responses = await Promise.all(promises);

      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      });

      // Verify all records in database
      const agents = await prisma.travelAgent.findMany({
        where: {
          email: {
            contains: 'concurrent'
          }
        }
      });

      expect(agents).toHaveLength(5);

      // Clean up
      await prisma.travelAgent.deleteMany({
        where: {
          email: {
            contains: 'concurrent'
          }
        }
      });
    });
  });
});
