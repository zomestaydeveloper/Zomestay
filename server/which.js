// scripts/which-db.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const [[row]] = await prisma.$queryRaw`SELECT DATABASE() AS db`;
  console.log('Prisma is connected to database:', row.db);
  await prisma.$disconnect();
})();
