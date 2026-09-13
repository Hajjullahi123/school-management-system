const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function searchStudents() {
  try {
    const searchTerm = 'Raudah';
    const admissionSearch = '089';

    console.log(`Searching for students matching: "${searchTerm}" or "${admissionSearch}"`);

    const students = await prisma.student.findMany({
      where: {
        OR: [
          { name: { contains: searchTerm } },
          { admissionNumber: { contains: admissionSearch } }
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
      console.log('No matching students found.');
    } else {
      console.log(`Found ${students.length} matching students:`);
      students.forEach((s, i) => {
        console.log(`\n[${i + 1}] Student: ${s.name}`);
        console.log(`    Admission No: ${s.admissionNumber}`);
        if (s.parent) {
          console.log(`    Parent: ${s.parent.user.firstName} ${s.parent.user.lastName}`);
          console.log(`    Parent Phone: ${s.parent.phone}`);
          console.log(`    Parent User ID: ${s.parent.userId}`);
        } else {
          console.log('    No linked Parent record.');
          console.log(`    Guardian Name: ${s.parentGuardianName}`);
          console.log(`    Guardian Phone: ${s.parentGuardianPhone}`);
        }
      });
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

searchStudents();
