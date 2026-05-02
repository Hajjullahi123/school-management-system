const prisma = require('./db');

async function testBulk() {
  try {
    const classId = 1;
    const termId = 1;
    const schoolId = 1; // Try to guess from the db

    const school = await prisma.school.findFirst();
    if (!school) return console.log('No school');
    const sId = school.id;

    const term = await prisma.term.findFirst({
        where: { schoolId: sId }
    });
    if (!term) return console.log('No term');
    
    const cl = await prisma.class.findFirst({
        where: { schoolId: sId }
    });
    if (!cl) return console.log('No class');

    console.log(`Testing with classId: ${cl.id}, termId: ${term.id}, schoolId: ${sId}`);

    // Let's just fetch FeeRecord and Term inclusion to see if it throws!
    try {
      const allFeeRecords = await prisma.feeRecord.findMany({
        where: { schoolId: sId },
        include: { Term: { select: { id: true, startDate: true } } }
      });
      console.log('FeeRecords fetched successfully with Term!');
    } catch (e) {
      console.log('ERROR FETCHING FEERECORD with Term:', e.message);
      try {
        const allFeeRecords2 = await prisma.feeRecord.findMany({
          where: { schoolId: sId },
          include: { term: { select: { id: true, startDate: true } } }
        });
        console.log('FeeRecords fetched successfully with term!');
      } catch (e2) {
        console.log('ERROR FETCHING FEERECORD with term:', e2.message);
      }
    }

  } catch (error) {
    console.error('Test script error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testBulk();
