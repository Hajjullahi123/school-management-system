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
router.get('/class/:classId', authenticate, authorize(['admin', 'teacher', 'principal', 'attendance_admin']), async (req, res) => {
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

    // Default to today if no date provided, but consistently use UTC midnight
    const queryDate = date ? new Date(date) : new Date();
    if (!date) queryDate.setUTCHours(0, 0, 0, 0); 
    queryDate.setHours(0, 0, 0, 0);

    // Ensure session and term exist (optional check for sheet, mandatory for marking)
    const { session, term } = await getCurrentSessionAndTerm(req.schoolId);
    if (!session || !term) {
      console.warn(`[ATTENDANCE WARNING] Fetch attempt for class ${classId} without active session.`);
      // We don't block FETCHing the sheet, but we return the info so frontend can warn
    }


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
        user: { select: { firstName: true, lastName: true, photoUrl: true } }
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
        photoUrl: student.user.photoUrl || student.photoUrl,
        status: record ? record.status : 'pending', // 'pending' means not marked yet
        notes: record ? record.notes : '',
        id: record ? record.id : null // Existing record ID if any
      };
    });

    // Check if the requested date is a holiday or weekend based on school settings
    const dayOfWeek = queryDate.getUTCDay();
    let isHoliday = false;
    let holidayInfo = null;

    // Fetch school settings for weekend configuration
    const school = await prisma.school.findUnique({
      where: { id: req.schoolId },
      select: { name: true, weekendDays: true }
    });

    // Determine weekend indices, defaulting to Sunday (0) and Saturday (6) if not set
    // Important: Handle empty string case where split(',') results in ['']
    const weekendDaysRaw = school?.weekendDays || "";
    const weekendIndices = weekendDaysRaw.split(',')
      .map(n => n.trim())
      .filter(n => n !== "")
      .map(n => parseInt(n));
      
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    if (weekendIndices.includes(dayOfWeek)) {
      isHoliday = true;
      holidayInfo = {
        name: dayNames[dayOfWeek],
        type: 'weekend'
      };
    }

    const holidayRecord = await prisma.schoolHoliday.findFirst({
      where: { schoolId: req.schoolId, date: queryDate }
    });

    if (holidayRecord) {
      // Prioritize dynamic weekend configuration for records of type 'weekend'
      if (holidayRecord.type === 'weekend') {
        if (weekendIndices.includes(dayOfWeek)) {
          isHoliday = true;
          holidayInfo = {
            name: holidayRecord.name || dayNames[dayOfWeek],
            type: 'weekend',
            description: holidayRecord.description
          };
        } else {
          // If it's a weekend record but NOT a configured weekend, 
          // we ignore it and keep isHoliday based on weekendIndices (which covers the case where it was set but now removed)
        }
      } else {
        // Real holidays or non-weekend types always override
        isHoliday = true;
        holidayInfo = {
          name: holidayRecord.name,
          type: holidayRecord.type,
          description: holidayRecord.description
        };
      }
    }

    res.json({
      date: queryDate,
      students: result,
      isHoliday,
      holidayInfo,
      session: session ? { id: session.id, name: session.name } : null,
      term: term ? { id: term.id, name: term.name, startDate: term.startDate, endDate: term.endDate } : null
    });

  } catch (error) {
    console.error('Get class attendance error:', error);
    res.status(500).json({ error: 'Failed to fetch attendance sheet' });
  }
});

// 2. Mark Attendance (Bulk Upsert)
router.post('/mark', authenticate, authorize(['admin', 'teacher', 'principal', 'attendance_admin']), async (req, res) => {
  try {
    const { classId, date, records, adminOverride } = req.body;
    // records: [{ studentId: 1, status: 'present', notes: '' }, ...]

    // SERVER-SIDE LOCK CHECK
    let targetDate;
    if (date) {
      // Create UTC date from YYYY-MM-DD to avoid timezone shifting
      const [year, month, day] = date.split('-');
      targetDate = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day), 0, 0, 0));
    } else {
      const now = new Date();
      targetDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
    }

    const dateDiff = (new Date() - targetDate) / (1000 * 60 * 60);

    if (req.user.role === 'teacher' && dateDiff > 48) {
      return res.status(403).json({ error: 'Marking window closed. Attendance for this date is locked (48h limit).' });
    }

    // HOLIDAY / WEEKEND CHECK (Global check for all users)
    const dayOfWeek = targetDate.getUTCDay();
    // Fetch school settings for weekend configuration
    const school = await prisma.school.findUnique({
      where: { id: req.schoolId },
      select: { weekendDays: true }
    });

    const weekendDaysRaw = school?.weekendDays || "";
    const weekendIndices = weekendDaysRaw.split(',')
      .map(n => n.trim())
      .filter(n => n !== "")
      .map(n => parseInt(n));

    const holidayRecord = await prisma.schoolHoliday.findFirst({
      where: { schoolId: req.schoolId, date: targetDate }
    });

    // Logical gate: 
    // 1. If it's a configured weekend day (dynamic setting), it's blocked.
    // 2. If it's a database holiday record, it's blocked UNLESS it's a 'weekend' type record 
    //    that is no longer in the dynamic weekend setting.
    const isActuallyWeekend = weekendIndices.includes(dayOfWeek);
    const isActuallyHoliday = holidayRecord && (holidayRecord.type !== 'weekend' || isActuallyWeekend);

    if ((isActuallyHoliday || isActuallyWeekend) && !adminOverride) {
      const reason = isActuallyHoliday ? `Holiday: ${holidayRecord?.name || 'School Holiday'}` : "Weekend";
      return res.status(403).json({
        error: `Cannot mark attendance on ${reason}.`
      });
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

    // targetDate is already normalized to UTC midnight above

    // TERM DATE BOUNDARY CHECK: Ensure targetDate is within the current term's date range
    const termStart = new Date(term.startDate);
    termStart.setHours(0, 0, 0, 0);
    const termEnd = new Date(term.endDate);
    termEnd.setHours(23, 59, 59, 999);

    if ((targetDate < termStart || targetDate > termEnd) && !adminOverride) {
      const startStr = termStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      const endStr = termEnd.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      return res.status(400).json({
        error: `Date out of term range. The current term (${term.name}) runs from ${startStr} to ${endStr}. Attendance can only be marked within this period.`
      });
    }

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

    // 4. Send alerts (non-blocking / background)
    res.json({ message: 'Attendance marked successfully' });

    const markedRecords = records.filter(r => r.status === 'absent' || r.status === 'present');
    if (markedRecords.length > 0) {
      // Process in background using an async IIFE or setImmediate
      (async () => {
        try {
          // Get school settings once
          const settings = await prisma.school.findUnique({
            where: { id: req.schoolId }
          });
          const schoolName = settings?.name || settings?.schoolName || 'School System';

          for (const record of markedRecords) {
            try {
              const student = await prisma.student.findFirst({
                where: { id: record.studentId, schoolId: req.schoolId },
                include: {
                  user: { select: { firstName: true, lastName: true } },
                  parent: { include: { user: { select: { email: true } } } },
                  classModel: { select: { name: true, arm: true } }
                }
              });

              if (!student) continue;

              // ABSENCE ALERT
              if (record.status === 'absent') {
                // Email Alert
                if (student.parent?.user?.email) {
                  const { sendAbsenceAlert } = require('../services/emailService');
                  await sendAbsenceAlert({
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
                  await sendAbsenceSMS({
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
                    await sendArrivalSMS({
                      phone: student.parent.phone,
                      studentName: student.user.firstName,
                      time: arrivalTime,
                      schoolName
                    }).catch(e => console.error('Arrival SMS error:', e));
                  }

                  // Email Alert
                  if (student.parent.user?.email) {
                    const { sendArrivalAlert } = require('../services/emailService');
                    await sendArrivalAlert({
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
              console.error('Error in alert processing individual student:', err);
            }
          }
        } catch (error) {
          console.error('Background alert processing major failure:', error);
        }
      })();
    }

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

    if (!session || !term) return res.json({ present: 0, absent: 0, late: 0, unmarked: 0, total: 0 });

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

    // Format: { present: 45, absent: 2, late: 1, unmarked: 3 }
    const summary = {
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
      unmarked: 0,
      total: 0
    };

    let studentRecordedDays = 0;
    stats.forEach(s => {
      if (summary[s.status] !== undefined) {
        summary[s.status] = s._count.status;
        studentRecordedDays += s._count.status;
      }
    });

    // Get the student's class to find total class attendance days
    const student = await prisma.student.findFirst({
      where: { id: parseInt(studentId), schoolId: req.schoolId },
      select: { classId: true }
    });

    if (student?.classId) {
      const classAttendanceDays = await prisma.attendanceRecord.groupBy({
        by: ['date'],
        where: {
          schoolId: req.schoolId,
          classId: student.classId,
          academicSessionId: session.id,
          termId: term.id
        }
      });
      const totalClassDays = classAttendanceDays.length;
      summary.unmarked = Math.max(0, totalClassDays - studentRecordedDays);
      summary.total = totalClassDays;
    } else {
      summary.total = studentRecordedDays;
    }

    res.json(summary);

  } catch (error) {
    console.error('Get student stats error:', error);
    res.status(500).json({ error: 'Failed to fetch student stats' });
  }
});

// Download attendance report (Admin/Principal only)
router.get('/download', authenticate, authorize(['admin', 'teacher', 'principal', 'attendance_admin']), async (req, res) => {
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
router.post('/scan', authenticate, authorize(['admin', 'teacher', 'principal', 'staff', 'attendance_admin']), async (req, res) => {
  try {
    let { admissionNumber } = req.body;
    console.log(`[SCAN DEBUG] Received Scan Request: "${admissionNumber}" for School ID: ${req.schoolId}`);

    // Normalize for case-insensitive matching (SQLite is case-sensitive)
    const normalizedId = admissionNumber.trim().toUpperCase();

    // 0. HOLIDAY / WEEKEND CHECK
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayOfWeek = today.getDay();

    const schoolSettings = await prisma.school.findUnique({
      where: { id: req.schoolId },
      select: { weekendDays: true, name: true, staffExpectedArrivalTime: true, enableSMS: true, staffClockInMode: true, authorizedIP: true }
    });
    const weekendDaysRaw = schoolSettings?.weekendDays || "";
    const weekendIndices = weekendDaysRaw.split(',')
      .map(n => n.trim())
      .filter(n => n !== "")
      .map(n => parseInt(n));

    const holidayRecord = await prisma.schoolHoliday.findFirst({
      where: { schoolId: req.schoolId, date: today }
    });

    if (holidayRecord || weekendIndices.includes(dayOfWeek)) {
      const reason = holidayRecord ? `Holiday: ${holidayRecord.name}` : "Weekend";
      console.warn(`[SCAN WARNING] Scan attempt blocked: School is closed today (${reason}).`);
      return res.status(403).json({
        error: 'School is closed',
        message: `Attendance is not recorded on ${reason}.`
      });
    }

    const { session, term } = await getCurrentSessionAndTerm(req.schoolId);
    if (!session || !term) {
      return res.status(400).json({ error: 'No active academic session or term found' });
    }

    // 1. Find the student
    const student = await prisma.student.findFirst({
      where: {
        schoolId: req.schoolId,
        OR: [
          { admissionNumber: normalizedId },
          { admissionNumber: admissionNumber.trim() }
        ]
      },
      include: {
        user: { select: { firstName: true, lastName: true } },
        classModel: true,
        parent: { include: { user: { select: { email: true, firstName: true } } } }
      }
    });

    console.log(`[SCAN DEBUG] Student Found: ${student ? student.user.firstName : 'NO'}`);

    // 4. Handle Scan (Student or Staff)
    if (!student) {
      const lowerId = admissionNumber.trim().toLowerCase();
      console.log(`[SCAN DEBUG] Searching for Staff with normalized: "${normalizedId}" or lower: "${lowerId}"`);

      // Step 1: Check Teacher.staffId
      const teacherByStaffId = await prisma.teacher.findFirst({
        where: {
          schoolId: req.schoolId,
          OR: [
            { staffId: normalizedId },
            { staffId: lowerId },
            { staffId: admissionNumber.trim() }
          ]
        },
        include: { user: true }
      });

      let staffUser = teacherByStaffId?.user;

      if (!staffUser) {
        // Step 2: Fallback to User.username or User.email
        staffUser = await prisma.user.findFirst({
          where: {
            schoolId: req.schoolId,
            role: { in: ['teacher', 'admin', 'principal', 'accountant', 'staff'] },
            OR: [
              { username: normalizedId },
              { email: normalizedId },
              { username: lowerId },
              { email: lowerId },
              { username: admissionNumber.trim() },
              { email: admissionNumber.trim() }
            ]
          }
        });
      }

      console.log(`[SCAN DEBUG] Staff Found: ${staffUser ? staffUser.firstName : 'NO'}`);

      if (staffUser) {
        const staffSettings = await prisma.school.findUnique({
          where: { id: req.schoolId },
          select: { staffExpectedArrivalTime: true }
        });

        const checkInTime = new Date();
        const expectedArrivalTime = staffSettings?.staffExpectedArrivalTime || '07:00';
        const lateMinutes = calculateLateMinutes(checkInTime, expectedArrivalTime);
        const status = determineStaffStatus(checkInTime, lateMinutes);

        // Check if already scanned today
        const existingStaffRecord = await prisma.staffAttendance.findUnique({
          where: {
            schoolId_userId_date: {
              schoolId: req.schoolId,
              userId: staffUser.id,
              date: today
            }
          }
        });

        if (existingStaffRecord && existingStaffRecord.checkInTime) {
          return res.status(400).json({
            error: 'User already scanned today',
            message: `${staffUser.firstName} already arrived at ${new Date(existingStaffRecord.checkInTime).toLocaleTimeString()}`
          });
        }

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

    // 2. Mark Attendance
    // Check if student already scanned today
    const existingStudentRecord = await prisma.attendanceRecord.findUnique({
      where: {
        schoolId_studentId_date: {
          schoolId: req.schoolId,
          studentId: student.id,
          date: today
        }
      }
    });

    if (existingStudentRecord && existingStudentRecord.status === 'present') {
      return res.status(400).json({
        error: 'Student already scanned today',
        message: `${student.user.firstName} already arrived today.`
      });
    }

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

    const school = await prisma.school.findUnique({
      where: { id: req.schoolId },
      select: { weekendDays: true }
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

      // Check for holiday/weekend
      const holidayRecord = await prisma.schoolHoliday.findUnique({
        where: {
          schoolId_date: {
            schoolId: req.schoolId,
            date: date
          }
        }
      });
      const weekendDaysRaw = school.weekendDays ?? "0,6";
      const weekendDays = weekendDaysRaw.split(',')
        .map(d => d.trim())
        .filter(d => d !== "")
        .map(d => parseInt(d));
      const isWeekend = weekendDays.includes(date.getDay());
      const isHoliday = !!holidayRecord || isWeekend;
      const holidayName = holidayRecord?.name || (isWeekend ? 'Weekend' : null);

      // Only add to dailyStats if there was any scanning activity (staff or students) 
      // OR if it's today
      if (staffArrivals > 0 || studentArrivals.length > 0 || i === 0) {
        dailyStats.push({
          date: date.toISOString(),
          isHoliday,
          holidayName,
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
