const prisma = require('./server/db');

async function checkAudit() {
  try {
    const logs = await prisma.auditLog.findMany({
      where: { action: 'UPDATE', resource: 'SCHOOL_SETTINGS' },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    console.log('--- SETTINGS AUDIT LOGS START ---');
    console.log(JSON.stringify(logs, null, 2));
    console.log('--- SETTINGS AUDIT LOGS END ---');
  } catch (err) {
    console.error('Audit check failed:', err.message);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

checkAudit();
