const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAudit() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const logs = await prisma.auditLog.findMany({
    where: {
      action: 'BULK_IMPORT',
      createdAt: { gte: today }
    },
    orderBy: { createdAt: 'desc' }
  });

  console.log(`Found ${logs.length} bulk import logs for today (${today.toDateString()}):`);
  logs.forEach(log => {
    console.log(`[${log.createdAt.toISOString()}] ${log.details}`);
  });

  const allLogsToday = await prisma.auditLog.findMany({
    where: {
      createdAt: { gte: today }
    },
    orderBy: { createdAt: 'desc' }
  });

  console.log(`\nAll logs today (${allLogsToday.length}):`);
  allLogsToday.forEach(log => {
    console.log(`[${log.createdAt.toISOString()}] ${log.action} - ${log.resource}`);
  });

  await prisma.$disconnect();
}

checkAudit();
