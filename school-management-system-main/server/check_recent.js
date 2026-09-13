const prisma = require('./db');

async function main() {
  const records = await prisma.attendanceRecord.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: {
        student: { include: { user: true } }
    }
  });
  console.log('Last 10 attendance records:');
  records.forEach(r => {
    console.log(`Student: ${r.student.user.firstName} ${r.student.user.lastName}, Status: [${r.status}], Records Date: ${r.date.toISOString()}, CreatedAt: ${r.createdAt.toISOString()}`);
  });
}

main().catch(err => console.error(err)).finally(() => prisma.$disconnect());
