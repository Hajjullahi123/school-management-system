require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkAllSchools() {
  try {
    const schools = await prisma.school.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        licenseKey: true,
        isActivated: true,
        packageType: true,
        maxStudents: true,
        subscriptionActive: true,
        expiresAt: true,
        createdAt: true
      }
    });

    console.log('\n=== ALL SCHOOLS LICENSE STATUS ===\n');

    schools.forEach((school, index) => {
      console.log(`${index + 1}. ${school.name} (${school.slug})`);
      console.log(`   ID: ${school.id}`);
      console.log(`   Is Activated: ${school.isActivated ? '✅ YES' : '❌ NO'}`);
      console.log(`   Has License Key: ${school.licenseKey ? '✅ YES' : '❌ NO'}`);
      console.log(`   Package Type: ${school.packageType || 'None'}`);
      console.log(`   Max Students: ${school.maxStudents || 'Not set'}`);
      console.log(`   Subscription Active: ${school.subscriptionActive ? '✅ YES' : '❌ NO'}`);
      console.log(`   Expires At: ${school.expiresAt || 'Never (Lifetime)'}`);
      console.log('');
    });

    console.log(`Total schools: ${schools.length}\n`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllSchools();
