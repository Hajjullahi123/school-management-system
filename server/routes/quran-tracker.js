const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/audit');

// Get all targets for a class
router.get('/targets/:classId', authenticate, async (req, res) => {
  try {
    const { classId } = req.params;
    const { sessionId, termId } = req.query;

    const where = {
      schoolId: req.schoolId,
      classId: parseInt(classId)
    };

    if (sessionId) where.academicSessionId = parseInt(sessionId);
    if (termId) where.termId = parseInt(termId);

    const targets = await prisma.quranTarget.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    res.json(targets);
  } catch (error) {
    console.error('Error fetching targets:', error);
    res.status(500).json({ error: 'Failed to fetch targets' });
  }
});

// Create a target (Admin or Teacher)
router.post('/targets', authenticate, authorize(['admin', 'teacher']), async (req, res) => {
  try {
    const { classId, sessionId, termId, targetType, period, juzStart, juzEnd, surahStart, surahEnd, ayahStart, ayahEnd, pagesCount, description, startDate, endDate } = req.body;

    if (!classId || !sessionId || !termId || !targetType || !period || !startDate || !endDate) {
      return res.status(400).json({ error: 'Missing required configuration fields' });
    }

    const target = await prisma.quranTarget.create({
      data: {
        schoolId: req.schoolId,
        classId: parseInt(classId),
        academicSessionId: parseInt(sessionId),
        termId: parseInt(termId),
        targetType,
        period,
        juzStart: juzStart ? parseInt(juzStart) : null,
        juzEnd: juzEnd ? parseInt(juzEnd) : null,
        surahStart,
        surahEnd,
        ayahStart: ayahStart ? parseInt(ayahStart) : null,
        ayahEnd: ayahEnd ? parseInt(ayahEnd) : null,
        pagesCount: pagesCount ? parseInt(pagesCount) : null,
        description,
        startDate: new Date(startDate),
        endDate: new Date(endDate)
      }
    });

    res.status(201).json(target);

    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'CREATE',
      resource: 'QURAN_TARGET',
      details: { targetId: target.id, classId },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Error creating target:', error);
    res.status(500).json({ error: 'Failed to create target' });
  }
});

// Delete a target
router.delete('/targets/:id', authenticate, authorize(['admin', 'teacher']), async (req, res) => {
  try {
    await prisma.quranTarget.delete({
      where: {
        id: parseInt(req.params.id),
        schoolId: req.schoolId
      }
    });
    res.json({ message: 'Target deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete target' });
  }
});

// Get records for a student
router.get('/records/:studentId', authenticate, async (req, res) => {
  try {
    const { studentId } = req.params;

    const records = await prisma.quranRecord.findMany({
      where: {
        schoolId: req.schoolId,
        studentId: parseInt(studentId)
      },
      include: {
        teacher: {
          select: { firstName: true, lastName: true }
        }
      },
      orderBy: { date: 'desc' }
    });

    res.json(records);
  } catch (error) {
    console.error('Error fetching records:', error);
    res.status(500).json({ error: 'Failed to fetch records' });
  }
});

// Add a progress record (Teacher)
router.post('/records', authenticate, authorize(['admin', 'teacher']), async (req, res) => {
  try {
    const { studentId, date, type, juz, surah, ayahStart, ayahEnd, pages, status, comments } = req.body;

    if (!studentId || !date || !type || !status) {
      return res.status(400).json({ error: 'Student, date, type and status are required' });
    }

    const record = await prisma.quranRecord.create({
      data: {
        schoolId: req.schoolId,
        studentId: parseInt(studentId),
        teacherId: req.user.id,
        date: new Date(date),
        type,
        juz: juz ? parseInt(juz) : null,
        surah,
        ayahStart: ayahStart ? parseInt(ayahStart) : null,
        ayahEnd: ayahEnd ? parseInt(ayahEnd) : null,
        pages: pages ? parseFloat(pages) : null,
        status,
        comments
      }
    });

    res.status(201).json(record);

    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'CREATE',
      resource: 'QURAN_RECORD',
      details: { recordId: record.id, studentId },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Error creating record:', error);
    res.status(500).json({ error: 'Failed to create record' });
  }
});

// Get class progress summary
router.get('/class-summary/:classId', authenticate, async (req, res) => {
  try {
    const { classId } = req.params;
    const { startDate, endDate } = req.query;

    const students = await prisma.student.findMany({
      where: {
        schoolId: req.schoolId,
        classId: parseInt(classId),
        status: 'active'
      },
      include: {
        user: {
          select: { firstName: true, lastName: true }
        },
        quranRecords: {
          where: {
            date: {
              gte: startDate ? new Date(startDate) : undefined,
              lte: endDate ? new Date(endDate) : undefined
            }
          },
          orderBy: { date: 'desc' }
        }
      }
    });

    res.json(students);
  } catch (error) {
    console.error('Error fetching class summary:', error);
    res.status(500).json({ error: 'Failed to fetch class summary' });
  }
});

module.exports = router;
