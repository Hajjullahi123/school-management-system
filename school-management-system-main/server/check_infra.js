const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkInfrastructure() {
  try {
    console.log('--- Superadmin Check ---');
    const superadmins = await prisma.user.findMany({
      where: { role: 'superadmin' },
      select: { id: true, username: true, schoolId: true, email: true, firstName: true, lastName: true }
    });
    console.log('Total Superadmins found:', superadmins.length);
    superadmins.forEach(s => console.log(`- ID: ${s.id}, Username: ${s.username}, SchoolID: ${s.schoolId}, Name: ${s.firstName} ${s.lastName}`));

    console.log('\n--- Schools List ---');
    const schools = await prisma.school.findMany({
      select: { id: true, name: true, slug: true, isActivated: true, packageType: true }
    });
    schools.forEach(s => console.log(`- ID: ${s.id}, Name: ${s.name}, Slug: ${s.slug}, Package: ${s.packageType}`));

    console.log('\n--- Searching for Al-Birr specifically ---');

    if (alBirr) {
      console.log('School Found:', alBirr.name, '(ID:', alBirr.id, ')');
      console.log('Slug:', alBirr.slug);
      console.log('Activated:', alBirr.isActivated);
      console.log('Package Type:', alBirr.packageType);
      console.log('Subscription Active:', alBirr.subscriptionActive);
      console.log('Expires At:', alBirr.expiresAt);

      const sessionCount = await prisma.academicSession.count({ where: { schoolId: alBirr.id } });
      const termCount = await prisma.term.count({ where: { schoolId: alBirr.id } });
      const feeStructureCount = await prisma.classFeeStructure.count({ where: { schoolId: alBirr.id } });

      console.log('Academic Sessions:', sessionCount);
      console.log('Terms:', termCount);
      console.log('Fee Structures:', feeStructureCount);

    } else {
      console.log('Al-Birr Academy school not found.');
    }

  } catch (error) {
    console.error('Check error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkInfrastructure();
