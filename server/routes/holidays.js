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
      // if date comes in as YYYY-MM-DD
      const [year, month, day] = date.split('-');
      checkDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 0, 0, 0);
    } else {
      checkDate = new Date(date);
      checkDate.setHours(0, 0, 0, 0);
    }

    // Check if Saturday or Sunday (auto weekend detection)
    const dayOfWeek = checkDate.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      const dayName = dayOfWeek === 0 ? 'Sunday' : 'Saturday';
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
    const holidayDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 0, 0, 0);

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

// POST /api/holidays/bulk-weekends — bulk-add all Sat/Sun in a date range
router.post('/bulk-weekends', authenticate, authorize(['admin', 'principal', 'superadmin']), async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    if (!startDate || !endDate) return res.status(400).json({ error: 'startDate and endDate are required' });

    const [startYear, startMonth, startDay] = startDate.split('-');
    const start = new Date(parseInt(startYear), parseInt(startMonth) - 1, parseInt(startDay), 0, 0, 0);

    const [endYear, endMonth, endDay] = endDate.split('-');
    const end = new Date(parseInt(endYear), parseInt(endMonth) - 1, parseInt(endDay), 0, 0, 0);

    const weekends = [];

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (d.getDay() === 0 || d.getDay() === 6) {
        const dayName = d.getDay() === 0 ? 'Sunday' : 'Saturday';
        weekends.push({
          schoolId: req.schoolId,
          date: new Date(d.setHours(0, 0, 0, 0)),
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
