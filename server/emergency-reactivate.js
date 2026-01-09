const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function reactivateDefaultSchool() {
  console.log('--- EMERGENCY REACTIVATION ---');
  try {
    // Reactivate school with ID 1 (default system school)
    const school = await prisma.school.update({
      where: { id: 1 },
      data: { isActivated: true }
    });
    console.log(`SUCCESS: School "${school.name}" (Slug: ${school.slug}) is now REACTIVATED.`);

    // Also ensure the admin user in this school is active
    const adminUser = await prisma.user.updateMany({
      where: {
        schoolId: 1,
        role: 'superadmin'
      },
      data: { isActive: true }
    });
    console.log(`Ensured ${adminUser.count} superadmin user(s) are active.`);

  } catch (err) {
    console.error('ERROR during reactivation:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

reactivateDefaultSchool();
