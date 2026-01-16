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
        subject: true,
        class: true
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }]
    });

    // Add teacher information helper for the frontend
    const scheduleWithTeachers = await Promise.all(schedule.map(async (slot) => {
      if (!slot.subjectId) return { ...slot, teacher: null };

      const assignment = await prisma.teacherAssignment.findFirst({
        where: {
          schoolId: req.schoolId,
          classSubject: {
            classId: slot.classId,
            subjectId: slot.subjectId
          }
        },
        include: { teacher: { select: { id: true, firstName: true, lastName: true } } }
      });

      return { ...slot, teacher: assignment?.teacher || null };
    }));

    res.json(scheduleWithTeachers);
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

    // DUPLICATE CHECK: Is there already a slot at this time for this class?
    const existing = await prisma.timetable.findFirst({
      where: {
        schoolId: req.schoolId,
        classId: parseInt(classId),
        dayOfWeek,
        startTime,
        endTime
      }
    });

    if (existing) {
      return res.status(400).json({ error: 'A slot already exists for this class at this specific time.' });
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

    // 2. Build map of teacher busy times (excluding current class)
    const schoolClassSubjects = await prisma.classSubject.findMany({
      where: { schoolId },
      include: { teacherAssignments: true }
    });

    const teacherMapByCS = {}; // "classId_subjectId" -> teacherId
    schoolClassSubjects.forEach(cs => {
      if (cs.teacherAssignments.length > 0) {
        teacherMapByCS[`${cs.classId}_${cs.subjectId}`] = cs.teacherAssignments[0].teacherId;
      }
    });

    const teacherBusyMap = {}; // "day_time_teacherId" -> true
    allExistingTimetables.forEach(t => {
      if (t.classId === classId) return;
      const tid = teacherMapByCS[`${t.classId}_${t.subjectId}`];
      if (tid) teacherBusyMap[`${t.dayOfWeek}_${t.startTime}_${tid}`] = true;
    });

    // 3. Build pool based on periodsPerWeek
    let pool = [];
    classSubjects.forEach(cs => {
      const periods = cs.periodsPerWeek || 0;
      for (let i = 0; i < periods; i++) {
        pool.push(cs);
      }
    });

    // 4. Allocation with Spreading Logic
    const daySubjectMap = {}; // "day_subjectId" -> count
    const updates = [];
    const conflicts = [];

    for (const slot of slots) {
      let allocated = false;

      // Try candidates from pool with Day-Spreading Priority
      // Priority 1: Subject NOT already on this day for this class
      for (let i = 0; i < pool.length; i++) {
        const candidate = pool[i];
        const teacherId = candidate.teacherAssignments[0]?.teacherId;
        const busyKey = teacherId ? `${slot.dayOfWeek}_${slot.startTime}_${teacherId}` : null;
        const daySubKey = `${slot.dayOfWeek}_${candidate.subjectId}`;

        if ((!busyKey || !teacherBusyMap[busyKey]) && !daySubjectMap[daySubKey]) {
          updates.push({ slotId: slot.id, subjectId: candidate.subjectId });
          if (busyKey) teacherBusyMap[busyKey] = true;
          daySubjectMap[daySubKey] = (daySubjectMap[daySubKey] || 0) + 1;
          pool.splice(i, 1);
          allocated = true;
          break;
        }
      }

      // Priority 2: If Priority 1 fails, try candidates that ARE on this day but teacher is free
      if (!allocated) {
        for (let i = 0; i < pool.length; i++) {
          const candidate = pool[i];
          const teacherId = candidate.teacherAssignments[0]?.teacherId;
          const busyKey = teacherId ? `${slot.dayOfWeek}_${slot.startTime}_${teacherId}` : null;

          if (!busyKey || !teacherBusyMap[busyKey]) {
            updates.push({ slotId: slot.id, subjectId: candidate.subjectId });
            if (busyKey) teacherBusyMap[busyKey] = true;
            const daySubKey = `${slot.dayOfWeek}_${candidate.subjectId}`;
            daySubjectMap[daySubKey] = (daySubjectMap[daySubKey] || 0) + 1;
            pool.splice(i, 1);
            allocated = true;
            break;
          }
        }
      }

      // Priority 3: Fallback to any class subject if pool exhausted but slots remain
      if (!allocated) {
        for (const candidate of classSubjects) {
          const teacherId = candidate.teacherAssignments[0]?.teacherId;
          const busyKey = teacherId ? `${slot.dayOfWeek}_${slot.startTime}_${teacherId}` : null;

          if (!busyKey || !teacherBusyMap[busyKey]) {
            updates.push({ slotId: slot.id, subjectId: candidate.subjectId });
            if (busyKey) teacherBusyMap[busyKey] = true;
            allocated = true;
            break;
          }
        }
      }

      if (!allocated) {
        conflicts.push({
          day: slot.dayOfWeek,
          time: `${slot.startTime} - ${slot.endTime}`,
          reason: 'Teacher conflict: No subject teacher is available for this slot.'
        });
      }
    }

    // 5. Apply updates
    await prisma.$transaction(
      updates.map(u => prisma.timetable.update({
        where: { id: u.slotId },
        data: { subjectId: u.subjectId }
      }))
    );

    res.json({
      message: conflicts.length > 0
        ? `Generated with ${conflicts.length} conflicts.`
        : 'Timetable generated successfully!',
      conflicts,
      successCount: updates.length
    });

  } catch (error) {
    console.error('Generation error:', error);
    res.status(500).json({ error: 'Generation failed: ' + error.message });
  }
});

// Bulk Sync Timetable Structure (Admin Only)
router.post('/sync', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { sourceClassId, targetClassIds } = req.body;

    if (!sourceClassId || !targetClassIds || !Array.isArray(targetClassIds)) {
      return res.status(400).json({ error: 'Missing sourceClassId or targetClassIds array' });
    }

    // 1. Fetch source slots
    const sourceSlots = await prisma.timetable.findMany({
      where: { classId: parseInt(sourceClassId), schoolId: req.schoolId }
    });

    if (sourceSlots.length === 0) {
      return res.status(400).json({ error: 'Source class has no timetable slots to copy.' });
    }

    // 2. Perform sync for each target class
    for (const classId of targetClassIds) {
      const targetId = parseInt(classId);
      if (targetId === parseInt(sourceClassId)) continue;

      // Clear existing timetable for target class
      await prisma.timetable.deleteMany({
        where: { classId: targetId, schoolId: req.schoolId }
      });

      // Create new slots (Structure only - subjectId set to null)
      await prisma.timetable.createMany({
        data: sourceSlots.map(slot => ({
          schoolId: req.schoolId,
          classId: targetId,
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
          type: slot.type,
          subjectId: null,
          isPublished: false
        }))
      });
    }

    res.json({ message: `Timetable structure synced to ${targetClassIds.length} classes successfully.` });

    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'SYNC_TIMETABLE',
      resource: 'TIMETABLE',
      details: {
        sourceClassId: parseInt(sourceClassId),
        targetCount: targetClassIds.length
      },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ error: 'Synchronization failed: ' + error.message });
  }
});

// Sync slots from one day to selected other days within a class (Admin Only)
router.post('/sync-days', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { classId, sourceDay, targetDays } = req.body;

    if (!classId || !sourceDay || !targetDays || !Array.isArray(targetDays)) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // 1. Fetch source slots
    const sourceSlots = await prisma.timetable.findMany({
      where: {
        classId: parseInt(classId),
        dayOfWeek: sourceDay,
        schoolId: req.schoolId
      }
    });

    if (sourceSlots.length === 0) {
      return res.status(400).json({ error: `Source day (${sourceDay}) has no slots to copy.` });
    }

    // 2. Perform sync for each target day
    for (const targetDay of targetDays) {
      if (targetDay === sourceDay) continue;

      // Clear existing slots for that day in that class
      await prisma.timetable.deleteMany({
        where: { classId: parseInt(classId), dayOfWeek: targetDay, schoolId: req.schoolId }
      });

      // Create new slots
      await prisma.timetable.createMany({
        data: sourceSlots.map(slot => ({
          schoolId: req.schoolId,
          classId: parseInt(classId),
          dayOfWeek: targetDay,
          startTime: slot.startTime,
          endTime: slot.endTime,
          type: slot.type,
          subjectId: null, // Keep subjects empty for manual/gen later
          isPublished: slot.isPublished
        }))
      });
    }

    res.json({ message: `Slots from ${sourceDay} copied to ${targetDays.length} days successfully.` });

    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'SYNC_TIMETABLE_DAYS',
      resource: 'TIMETABLE',
      details: {
        classId: parseInt(classId),
        sourceDay,
        targetDays
      },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Day sync error:', error);
    res.status(500).json({ error: 'Day synchronization failed' });
  }
});

module.exports = router;
