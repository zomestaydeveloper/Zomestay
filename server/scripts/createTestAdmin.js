const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createTestAdmin() {
  try {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const admin = await prisma.admin.create({
      data: {
        email: 'admin@example.com',
        firstName: 'Admin',
        lastName: 'User',
        password: hashedPassword,
        role: 'ADMIN',
        status: 'ACTIVE'
      },
    });

    console.log('✅ Test admin created successfully:');
    console.log({
      id: admin.id,
      email: admin.email,
      name: `${admin.firstName} ${admin.lastName}`,
      role: admin.role,
      status: admin.status
    });
  } catch (error) {
    console.error('❌ Error creating test admin:');
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestAdmin();
