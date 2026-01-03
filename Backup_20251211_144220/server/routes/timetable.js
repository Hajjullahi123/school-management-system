const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

// Get Timetable for a Class
router.get('/class/:classId', authenticate, async (req, res) => {
  try {
    const { classId } = req.params;

    const where = { classId: parseInt(classId) };

    // Non-admins can only see published timetables
    if (req.user.role !== 'admin') {
      where.isPublished = true;
    }

    const schedule = await prisma.timetable.findMany({
      where,
      include: {
        subject: true
      },
      orderBy: { startTime: 'asc' }
    });

    res.json(schedule);
  } catch (error) {
    console.error('Get timetable error:', error);
    res.status(500).json({ error: 'Failed to fetch timetable' });
  }
});

// Add Slot (Admin Only)
router.post('/', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { classId, subjectId, dayOfWeek, startTime, endTime, type } = req.body;

    // Basic validation
    if (!classId || !dayOfWeek || !startTime || !endTime || !type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const slot = await prisma.timetable.create({
      data: {
        classId: parseInt(classId),
        subjectId: subjectId ? parseInt(subjectId) : null,
        dayOfWeek,
        startTime,
        endTime,
        type, // 'lesson', 'break'
        isPublished: false // Default to unpublished
      },
      include: {
        subject: true
      }
    });

    res.status(201).json(slot);
  } catch (error) {
    console.error('Create timetable slot error:', error);
    res.status(500).json({ error: 'Failed to create slot' });
  }
});

// Publish/Unpublish Timetable for a Class (Admin Only)
router.patch('/class/:classId/publish', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { classId } = req.params;
    const { isPublished } = req.body;

    // Update all slots for this class
    await prisma.timetable.updateMany({
      where: { classId: parseInt(classId) },
      data: { isPublished: isPublished === true }
    });

    res.json({
      message: isPublished ? 'Timetable published successfully' : 'Timetable unpublished successfully',
      classId: parseInt(classId),
      isPublished
    });
  } catch (error) {
    console.error('Publish timetable error:', error);
    res.status(500).json({ error: 'Failed to update publish status' });
  }
});

// Get Publish Status for a Class
router.get('/class/:classId/status', authenticate, async (req, res) => {
  try {
    const { classId } = req.params;

    const firstSlot = await prisma.timetable.findFirst({
      where: { classId: parseInt(classId) },
      select: { isPublished: true }
    });

    res.json({
      isPublished: firstSlot?.isPublished || false,
      hasSlots: !!firstSlot
    });
  } catch (error) {
    console.error('Get status error:', error);
    res.status(500).json({ error: 'Failed to get status' });
  }
});

// Delete a Slot (Admin Only)
router.delete('/:id', authenticate, authorize(['admin']), async (req, res) => {
  try {
    await prisma.timetable.delete({
      where: { id: parseInt(req.params.id) }
    });
    res.json({ message: 'Slot deleted' });
  } catch (error) {
    console.error('Delete slot error:', error);
    res.status(500).json({ error: 'Failed to delete slot' });
  }
});

module.exports = router;
