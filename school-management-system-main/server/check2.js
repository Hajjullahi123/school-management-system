require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const school = await prisma.school.findFirst({ where: { name: { contains: 'Amana' } } });
    if (!school) {
      console.log('School not found!');
      return;
    }
    console.log('School:', school.name, school.id);
    
    const classes = await prisma.class.findMany({ where: { schoolId: school.id } });
    console.log('Classes count:', classes.length);
    
    const apps = await prisma.admissionApplication.findMany({ where: { schoolId: school.id } });
    console.log('Applications count:', apps.length);
    if (apps.length > 0) {
      console.log('Sample app status:', apps[0].status, 'candidate:', apps[0].candidateFirstName, 'parent:', apps[0].parentName);
    }
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

check();
