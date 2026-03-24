const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const schools = await prisma.school.findMany();
  schools.forEach(s => {
    console.log(`School: ${s.name} (ID: ${s.id})`);
    console.log(`weekendDays: ${s.weekendDays}`);
  });
  
  const student = await prisma.student.findFirst({
    where: { admissionNumber: 'DQA/HS/2026/001' },
    include: {
      attendanceRecords: {
        orderBy: { date: 'desc' },
        take: 5
      }
    }
  });
  
  if (student) {
    console.log(`Student: ${student.admissionNumber}`);
    student.attendanceRecords.forEach(r => {
      console.log(`- ${r.date.toISOString()}: ${r.status}`);
    });
  }
  
  process.exit(0);
}

check();
