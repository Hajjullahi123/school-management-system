const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function autoLinkParents() {
  console.log('--- Starting Student-Parent Auto-Linker ---');
  
  try {
    // 1. Get all parents
    const parents = await prisma.parent.findMany();
    console.log(`Found ${parents.length} total parent accounts.`);

    let linkedCount = 0;
    let alreadyLinkedCount = 0;

    for (const parent of parents) {
      // 2. Find students with this phone number in the same school
      const matchingStudents = await prisma.student.findMany({
        where: {
          schoolId: parent.schoolId,
          parentGuardianPhone: parent.phone,
          parentId: null
        }
      });

      if (matchingStudents.length > 0) {
        console.log(`\nParent: ${parent.phone} (ID: ${parent.id})`);
        
        for (const student of matchingStudents) {
          if (student.parentId !== null) {
             console.log(`  - Skip: Student ${student.admissionNumber} is already linked to Parent ID ${student.parentId}`);
             alreadyLinkedCount++;
             continue;
          }

          // 3. Perform the link
          await prisma.student.update({
            where: { id: student.id },
            data: { parentId: parent.id }
          });
          
          console.log(`  + Linked: Student ${student.admissionNumber} (${student.name || student.middleName || 'Unnamed'})`);
          linkedCount++;
        }
      }
    }

    console.log('\n--- Linker Finished ---');
    console.log(`Successfully linked: ${linkedCount} students`);
    console.log(`Already linked to others: ${alreadyLinkedCount} students`);

  } catch (error) {
    console.error('Error during auto-linking:', error);
  } finally {
    await prisma.$disconnect();
  }
}

autoLinkParents();
