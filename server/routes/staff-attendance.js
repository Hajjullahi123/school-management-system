const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/audit');
const ExcelJS = require('exceljs');

// Helper to get current session and term
async function getCurrentSessionAndTerm(schoolId) {
  const session = await prisma.academicSession.findFirst({
    where: { isCurrent: true, schoolId }
  });
  const term = await prisma.term.findFirst({
    where: { isCurrent: true, schoolId }
  });
  return { session, term };
}

// Helper to calculate late minutes based on school settings
function calculateLateMinutes(checkInTime, expectedArrivalTime) {
  if (!expectedArrivalTime) return 0;

  const today = new Date().toISOString().split('T')[0];
  const expected = new Date(`${today}T${expectedArrivalTime}`);
  const actual = new Date(checkInTime);

  const diffMs = actual - expected;
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  return diffMinutes > 0 ? diffMinutes : 0;
}

// Determine attendance status
function determineStatus(checkInTime, lateMinutes) {
  if (!checkInTime) return 'absent';
  if (lateMinutes > 30) return 'late'; // More than 30 minutes late
  return 'present';
}

// 1. Check In (Teacher/Staff)
router.post('/check-in', authenticate, authorize(['teacher', 'admin', 'principal', 'accountant', 'attendance_admin']), async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const schoolId = parseInt(req.schoolId);
    const userId = parseInt(req.user.id);

    // Check if already checked in today
    const existing = await prisma.staffAttendance.findUnique({
      where: {
        schoolId_userId_date: {
          schoolId,
          userId,
          date: today
        }
      }
    });

    if (existing && existing.checkInTime) {
      return res.status(400).json({
        error: 'Already checked in today',
        checkInTime: existing.checkInTime
      });
    }

    // Get school settings for expected arrival time and deadline
    const schoolSettings = await prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        name: true,
        staffExpectedArrivalTime: true,
        staffClockInDeadline: true,
        staffClockInMode: true,
        authorizedIP: true
      }
    });

    // 1. Role-based Restriction (Teachers must be scanned by admin)
    if (req.user.role === 'teacher') {
      return res.status(403).json({
        error: 'Self check-in disabled for teachers',
        message: 'Your check-in must be handled by an admin using your ID card/code scan at the gate. You can still clock out from your dashboard once your shift is over.'
      });
    }

    // 2. Clock-in Mode Validation (For other roles if scan_only is active)
    if (schoolSettings?.staffClockInMode === 'scan_only' && !['admin', 'principal'].includes(req.user.role)) {
      return res.status(403).json({
        error: 'Direct clock-in disabled',
        message: 'Your school requires attendance to be marked via the Arrival Scanner at the gate. Please proceed to the scanner point.'
      });
    }

    // 3. IP Restriction Validation
    if (schoolSettings?.staffClockInMode === 'ip_locked' && schoolSettings.authorizedIP) {
      const clientIp = req.ip.replace('::ffff:', '');
      // Allow localhost/loopback for development, otherwise must match authorizedIP
      if (clientIp !== schoolSettings.authorizedIP && clientIp !== '::1' && clientIp !== '127.0.0.1') {
        return res.status(403).json({
          error: 'Network restriction',
          message: 'Clock-in is restricted to the school\'s internal network. Please ensure you are connected to the school Wi-Fi.'
        });
      }
    }

    // Check if after deadline
    if (schoolSettings?.staffClockInDeadline) {
      const now = new Date();
      const currentHHMM = now.toTimeString().split(' ')[0].substring(0, 5); // "HH:MM"

      // Handle the case where the deadline might be in a different format or missing
      if (currentHHMM > schoolSettings.staffClockInDeadline) {
        return res.status(403).json({
          error: 'Clock-in period has ended',
          message: `The clock-in window closed at ${schoolSettings.staffClockInDeadline}. Please contact administration for manual attendance marking.`
        });
      }
    }

    const checkInTime = new Date();
    // Use configured expected arrival time or default to 07:00
    const expectedArrivalTime = schoolSettings?.staffExpectedArrivalTime || '07:00';
    const lateMinutes = calculateLateMinutes(checkInTime, expectedArrivalTime);
    const status = determineStatus(checkInTime, lateMinutes);

    // Create or update attendance record
    const record = await prisma.staffAttendance.upsert({
      where: {
        schoolId_userId_date: {
          schoolId,
          userId,
          date: today
        }
      },
      update: {
        checkInTime,
        status,
        lateMinutes
      },
      create: {
        schoolId,
        userId,
        date: today,
        checkInTime,
        status,
        lateMinutes
      }
    });

    // Log the action
    logAction({
      schoolId,
      userId,
      action: 'STAFF_CHECK_IN',
      resource: 'STAFF_ATTENDANCE',
      details: {
        checkInTime: checkInTime.toISOString(),
        status,
        lateMinutes
      },
      ipAddress: req.ip
    });

    res.json({
      message: 'Checked in successfully',
      checkInTime,
      status,
      lateMinutes: lateMinutes > 0 ? lateMinutes : null,
      isLate: status === 'late'
    });

  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({ error: 'Failed to check in' });
  }
});

// 2. Check Out (Teacher/Staff)
router.post('/check-out', authenticate, authorize(['teacher', 'admin', 'principal', 'accountant', 'attendance_admin']), async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const schoolId = parseInt(req.schoolId);
    const userId = parseInt(req.user.id);

    const record = await prisma.staffAttendance.findUnique({
      where: {
        schoolId_userId_date: {
          schoolId,
          userId,
          date: today
        }
      }
    });

    if (!record) {
      return res.status(404).json({ error: 'No check-in record found for today' });
    }

    if (record.checkOutTime) {
      return res.status(400).json({
        error: 'Already checked out today',
        checkOutTime: record.checkOutTime
      });
    }

    const checkOutTime = new Date();

    // Calculate total hours worked
    const hoursWorked = record.checkInTime
      ? ((checkOutTime - new Date(record.checkInTime)) / (1000 * 60 * 60)).toFixed(2)
      : 0;

    await prisma.staffAttendance.update({
      where: { id: record.id },
      data: { checkOutTime }
    });

    // Log the action
    logAction({
      schoolId,
      userId,
      action: 'STAFF_CHECK_OUT',
      resource: 'STAFF_ATTENDANCE',
      details: {
        checkOutTime: checkOutTime.toISOString(),
        hoursWorked
      },
      ipAddress: req.ip
    });

    res.json({
      message: 'Checked out successfully',
      checkOutTime,
      hoursWorked: parseFloat(hoursWorked)
    });

  } catch (error) {
    console.error('Check-out error:', error);
    res.status(500).json({ error: 'Failed to check out' });
  }
});

// 3. Get My Status (Teacher/Staff)
router.get('/my-status', authenticate, authorize(['teacher', 'admin', 'principal', 'accountant', 'attendance_admin']), async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const schoolId = parseInt(req.schoolId);
    const userId = parseInt(req.user.id);

    const record = await prisma.staffAttendance.findUnique({
      where: {
        schoolId_userId_date: {
          schoolId,
          userId,
          date: today
        }
      }
    });

    const schoolSettings = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { staffClockInMode: true }
    });

    if (!record) {
      return res.json({
        hasCheckedIn: false,
        hasCheckedOut: false,
        status: 'not_checked_in',
        staffClockInMode: schoolSettings?.staffClockInMode || 'anywhere'
      });
    }

    const hoursWorked = record.checkInTime && record.checkOutTime
      ? ((new Date(record.checkOutTime) - new Date(record.checkInTime)) / (1000 * 60 * 60)).toFixed(2)
      : null;

    res.json({
      hasCheckedIn: !!record.checkInTime,
      hasCheckedOut: !!record.checkOutTime,
      checkInTime: record.checkInTime,
      checkOutTime: record.checkOutTime,
      status: record.status,
      lateMinutes: record.lateMinutes,
      isLate: record.status === 'late',
      hoursWorked: hoursWorked ? parseFloat(hoursWorked) : null,
      staffClockInMode: schoolSettings?.staffClockInMode || 'anywhere'
    });

  } catch (error) {
    console.error('Get status error:', error);
    res.status(500).json({ error: 'Failed to fetch status' });
  }
});

// 4. Daily Report (Admin/Principal)
router.get('/daily-report', authenticate, authorize(['admin', 'principal', 'attendance_admin']), async (req, res) => {
  try {
    const { date, days = 1 } = req.query;
    const numDays = parseInt(days);
    const schoolId = parseInt(req.schoolId);

    const baseDate = date ? new Date(date) : new Date();
    baseDate.setHours(0, 0, 0, 0);

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { weekendDays: true }
    });

    const reports = [];

    // Get all active staff once to avoid redundant queries
    const staffMembers = await prisma.user.findMany({
      where: {
        schoolId,
        role: { in: ['teacher', 'admin', 'principal', 'accountant'] },
        isActive: true
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        email: true
      },
      orderBy: { lastName: 'asc' }
    });

    for (let i = 0; i < numDays; i++) {
      const queryDate = new Date(baseDate);
      queryDate.setDate(queryDate.getDate() - i);

      // Get attendance records for the specific date
      const records = await prisma.staffAttendance.findMany({
        where: {
          schoolId,
          date: queryDate
        },
        include: {
          verifier: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        }
      });

      // Skip historical days with no records, but always include today
      if (records.length === 0 && i > 0) continue;

      // Create a map for easy lookup
      const recordMap = new Map();
      records.forEach(r => recordMap.set(r.userId, r));

      // Combine data
      const dailyStaffData = staffMembers.map(s => {
        const record = recordMap.get(s.id);
        const hoursWorked = record?.checkInTime && record?.checkOutTime
          ? ((new Date(record.checkOutTime) - new Date(record.checkInTime)) / (1000 * 60 * 60)).toFixed(2)
          : null;

        return {
          userId: s.id,
          name: `${s.firstName} ${s.lastName}`,
          role: s.role,
          email: s.email,
          checkInTime: record?.checkInTime || null,
          checkOutTime: record?.checkOutTime || null,
          status: record?.status || 'absent',
          lateMinutes: record?.lateMinutes || null,
          hoursWorked: hoursWorked ? parseFloat(hoursWorked) : null,
          notes: record?.notes || null,
          verifiedAt: record?.verifiedAt || null,
          verifiedBy: record?.verifier ? `${record.verifier.firstName} ${record.verifier.lastName}` : null
        };
      });

      // Check for holiday/weekend
      const holidayRecord = await prisma.schoolHoliday.findUnique({
        where: {
          schoolId_date: {
            schoolId,
            date: queryDate
          }
        }
      });
      const weekendDays = (school.weekendDays || '0,6').split(',').map(d => parseInt(d.trim()));
      const isWeekend = weekendDays.includes(queryDate.getDay());
      const isHoliday = !!holidayRecord || isWeekend;
      const holidayName = holidayRecord?.name || (isWeekend ? 'Weekend' : null);

      // Calculate summary stats
      const stats = {
        total: staffMembers.length,
        present: dailyStaffData.filter(r => r.status === 'present' || r.status === 'late').length,
        late: dailyStaffData.filter(r => r.status === 'late').length,
        absent: dailyStaffData.filter(r => r.status === 'absent').length
      };

      reports.push({
        date: queryDate,
        isHoliday,
        holidayName,
        stats,
        staff: isHoliday ? [] : dailyStaffData
      });
    }

    // If numDays is 1, return an object for backward compatibility, otherwise return the array
    // Actually, it's better to return the array if days param is provided, 
    // but the frontend might expect a single object if it's not updated yet.
    // For now, let's return the array and update the frontend immediately.
    res.json(numDays > 1 ? reports : reports[0]);

  } catch (error) {
    console.error('Daily report error:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// 5. Monthly Summary (Admin/Principal)
router.get('/monthly-summary', authenticate, authorize(['admin', 'principal', 'attendance_admin']), async (req, res) => {
  try {
    const schoolId = parseInt(req.schoolId);
    const { month, year } = req.query;
    const targetMonth = month ? parseInt(month) : new Date().getMonth() + 1;
    const targetYear = year ? parseInt(year) : new Date().getFullYear();

    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59);

    const records = await prisma.staffAttendance.findMany({
      where: {
        schoolId,
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            role: true
          }
        }
      }
    });

    // Group by user
    const userStats = new Map();

    records.forEach(record => {
      const userId = record.userId;
      if (!userStats.has(userId)) {
        userStats.set(userId, {
          userId,
          name: `${record.user.firstName} ${record.user.lastName}`,
          role: record.user.role,
          totalDays: 0,
          present: 0,
          late: 0,
          absent: 0,
          totalLateMinutes: 0
        });
      }

      const stats = userStats.get(userId);
      stats.totalDays++;

      if (record.status === 'present') stats.present++;
      if (record.status === 'late') {
        stats.late++;
        stats.totalLateMinutes += record.lateMinutes || 0;
      }
      if (record.status === 'absent') stats.absent++;
    });

    const summary = Array.from(userStats.values()).map(s => ({
      ...s,
      attendanceRate: s.totalDays > 0 ? ((s.present + s.late) / s.totalDays * 100).toFixed(1) : '0.0',
      avgLateMinutes: s.late > 0 ? Math.floor(s.totalLateMinutes / s.late) : 0
    }));

    res.json({
      month: targetMonth,
      year: targetYear,
      summary
    });

  } catch (error) {
    console.error('Monthly summary error:', error);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

// 6. Mark Absent (Admin - manual marking)
router.post('/mark-absent', authenticate, authorize(['admin', 'principal', 'attendance_admin']), async (req, res) => {
  try {
    const schoolId = parseInt(req.schoolId);
    const { userId, date, notes } = req.body;

    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    await prisma.staffAttendance.upsert({
      where: {
        schoolId_userId_date: {
          schoolId,
          userId: parseInt(userId),
          date: targetDate
        }
      },
      update: {
        status: 'absent',
        notes
      },
      create: {
        schoolId,
        userId: parseInt(userId),
        date: targetDate,
        status: 'absent',
        notes
      }
    });

    logAction({
      schoolId,
      userId: req.user.id,
      action: 'MARK_STAFF_ABSENT',
      resource: 'STAFF_ATTENDANCE',
      details: {
        targetUserId: userId,
        date: targetDate.toISOString()
      },
      ipAddress: req.ip
    });

    res.json({ message: 'Marked as absent successfully' });

  } catch (error) {
    console.error('Mark absent error:', error);
    res.status(500).json({ error: 'Failed to mark absent' });
  }
});

// 7. Verify Attendance (Admin manual marking/verification)
router.post('/verify', authenticate, authorize(['admin', 'principal', 'attendance_admin']), async (req, res) => {
  try {
    const schoolId = parseInt(req.schoolId);
    const { userId, date, status, notes, checkInTime, checkOutTime } = req.body;

    if (!userId || !date || !status) {
      return res.status(400).json({ error: 'User ID, date, and status are required' });
    }

    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    const updateData = {
      status,
      notes,
      verifiedById: req.user.id,
      verifiedAt: new Date()
    };

    if (checkInTime) updateData.checkInTime = new Date(checkInTime);
    if (checkOutTime) updateData.checkOutTime = new Date(checkOutTime);

    // If status is present/late but no checkInTime provided and none exists, use school defaults or current time
    if ((status === 'present' || status === 'late') && !checkInTime) {
      const existing = await prisma.staffAttendance.findUnique({
        where: {
          schoolId_userId_date: {
            schoolId,
            userId: parseInt(userId),
            date: targetDate
          }
        }
      });

      if (!existing || !existing.checkInTime) {
        // Fallback to a reasonable "start of day" if marking present
        const schoolSettings = await prisma.school.findUnique({
          where: { id: schoolId },
          select: { staffExpectedArrivalTime: true }
        });
        const arrivalTimeStr = schoolSettings?.staffExpectedArrivalTime || '07:00';
        const [hours, minutes] = arrivalTimeStr.split(':');
        const defaultTime = new Date(targetDate);
        defaultTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        updateData.checkInTime = defaultTime;
      }
    }

    const record = await prisma.staffAttendance.upsert({
      where: {
        schoolId_userId_date: {
          schoolId,
          userId: parseInt(userId),
          date: targetDate
        }
      },
      update: updateData,
      create: {
        schoolId,
        userId: parseInt(userId),
        date: targetDate,
        ...updateData
      }
    });

    logAction({
      schoolId,
      userId: req.user.id,
      action: 'VERIFY_STAFF_ATTENDANCE',
      resource: 'STAFF_ATTENDANCE',
      details: {
        targetUserId: userId,
        date: targetDate.toISOString(),
        status
      },
      ipAddress: req.ip
    });

    res.json({ message: 'Attendance verified successfully', record });

  } catch (error) {
    console.error('Verify attendance error:', error);
    res.status(500).json({ error: 'Failed to verify attendance' });
  }
});

// 8. Bulk Mark Attendance (Admin/Principal)
router.post('/mark-bulk', authenticate, authorize(['admin', 'principal', 'attendance_admin']), async (req, res) => {
  try {
    const { records, date } = req.body;
    // records: [{ userId: 1, status: 'present', notes: '' }, ...]

    if (!records || !Array.isArray(records)) {
      return res.status(400).json({ error: 'Invalid records format' });
    }

    const targetDate = new Date(date || new Date());
    targetDate.setHours(0, 0, 0, 0);

    const schoolId = parseInt(req.schoolId);
    // Get school settings for arrival time fallbacks
    const schoolSettings = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { staffExpectedArrivalTime: true }
    });
    const arrivalTimeStr = schoolSettings?.staffExpectedArrivalTime || '07:00';
    const [hours, minutes] = arrivalTimeStr.split(':');

    await prisma.$transaction(
      records.map(record => {
        const updateData = {
          status: record.status,
          notes: record.notes,
          updatedAt: new Date()
        };

        // If marking present/late but no check-in exists, set a default
        // In bulk mode, we don't necessarily have a check-in time, so we use school default or current time
        // Actually, for simplicity and matching student behavior, we just set the status.
        // If they want to set specific times, they use the Verify individual modal.

        return prisma.staffAttendance.upsert({
          where: {
            schoolId_userId_date: {
              schoolId,
              userId: parseInt(record.userId),
              date: targetDate
            }
          },
          update: updateData,
          create: {
            schoolId,
            userId: parseInt(record.userId),
            date: targetDate,
            ...updateData
          }
        });
      })
    );

    logAction({
      schoolId,
      userId: req.user.id,
      action: 'BULK_MARK_STAFF_ATTENDANCE',
      resource: 'STAFF_ATTENDANCE',
      details: {
        date: targetDate,
        recordCount: records.length
      },
      ipAddress: req.ip
    });

    res.json({ message: 'Bulk attendance marked successfully' });

  } catch (error) {
    console.error('Bulk mark staff attendance error:', error);
    res.status(500).json({ error: 'Failed to bulk mark attendance' });
  }
});

// 9. Download Excel Report (Admin/Principal)
router.get('/download', authenticate, authorize(['admin', 'principal', 'attendance_admin']), async (req, res) => {
  try {
    const schoolId = parseInt(req.schoolId);
    const { startDate, endDate, role, status } = req.query;

    const start = startDate ? new Date(startDate) : new Date();
    start.setHours(0, 0, 0, 0);
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    // 1. Fetch Records
    const records = await prisma.staffAttendance.findMany({
      where: {
        schoolId,
        date: { gte: start, lte: end },
        status: status || undefined,
        user: {
          role: role || { in: ['teacher', 'admin', 'principal', 'accountant', 'staff'] }
        }
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            role: true,
            email: true
          }
        },
        verifier: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: [
        { date: 'desc' },
        { user: { lastName: 'asc' } }
      ]
    });

    // 2. Setup Excel
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Staff Attendance');

    worksheet.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Name', key: 'name', width: 25 },
      { header: 'Role', key: 'role', width: 15 },
      { header: 'Check-In', key: 'checkIn', width: 15 },
      { header: 'Check-Out', key: 'checkOut', width: 15 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Late (min)', key: 'late', width: 10 },
      { header: 'Hours', key: 'hours', width: 10 },
      { header: 'Notes', key: 'notes', width: 30 },
      { header: 'Verified By', key: 'verifiedBy', width: 20 }
    ];

    // Style Header
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // 3. Add Data
    records.forEach(r => {
      const hoursWorked = r.checkInTime && r.checkOutTime
        ? ((new Date(r.checkOutTime) - new Date(r.checkInTime)) / (1000 * 60 * 60)).toFixed(2)
        : null;

      worksheet.addRow({
        date: r.date.toISOString().split('T')[0],
        name: `${r.user.firstName} ${r.user.lastName}`,
        role: r.user.role,
        checkIn: r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString() : '-',
        checkOut: r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString() : '-',
        status: r.status,
        late: r.lateMinutes || 0,
        hours: hoursWorked ? parseFloat(hoursWorked) : '-',
        notes: r.notes || '-',
        verifiedBy: r.verifier ? `${r.verifier.firstName} ${r.verifier.lastName}` : '-'
      });
    });

    // 4. Send Response
    const filename = `Staff_Attendance_${start.toISOString().split('T')[0]}_to_${end.toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();

    // Log Action
    logAction({
      schoolId,
      userId: req.user.id,
      action: 'DOWNLOAD_STAFF_ATTENDANCE',
      resource: 'STAFF_ATTENDANCE',
      details: { startDate, endDate, recordCount: records.length },
      ipAddress: req.ip
    });

  } catch (error) {
    console.error('Download staff attendance error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate Excel report' });
    }
  }
});

module.exports = router;
