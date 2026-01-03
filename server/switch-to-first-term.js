// Switch to First Term
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function switchToFirstTerm() {
  console.log('\n🔄 SWITCHING TO FIRST TERM\n');
  console.log('='.repeat(60));

  try {
    const currentSession = await prisma.academicSession.findFirst({
      where: { isCurrent: true }
    });

    if (!currentSession) {
      console.log('❌ No current session found!');
      return;
    }

    const firstTerm = await prisma.term.findFirst({
      where: {
        academicSessionId: currentSession.id,
        name: { contains: 'First' }
      }
    });

    if (!firstTerm) {
      console.log('❌ First Term not found!');
      return;
    }

    console.log(`📅 Session: ${currentSession.name}`);
    console.log(`\n🔄 Changing current term to "${firstTerm.name}"...\n`);

    // Set all terms to not current
    await prisma.term.updateMany({
      where: { academicSessionId: currentSession.id },
      data: { isCurrent: false }
    });

    // Set First Term as current
    await prisma.term.update({
      where: { id: firstTerm.id },
      data: { isCurrent: true }
    });

    console.log('✅ Successfully switched to First Term!');
    console.log('\n📊 Now refresh your browser to see First Term data.\n');
    console.log('='.repeat(60));
    console.log('\n💡 TIP: You can still view Second Term using the dropdown!\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

switchToFirstTerm();
