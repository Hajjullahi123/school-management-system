const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createEdutechSchool() {
  try {
    const existing = await prisma.school.findUnique({ where: { slug: 'edutech' } });
    if (existing) {
      console.log('edutech school already exists:', existing.id);
      return;
    }

    const school = await prisma.school.create({
      data: {
        name: 'EduTech Systems',
        slug: 'edutech',
        email: 'admin@edutechportal.com',
        phone: '+234 (0) 800 123 4567',
        address: 'HQ',
        motto: 'Transforming Education Through Innovation',
        primaryColor: '#0ea5e9',
        secondaryColor: '#38bdf8',
        accentColor: '#0284c7',
        isActivated: true,
        packageType: 'enterprise',
        maxStudents: 999999,
        isSetupComplete: true,
        welcomeTitle: 'Transforming Education Through Innovation',
        welcomeMessage: 'Empowering institutions with cutting-edge technology. Experience seamless administration, data-driven insights, and bank-grade security all in one platform.'
      }
    });

    console.log('Successfully created edutech school:', school.id);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

createEdutechSchool();
