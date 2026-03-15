const { generateLicenseKey } = require('./server/utils/license');
const prisma = require('./server/db');

async function test() {
  try {
    const schoolId = 1; // Assuming school 1 exists locally
    const packageType = 'premium';
    const maxStudents = -1;
    
    const school = await prisma.school.findFirst();
    if (!school) {
      console.log('No school found in DB');
      return;
    }
    
    console.log('Testing for school:', school.name);
    
    const key = generateLicenseKey({
      schoolName: school.name,
      packageType,
      maxStudents,
    });
    
    console.log('Generated Key:', key);
    
    const updated = await prisma.school.update({
      where: { id: school.id },
      data: {
        licenseKey: key,
        isActivated: true,
        packageType,
        maxStudents: maxStudents || (packageType === 'basic' ? 500 : packageType === 'standard' ? 1500 : -1),
        subscriptionActive: true
      }
    });
    
    console.log('Update success');
  } catch (err) {
    console.error('Test failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

test();
