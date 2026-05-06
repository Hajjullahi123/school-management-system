const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkFees() {
  try {
    const totalFees = await prisma.feeRecord.count();
    console.log('Total Fee Records:', totalFees);

    const feesByTerm = await prisma.feeRecord.groupBy({
      by: ['termId'],
      _count: {
        id: true,
      },
    });

    console.log('\nFee Records by Term ID:');
    for (const f of feesByTerm) {
      console.log(` - Term ID ${f.termId}: ${f._count.id} records`);
    }

    const recentFees = await prisma.feeRecord.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        Student: {
          include: {
            user: { select: { firstName: true, lastName: true } }
          }
        },
        Term: { select: { name: true } },
        AcademicSession: { select: { name: true } }
      }
    });

    console.log('\nMost Recent 5 Records:');
    recentFees.forEach(f => {
      console.log(` - [${f.AcademicSession?.name} | ${f.Term?.name}] ${f.Student?.user?.firstName} ${f.Student?.user?.lastName}: ₦${f.paidAmount} / ₦${f.expectedAmount} (Created: ${f.createdAt})`);
    });

  } catch (error) {
    console.error('Error checking fees:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkFees();
