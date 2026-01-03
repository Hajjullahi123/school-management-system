// Set Current Term and Session
// This script allows you to change which term/session is marked as "current"

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function setCurrentTermAndSession() {
  console.log('\n🔧 SET CURRENT TERM AND SESSION\n');
  console.log('='.repeat(60));

  try {
    // Get all sessions
    const sessions = await prisma.academicSession.findMany({
      orderBy: { name: 'asc' }
    });

    console.log('\n📅 Available Academic Sessions:\n');
    sessions.forEach((s, index) => {
      console.log(`${index + 1}. ${s.name} ${s.isCurrent ? '← CURRENT' : ''}`);
    });

    // For this example, let's set 2024/2025 as current
    const targetSession = sessions.find(s => s.name.includes('2024/2025'));

    if (!targetSession) {
      console.log('\n❌ Session not found! Please modify the script.');
      return;
    }

    console.log(`\n✅ Setting ${targetSession.name} as current session...\n`);

    // Set all sessions to not current
    await prisma.academicSession.updateMany({
      data: { isCurrent: false }
    });

    // Set target session as current
    await prisma.academicSession.update({
      where: { id: targetSession.id },
      data: { isCurrent: true }
    });

    // Get all terms for this session
    const terms = await prisma.term.findMany({
      where: { academicSessionId: targetSession.id },
      orderBy: { name: 'asc' }
    });

    console.log('📋 Available Terms in this session:\n');
    terms.forEach((t, index) => {
      console.log(`${index + 1}. ${t.name} ${t.isCurrent ? '← CURRENT' : ''}`);
    });

    // Set which term is current (change this as needed)
    // Options: 'First', 'Second', 'Third'
    const DESIRED_TERM = 'Second'; // ← CHANGE THIS TO SET CURRENT TERM

    const targetTerm = terms.find(t => t.name.includes(DESIRED_TERM));

    if (!targetTerm) {
      console.log(`\n❌ ${DESIRED_TERM} Term not found!`);
      return;
    }

    console.log(`\n✅ Setting ${targetTerm.name} as current term...\n`);

    // Set all terms in session to not current
    await prisma.term.updateMany({
      where: { academicSessionId: targetSession.id },
      data: { isCurrent: false }
    });

    // Set target term as current
    await prisma.term.update({
      where: { id: targetTerm.id },
      data: { isCurrent: true }
    });

    console.log('='.repeat(60));
    console.log('\n✅ SUCCESS!\n');
    console.log(`📅 Current Session: ${targetSession.name}`);
    console.log(`📋 Current Term: ${targetTerm.name}`);
    console.log('\n💡 TIP: The Fee Management page will now default to this term.');
    console.log('    But you can still view other terms using the dropdown!\n');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setCurrentTermAndSession();
