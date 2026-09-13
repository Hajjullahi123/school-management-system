const prisma = require('./db');

async function checkIntegrity() {
  console.log('--- Database Integrity Health Check ---');
  
  try {
    // 1. Check for orphaned Students (userId points to non-existent user)
    const students = await prisma.student.findMany({
      select: { id: true, userId: true, name: true, admissionNumber: true }
    });
    const userIds = (await prisma.user.findMany({ select: { id: true } })).map(u => u.id);
    
    const orphanedStudents = students.filter(s => s.userId && !userIds.includes(s.userId));
    console.log(`[Students] Found ${orphanedStudents.length} orphaned student records.`);
    if (orphanedStudents.length > 0) {
      console.warn('⚠️ Warning: These students have broken User links:', orphanedStudents.map(s => s.admissionNumber).join(', '));
    }

    // 2. Check for orphaned PushSubscriptions
    const pushSubs = await prisma.pushSubscription.findMany({
      select: { id: true, userId: true }
    });
    const orphanedSubs = pushSubs.filter(s => !userIds.includes(s.userId));
    console.log(`[Push] Found ${orphanedSubs.length} orphaned push subscriptions.`);

    // 3. Check for Schools without GlobalSettings
    const schools = await prisma.school.count();
    const settings = await prisma.globalSettings.count();
    console.log(`[System] Schools: ${schools}, GlobalSettings: ${settings}`);
    if (settings === 0) {
      console.error('❌ CRITICAL: No GlobalSettings record found! System settings will fail.');
    }

    // 4. Check for FeeRecords with zero amount (potential data entry error)
    const zeroFees = await prisma.feeRecord.count({ where: { totalAmount: 0 } });
    console.log(`[Finance] Found ${zeroFees} fee records with 0.00 amount.`);

    console.log('--- Check Complete ---');
  } catch (error) {
    console.error('Integrity check failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkIntegrity();
