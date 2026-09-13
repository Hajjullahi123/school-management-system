const prisma = require('./db');

async function main() {
  const count = await prisma.attendanceRecord.count();
  console.log('Total Attendance Records:', count);
  
  const student = await prisma.student.findFirst({
      include: { user: true }
  });
  console.log('Sample Student:', student ? `${student.user.firstName} ${student.admissionNumber}` : 'NONE');
}

main().catch(err => console.error(err)).finally(() => prisma.$disconnect());
