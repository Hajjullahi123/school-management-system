const prisma = require('./db');

async function main() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const stats = await prisma.staffAttendance.groupBy({
    by: ['status'],
    where: {
      date: today
    },
    _count: {
      userId: true
    }
  });

  const details = await prisma.staffAttendance.findMany({
    where: {
      date: today
    },
    include: {
      user: {
        select: {
          firstName: true,
          lastName: true,
          role: true
        }
      }
    }
  });

  console.log('--- Attendance Stats for Today (' + today.toDateString() + ') ---');
  console.log(JSON.stringify(stats, null, 2));
  console.log('\n--- Individual Records ---');
  if (details.length === 0) {
    console.log('No records found for today.');
  } else {
    details.forEach(record => {
      console.log(`${record.user.firstName} ${record.user.lastName} (${record.user.role}): ${record.status} - In: ${record.checkInTime ? record.checkInTime.toLocaleTimeString() : 'N/A'}`);
    });
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
