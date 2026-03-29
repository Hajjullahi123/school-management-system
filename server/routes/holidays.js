const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

// GET /api/holidays — list all holidays for this school
router.get('/', authenticate, async (req, res) => {
  try {
    const { year, month } = req.query;
    const where = { schoolId: req.schoolId };

    if (year && month) {
      const start = new Date(parseInt(year), parseInt(month) - 1, 1);
      const end = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
      where.date = { gte: start, lte: end };
    } else if (year) {
      const start = new Date(parseInt(year), 0, 1);
      const end = new Date(parseInt(year), 11, 31, 23, 59, 59);
      where.date = { gte: start, lte: end };
    }

    const holidays = await prisma.schoolHoliday.findMany({
      where,
      orderBy: { date: 'asc' }
    });

    res.json(holidays);
  } catch (error) {
    console.error('Error fetching holidays:', error);
    res.status(500).json({ error: 'Failed to fetch holidays' });
  }
});

// GET /api/holidays/check?date=YYYY-MM-DD — check if a date is a holiday
router.get('/check', authenticate, async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.json({ isHoliday: false });

    let checkDate;
    if (date.includes('-')) {
      const [year, month, day] = date.split('-');
      checkDate = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)));
    } else {
      const d = new Date(date);
      checkDate = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    }

    // Fetch school settings for custom weekends
    const school = await prisma.school.findUnique({
      where: { id: req.schoolId },
      select: { weekendDays: true }
    });

    const weekendDaysRaw = school?.weekendDays ?? "0,6";
    const weekendDays = weekendDaysRaw.split(',')
      .map(d => d.trim())
      .filter(d => d !== "")
      .map(d => parseInt(d));
      
    const dayOfWeek = checkDate.getUTCDay();

    if (weekendDays.includes(dayOfWeek)) {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayName = days[dayOfWeek];
      // Also check if there's a DB record overriding/confirming this
      const record = await prisma.schoolHoliday.findFirst({
        where: { schoolId: req.schoolId, date: checkDate }
      });
      return res.json({
        isHoliday: true,
        name: record?.name || dayName,
        type: record?.type || 'weekend',
        description: record?.description || null,
        isAutoWeekend: !record
      });
    }

    // Check DB for a stored holiday on this date
    const holiday = await prisma.schoolHoliday.findFirst({
      where: { schoolId: req.schoolId, date: checkDate }
    });

    if (holiday) {
      res.json({ isHoliday: true, name: holiday.name, type: holiday.type, description: holiday.description });
    } else {
      res.json({ isHoliday: false });
    }
  } catch (error) {
    console.error('Error checking holiday:', error);
    res.status(500).json({ error: 'Failed to check holiday' });
  }
});

// POST /api/holidays — create a holiday (admin/principal only)
router.post('/', authenticate, authorize(['admin', 'principal', 'superadmin']), async (req, res) => {
  try {
    const { date, name, type, description } = req.body;
    if (!date || !name) return res.status(400).json({ error: 'Date and name are required' });

    const [year, month, day] = date.split('-');
    const holidayDate = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)));

    const holiday = await prisma.schoolHoliday.upsert({
      where: { schoolId_date: { schoolId: req.schoolId, date: holidayDate } },
      update: { name, type: type || 'holiday', description },
      create: { schoolId: req.schoolId, date: holidayDate, name, type: type || 'holiday', description }
    });

    res.json(holiday);
  } catch (error) {
    console.error('Error creating holiday:', error);
    res.status(500).json({ error: 'Failed to create holiday' });
  }
});

// POST /api/holidays/bulk-weekends — bulk-add all weekend days in a date range
router.post('/bulk-weekends', authenticate, authorize(['admin', 'principal', 'superadmin']), async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    if (!startDate || !endDate) return res.status(400).json({ error: 'startDate and endDate are required' });

    // Fetch school settings for custom weekends
    const school = await prisma.school.findUnique({
      where: { id: req.schoolId },
      select: { weekendDays: true }
    });

    const weekendDaysRaw = school?.weekendDays ?? "0,6";
    const weekendDays = weekendDaysRaw.split(',')
      .map(d => d.trim())
      .filter(d => d !== "")
      .map(d => parseInt(d));
      
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const [startYear, startMonth, startDay] = startDate.split('-');
    const start = new Date(Date.UTC(parseInt(startYear), parseInt(startMonth) - 1, parseInt(startDay)));

    const [endYear, endMonth, endDay] = endDate.split('-');
    const end = new Date(Date.UTC(parseInt(endYear), parseInt(endMonth) - 1, parseInt(endDay)));

    const weekends = [];

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay();
      if (weekendDays.includes(dayOfWeek)) {
        const dayName = days[dayOfWeek];
        weekends.push({
          schoolId: req.schoolId,
          date: new Date(d.toISOString().split('T')[0] + 'T00:00:00.000Z'),
          name: dayName,
          type: 'weekend',
          description: null
        });
      }
    }

    // Use Promise.all with upsert since SQLite doesn't support createMany with skipDuplicates
    let addedCount = 0;

    await Promise.all(weekends.map(async (weekendDay) => {
      try {
        await prisma.schoolHoliday.upsert({
          where: {
            schoolId_date: {
              schoolId: weekendDay.schoolId,
              date: weekendDay.date
            }
          },
          update: {}, // keep existing
          create: weekendDay
        });
        addedCount++;
      } catch (e) {
        // ignore unique constraint errors if concurrent
      }
    }));

    res.json({ created: addedCount, message: `${addedCount} weekend days added` });
  } catch (error) {
    console.error('Error adding bulk weekends:', error);
    res.status(500).json({ error: 'Failed to add weekends' });
  }
});

// DELETE /api/holidays/:id — delete (admin/principal only)
router.delete('/:id', authenticate, authorize(['admin', 'principal', 'superadmin']), async (req, res) => {
  try {
    const { id } = req.params;
    const holiday = await prisma.schoolHoliday.findFirst({
      where: { id: parseInt(id), schoolId: req.schoolId }
    });
    if (!holiday) return res.status(404).json({ error: 'Holiday not found' });

    await prisma.schoolHoliday.delete({ where: { id: parseInt(id) } });
    res.json({ message: 'Holiday deleted' });
  } catch (error) {
    console.error('Error deleting holiday:', error);
    res.status(500).json({ error: 'Failed to delete holiday' });
  }
});

module.exports = router;
