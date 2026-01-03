// Switch to Second Term
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function switchToSecondTerm() {
  console.log('\n🔄 SWITCHING TO SECOND TERM\n');
  console.log('='.repeat(60));

  try {
    const currentSession = await prisma.academicSession.findFirst({
      where: { isCurrent: true }
    });

    if (!currentSession) {
      console.log('❌ No current session found!');
      return;
    }

    // Get all terms
    const terms = await prisma.term.findMany({
      where: { academicSessionId: currentSession.id }
    });

    const firstTerm = terms.find(t => t.name.includes('First'));
    const secondTerm = terms.find(t => t.name.includes('Second'));

    if (!secondTerm) {
      console.log('❌ Second Term not found!');
      return;
    }

    console.log(`\n📅 Session: ${currentSession.name}`);
    console.log(`\n🔄 Changing current term from "${firstTerm?.name}" to "${secondTerm.name}"...\n`);

    // Set all terms to not current
    await prisma.term.updateMany({
      where: { academicSessionId: currentSession.id },
      data: { isCurrent: false }
    });

    // Set Second Term as current
    await prisma.term.update({
      where: { id: secondTerm.id },
      data: { isCurrent: true }
    });

    console.log('✅ Successfully switched to Second Term!');
    console.log('\n📊 Now refresh the Fee Management page to see Second Term data.\n');
    console.log('='.repeat(60));
    console.log('\n⚠️  NOTE: To switch back to First Term, run this script again and modify it,');
    console.log('   or use the admin panel to change the current term.\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

switchToSecondTerm();
