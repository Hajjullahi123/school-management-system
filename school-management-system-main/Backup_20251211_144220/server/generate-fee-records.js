const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function generateMissingFeeRecords() {
  try {
    console.log('\n🔧 GENERATING MISSING FEE RECORDS\n');
    console.log('='.repeat(60));

    // Get current term and session
    const currentTerm = await prisma.term.findFirst({
      where: { isCurrent: true }
    });

    const currentSession = await prisma.academicSession.findFirst({
      where: { isCurrent: true }
    });

    if (!currentTerm || !currentSession) {
      console.log('❌ No current term/session set!');
      return;
    }

    console.log(`\n📅 Generating records for:`);
    console.log(`   Session: ${currentSession.name}`);
    console.log(`   Term: ${currentTerm.name}\n`);

    // Get all classes with fee structures
    const feeStructures = await prisma.classFeeStructure.findMany({
      where: {
        termId: currentTerm.id,
        academicSessionId: currentSession.id
      },
      include: {
        class: true
      }
    });

    console.log(`📚 Found ${feeStructures.length} classes with fee structures\n`);

    let totalCreated = 0;
    let totalSkipped = 0;

    for (const structure of feeStructures) {
      console.log(`\n📖 Processing: ${structure.class.name}${structure.class.arm || ''}`);
      console.log(`   Fee Amount: ₦${structure.amount.toLocaleString()}`);

      // Get all students in this class
      const students = await prisma.student.findMany({
        where: { classId: structure.classId }
      });

      console.log(`   Students in class: ${students.length}`);

      let created = 0;
      let skipped = 0;

      for (const student of students) {
        // Check if fee record already exists
        const existing = await prisma.feeRecord.findUnique({
          where: {
            studentId_termId_academicSessionId: {
              studentId: student.id,
              termId: currentTerm.id,
              academicSessionId: currentSession.id
            }
          }
        });

        if (existing) {
          skipped++;
          continue;
        }

        // Create fee record
        await prisma.feeRecord.create({
          data: {
            studentId: student.id,
            termId: currentTerm.id,
            academicSessionId: currentSession.id,
            expectedAmount: structure.amount,
            paidAmount: 0,
            balance: structure.amount,
            isClearedForExam: false
          }
        });

        created++;
      }

      console.log(`   ✅ Created: ${created} records`);
      console.log(`   ⏭️  Skipped: ${skipped} (already exist)`);

      totalCreated += created;
      totalSkipped += skipped;
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`\n📊 SUMMARY:`);
    console.log(`   ✅ Total fee records created: ${totalCreated}`);
    console.log(`   ⏭️  Total skipped (already existed): ${totalSkipped}`);
    console.log(`\n✨ Fee records generation complete!`);

  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

generateMissingFeeRecords();
