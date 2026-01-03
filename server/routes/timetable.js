const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/audit');

// Get Timetable for a Class
router.get('/class/:classId', authenticate, async (req, res) => {
  try {
    const { classId } = req.params;
    const requestedClassId = parseInt(classId);

    // RESTRICTION: Students can ONLY see their own class timetable
    if (req.user.role === 'student') {
      const studentProfile = await prisma.student.findUnique({
        where: { userId: req.user.id }
      });

      if (!studentProfile || studentProfile.classId !== requestedClassId) {
        return res.status(403).json({ error: 'Access denied. You can only view your own class timetable.' });
      }
    }

    const where = {
      classId: requestedClassId,
      schoolId: req.schoolId
    };

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
        schoolId: req.schoolId,
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

    // Log the action
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'CREATE',
      resource: 'TIMETABLE_SLOT',
      details: {
        slotId: slot.id,
        classId: parseInt(classId),
        dayOfWeek,
        startTime,
        endTime
      },
      ipAddress: req.ip
    });
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

    // Update all slots for this class in THIS school
    await prisma.timetable.updateMany({
      where: {
        classId: parseInt(classId),
        schoolId: req.schoolId
      },
      data: { isPublished: isPublished === true }
    });
    res.json({
      message: isPublished ? 'Timetable published successfully' : 'Timetable unpublished successfully',
      classId: parseInt(classId),
      isPublished
    });

    // Log the action
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: isPublished ? 'PUBLISH_TIMETABLE' : 'UNPUBLISH_TIMETABLE',
      resource: 'TIMETABLE',
      details: {
        classId: parseInt(classId)
      },
      ipAddress: req.ip
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
      where: {
        classId: parseInt(classId),
        schoolId: req.schoolId
      },
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
      where: {
        id: parseInt(req.params.id),
        schoolId: req.schoolId
      }
    });
    res.json({ message: 'Slot deleted' });

    // Log the deletion
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'DELETE',
      resource: 'TIMETABLE_SLOT',
      details: {
        slotId: parseInt(req.params.id)
      },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Delete slot error:', error);
    res.status(500).json({ error: 'Failed to delete slot' });
  }
});

module.exports = router;
