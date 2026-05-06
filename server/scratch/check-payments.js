const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPayments() {
  const sIds = [1, 3, 4, 5];
  try {
    for (const sId of sIds) {
      const count = await prisma.feePayment.count({ where: { schoolId: sId } });
      const records = await prisma.feeRecord.count({ where: { schoolId: sId } });
      const students = await prisma.student.count({ where: { schoolId: sId } });
      console.log(`School ID ${sId}: Students=${students}, FeeRecords=${records}, Payments=${count}`);
    }
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPayments();
