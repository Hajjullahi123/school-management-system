require('dotenv').config({ path: './server/.env' });
const prisma = require('./db');

async function migrateStudentIdentifiers() {
  console.log('🚀 Starting Student Identifier Migration...');

  try {
    const schools = await prisma.school.findMany();

    for (const school of schools) {
      const schoolCode = school.code || 'SCH';
      console.log(`\nProcessing School: [${school.name}] (Code: ${schoolCode})`);

      const students = await prisma.student.findMany({
        where: { schoolId: school.id },
        include: { 
          user: true,
          classModel: true 
        }
      });

      console.log(`Found ${students.length} students.`);

      let counter = 1;
      for (const student of students) {
        const year = student.createdAt.getFullYear();
        const className = student.classModel?.name.replace(/\s+/g, '').toUpperCase() || 'NEW';
        const classArm = student.classModel?.arm?.toUpperCase() || '';
        
        // Format: CODE/YEAR/CLASSARM/NN
        const newAdmissionNumber = `${schoolCode.toUpperCase()}/${year}/${className}${classArm}/${String(counter).padStart(3, '0')}`;
        const newUsername = newAdmissionNumber.toLowerCase();

        console.log(`  - Updating Student [${student.name}]: ${student.admissionNumber} -> ${newAdmissionNumber}`);

        try {
          await prisma.$transaction([
            prisma.student.update({
              where: { id: student.id },
              data: { 
                admissionNumber: newAdmissionNumber,
                rollNo: newAdmissionNumber 
              }
            }),
            prisma.user.update({
              where: { id: student.userId },
              data: { username: newUsername }
            })
          ]);
          counter++;
        } catch (err) {
          console.error(`    ❌ Failed to update student ${student.id}:`, err.message);
        }
      }
    }

    console.log('\n✅ Student migration completed successfully!');
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

migrateStudentIdentifiers();
