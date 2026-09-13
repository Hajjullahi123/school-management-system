const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Starting full data cleanup...');

  // Order matters for foreign keys
  const deleteOperations = [
    prisma.result.deleteMany(),
    prisma.cBTResult.deleteMany(),
    prisma.cBTQuestion.deleteMany(),
    prisma.cBTExam.deleteMany(),
    prisma.attendanceRecord.deleteMany(),
    prisma.feePayment.deleteMany(),
    prisma.feeRecord.deleteMany(),
    prisma.onlinePayment.deleteMany(),
    prisma.examCard.deleteMany(),
    prisma.studentReportCard.deleteMany(),
    prisma.promotionHistory.deleteMany(),
    prisma.homework.deleteMany(),
    prisma.learningResource.deleteMany(),
    prisma.notice.deleteMany(),
    prisma.alumniDonation.deleteMany(),
    prisma.alumni.deleteMany(),
    prisma.alumniEvent.deleteMany(),
    prisma.alumniStory.deleteMany(),
    prisma.parentTeacherMessage.deleteMany(),
    prisma.teacherAssignment.deleteMany(),
    prisma.classSubject.deleteMany(),
    prisma.timetable.deleteMany(),
    prisma.classFeeStructure.deleteMany(),
    prisma.psychomotorDomain.deleteMany(),
    prisma.student.deleteMany(),
    prisma.teacher.deleteMany(),
    prisma.parent.deleteMany(),
    // Delete users except 'admin'
    prisma.user.deleteMany({
      where: {
        username: { not: 'admin' }
      }
    }),
    prisma.class.deleteMany(),
    prisma.subject.deleteMany(),
    prisma.term.deleteMany(),
    prisma.academicSession.deleteMany(),
    prisma.newsEvent.deleteMany(),
    prisma.galleryImage.deleteMany(),
  ];

  try {
    // Execute deletions in sequence to respect constraints where possible (Prisma handles some, but sequence is safer)
    for (const op of deleteOperations) {
      await op;
    }
    console.log('Successfully cleared all test data (Students, Teachers, Classes, Subjects, and Results).');
    console.log('System is now empty except for the Admin account.');
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
