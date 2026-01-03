const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    console.log('\n📊 DATABASE STATUS CHECK\n');
    console.log('='.repeat(50));

    const students = await prisma.student.count();
    const feeRecords = await prisma.feeRecord.count();
    const feeStructures = await prisma.classFeeStructure.count();
    const sessions = await prisma.academicSession.count();
    const terms = await prisma.term.count();
    const classes = await prisma.class.count();

    console.log('📚 Academic Setup:');
    console.log(`   Classes: ${classes}`);
    console.log(`   Academic Sessions: ${sessions}`);
    console.log(`   Terms: ${terms}`);

    console.log('\n👨‍🎓 Students:');
    console.log(`   Total Students: ${students}`);

    console.log('\n💰 Fee Management:');
    console.log(`   Fee Structures: ${feeStructures}`);
    console.log(`   Fee Records: ${feeRecords}`);

    console.log('\n' + '='.repeat(50));

    if (students === 0) {
      console.log('\n⚠️  NO STUDENTS FOUND');
      console.log('   You need to add students first!');
    } else if (feeStructures === 0) {
      console.log('\n⚠️  NO FEE STRUCTURES SET UP');
      console.log('   You need to set up fee structures for classes!');
    } else if (feeRecords === 0) {
      console.log('\n⚠️  NO FEE RECORDS GENERATED');
      console.log('   You need to generate fee records for students!');
    } else {
      console.log('\n✅ Database has fee data!');
    }

    // Check current session/term
    const currentSession = await prisma.academicSession.findFirst({
      where: { isCurrent: true }
    });

    const currentTerm = await prisma.term.findFirst({
      where: { isCurrent: true }
    });

    console.log('\n📅 Current Period:');
    console.log(`   Session: ${currentSession ? currentSession.name : 'NOT SET'}`);
    console.log(`   Term: ${currentTerm ? currentTerm.name : 'NOT SET'}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
