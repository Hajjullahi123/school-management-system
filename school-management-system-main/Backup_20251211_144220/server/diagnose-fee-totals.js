// Diagnostic script to check fee structure and fee records mismatch
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function diagnose() {
  console.log('\n🔍 DIAGNOSING FEE STRUCTURE ISSUE\n');
  console.log('='.repeat(60));

  try {
    // Get current term and session
    const currentSession = await prisma.academicSession.findFirst({
      where: { isCurrent: true }
    });

    const currentTerm = await prisma.term.findFirst({
      where: { isCurrent: true }
    });

    if (!currentSession || !currentTerm) {
      console.log('❌ No current session or term found!');
      return;
    }

    console.log(`\n📅 Current Session: ${currentSession.name}`);
    console.log(`📅 Current Term: ${currentTerm.name}\n`);

    // Get all fee structures for current term/session
    const feeStructures = await prisma.classFeeStructure.findMany({
      where: {
        termId: currentTerm.id,
        academicSessionId: currentSession.id
      },
      include: {
        class: true
      },
      orderBy: {
        class: {
          name: 'asc'
        }
      }
    });

    console.log(`\n📚 Fee Structures Found: ${feeStructures.length}\n`);

    for (const fs of feeStructures) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📖 Class: ${fs.class.name}${fs.class.arm || ''}`);
      console.log(`   Fee Amount: ₦${fs.amount.toLocaleString()}`);

      // Count students in class
      const studentCount = await prisma.student.count({
        where: { classId: fs.classId }
      });

      console.log(`   Students in class: ${studentCount}`);

      // Count fee records for this class
      const feeRecordCount = await prisma.feeRecord.count({
        where: {
          student: {
            classId: fs.classId
          },
          termId: currentTerm.id,
          academicSessionId: currentSession.id
        }
      });

      console.log(`   Fee records created: ${feeRecordCount}`);

      // Get totals for this class
      const feeRecords = await prisma.feeRecord.findMany({
        where: {
          student: {
            classId: fs.classId
          },
          termId: currentTerm.id,
          academicSessionId: currentSession.id
        }
      });

      const totalExpected = feeRecords.reduce((sum, r) => sum + r.expectedAmount, 0);
      const totalPaid = feeRecords.reduce((sum, r) => sum + r.paidAmount, 0);
      const totalBalance = feeRecords.reduce((sum, r) => sum + r.balance, 0);

      console.log(`\n   📊 TOTALS FOR THIS CLASS:`);
      console.log(`      Total Expected: ₦${totalExpected.toLocaleString()}`);
      console.log(`      Total Paid: ₦${totalPaid.toLocaleString()}`);
      console.log(`      Total Balance: ₦${totalBalance.toLocaleString()}`);

      if (studentCount !== feeRecordCount) {
        console.log(`\n   ⚠️  MISMATCH: ${studentCount} students but ${feeRecordCount} fee records!`);
        console.log(`      Missing ${studentCount - feeRecordCount} fee records`);
      } else if (studentCount === 0) {
        console.log(`\n   ℹ️  This class has NO STUDENTS - that's why totals are ₦0`);
      } else {
        console.log(`\n   ✅ All students have fee records`);
      }
    }

    // Overall summary
    console.log(`\n${'='.repeat(60)}`);
    console.log('\n📊 OVERALL SUMMARY\n');

    const allFeeRecords = await prisma.feeRecord.findMany({
      where: {
        termId: currentTerm.id,
        academicSessionId: currentSession.id
      }
    });

    const grandTotalExpected = allFeeRecords.reduce((sum, r) => sum + r.expectedAmount, 0);
    const grandTotalPaid = allFeeRecords.reduce((sum, r) => sum + r.paidAmount, 0);
    const grandTotalBalance = allFeeRecords.reduce((sum, r) => sum + r.balance, 0);

    console.log(`Total Fee Records: ${allFeeRecords.length}`);
    console.log(`Total Expected: ₦${grandTotalExpected.toLocaleString()}`);
    console.log(`Total Paid: ₦${grandTotalPaid.toLocaleString()}`);
    console.log(`Total Balance: ₦${grandTotalBalance.toLocaleString()}`);

    console.log(`\n${'='.repeat(60)}\n`);

    // Check for recently added fee structures
    const recentStructures = await prisma.classFeeStructure.findMany({
      where: {
        termId: currentTerm.id,
        academicSessionId: currentSession.id
      },
      include: {
        class: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 3
    });

    console.log('🕐 RECENTLY ADDED FEE STRUCTURES (Last 3):\n');
    for (const fs of recentStructures) {
      console.log(`   - ${fs.class.name}${fs.class.arm || ''}: ₦${fs.amount.toLocaleString()}`);
      console.log(`     Added: ${fs.createdAt.toLocaleString()}`);
      console.log(`     Updated: ${fs.updatedAt.toLocaleString()}\n`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

diagnose();
