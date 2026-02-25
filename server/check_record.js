const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const record = await prisma.staffAttendance.findFirst({
    where: { userId: 75, date: today }
  });
  console.log('RECORD_FOUND:', !!record);
  if (record) console.log('RECORD_DATA:', JSON.stringify(record));
  process.exit(0);
}
check();
