const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

// Helper to get current session and term (centralized logic)
async function getCurrentSessionAndTerm() {
  const session = await prisma.academicSession.findFirst({ where: { isCurrent: true } });
  const term = await prisma.term.findFirst({ where: { isCurrent: true } });
  return { session, term };
}

// 1. Get Attendance Sheet for a Class (on a specific date)
router.get('/class/:classId', authenticate, async (req, res) => {
  try {
    const { classId } = req.params;
    const { date } = req.query; // YYYY-MM-DD

    // Default to today if no date provided, but strip time to midnight for consistency
    const queryDate = date ? new Date(date) : new Date();
    queryDate.setHours(0, 0, 0, 0);

    // Get all students in this class
    const students = await prisma.student.findMany({
      where: { classId: parseInt(classId) },
      include: {
        user: { select: { firstName: true, lastName: true } }
      },
      orderBy: { user: { lastName: 'asc' } }
    });

    // Get existing attendance for these students on this date
    // We fetch ALL records for this date to simple map them
    const existingRecords = await prisma.attendanceRecord.findMany({
      where: {
        classId: parseInt(classId),
        date: queryDate
      }
    });

    // Create a map for easy lookup
    const recordMap = new Map();
    existingRecords.forEach(r => recordMap.set(r.studentId, r));

    // Combine data: Return student list with their status attached
    const result = students.map(student => {
      const record = recordMap.get(student.id);
      return {
        studentId: student.id,
        name: `${student.user.firstName} ${student.user.lastName}`,
        admissionNumber: student.admissionNumber,
        status: record ? record.status : 'pending', // 'pending' means not marked yet
        notes: record ? record.notes : '',
        id: record ? record.id : null // Existing record ID if any
      };
    });

    res.json({
      date: queryDate,
      students: result
    });

  } catch (error) {
    console.error('Get class attendance error:', error);
    res.status(500).json({ error: 'Failed to fetch attendance sheet' });
  }
});

// 2. Mark Attendance (Bulk Upsert)
router.post('/mark', authenticate, async (req, res) => {
  try {
    const { classId, date, records } = req.body;
    // records: [{ studentId: 1, status: 'present', notes: '' }, ...]

    if (!records || !Array.isArray(records)) {
      return res.status(400).json({ error: 'Invalid records format' });
    }

    const { session, term } = await getCurrentSessionAndTerm();
    if (!session || !term) {
      return res.status(400).json({ error: 'No active academic session or term found' });
    }

    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    // We use a transaction because we might be updating many rows
    // Prisma deleteMany + createMany is often cleaner for "Overwrite" logic, 
    // but we want to preserve IDs if possible. For simplicity/robustness, we'll upsert loop in transaction.

    await prisma.$transaction(
      records.map(record => {
        return prisma.attendanceRecord.upsert({
          where: {
            studentId_date: {
              studentId: record.studentId,
              date: targetDate
            }
          },
          update: {
            status: record.status,
            notes: record.notes,
            classId: parseInt(classId), // Update class ID in case student moved
          },
          create: {
            studentId: record.studentId,
            classId: parseInt(classId),
            academicSessionId: session.id,
            termId: term.id,
            date: targetDate,
            status: record.status,
            notes: record.notes
          }
        });
      })
    );

    res.json({ message: 'Attendance marked successfully' });

  } catch (error) {
    console.error('Mark attendance error:', error);
    res.status(500).json({ error: 'Failed to mark attendance' });
  }
});

// 3. Get Student Stats (Summary)
router.get('/student/:studentId/summary', authenticate, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { session, term } = await getCurrentSessionAndTerm();

    if (!session || !term) return res.json({ present: 0, absent: 0, late: 0, total: 0 });

    const stats = await prisma.attendanceRecord.groupBy({
      by: ['status'],
      where: {
        studentId: parseInt(studentId),
        academicSessionId: session.id,
        termId: term.id
      },
      _count: {
        status: true
      }
    });

    // Format: { present: 45, absent: 2, late: 1 }
    const summary = {
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
      total: 0
    };

    stats.forEach(s => {
      if (summary[s.status] !== undefined) {
        summary[s.status] = s._count.status;
        summary.total += s._count.status;
      }
    });

    res.json(summary);

  } catch (error) {
    console.error('Get student stats error:', error);
    res.status(500).json({ error: 'Failed to fetch student stats' });
  }
});

module.exports = router;
