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

// Update a Slot (Admin Only)
router.patch('/:id', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { dayOfWeek, startTime, endTime, type, subjectId } = req.body;

    const slot = await prisma.timetable.update({
      where: {
        id: parseInt(req.params.id),
        schoolId: req.schoolId
      },
      data: {
        dayOfWeek,
        startTime,
        endTime,
        type,
        subjectId: subjectId ? parseInt(subjectId) : null
      },
      include: {
        subject: true
      }
    });

    res.json(slot);

    // Log the update
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'UPDATE',
      resource: 'TIMETABLE_SLOT',
      details: {
        slotId: slot.id,
        classId: slot.classId,
        dayOfWeek,
        startTime,
        endTime
      },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Update timetable slot error:', error);
    res.status(500).json({ error: 'Failed to update slot' });
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

// Generate Intelligent Timetable (Admin Only)
router.post('/generate/:classId', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const classId = parseInt(req.params.classId);
    const schoolId = req.schoolId;

    // 1. Fetch slots, assigned subjects (with teachers), and current school schedule
    const [slots, classSubjects, allExistingTimetables] = await Promise.all([
      prisma.timetable.findMany({
        where: { schoolId, classId, type: 'lesson' },
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }]
      }),
      prisma.classSubject.findMany({
        where: { schoolId, classId },
        include: { subject: true, teacherAssignments: { include: { teacher: true } } }
      }),
      prisma.timetable.findMany({
        where: { schoolId, subjectId: { not: null } },
        include: { subject: true }
      })
    ]);

    if (slots.length === 0) return res.status(400).json({ error: 'No lesson slots defined for this class. Please add slots first.' });

    // Only work with subjects that have teachers assigned
    const assignableSubjects = classSubjects.filter(cs => cs.teacherAssignments.length > 0);
    if (assignableSubjects.length === 0) {
      return res.status(400).json({ error: 'No subjects with assigned teachers found for this class. Please assign teachers to subjects first.' });
    }

    // 2. Build a Map of which teacher teaches what per class across the school
    const schoolClassSubjects = await prisma.classSubject.findMany({
      where: { schoolId },
      include: { teacherAssignments: true }
    });

    const teacherMap = {}; // "classId_subjectId" -> teacherId
    schoolClassSubjects.forEach(cs => {
      if (cs.teacherAssignments.length > 0) {
        teacherMap[`${cs.classId}_${cs.subjectId}`] = cs.teacherAssignments[0].teacherId;
      }
    });

    // 3. Map of Teacher Busy Times across ALL classes
    const teacherBusyMap = {}; // "day_time_teacherId" -> true
    allExistingTimetables.forEach(t => {
      // Skip current class's entries as we are re-generating them
      if (t.classId === classId) return;

      const tid = teacherMap[`${t.classId}_${t.subjectId}`];
      if (tid) {
        teacherBusyMap[`${t.dayOfWeek}_${t.startTime}_${tid}`] = true;
      }
    });

    // 4. Build a pool of subjects to distribute
    // We'll aim for balanced distribution
    let pool = [];
    const periodsPerSubject = Math.ceil(slots.length / assignableSubjects.length);
    assignableSubjects.forEach(cs => {
      for (let i = 0; i < periodsPerSubject; i++) {
        pool.push(cs);
      }
    });

    // Randomize pool for natural distribution
    pool = pool.sort(() => Math.random() - 0.5);

    const updates = [];
    const conflicts = [];

    // 5. Intelligent Allocation
    for (const slot of slots) {
      let allocated = false;

      // Try each subject in the pool (they are randomized)
      for (let i = 0; i < pool.length; i++) {
        const subject = pool[i];
        const teacherId = subject.teacherAssignments[0].teacherId;
        const busyKey = `${slot.dayOfWeek}_${slot.startTime}_${teacherId}`;

        if (!teacherBusyMap[busyKey]) {
          // Free!
          updates.push({ slotId: slot.id, subjectId: subject.subjectId });
          teacherBusyMap[busyKey] = true; // Mark as busy for this generation run too
          pool.splice(i, 1); // Remove from pool
          allocated = true;
          break;
        }
      }

      // If still not allocated (maybe pool was restricted), try ANY assignable subject as fallback
      if (!allocated) {
        for (const subject of assignableSubjects) {
          const teacherId = subject.teacherAssignments[0].teacherId;
          const busyKey = `${slot.dayOfWeek}_${slot.startTime}_${teacherId}`;

          if (!teacherBusyMap[busyKey]) {
            updates.push({ slotId: slot.id, subjectId: subject.subjectId });
            teacherBusyMap[busyKey] = true;
            allocated = true;
            break;
          }
        }
      }

      if (!allocated) {
        conflicts.push({
          day: slot.dayOfWeek,
          time: `${slot.startTime} - ${slot.endTime}`,
          reason: 'Conflict: No teacher for assigned subjects is available at this time.'
        });
      }
    }

    // 6. Apply Updates
    await Promise.all(updates.map(upd =>
      prisma.timetable.update({
        where: { id: upd.slotId },
        data: { subjectId: upd.subjectId }
      })
    ));

    // 7. Log and Return Result
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'GENERATE_TIMETABLE',
      resource: 'TIMETABLE',
      details: {
        classId,
        slotsFilled: updates.length,
        conflictsCount: conflicts.length
      },
      ipAddress: req.ip
    });

    res.json({
      message: conflicts.length > 0
        ? `Generated with ${conflicts.length} conflicts. Please resolve manually.`
        : 'Timetable generated successfully without clashes!',
      conflicts,
      successCount: updates.length
    });

  } catch (error) {
    console.error('Generation error:', error);
    res.status(500).json({ error: 'Failed to generate timetable' });
  }
});

module.exports = router;
