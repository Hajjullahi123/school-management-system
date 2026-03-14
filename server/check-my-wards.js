const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const bulamaUser = await prisma.user.findFirst({ where: { firstName: { contains: 'Bulama' } } });

  if (!bulamaUser) { console.log('not found'); return; }

  const includeQuery = {
    students: {
      include: {
        classModel: true,
        user: { select: { firstName: true, lastName: true, email: true } },
        results: { take: 1 },
        attendanceRecords: { take: 1 },
        miscellaneousFeePayments: { take: 1 },
        feeRecords: { take: 1 }
      }
    }
  };

  const parent = await prisma.parent.findFirst({
    where: { userId: bulamaUser.id },
    include: includeQuery
  });

  console.log('Returned Parent:', parent ? parent.id : null);
  console.log('Students array length:', parent ? parent.students.length : null);
  console.log('Students:', JSON.stringify(parent.students, null, 2));
}

run().catch(console.error).finally(() => prisma.$disconnect());
