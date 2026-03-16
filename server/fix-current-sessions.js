const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const schoolIds = [1, 4];
  
  for (const schoolId of schoolIds) {
    console.log(`Fixing current session/term for school ${schoolId}...`);
    
    // Find latest session
    const session = await prisma.academicSession.findFirst({
      where: { schoolId },
      orderBy: { startDate: 'desc' }
    });
    
    if (session) {
      await prisma.academicSession.update({
        where: { id: session.id },
        data: { isCurrent: true }
      });
      console.log(`  Set session "${session.name}" as current.`);
      
      // Find latest term for this session
      const term = await prisma.term.findFirst({
        where: { academicSessionId: session.id },
        orderBy: { startDate: 'desc' }
      });
      
      if (term) {
        await prisma.term.update({
          where: { id: term.id },
          data: { isCurrent: true }
        });
        console.log(`  Set term "${term.name}" as current.`);
      }
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
