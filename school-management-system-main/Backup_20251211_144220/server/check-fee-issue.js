const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkFeeIssue() {
  try {
    console.log('\n🔍 INVESTIGATING JSS 2A FEE ISSUE\n');
    console.log('='.repeat(60));

    // Find JSS 2A class
    const jss2a = await prisma.class.findFirst({
      where: {
        name: 'JSS 2',
        arm: 'A'
      }
    });

    if (!jss2a) {
      console.log('❌ JSS 2A class not found!');
      return;
    }

    console.log(`\n✅ Found JSS 2A (ID: ${jss2a.id})`);

    // Count students in JSS 2A
    const studentCount = await prisma.student.count({
      where: { classId: jss2a.id }
    });

    console.log(`\n👨‍🎓 Students in JSS 2A: ${studentCount}`);

    // Get current term and session
    const currentTerm = await prisma.term.findFirst({
      where: { isCurrent: true }
    });

    const currentSession = await prisma.academicSession.findFirst({
      where: { isCurrent: true }
    });

    console.log(`\n📅 Current Period:`);
    console.log(`   Session: ${currentSession?.name || 'NOT SET'}`);
    console.log(`   Term: ${currentTerm?.name || 'NOT SET'}`);

    if (!currentTerm || !currentSession) {
      console.log('\n⚠️  No current term/session set!');
      return;
    }

    // Check fee structure for JSS 2A
    const feeStructure = await prisma.classFeeStructure.findFirst({
      where: {
        classId: jss2a.id,
        termId: currentTerm.id,
        academicSessionId: currentSession.id
      }
    });

    console.log(`\n💰 Fee Structure for JSS 2A:`);
    if (feeStructure) {
      console.log(`   Expected Amount per Student: ₦${feeStructure.amount.toLocaleString()}`);
      console.log(`   Description: ${feeStructure.description || 'N/A'}`);
    } else {
      console.log('   ❌ NO FEE STRUCTURE SET for this class/term!');
    }

    // Check fee records for JSS 2A students
    const feeRecords = await prisma.feeRecord.findMany({
      where: {
        termId: currentTerm.id,
        academicSessionId: currentSession.id,
        student: {
          classId: jss2a.id
        }
      },
      include: {
        student: {
          select: {
            admissionNumber: true,
            user: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    });

    console.log(`\n📋 Fee Records for JSS 2A Students: ${feeRecords.length} out of ${studentCount}`);

    if (feeRecords.length < studentCount) {
      console.log(`   ⚠️  ${studentCount - feeRecords.length} students don't have fee records!`);
    }

    // Calculate totals
    let totalExpected = 0;
    let totalPaid = 0;
    let totalBalance = 0;
    let studentsPaid = 0;

    feeRecords.forEach(record => {
      totalExpected += record.expectedAmount;
      totalPaid += record.paidAmount;
      totalBalance += record.balance;
      if (record.paidAmount > 0) studentsPaid++;
    });

    console.log(`\n📊 Summary:`);
    console.log(`   Total Expected: ₦${totalExpected.toLocaleString()}`);
    console.log(`   Total Paid: ₦${totalPaid.toLocaleString()}`);
    console.log(`   Total Balance: ₦${totalBalance.toLocaleString()}`);
    console.log(`   Students who paid: ${studentsPaid} out of ${feeRecords.length}`);

    // Show details of payments
    if (studentsPaid > 0) {
      console.log(`\n💵 Students with Payments:`);
      feeRecords
        .filter(r => r.paidAmount > 0)
        .forEach(record => {
          console.log(`   - ${record.student.user.firstName} ${record.student.user.lastName}`);
          console.log(`     Expected: ₦${record.expectedAmount}, Paid: ₦${record.paidAmount}, Balance: ₦${record.balance}`);
        });
    }

    // Check if the issue is that SHOULD BE calculations
    if (feeStructure && feeRecords.length < studentCount) {
      const shouldBeExpected = feeStructure.amount * studentCount;
      console.log(`\n🎯 What SHOULD Be (if all ${studentCount} students had fee records):`);
      console.log(`   Total Expected: ₦${shouldBeExpected.toLocaleString()}`);
      console.log(`   Difference: ₦${(shouldBeExpected - totalExpected).toLocaleString()}`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkFeeIssue();
