const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Inspecting Teacher: Fatima Musa ---');
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { firstName: { contains: 'Fatima' } },
        { lastName: { contains: 'Musa' } },
        { username: { contains: 'fatima' } }
      ]
    },
    include: {
      teacher: true,
      school: true
    }
  });

  if (users.length === 0) {
    console.log('No users found.');
    return;
  }

  users.forEach(u => {
    console.log('User found:', {
      id: u.id,
      username: u.username,
      firstName: u.firstName,
      lastName: u.lastName,
      role: u.role,
      schoolId: u.schoolId,
      teacherId: u.teacher?.id
    });
  });

  console.log('\n--- Inspecting School 3 ---');
  const school = await prisma.school.findUnique({
    where: { id: 3 }
  });
  if (school) {
    console.log('School found:', { id: school.id, name: school.name, slug: school.slug });
  } else {
    console.log('School 3 NOT FOUND');
  }

  console.log('\n--- Inspecting Classes for USER 75 across ALL Schools ---');
  const classesForUser = await prisma.class.findMany({
    where: { classTeacherId: 75, isActive: true },
    include: {
      school: {
        select: { id: true, name: true, slug: true }
      }
    }
  });

  classesForUser.forEach(c => {
    console.log(`Class: ${c.name} ${c.arm || ''} (ID: ${c.id}) - School: ${c.school.name} (ID: ${c.school.id}, Slug: ${c.school.slug})`);
  });

  const teacherIdMatch = await prisma.class.findFirst({
    where: { classTeacherId: 75, schoolId: 3, isActive: true }
  });
  console.log('\nDirect findFirst lookup result for userId 75:', teacherIdMatch ? 'FOUND (ID: ' + teacherIdMatch.id + ')' : 'NOT FOUND');

  console.log('\n--- Inspecting Audit Logs for User 75 ---');
  const logs = await prisma.auditLog.findMany({
    where: { userId: 75 },
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  logs.forEach(l => {
    console.log(`[${l.createdAt.toISOString()}] ${l.action} ${l.resource} - Details: ${l.details}`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
