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

// Staff Attendance Helpers
function calculateLateMinutes(checkInTime, expectedArrivalTime) {
  if (!expectedArrivalTime) return 0;
  const today = new Date().toISOString().split('T')[0];
  const expected = new Date(`${today}T${expectedArrivalTime}`);
  const actual = new Date(checkInTime);
  const diffMs = actual - expected;
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  return diffMinutes > 0 ? diffMinutes : 0;
}

function determineStaffStatus(checkInTime, lateMinutes) {
  if (!checkInTime) return 'absent';
  if (lateMinutes > 30) return 'late';
  return 'present';
}

// 1. Get Attendance Sheet for a Class (on a specific date)
router.get('/class/:classId', authenticate, authorize(['admin', 'teacher', 'principal']), async (req, res) => {
  try {
    const { classId } = req.params;
    const { date } = req.query; // YYYY-MM-DD

    // TEACHER SCOPE CHECK: Ensure teacher is assigned to this class
    // Principals and Admins bypass this
    if (req.user.role === 'teacher') {
      const classInfo = await prisma.class.findFirst({
        where: { id: parseInt(classId), schoolId: req.schoolId }
      });

      console.log(`[ATTENDANCE DEBUG] Teacher ${req.user.id} attempting access to class ${classId}. Class found: ${classInfo ? 'Yes' : 'No'}. Assigned teacher ID: ${classInfo?.classTeacherId}`);

      if (!classInfo || classInfo.classTeacherId !== req.user.id) {
        console.warn(`[ATTENDANCE WARNING] Access Denied for Teacher ${req.user.id} on class ${classId}.`);
        return res.status(403).json({
          error: 'Access Denied',
          message: 'You are not the assigned Class Teacher (Form Master) for this class.'
        });
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
router.post('/mark', authenticate, authorize(['admin', 'teacher', 'principal']), async (req, res) => {
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

    // 4. Send alerts (non-blocking)
    const markedRecords = records.filter(r => r.status === 'absent' || r.status === 'present');
    if (markedRecords.length > 0) {
      // Get school settings once
      const settings = await prisma.school.findUnique({
        where: { id: req.schoolId }
      });
      const schoolName = settings?.name || settings?.schoolName || 'School System';

      markedRecords.forEach(async (record) => {
        try {
          const student = await prisma.student.findFirst({
            where: { id: record.studentId, schoolId: req.schoolId },
            include: {
              user: { select: { firstName: true, lastName: true } },
              parent: { include: { user: { select: { email: true } } } },
              classModel: { select: { name: true, arm: true } }
            }
          });

          if (!student) return;

          // ABSENCE ALERT
          if (record.status === 'absent') {
            // Email Alert
            if (student.parent?.user?.email) {
              const { sendAbsenceAlert } = require('../services/emailService');
              sendAbsenceAlert({
                parentEmail: student.parent.user.email,
                studentName: `${student.user.firstName} ${student.user.lastName}`,
                date: targetDate.toLocaleDateString(),
                className: `${student.classModel?.name} ${student.classModel?.arm || ''}`.trim(),
                schoolName
              }).catch(e => console.error('Absence email error:', e));
            }

            // SMS Alert
            if (student.parent?.phone) {
              const { sendAbsenceSMS } = require('../services/smsService');
              sendAbsenceSMS({
                phone: student.parent.phone,
                studentName: student.user.firstName,
                date: targetDate.toLocaleDateString(),
                schoolName
              }).catch(e => console.error('Absence SMS error:', e));
            }

            // In-App Alert
            if (student.parent?.userId) {
              await prisma.parentTeacherMessage.create({
                data: {
                  schoolId: req.schoolId,
                  senderId: req.user.id,
                  receiverId: student.parent.userId,
                  senderRole: req.user.role,
                  studentId: student.id,
                  subject: 'Absence Notification',
                  message: `Automatic Alert: ${student.user.firstName} ${student.user.lastName} was marked ABSENT today (${targetDate.toLocaleDateString()}).`,
                  messageType: 'attendance',
                  isRead: false
                }
              }).catch(e => console.error('In-app notification error:', e));
            }
          }

          // SAFE ARRIVAL ALERT
          if (record.status === 'present') {
            // Check if already notified today for arrival
            const existingArrivalMsg = await prisma.parentTeacherMessage.findFirst({
              where: {
                receiverId: student.parent?.userId,
                studentId: student.id,
                subject: 'Safe Arrival Alert',
                createdAt: { gte: targetDate }
              }
            });

            if (!existingArrivalMsg && student.parent?.userId) {
              const arrivalTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

              // In-App Notification
              await prisma.parentTeacherMessage.create({
                data: {
                  schoolId: req.schoolId,
                  senderId: req.user.id,
                  receiverId: student.parent.userId,
                  senderRole: req.user.role,
                  studentId: student.id,
                  subject: 'Safe Arrival Alert',
                  message: `${student.user.firstName} has arrived safely at school (${arrivalTime}).`,
                  messageType: 'attendance',
                  isRead: false
                }
              }).catch(e => console.error('In-app arrival notification error:', e));

              // SMS Alert
              if (settings?.enableSMS && student.parent.phone) {
                const { sendArrivalSMS } = require('../services/smsService');
                sendArrivalSMS({
                  phone: student.parent.phone,
                  studentName: student.user.firstName,
                  time: arrivalTime,
                  schoolName
                }).catch(e => console.error('Arrival SMS error:', e));
              }

              // Email Alert
              if (student.parent.user?.email) {
                const { sendArrivalAlert } = require('../services/emailService');
                sendArrivalAlert({
                  parentEmail: student.parent.user.email,
                  studentName: student.user.firstName,
                  time: arrivalTime,
                  className: `${student.classModel?.name} ${student.classModel?.arm || ''}`.trim(),
                  schoolName
                }).catch(e => console.error('Arrival email error:', e));
              }
            }
          }
        } catch (err) {
          console.error('Error in alert processing:', err);
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

// Download attendance report (Admin/Principal only)
router.get('/download', authenticate, authorize(['admin', 'principal']), async (req, res) => {
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

// 4. Student Scan (Safe-Arrival Notification)
router.post('/scan', authenticate, authorize(['admin', 'teacher', 'principal', 'staff']), async (req, res) => {
  try {
    const { admissionNumber } = req.body;
    if (!admissionNumber) {
      return res.status(400).json({ error: 'Admission number is required' });
    }

    const { session, term } = await getCurrentSessionAndTerm(req.schoolId);
    if (!session || !term) {
      return res.status(400).json({ error: 'No active academic session or term found' });
    }

    // 1. Find the student
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const student = await prisma.student.findFirst({
      where: { admissionNumber, schoolId: req.schoolId },
      include: {
        user: { select: { firstName: true, lastName: true } },
        classModel: true,
        parent: { include: { user: { select: { email: true, firstName: true } } } }
      }
    });

    // 4. Handle Scan (Student or Staff)
    if (!student) {
      // Logic for staff scanning
      const staffUser = await prisma.user.findFirst({
        where: {
          schoolId: req.schoolId,
          role: { in: ['teacher', 'admin', 'principal', 'accountant', 'staff'] },
          OR: [
            { username: admissionNumber },
            { email: admissionNumber }
          ]
        }
      });

      if (staffUser) {
        const staffSettings = await prisma.school.findUnique({
          where: { id: req.schoolId },
          select: { staffExpectedArrivalTime: true }
        });

        const checkInTime = new Date();
        const expectedArrivalTime = staffSettings?.staffExpectedArrivalTime || '07:00';
        const lateMinutes = calculateLateMinutes(checkInTime, expectedArrivalTime);
        const status = determineStaffStatus(checkInTime, lateMinutes);

        const staffRecord = await prisma.staffAttendance.upsert({
          where: {
            schoolId_userId_date: {
              schoolId: req.schoolId,
              userId: staffUser.id,
              date: today
            }
          },
          update: { checkInTime, status, lateMinutes },
          create: {
            schoolId: req.schoolId,
            userId: staffUser.id,
            date: today,
            checkInTime,
            status,
            lateMinutes
          }
        });

        logAction({
          schoolId: req.schoolId,
          userId: req.user.id,
          action: 'STAFF_SCAN_ARRIVAL',
          resource: 'STAFF_ATTENDANCE',
          details: { staffUserId: staffUser.id, status },
          ipAddress: req.ip
        });

        return res.json({
          message: `${staffUser.firstName} (Staff) arrival logged`,
          isStaff: true,
          staff: {
            name: `${staffUser.firstName} ${staffUser.lastName}`,
            role: staffUser.role,
            status,
            isLate: status === 'late',
            lateMinutes
          }
        });
      }

      return res.status(404).json({ error: 'ID not recognized (not a student or staff)' });
    }

    // 2. Mark Attendance (already handled for student in original code logic above, but let's re-align)
    // Actually, if we reach here, it IS a student.
    const record = await prisma.attendanceRecord.upsert({
      where: {
        schoolId_studentId_date: {
          schoolId: req.schoolId,
          studentId: student.id,
          date: today
        }
      },
      update: {
        status: 'present',
        notes: 'Arrived via scan'
      },
      create: {
        schoolId: req.schoolId,
        studentId: student.id,
        classId: student.classId,
        academicSessionId: session.id,
        termId: term.id,
        date: today,
        status: 'present',
        notes: 'Arrived via scan'
      }
    });

    // 3. Trigger Notification (Non-blocking)
    const schoolSettings = await prisma.school.findUnique({
      where: { id: req.schoolId }
    });
    const schoolName = schoolSettings?.name || schoolSettings?.schoolName || 'Your School';

    if (student.parent?.userId) {
      const arrivalTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // In-App Notification
      await prisma.parentTeacherMessage.create({
        data: {
          schoolId: req.schoolId,
          senderId: req.user.id,
          receiverId: student.parent.userId,
          senderRole: req.user.role,
          studentId: student.id,
          subject: 'Safe Arrival Alert',
          message: `${student.user.firstName} has arrived safely at school today (${arrivalTime}).`,
          messageType: 'attendance',
          isRead: false
        }
      }).catch(e => console.error('In-app notification error:', e));

      // SMS Alert (if enabled)
      if (schoolSettings?.enableSMS && student.parent.phone) {
        const { sendArrivalSMS } = require('../services/smsService');
        sendArrivalSMS({
          phone: student.parent.phone,
          studentName: student.user.firstName,
          time: arrivalTime,
          schoolName
        }).catch(e => console.error('Arrival SMS error:', e));
      }

      // Email Alert
      if (student.parent.user?.email) {
        const { sendArrivalAlert } = require('../services/emailService');
        sendArrivalAlert({
          parentEmail: student.parent.user.email,
          studentName: student.user.firstName,
          time: arrivalTime,
          className: student.classModel?.name || 'N/A',
          schoolName
        }).catch(e => console.error('Arrival email error:', e));
      }
    }

    res.json({
      message: `${student.user.firstName} arrival logged successfully`,
      student: {
        name: `${student.user.firstName} ${student.user.lastName}`,
        class: student.classModel?.name,
        admissionNumber: student.admissionNumber
      }
    });

    // Log the action
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'SCAN_ARRIVAL',
      resource: 'ATTENDANCE',
      details: {
        studentId: student.id,
        admissionNumber: student.admissionNumber
      },
      ipAddress: req.ip
    });

  } catch (error) {
    console.error('Scan arrival error:', error);
    res.status(500).json({ error: 'Failed to process arrival scan' });
  }
});

// 5. Get Arrival Statistics for Gate Scanner
router.get('/arrival-stats', authenticate, authorize(['admin', 'principal', 'staff']), async (req, res) => {
  try {
    const { days = 5 } = req.query;
    const numDays = parseInt(days);

    // Generate dates for the last N days
    const dailyStats = [];
    const classes = await prisma.class.findMany({
      where: { schoolId: req.schoolId },
      include: {
        _count: {
          select: { students: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    const staffTotal = await prisma.user.count({
      where: {
        schoolId: req.schoolId,
        role: { in: ['teacher', 'admin', 'principal', 'accountant'] },
        isActive: true
      }
    });

    for (let i = 0; i < numDays; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      // 1. Get Student Stats per Class for this date
      const studentArrivals = await prisma.attendanceRecord.groupBy({
        by: ['classId'],
        where: {
          schoolId: req.schoolId,
          date: date,
          status: 'present'
        },
        _count: {
          studentId: true
        }
      });

      const studentArrivalMap = new Map();
      studentArrivals.forEach(a => studentArrivalMap.set(a.classId, a._count.studentId));

      const studentStats = classes.map(c => {
        const scanned = studentArrivalMap.get(c.id) || 0;
        const total = c._count.students;
        return {
          classId: c.id,
          className: `${c.name} ${c.arm || ''}`.trim(),
          total,
          scanned,
          unscanned: Math.max(0, total - scanned)
        };
      });

      // 2. Get Staff Stats for this date
      const staffArrivals = await prisma.staffAttendance.count({
        where: {
          schoolId: req.schoolId,
          date: date,
          checkInTime: { not: null }
        }
      });

      const staffStats = {
        total: staffTotal,
        scanned: staffArrivals,
        unscanned: Math.max(0, staffTotal - staffArrivals)
      };

      // Only add to dailyStats if there was any scanning activity (staff or students) 
      // OR if it's today
      if (staffArrivals > 0 || studentArrivals.length > 0 || i === 0) {
        dailyStats.push({
          date: date.toISOString(),
          studentStats,
          staffStats
        });
      }
    }

    res.json(dailyStats);

  } catch (error) {
    console.error('Get arrival stats error:', error);
    res.status(500).json({ error: 'Failed to fetch arrival statistics' });
  }
});

module.exports = router;
