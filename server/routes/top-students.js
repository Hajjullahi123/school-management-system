const express = require('express');
const router = express.Router();
const prisma = require('../db');

// Helper: ordinal suffix
function getOrdinalSuffix(num) {
  const j = num % 10, k = num % 100;
  if (j === 1 && k !== 11) return 'st';
  if (j === 2 && k !== 12) return 'nd';
  if (j === 3 && k !== 13) return 'rd';
  return 'th';
}

// Helper: check if results are published for a class in a given term
async function isPublished(schoolId, classId, termId, classItem) {
  const publication = await prisma.resultPublication.findUnique({
    where: { schoolId_classId_termId: { schoolId, classId, termId } }
  });
  return !!publication?.isPublished;
}

// Helper: get top student for a given class + term + session
async function getTopStudentForClass(schoolId, classItem, termId, sessionId) {
  const students = await prisma.student.findMany({
    where: { classId: classItem.id, schoolId, user: { isActive: true, schoolId } },
    include: {
      user: { select: { firstName: true, lastName: true, photoUrl: true } },
      classModel: true,
      results: {
        where: { termId, academicSessionId: sessionId, schoolId },
        include: { subject: true }
      }
    }
  });

  const withAverages = students
    .map(s => {
      if (s.results.length === 0) return null;
      const total = s.results.reduce((sum, r) => sum + r.totalScore, 0);
      return { ...s, average: total / s.results.length };
    })
    .filter(Boolean);

  if (withAverages.length === 0) return null;

  withAverages.sort((a, b) => b.average - a.average);
  const top = withAverages[0];

  const bestSubjects = top.results
    .slice().sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, 3)
    .map(r => r.subject?.name)
    .filter(Boolean);

  let achievement = 'Top Performer';
  if (top.average >= 90) achievement = 'Outstanding Excellence';
  else if (top.average >= 85) achievement = 'Excellent Performance';
  else if (top.average >= 80) achievement = 'Very Good Performance';

  return {
    id: top.id,
    name: `${top.user.firstName} ${top.user.lastName}`,
    class: `${classItem.name}${classItem.arm ? ' ' + classItem.arm : ''}`,
    average: top.average.toFixed(1) + '%',
    averageNumeric: top.average,
    position: '1st',
    subjects: bestSubjects.join(', ') || 'Multiple Subjects',
    photo: top.user?.photoUrl || top.photoUrl || null,
    achievement,
    admissionNumber: top.admissionNumber
  };
}

// GET /top-students/top-students
// Returns top student per class — current term if published, fallbacks to latest published prior term.
router.get('/top-students', async (req, res) => {
  try {
    const { limit = 6, schoolId } = req.query;
    if (!schoolId) return res.status(400).json({ error: 'School ID is required' });
    const finalSchoolId = parseInt(schoolId);

    // Find current term
    const currentTerm = await prisma.term.findFirst({
      where: { isCurrent: true, schoolId: finalSchoolId }
    });

    // All terms ordered newest first for fallback lookup
    const allTerms = await prisma.term.findMany({
      where: { schoolId: finalSchoolId },
      orderBy: [{ academicSession: { startDate: 'desc' } }, { startDate: 'desc' }],
      include: { academicSession: true }
    });

    // Get all active classes
    const classes = await prisma.class.findMany({
      where: { schoolId: finalSchoolId, isActive: true },
      orderBy: { name: 'asc' }
    });

    const topStudents = [];

    for (const classItem of classes) {
      let found = false;

      // 1. Try current term (if published)
      if (currentTerm) {
        const published = await isPublished(finalSchoolId, classItem.id, currentTerm.id, classItem);
        if (published) {
          const entry = await getTopStudentForClass(
            finalSchoolId, classItem, currentTerm.id, currentTerm.academicSessionId
          );
          if (entry) { topStudents.push(entry); found = true; }
        }
      }

      // 2. Fallback: walk back through prior terms
      if (!found) {
        for (const term of allTerms) {
          if (currentTerm && term.id === currentTerm.id) continue; // skip current
          const published = await isPublished(finalSchoolId, classItem.id, term.id, classItem);
          if (published) {
            const entry = await getTopStudentForClass(
              finalSchoolId, classItem, term.id, term.academicSessionId
            );
            if (entry) {
              topStudents.push({
                ...entry,
                isFallback: true,
                fallbackTerm: `${term.name} (${term.academicSession?.name || ''})`
              });
              found = true;
              break;
            }
          }
        }
      }
      // 3. Nothing found for this class — skip entirely (no fake data)
    }

    topStudents.sort((a, b) => b.averageNumeric - a.averageNumeric);
    res.json(topStudents.slice(0, parseInt(limit)));
  } catch (error) {
    console.error('Error fetching top students:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /top-students/top-performers (across all classes)
router.get('/top-performers', async (req, res) => {
  try {
    const { academicSessionId, termId, limit = 10, schoolId } = req.query;
    if (!schoolId) return res.status(400).json({ error: 'School ID is required' });
    const finalSchoolId = parseInt(schoolId);

    let currentTerm, currentSession;
    if (!termId || !academicSessionId) {
      [currentTerm, currentSession] = await Promise.all([
        prisma.term.findFirst({ where: { isCurrent: true, schoolId: finalSchoolId } }),
        prisma.academicSession.findFirst({ where: { isCurrent: true, schoolId: finalSchoolId } })
      ]);
    }

    const finalTermId = termId ? parseInt(termId) : currentTerm?.id;
    const finalSessionId = academicSessionId ? parseInt(academicSessionId) : currentSession?.id;

    if (!finalTermId || !finalSessionId) return res.json([]);

    const students = await prisma.student.findMany({
      where: { schoolId: finalSchoolId, user: { isActive: true, schoolId: finalSchoolId } },
      include: {
        user: { select: { firstName: true, lastName: true, email: true, photoUrl: true } },
        classModel: true,
        results: {
          where: { termId: finalTermId, academicSessionId: finalSessionId, schoolId: finalSchoolId },
          include: { subject: true }
        }
      }
    });

    const studentsWithAveragePromises = students.map(async student => {
      if (student.classModel) {
        const publication = await prisma.resultPublication.findUnique({
          where: { schoolId_classId_termId: { schoolId: finalSchoolId, classId: student.classModel.id, termId: finalTermId } }
        });
        if (!publication || !publication.isPublished) {
          return null;
        }
      }
      if (student.results.length === 0) return null;

      const totalScore = student.results.reduce((sum, r) => sum + r.totalScore, 0);
      const average = totalScore / student.results.length;
      const bestSubjects = student.results
        .slice().sort((a, b) => b.totalScore - a.totalScore)
        .slice(0, 3).map(r => r.subject.name).join(', ');

      let achievement = 'Top Performer';
      if (average >= 95) achievement = 'Outstanding Excellence';
      else if (average >= 90) achievement = 'Exceptional Performance';
      else if (average >= 85) achievement = 'Excellent Performance';
      else if (average >= 80) achievement = 'Very Good Performance';

      return {
        id: student.id,
        name: `${student.user.firstName} ${student.user.lastName}`,
        class: student.classModel ? `${student.classModel.name}${student.classModel.arm || ''}` : 'N/A',
        average: average.toFixed(1) + '%',
        averageNumeric: average,
        subjects: bestSubjects || 'Multiple Subjects',
        photo: student.user?.photoUrl || student.photoUrl || null,
        achievement,
        admissionNumber: student.admissionNumber,
        totalSubjects: student.results.length
      };
    });

    const studentsWithAverage = (await Promise.all(studentsWithAveragePromises)).filter(Boolean);
    studentsWithAverage.sort((a, b) => b.averageNumeric - a.averageNumeric);

    const topPerformers = studentsWithAverage.slice(0, parseInt(limit)).map((s, i) => ({
      ...s,
      position: `${i + 1}${getOrdinalSuffix(i + 1)}`
    }));

    res.json(topPerformers);
  } catch (error) {
    console.error('Error fetching top performers:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
