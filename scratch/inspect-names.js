// Inspect students with missing firstName/lastName on the PRODUCTION database
const prisma = require('../server/db');

async function inspect() {
  try {
    // Find students where the User has empty or missing firstName/lastName
    const students = await prisma.student.findMany({
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, username: true }
        }
      },
      orderBy: { id: 'asc' }
    });

    console.log(`\n=== Total students: ${students.length} ===\n`);

    const problematic = students.filter(s => {
      const fName = (s.user?.firstName || '').trim();
      const lName = (s.user?.lastName || '').trim();
      return !fName || !lName;
    });

    console.log(`=== Students with missing firstName or lastName: ${problematic.length} ===\n`);

    // Show detailed data for each problematic student (limit to first 30)
    problematic.slice(0, 30).forEach(s => {
      console.log(`--- Student ID: ${s.id} | Admission: ${s.admissionNumber} ---`);
      console.log(`  user.firstName:     "${s.user?.firstName || ''}"`);
      console.log(`  user.lastName:      "${s.user?.lastName || ''}"`);
      console.log(`  student.name:       "${s.name || ''}"`);
      console.log(`  student.middleName: "${s.middleName || ''}"`);
      console.log(`  parentGuardian:     "${s.parentGuardianName || ''}"`);
      console.log(`  username:           "${s.user?.username || ''}"`);
      console.log('');
    });

    if (problematic.length > 30) {
      console.log(`... and ${problematic.length - 30} more\n`);
    }

    // Summary of data availability
    const hasLegacyName = problematic.filter(s => s.name && s.name.trim());
    const hasMiddleNameOnly = problematic.filter(s => s.middleName && s.middleName.trim() && !(s.user?.firstName?.trim()) && !(s.user?.lastName?.trim()));
    const hasBothMissing = problematic.filter(s => !(s.user?.firstName?.trim()) && !(s.user?.lastName?.trim()));
    const hasOnlyFirstName = problematic.filter(s => (s.user?.firstName?.trim()) && !(s.user?.lastName?.trim()));
    const hasOnlyLastName = problematic.filter(s => !(s.user?.firstName?.trim()) && (s.user?.lastName?.trim()));

    console.log('=== RECOVERY SUMMARY ===');
    console.log(`Total problematic: ${problematic.length}`);
    console.log(`  - Has firstName only (missing lastName):  ${hasOnlyFirstName.length}`);
    console.log(`  - Has lastName only (missing firstName):  ${hasOnlyLastName.length}`);
    console.log(`  - Both firstName AND lastName empty:      ${hasBothMissing.length}`);
    console.log(`  - Has legacy "name" field (recoverable):  ${hasLegacyName.length}`);
    console.log(`  - Has middleName only (partial recovery): ${hasMiddleNameOnly.length}`);

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

inspect();
