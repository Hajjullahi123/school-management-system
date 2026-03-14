const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const parents = await prisma.parent.findMany({ include: { user: true, students: true } });
  const bulama = parents.find(p => p.user.firstName.includes('Bulama'));

  if (bulama) {
    console.log('--- FOUND BULAMA PARENT ---');
    console.log('ID:', bulama.id);
    console.log('Name:', bulama.user.firstName, bulama.user.lastName);
    console.log('Phone:', bulama.phone);
    console.log('Students Linked:', bulama.students.length);

    // Find unlinked students with matching phone
    const unlinked = await prisma.student.findMany({
      where: { parentGuardianPhone: bulama.phone, parentId: null }
    });
    console.log('\n--- UNLINKED STUDENTS MATCHING PHONE ---');
    console.log('Count:', unlinked.length);
    for (const s of unlinked) {
      console.log(`- ${s.name} (${s.admissionNumber})`);

      // Auto link them
      console.log('Linking...');
      await prisma.student.update({
        where: { id: s.id },
        data: { parentId: bulama.id }
      });
      console.log('Done linking.');
    }

    // Check if there are ANY students with matching phone
    const anyMatching = await prisma.student.findMany({
      where: { parentGuardianPhone: { contains: bulama.phone } }
    });
    console.log('\n--- ALL STUDENTS MATCHING PHONE IN DB ---');
    console.log('Count:', anyMatching.length);
    for (const s of anyMatching) {
      console.log(`- ${s.name} (${s.admissionNumber}) -> ParentID: ${s.parentId}`);
    }

  } else {
    console.log('Bulama Parent not found.');
  }
}

run().catch(console.error).finally(() => prisma.$disconnect());
