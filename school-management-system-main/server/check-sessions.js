const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const schools = await prisma.school.findMany({
    include: {
      _count: {
        select: {
          academicSessions: true,
          terms: true
        }
      }
    }
  });

  console.log('--- Schools ---');
  for (const s of schools) {
    const session = await prisma.academicSession.findFirst({
      where: { isCurrent: true, schoolId: s.id }
    });
    const term = await prisma.term.findFirst({
      where: { isCurrent: true, schoolId: s.id }
    });
    console.log(`School: ${s.name} (ID: ${s.id}, Slug: ${s.slug})`);
    console.log(` Sessions: ${s._count.academicSessions}, Current: ${session ? session.name : 'NONE'}`);
    console.log(` Terms: ${s._count.terms}, Current: ${term ? term.name : 'NONE'}`);
    console.log('---');
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
