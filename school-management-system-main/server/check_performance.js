const prisma = require('./db.js');

async function main() {
  console.log('--- START PERFORMANCE CHECK ---');
  const [uCount, sCount, tCount] = await Promise.all([
    prisma.user.count(),
    prisma.student.count(),
    prisma.teacher.count()
  ]);
  console.log(`DB Counts: Users(${uCount}), Students(${sCount}), Teachers(${tCount})`);

  const start = Date.now();
  const schools = await prisma.school.findMany({
    select: { id: true, name: true, logoUrl: true, slug: true }
  });
  const end = Date.now();
  console.log(`Fetched ${schools.length} schools in ${end - start}ms`);
  
  schools.forEach(s => {
    const logoSize = s.logoUrl ? s.logoUrl.length : 0;
    console.log(`- School: ${s.name} (${s.slug}) | Logo: ${(logoSize/1024).toFixed(2)} KB`);
  });

  const searchId = 'admin'; // Common test ID
  console.log(`\nSimulating Identify for '${searchId}'...`);
  const iStart = Date.now();
  const [users, students, teachers] = await Promise.all([
      prisma.user.findMany({
        where: {
          OR: [
            { username: { equals: searchId, mode: 'insensitive' } },
            { email: { equals: searchId, mode: 'insensitive' } }
          ]
        },
        select: { school: { select: { id: true, name: true, slug: true, logoUrl: true } }, role: true, schoolId: true }
      }),
      prisma.student.findMany({
        where: { admissionNumber: { equals: searchId, mode: 'insensitive' } },
        select: { school: { select: { id: true, name: true, slug: true, logoUrl: true } } }
      }),
      prisma.teacher.findMany({
        where: { staffId: { equals: searchId, mode: 'insensitive' } },
        select: { school: { select: { id: true, name: true, slug: true, logoUrl: true } } }
      })
    ]);
  const iEnd = Date.now();
  console.log(`Identify took ${iEnd - iStart}ms`);
  console.log(`Results: Users(${users.length}), Students(${students.length}), Teachers(${teachers.length})`);
  
  const totalJson = JSON.stringify({ users, students, teachers });
  console.log(`Estimated Payload Size: ${(totalJson.length / 1024).toFixed(2)} KB`);
}

main().catch(console.error).finally(() => process.exit(0));
