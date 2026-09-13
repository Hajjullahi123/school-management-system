const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function check() {
  // The transcript URL was /dashboard/transcript/3 — check student ID 3 first
  // Also check all alumni records for school 3
  const student = await p.student.findFirst({
    where: { id: 3 },
    select: {
      id: true,
      admissionNumber: true,
      enrollmentDate: true,
      classId: true,
      classModel: { select: { name: true, arm: true } },
      user: { select: { firstName: true, lastName: true } },
      alumni: true
    }
  });

  console.log('Student record:', JSON.stringify(student, null, 2));

  // Also check if any alumni records exist for school 3
  const alumniCount = await p.alumni.count({ where: { schoolId: 3 } });
  console.log('\nTotal alumni records for school 3:', alumniCount);

  if (alumniCount > 0) {
    const alumni = await p.alumni.findMany({ where: { schoolId: 3 }, take: 3 });
    console.log('Sample alumni:', JSON.stringify(alumni, null, 2));
  }

  await p.$disconnect();
}

check().catch(e => { console.error(e); process.exit(1); });
