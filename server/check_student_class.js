const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkStudentClass() {
  try {
    const name = 'Raudah Lawal Abdullahi';
    const student = await prisma.student.findFirst({
      where: { name: name },
      include: {
        classModel: true
      }
    });

    if (!student) {
      console.log('Student not found.');
      return;
    }

    console.log(`Student: ${student.name}`);
    console.log(`Class ID: ${student.classId}`);
    console.log(`Class Name: ${student.classModel ? student.classModel.name : 'NO CLASS'}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkStudentClass();
