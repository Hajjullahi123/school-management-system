const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/audit');

// Helper to get current session and term (centralized logic)
async function getCurrentSessionAndTerm(schoolId) {
  const session = await prisma.academicSession.findFirst({
    where: { isCurrent: true, schoolId }
  });
  const term = await prisma.term.findFirst({
    where: { isCurrent: true, schoolId }
  });
  return { session, term };
}

// 1. Get Attendance Sheet for a Class (on a specific date)
router.get('/class/:classId', authenticate, authorize(['admin', 'teacher']), async (req, res) => {
  try {
    const { classId } = req.params;
    const { date } = req.query; // YYYY-MM-DD

    // TEACHER SCOPE CHECK: Ensure teacher is assigned to this class
    if (req.user.role === 'teacher') {
      const classInfo = await prisma.class.findFirst({
        where: { id: parseInt(classId), schoolId: req.schoolId }
      });

      if (!classInfo || classInfo.classTeacherId !== req.user.id) {
        return res.status(403).json({ error: 'Access Denied: You are not the assigned Class Teacher for this class.' });
      }
    }

    // Default to today if no date provided, but strip time to midnight for consistency
    const queryDate = date ? new Date(date) : new Date();
    queryDate.setHours(0, 0, 0, 0);

    // Get all students in this class for THIS school
    const students = await prisma.student.findMany({
      where: {
        classId: parseInt(classId),
        schoolId: req.schoolId
      },
      include: {
        user: { select: { firstName: true, lastName: true } }
      },
      select: {
        id: true,
        admissionNumber: true,
        photoUrl: true,
        user: { select: { firstName: true, lastName: true } }
      },
      orderBy: { user: { lastName: 'asc' } }
    });

    // Get existing attendance for these students on this date
    // We fetch ALL records for this date to simple map them
    const existingRecords = await prisma.attendanceRecord.findMany({
      where: {
        classId: parseInt(classId),
        date: queryDate,
        schoolId: req.schoolId
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
        photoUrl: student.photoUrl,
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
router.post('/mark', authenticate, authorize(['admin', 'teacher']), async (req, res) => {
  try {
    const { classId, date, records, adminOverride } = req.body;
    // records: [{ studentId: 1, status: 'present', notes: '' }, ...]

    // SERVER-SIDE LOCK CHECK
    const targetDate = new Date(date);
    const dateDiff = (new Date() - targetDate) / (1000 * 60 * 60);

    if (req.user.role === 'teacher' && dateDiff > 48) {
      return res.status(403).json({ error: 'Marking window closed. Attendance for this date is locked (48h limit).' });
    }

    // TEACHER SCOPE CHECK
    if (req.user.role === 'teacher') {
      const classInfo = await prisma.class.findFirst({
        where: { id: parseInt(classId), schoolId: req.schoolId }
      });
      if (!classInfo || classInfo.classTeacherId !== req.user.id) {
        return res.status(403).json({ error: 'Unauthorized: You can only mark attendance for your assigned classes.' });
      }
    }

    if (!records || !Array.isArray(records)) {
      return res.status(400).json({ error: 'Invalid records format' });
    }

    const { session, term } = await getCurrentSessionAndTerm(req.schoolId);
    if (!session || !term) {
      return res.status(400).json({ error: 'No active academic session or term found' });
    }

    targetDate.setHours(0, 0, 0, 0);

    // We use a transaction because we might be updating many rows
    await prisma.$transaction(
      records.map(record => {
        return prisma.attendanceRecord.upsert({
          where: {
            schoolId_studentId_date: {
              schoolId: req.schoolId,
              studentId: record.studentId,
              date: targetDate
            }
          },
          update: {
            status: record.status,
            notes: record.notes,
            classId: parseInt(classId),
          },
          create: {
            schoolId: req.schoolId,
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

    // 4. Send absence alerts (non-blocking)
    const absentRecords = records.filter(r => r.status === 'absent');
    if (absentRecords.length > 0) {
      // Get school settings once
      const settings = await prisma.school.findUnique({
        where: { id: req.schoolId }
      });
      const schoolName = settings?.name || settings?.schoolName || process.env.SCHOOL_NAME || 'School Management System';

      // Process alerts asynchronously
      absentRecords.forEach(async (record) => {
        try {
          const student = await prisma.student.findFirst({
            where: {
              id: record.studentId,
              schoolId: req.schoolId
            },
            include: {
              user: { select: { firstName: true, lastName: true } },
              parent: { include: { user: { select: { email: true } } } },
              classModel: { select: { name: true, arm: true } }
            }
          });

          // 1. Email Alert
          if (student?.parent?.user?.email) {
            const absenceData = {
              parentEmail: student.parent.user.email,
              studentName: `${student.user.firstName} ${student.user.lastName}`,
              date: targetDate,
              className: `${student.classModel?.name} ${student.classModel?.arm || ''}`.trim(),
              schoolName
            };

            const { sendAbsenceAlert } = require('../services/emailService');
            sendAbsenceAlert(absenceData).catch(e => console.error('Absence email error:', e));
          }

          // 2. SMS Alert
          if (student?.parent?.phone) {
            const { sendAbsenceSMS } = require('../services/smsService');
            sendAbsenceSMS({
              phone: student.parent.phone,
              studentName: `${student.user.firstName} ${student.user.lastName}`,
              date: targetDate,
              schoolName
            }).catch(e => console.error('Absence SMS error:', e));
          }

          // 3. NEW: In-App Parent Alert (via Message System)
          if (student?.parent?.userId) {
            await prisma.parentTeacherMessage.create({
              data: {
                schoolId: req.schoolId,
                senderId: req.user.id,
                receiverId: student.parent.userId,
                senderRole: req.user.role,
                studentId: student.id,
                subject: 'Absence Notification',
                message: `Automatic Alert: ${student.user.firstName} ${student.user.lastName} was marked ABSENT today (${targetDate.toLocaleDateString()}). If this is an error, please contact the class teacher.`,
                messageType: 'attendance',
                isRead: false
              }
            }).catch(e => console.error('In-app notification error:', e));
          }
        } catch (err) {
          console.error('Error in absence alert processing:', err);
        }
      });
    }

    res.json({ message: 'Attendance marked successfully' });

    // Log the action
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'MARK_ATTENDANCE',
      resource: 'ATTENDANCE',
      details: {
        classId: parseInt(classId),
        date: targetDate,
        recordCount: records.length
      },
      ipAddress: req.ip
    });

  } catch (error) {
    console.error('Mark attendance error:', error);
    res.status(500).json({ error: 'Failed to mark attendance' });
  }
});

// 3. Get Student Stats (Summary)
router.get('/student/:studentId/summary', authenticate, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { session, term } = await getCurrentSessionAndTerm(req.schoolId);

    if (!session || !term) return res.json({ present: 0, absent: 0, late: 0, total: 0 });

    const stats = await prisma.attendanceRecord.groupBy({
      by: ['status'],
      where: {
        studentId: parseInt(studentId),
        schoolId: req.schoolId,
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

router.get('/download', authenticate, authorize(['admin', 'teacher']), async (req, res) => {
  try {
    const { classId, startDate, endDate, termId, sessionId } = req.query;

    // Build the where clause dynamically
    const where = { schoolId: req.schoolId };

    // TEACHER SCOPE CHECK
    if (req.user.role === 'teacher') {
      if (classId) {
        const classInfo = await prisma.class.findFirst({
          where: { id: parseInt(classId), schoolId: req.schoolId }
        });
        if (!classInfo || classInfo.classTeacherId !== req.user.id) {
          return res.status(403).json({ error: 'Unauthorized: You can only download records for your own class.' });
        }
        where.classId = parseInt(classId);
      } else {
        // Force filter to their assigned class if no classId provided
        const myClass = await prisma.class.findFirst({
          where: { classTeacherId: req.user.id, schoolId: req.schoolId }
        });
        if (!myClass) {
          return res.status(403).json({ error: 'You are not assigned to any class.' });
        }
        where.classId = myClass.id;
      }
    } else if (classId) {
      where.classId = parseInt(classId);
    }

    if (termId) {
      where.termId = parseInt(termId);
    }

    if (sessionId) {
      where.academicSessionId = parseInt(sessionId);
    }

    // Date range filter
    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // Include the end date
        where.date.lte = end;
      }
    }

    // Fetch attendance records with related data
    const records = await prisma.attendanceRecord.findMany({
      where,
      include: {
        student: {
          include: {
            user: { select: { firstName: true, lastName: true } },
            classModel: { select: { name: true, arm: true } }
          }
        },
        academicSession: { select: { name: true } },
        term: { select: { name: true } },
        class: { select: { name: true, arm: true } }
      },
      orderBy: [
        { date: 'desc' },
        { student: { user: { lastName: 'asc' } } }
      ]
    });

    // Convert to CSV format
    const csvHeader = 'Date,Student Name,Admission Number,Class,Session,Term,Status,Notes\n';

    const csvRows = records.map(record => {
      const date = record.date.toISOString().split('T')[0];
      const studentName = `${record.student.user.firstName} ${record.student.user.lastName}`;
      const admissionNumber = record.student.admissionNumber || '';
      const className = `${record.class.name} ${record.class.arm || ''}`.trim();
      const session = record.academicSession.name;
      const term = record.term.name;
      const status = record.status;
      const notes = (record.notes || '').replace(/,/g, ';'); // Replace commas in notes

      return `${date},"${studentName}",${admissionNumber},"${className}",${session},${term},${status},"${notes}"`;
    });

    const csv = csvHeader + csvRows.join('\n');

    // Set headers for file download
    const filename = `attendance_${Date.now()}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);

    // Log the download
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'DOWNLOAD',
      resource: 'ATTENDANCE_RECORDS',
      details: {
        filters: req.query
      },
      ipAddress: req.ip
    });

  } catch (error) {
    console.error('Download attendance error:', error);
    res.status(500).json({ error: 'Failed to download attendance records' });
  }
});

module.exports = router;
