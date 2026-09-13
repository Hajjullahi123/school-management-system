const express = require('express');
const router = express.Router();
const prisma = require('../db');

// Get top students from each class
router.get('/top-students', async (req, res) => {
  try {
    const { academicSessionId, termId, limit = 6 } = req.query;

    // Get current term and session if not provided
    let currentTerm, currentSession;

    if (!termId || !academicSessionId) {
      [currentTerm, currentSession] = await Promise.all([
        prisma.term.findFirst({ where: { isCurrent: true } }),
        prisma.academicSession.findFirst({ where: { isCurrent: true } })
      ]);
    }

    const finalTermId = termId ? parseInt(termId) : currentTerm?.id;
    const finalSessionId = academicSessionId ? parseInt(academicSessionId) : currentSession?.id;

    if (!finalTermId || !finalSessionId) {
      return res.json([]); // Return empty array if no current term/session
    }

    // Get all classes
    const classes = await prisma.class.findMany({
      orderBy: { name: 'asc' }
    });

    const topStudents = [];

    // For each class, find the top student
    for (const classItem of classes) {
      // Get all students in this class with their results
      const students = await prisma.student.findMany({
        where: {
          classId: classItem.id,
          user: { isActive: true }
        },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true
            }
          },
          classModel: true,
          results: {
            where: {
              termId: finalTermId,
              academicSessionId: finalSessionId
            }
          }
        }
      });

      // Calculate average for each student
      const studentsWithAverage = students.map(student => {
        if (student.results.length === 0) {
          return { ...student, average: 0, totalSubjects: 0 };
        }

        const totalScore = student.results.reduce((sum, result) => sum + result.totalScore, 0);
        const average = totalScore / student.results.length;

        return {
          ...student,
          average: average,
          totalSubjects: student.results.length
        };
      }).filter(s => s.totalSubjects > 0); // Only students with results

      // Sort by average (descending) and get top student
      studentsWithAverage.sort((a, b) => b.average - a.average);

      if (studentsWithAverage.length > 0) {
        const topStudent = studentsWithAverage[0];

        // Get best subjects (top 3 subjects by score)
        const sortedResults = topStudent.results
          .sort((a, b) => b.totalScore - a.totalScore)
          .slice(0, 3);

        const bestSubjects = await Promise.all(
          sortedResults.map(async (result) => {
            const subject = await prisma.subject.findUnique({
              where: { id: result.subjectId }
            });
            return subject?.name;
          })
        );

        // Determine achievement based on average
        let achievement = 'Top Performer';
        if (topStudent.average >= 90) achievement = 'Outstanding Excellence';
        else if (topStudent.average >= 85) achievement = 'Excellent Performance';
        else if (topStudent.average >= 80) achievement = 'Very Good Performance';

        topStudents.push({
          id: topStudent.id,
          name: `${topStudent.user.firstName} ${topStudent.user.lastName}`,
          class: `${classItem.name}${classItem.arm || ''}`,
          average: topStudent.average.toFixed(1) + '%',
          position: '1st',
          subjects: bestSubjects.filter(Boolean).join(', ') || 'Multiple Subjects',
          photo: topStudent.photoUrl || null,
          achievement: achievement,
          admissionNumber: topStudent.admissionNumber
        });
      }
    }

    // Sort by average (descending) and limit results
    topStudents.sort((a, b) => parseFloat(b.average) - parseFloat(a.average));
    const limitedTopStudents = topStudents.slice(0, parseInt(limit));

    res.json(limitedTopStudents);
  } catch (error) {
    console.error('Error fetching top students:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get overall top performers (across all classes)
router.get('/top-performers', async (req, res) => {
  try {
    const { academicSessionId, termId, limit = 10 } = req.query;

    // Get current term and session if not provided
    let currentTerm, currentSession;

    if (!termId || !academicSessionId) {
      [currentTerm, currentSession] = await Promise.all([
        prisma.term.findFirst({ where: { isCurrent: true } }),
        prisma.academicSession.findFirst({ where: { isCurrent: true } })
      ]);
    }

    const finalTermId = termId ? parseInt(termId) : currentTerm?.id;
    const finalSessionId = academicSessionId ? parseInt(academicSessionId) : currentSession?.id;

    if (!finalTermId || !finalSessionId) {
      return res.json([]);
    }

    // Get all students with their results
    const students = await prisma.student.findMany({
      where: {
        user: { isActive: true }
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        },
        classModel: true,
        results: {
          where: {
            termId: finalTermId,
            academicSessionId: finalSessionId
          },
          include: {
            subject: true
          }
        }
      }
    });

    // Calculate average for each student
    const studentsWithAverage = students.map(student => {
      if (student.results.length === 0) {
        return null;
      }

      const totalScore = student.results.reduce((sum, result) => sum + result.totalScore, 0);
      const average = totalScore / student.results.length;

      // Get best subjects
      const sortedResults = student.results
        .sort((a, b) => b.totalScore - a.totalScore)
        .slice(0, 3);

      const bestSubjects = sortedResults.map(r => r.subject.name).join(', ');

      // Determine achievement
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
        photo: student.photoUrl || null,
        achievement: achievement,
        admissionNumber: student.admissionNumber,
        totalSubjects: student.results.length
      };
    }).filter(Boolean); // Remove nulls

    // Sort by average (descending) and assign positions
    studentsWithAverage.sort((a, b) => b.averageNumeric - a.averageNumeric);

    const topPerformers = studentsWithAverage.slice(0, parseInt(limit)).map((student, index) => ({
      ...student,
      position: `${index + 1}${getOrdinalSuffix(index + 1)}`
    }));

    res.json(topPerformers);
  } catch (error) {
    console.error('Error fetching top performers:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper function to get ordinal suffix (1st, 2nd, 3rd, etc.)
function getOrdinalSuffix(num) {
  const j = num % 10;
  const k = num % 100;
  if (j === 1 && k !== 11) return 'st';
  if (j === 2 && k !== 12) return 'nd';
  if (j === 3 && k !== 13) return 'rd';
  return 'th';
}

module.exports = router;
