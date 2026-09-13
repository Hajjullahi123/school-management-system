const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findParent() {
  try {
    const admissionNumber = 'aam/ra/2026/089';
    const studentName = 'Raudah Abdullahi';

    console.log(`Searching for student: ${studentName} (${admissionNumber})`);

    const students = await prisma.student.findMany({
      where: {
        OR: [
          { admissionNumber: { equals: admissionNumber } },
          { name: { contains: studentName } }
        ]
      },
      include: {
        parent: {
          include: {
            user: true
          }
        },
        user: true
      }
    });

    if (students.length === 0) {
      console.log('No student found with that name or admission number.');
      return;
    }

    students.forEach((student, index) => {
      console.log(`\n--- Student ${index + 1} ---`);
      console.log(`ID: ${student.id}`);
      console.log(`Name: ${student.name}`);
      console.log(`Admission Number: ${student.admissionNumber}`);
      console.log(`Class ID: ${student.classId}`);

      if (student.parent) {
        console.log(`Parent ID: ${student.parent.id}`);
        console.log(`Parent Name: ${student.parent.user.firstName} ${student.parent.user.lastName}`);
        console.log(`Parent Phone: ${student.parent.phone}`);
        console.log(`Parent Email: ${student.parent.user.email}`);
        console.log(`Parent Username: ${student.parent.user.username}`);
      } else {
        console.log('No linked parent record found in the Parent table.');
        console.log(`Parent/Guardian Name from Student record: ${student.parentGuardianName || 'N/A'}`);
        console.log(`Parent/Guardian Phone from Student record: ${student.parentGuardianPhone || 'N/A'}`);
        console.log(`Parent Email from Student record: ${student.parentEmail || 'N/A'}`);
      }
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findParent();
