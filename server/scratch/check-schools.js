const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSchools() {
  try {
    const schools = await prisma.school.findMany({
      select: { id: true, name: true, slug: true }
    });
    console.log('SCHOOLS IN DATABASE:');
    schools.forEach(s => console.log(`ID: ${s.id} | Name: ${s.name} | Slug: ${s.slug}`));
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSchools();
