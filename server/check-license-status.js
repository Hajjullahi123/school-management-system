require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkLicenseStatus() {
  try {
    // Find the school by slug (Amana Academy)
    const school = await prisma.school.findFirst({
      where: {
        OR: [
          { name: { contains: 'Amana' } },
          { slug: { contains: 'amana' } }
        ]
      }
    });

    if (!school) {
      console.log('❌ School not found');
      return;
    }

    console.log('\n=== School License Status ===');
    console.log('School Name:', school.name);
    console.log('School Slug:', school.slug);
    console.log('License Key:', school.licenseKey || 'None');
    console.log('Is Activated:', school.isActivated);
    console.log('Package Type:', school.packageType);
    console.log('Max Students:', school.maxStudents);
    console.log('Expires At:', school.expiresAt);
    console.log('Subscription Active:', school.subscriptionActive);
    console.log('Last Billing Date:', school.lastBillingDate);
    console.log('Created At:', school.createdAt);

    if (school.licenseKey) {
      console.log('\n✅ License key exists in database');
    } else {
      console.log('\n⚠️ No license key found in database');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkLicenseStatus();
