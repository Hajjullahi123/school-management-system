const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkStudentAndParentSchool() {
  try {
    const admissionNumber = 'AAM/RA/2026/089';
    const student = await prisma.student.findFirst({
      where: { admissionNumber: admissionNumber },
      include: {
        school: true,
        parent: {
          include: {
            school: true,
            user: true
          }
        }
      }
    });

    if (!student) {
      console.log('Student not found.');
      return;
    }

    console.log('--- Student Details ---');
    console.log(`Name: ${student.name}`);
    console.log(`Student School ID: ${student.schoolId} (${student.school.name})`);

    if (student.parent) {
      console.log('--- Parent Details ---');
      console.log(`Parent ID: ${student.parent.id}`);
      console.log(`Parent Name: ${student.parent.user.firstName} ${student.parent.user.lastName}`);
      console.log(`Parent School ID: ${student.parent.schoolId} (${student.parent.school.name})`);
    } else {
      console.log('Student has no linked parent.');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkStudentAndParentSchool();
