const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSchoolConfig() {
  const school = await prisma.school.findFirst({
    where: { name: { contains: "Darul Qur" } },
    select: { id: true, name: true, weekendDays: true }
  });
  console.log('School Config:', JSON.stringify(school, null, 2));
  await prisma.$disconnect();
}

checkSchoolConfig();
