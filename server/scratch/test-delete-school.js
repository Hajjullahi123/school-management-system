const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteSchool(schoolId) {
  try {
    console.log(`Attempting to delete School ID ${schoolId}...`);
    
    // We'll try to delete it directly first to see the error
    await prisma.school.delete({ where: { id: schoolId } });
    console.log('Success!');
  } catch (error) {
    console.error('Failed to delete school:', error.message);
    if (error.code === 'P2003') {
      console.log('Reason: Foreign key constraint failed.');
    }
  } finally {
    await prisma.$disconnect();
  }
}

const targetId = parseInt(process.argv[2]);
if (!targetId) {
  console.log('Usage: node delete-school.js <id>');
  process.exit(1);
}

deleteSchool(targetId);
