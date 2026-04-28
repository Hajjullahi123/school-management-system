const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function repairDatabase() {
  console.log('==================== DATABASE REPAIR START ====================');
  
  try {
    // 1. Repair Student -> Parent links
    console.log('[Repair] Checking for orphaned Student-Parent links...');
    const students = await prisma.student.findMany({
      where: { parentId: { not: null } },
      select: { id: true, parentId: true }
    });
    
    for (const student of students) {
      const parentProfile = await prisma.parent.findUnique({ where: { id: student.parentId } });
      if (!parentProfile) {
        console.log(`[Repair] Orphaned parentId ${student.parentId} found for Student ${student.id}. Healing...`);
        await prisma.student.update({
          where: { id: student.id },
          data: { parentId: null }
        });
      }
    }

    // 2. Repair AuditLog -> User links
    console.log('[Repair] Checking for orphaned AuditLog-User links...');
    const orphanedLogs = await prisma.auditLog.findMany({
      where: {
        userId: {
          notIn: (await prisma.user.findMany({ select: { id: true } })).map(u => u.id)
        }
      },
      select: { id: true, userId: true }
    });

    if (orphanedLogs.length > 0) {
      console.log(`[Repair] Found ${orphanedLogs.length} orphaned audit logs. Deleting for integrity...`);
      await prisma.auditLog.deleteMany({
        where: { id: { in: orphanedLogs.map(l => l.id) } }
      });
    }

    console.log('[Repair] Database integrity restored successfully.');
  } catch (error) {
    console.error('[Repair] Failure during database healing:', error.message);
  } finally {
    await prisma.$disconnect();
    console.log('==================== DATABASE REPAIR END ====================');
  }
}

module.exports = { repairDatabase };
