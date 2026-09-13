const { PrismaClient } = require('@prisma/client');
const path = require('path');

// Manually initialize Prisma Client pointing to the PostgreSQL URL from the root .env
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres.pxjjxorczgqyqnlqfhmt:EduTechAI123@aws-1-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require"
    }
  }
});

async function main() {
  try {
    const schools = await prisma.school.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        isActivated: true,
        websiteTheme: true
      }
    });
    console.log('--- PRODUCTION SCHOOLS IN DATABASE ---');
    console.log(JSON.stringify(schools, null, 2));
  } catch (error) {
    console.error('Error fetching production schools:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
