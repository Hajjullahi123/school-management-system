// Check Second Term fee structures
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSecondTerm() {
  console.log('\n🔍 CHECKING SECOND TERM FEE STRUCTURES\n');
  console.log('='.repeat(60));

  try {
    // Get current session
    const currentSession = await prisma.academicSession.findFirst({
      where: { isCurrent: true }
    });

    if (!currentSession) {
      console.log('❌ No current session found!');
      return;
    }

    console.log(`\n📅 Current Session: ${currentSession.name}\n`);

    // Get all terms for this session
    const terms = await prisma.term.findMany({
      where: { academicSessionId: currentSession.id },
      orderBy: { name: 'asc' }
    });

    console.log('📋 Terms in this session:');
    for (const term of terms) {
      console.log(`   ${term.isCurrent ? '✅' : '  '} ${term.name} (ID: ${term.id})`);
    }

    // Check for Second Term
    const secondTerm = terms.find(t => t.name.includes('Second'));

    if (!secondTerm) {
      console.log('\n❌ Second Term not found! You need to create it first.');
      return;
    }

    console.log(`\n✅ Second Term found: ${secondTerm.name} (ID: ${secondTerm.id})`);
    console.log(`   Is Current: ${secondTerm.isCurrent ? 'YES' : 'NO'}`);

    // Get fee structures for Second Term
    console.log('\n' + '='.repeat(60));
    console.log('\n📚 FEE STRUCTURES FOR SECOND TERM:\n');

    const secondTermStructures = await prisma.classFeeStructure.findMany({
      where: {
        termId: secondTerm.id,
        academicSessionId: currentSession.id
      },
      include: {
        class: true
      },
      orderBy: {
        class: { name: 'asc' }
      }
    });

    if (secondTermStructures.length === 0) {
      console.log('❌ No fee structures found for Second Term!');
      console.log('   Make sure you selected "Second Term" when adding the fee structures.');
      return;
    }

    console.log(`Found ${secondTermStructures.length} fee structure(s):\n`);

    for (const fs of secondTermStructures) {
      console.log(`📖 ${fs.class.name}${fs.class.arm || ''}`);
      console.log(`   Amount: ₦${fs.amount.toLocaleString()}`);
      console.log(`   Added: ${fs.createdAt.toLocaleString()}\n`);

      // Check for students
      const studentCount = await prisma.student.count({
        where: { classId: fs.classId }
      });

      console.log(`   Students in class: ${studentCount}`);

      // Check for fee records
      const feeRecordCount = await prisma.feeRecord.count({
        where: {
          student: { classId: fs.classId },
          termId: secondTerm.id,
          academicSessionId: currentSession.id
        }
      });

      console.log(`   Fee records for Second Term: ${feeRecordCount}`);

      if (studentCount > feeRecordCount) {
        console.log(`   ⚠️  MISSING ${studentCount - feeRecordCount} fee records!`);
        console.log(`   👉 Run: node generate-fee-records.js`);
      } else if (feeRecordCount === 0 && studentCount === 0) {
        console.log(`   ℹ️  No students in this class yet`);
      } else {
        console.log(`   ✅ All students have fee records`);
      }

      console.log();
    }

    // Check which term the Fee Management is probably showing
    console.log('='.repeat(60));
    console.log('\n💡 IMPORTANT:\n');

    const currentTerm = terms.find(t => t.isCurrent);
    if (currentTerm) {
      console.log(`📍 The system is currently set to: ${currentTerm.name}`);

      if (currentTerm.id !== secondTerm.id) {
        console.log('\n⚠️  FEE MANAGEMENT PAGE IS SHOWING: ' + currentTerm.name);
        console.log('   But you added fee structures for: Second Term');
        console.log('\n✅ SOLUTION:');
        console.log('   1. Go to Fee Management page');
        console.log('   2. Change the term selector to "Second Term"');
        console.log('   3. You will see your Second Term fee structures!\n');
      } else {
        console.log('\n✅ Fee Management is already showing Second Term');
        console.log('   If you don\'t see the data, try refreshing the page.\n');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSecondTerm();
