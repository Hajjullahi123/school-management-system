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

// Reset Timetable for a Class (Admin Only)
router.delete('/reset/class/:classId', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const classId = parseInt(req.params.classId);
    await prisma.timetable.deleteMany({
      where: { classId, schoolId: req.schoolId }
    });

    res.json({ message: 'Class timetable reset successfully' });

    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'RESET_CLASS_TIMETABLE',
      resource: 'TIMETABLE',
      details: { classId },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Reset class timetable error:', error);
    res.status(500).json({ error: 'Failed to reset class timetable' });
  }
});

// Reset All Timetables for the School (Admin Only)
router.delete('/reset/all', authenticate, authorize(['admin']), async (req, res) => {
  try {
    await prisma.timetable.deleteMany({
      where: { schoolId: req.schoolId }
    });

    res.json({ message: 'All timetables reset successfully' });

    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'RESET_ALL_TIMETABLES',
      resource: 'TIMETABLE',
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Reset all timetables error:', error);
    res.status(500).json({ error: 'Failed to reset all timetables' });
  }
});

// Generate All Timetables for the entire school (Admin Only)
router.post('/generate-all', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const schoolId = req.schoolId;

    // 1. Fetch EVERYTHING needed
    const [allClasses, allSlots, allClassSubjects] = await Promise.all([
      prisma.class.findMany({ where: { schoolId } }),
      prisma.timetable.findMany({
        where: { schoolId, type: 'lesson' },
        orderBy: [{ classId: 'asc' }, { dayOfWeek: 'asc' }, { startTime: 'asc' }]
      }),
      prisma.classSubject.findMany({
        where: { schoolId },
        include: { subject: true, teacherAssignments: { include: { teacher: true } } }
      })
    ]);

    // 2. Build helper maps
    const teacherMapByCS = {}; // "classId_subjectId" -> teacherId
    const teacherNameMap = {}; // teacherId -> "Name"
    allClassSubjects.forEach(cs => {
      if (cs.teacherAssignments.length > 0) {
        const t = cs.teacherAssignments[0].teacher;
        teacherMapByCS[`${cs.classId}_${cs.subjectId}`] = t.id;
        teacherNameMap[t.id] = `${t.firstName} ${t.lastName}`;
      }
    });

    const teacherBusyMap = {}; // "day_time_teacherId" -> "ClassName"

    // Preliminary: Pre-load busy map with already fixed subjects (manual/previously generated)
    // For simplicity, we assume we are filling empty slots or overwriting.
    // If we want to strictly respect manual slots, we'd fetch them here.
    // Fixed: The user usually wants a fresh start. If not, we still need to know where teachers are.
    allSlots.forEach(s => {
      if (s.subjectId) {
        const tid = teacherMapByCS[`${s.classId}_${s.subjectId}`];
        if (tid) {
          const cls = allClasses.find(c => c.id === s.classId);
          teacherBusyMap[`${s.dayOfWeek}_${s.startTime}_${tid}`] = `${cls.name} ${cls.arm || ''}`;
        }
      }
    });
    const updates = [];
    const allConflicts = [];

    // Group items by class
    const subjectsByClass = {};
    const slotsByClass = {};

    allClassSubjects.forEach(cs => {
      if (!subjectsByClass[cs.classId]) subjectsByClass[cs.classId] = [];
      subjectsByClass[cs.classId].push(cs);
    });

    allSlots.forEach(slot => {
      if (!slotsByClass[slot.classId]) slotsByClass[slot.classId] = [];
      slotsByClass[slot.classId].push(slot);
    });

    // 3. Process each class (Sequential generation with global busy map)
    for (const cls of allClasses) {
      const classId = cls.id;
      const classSlots = slotsByClass[classId] || [];
      const classSubjects = subjectsByClass[classId] || [];

      if (classSlots.length === 0) continue;

      // Build pool for this class
      let pool = [];
      classSubjects.forEach(cs => {
        const periods = cs.periodsPerWeek || 0;
        for (let i = 0; i < periods; i++) {
          pool.push(cs);
        }
      });

      const daySubjectMap = {}; // "day_subjectId" -> count for this class

      for (const slot of classSlots) {
        let allocated = false;
        const dayOfWeek = slot.dayOfWeek;
        const startTime = slot.startTime;

        // Priority 1: Subject NOT already on this day, Teacher FREE
        for (let i = 0; i < pool.length; i++) {
          const candidate = pool[i];
          const teacherId = teacherMapByCS[`${classId}_${candidate.subjectId}`];
          const busyKey = teacherId ? `${dayOfWeek}_${startTime}_${teacherId}` : null;
          const daySubKey = `${dayOfWeek}_${candidate.subjectId}`;

          if ((!busyKey || !teacherBusyMap[busyKey]) && !daySubjectMap[daySubKey]) {
            updates.push({ slotId: slot.id, subjectId: candidate.subjectId });
            if (busyKey) teacherBusyMap[busyKey] = `${cls.name} ${cls.arm || ''}`;
            daySubjectMap[daySubKey] = (daySubjectMap[daySubKey] || 0) + 1;
            pool.splice(i, 1);
            allocated = true;
            break;
          }
        }

        // Priority 2: Teacher FREE (even if subject exists on this day)
        if (!allocated) {
          for (let i = 0; i < pool.length; i++) {
            const candidate = pool[i];
            const teacherId = teacherMapByCS[`${classId}_${candidate.subjectId}`];
            const busyKey = teacherId ? `${dayOfWeek}_${startTime}_${teacherId}` : null;

            if (!busyKey || !teacherBusyMap[busyKey]) {
              updates.push({ slotId: slot.id, subjectId: candidate.subjectId });
              if (busyKey) teacherBusyMap[busyKey] = `${cls.name} ${cls.arm || ''}`;
              const daySubKey = `${dayOfWeek}_${candidate.subjectId}`;
              daySubjectMap[daySubKey] = (daySubjectMap[daySubKey] || 0) + 1;
              pool.splice(i, 1);
              allocated = true;
              break;
            }
          }
        }

        if (!allocated && pool.length > 0) {
          // AUTO-DETECTION & CORRECTION LOGIC
          // Try to "Swap & Resolve" - Find a conflicting assignment and move it
          let resolvedBySwap = false;

          for (let i = 0; i < pool.length; i++) {
            const candidate = pool[i];
            const teacherId = teacherMapByCS[`${classId}_${candidate.subjectId}`];
            if (!teacherId) continue;

            const busyKey = `${dayOfWeek}_${startTime}_${teacherId}`;
            const busyClassStr = teacherBusyMap[busyKey]; // The class that is currently blocking us

            if (busyClassStr) {
              const busyClass = allClasses.find(c => `${c.name} ${c.arm || ''}` === busyClassStr);
              if (busyClass) {
                const busyClassSlots = slotsByClass[busyClass.id];
                // Look for an EXISTING assigned slot for this teacher in that class that we can SWAP
                // OR an EMPTY slot in that class where this teacher would be free
                const swapTarget = busyClassSlots.find(s => {
                  const currentSubjectIdInOtherSlot = updates.find(u => u.slotId === s.id)?.subjectId || s.subjectId;
                  // Is the teacher FREE in this other slot's time?
                  const sBusyKey = `${s.dayOfWeek}_${s.startTime}_${teacherId}`;
                  const isTeacherFreeInOtherTime = !teacherBusyMap[sBusyKey] || teacherBusyMap[sBusyKey] === busyClassStr;

                  // CAN THE TEACHER OF THE OTHER SLOT MOVE TO OUR TIME?
                  const otherTeacherId = currentSubjectIdInOtherSlot ? teacherMapByCS[`${busyClass.id}_${currentSubjectIdInOtherSlot}`] : null;
                  const otherTeacherFreeInMyTime = !otherTeacherId || !teacherBusyMap[`${dayOfWeek}_${startTime}_${otherTeacherId}`];

                  return isTeacherFreeInOtherTime && otherTeacherFreeInMyTime && s.type === 'lesson';
                });

                if (swapTarget) {
                  // EXECUTE SWAP
                  const oldUpdate = updates.find(u => u.slotId === swapTarget.id);
                  const currentOtherSubjectId = oldUpdate ? oldUpdate.subjectId : swapTarget.subjectId;

                  const otherTeacherId = currentOtherSubjectId ? teacherMapByCS[`${busyClass.id}_${currentOtherSubjectId}`] : null;

                  // 1. Move the busy teacher to the other slot
                  if (oldUpdate) {
                    oldUpdate.subjectId = candidate.subjectId;
                  } else {
                    updates.push({ slotId: swapTarget.id, subjectId: candidate.subjectId });
                  }

                  // 2. Update busy maps
                  delete teacherBusyMap[busyKey];
                  teacherBusyMap[`${swapTarget.dayOfWeek}_${swapTarget.startTime}_${teacherId}`] = busyClassStr;
                  if (otherTeacherId) {
                    delete teacherBusyMap[`${swapTarget.dayOfWeek}_${swapTarget.startTime}_${otherTeacherId}`];
                    teacherBusyMap[`${dayOfWeek}_${startTime}_${otherTeacherId}`] = busyClassStr;
                  }

                  // 3. Fill the current slot in OUR class
                  updates.push({ slotId: slot.id, subjectId: currentOtherSubjectId || candidate.subjectId }); // This is a bit complex, let's just use the current slot for our candidate
                  // Re-fill our slot with candidate
                  updates.push({ slotId: slot.id, subjectId: candidate.subjectId });
                  teacherBusyMap[busyKey] = `${cls.name} ${cls.arm || ''}`;

                  daySubjectMap[`${dayOfWeek}_${candidate.subjectId}`] = (daySubjectMap[`${dayOfWeek}_${candidate.subjectId}`] || 0) + 1;
                  pool.splice(i, 1);
                  allocated = true;
                  resolvedBySwap = true;
                  break;
                }
              }
            }
          }
        }

        if (!allocated && pool.length > 0) {
          const involvedDetails = [...new Set(pool.map(p => {
            const tid = teacherMapByCS[`${classId}_${p.subjectId}`];
            const busyLocation = tid ? teacherBusyMap[`${dayOfWeek}_${startTime}_${tid}`] : null;
            const tName = tid ? teacherNameMap[tid] : 'Unknown Teacher';
            return tid ? `${p.subject.name} (${tName} is busy in ${busyLocation || 'another slot'})` : `${p.subject.name} (No teacher assigned)`;
          }))];

          allConflicts.push({
            class: `${cls.name} ${cls.arm || ''}`,
            day: dayOfWeek,
            time: `${slot.startTime} - ${slot.endTime}`,
            reason: `Blocked Requirements: ${involvedDetails.join(', ')}`,
            solution: `AUTO-CORRECTION FAILED: No valid swap path found. Consider adding more teachers or increasing the number of available periods.`
          });
        }
      }
    }

    // 4. Apply all updates
    await prisma.$transaction(
      updates.map(u => prisma.timetable.update({
        where: { id: u.slotId },
        data: { subjectId: u.subjectId }
      }))
    );

    res.json({
      message: allConflicts.length > 0
        ? `Generated with ${allConflicts.length} school-wide conflicts.`
        : 'Whole-school timetable generated successfully!',
      totalClasses: allClasses.length,
      successCount: updates.length,
      conflicts: allConflicts
    });

  } catch (error) {
    console.error('All-generation error:', error);
    res.status(500).json({ error: 'Generation failed: ' + error.message });
  }
});

// Clear Subjects for a Class (Admin Only)
router.patch('/reset/class/:classId/clear-subjects', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const classId = parseInt(req.params.classId);

    await prisma.timetable.updateMany({
      where: {
        classId,
        schoolId: req.schoolId,
        type: 'lesson'
      },
      data: {
        subjectId: null
      }
    });

    res.json({ message: 'All subjects cleared from this class timetable' });

    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'CLEAR_TIMETABLE_SUBJECTS',
      resource: 'TIMETABLE',
      details: { classId },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Clear subjects error:', error);
    res.status(500).json({ error: 'Failed to clear subjects' });
  }
});

// Reset Timetable for a Specific Day in a Class (Admin Only)
router.delete('/reset/class/:classId/day/:day', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const classId = parseInt(req.params.classId);
    const { day } = req.params;

    await prisma.timetable.deleteMany({
      where: {
        classId,
        dayOfWeek: day,
        schoolId: req.schoolId
      }
    });

    res.json({ message: `Timetable for ${day} reset successfully` });

    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'RESET_DAY_TIMETABLE',
      resource: 'TIMETABLE',
      details: { classId, day },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Reset day timetable error:', error);
    res.status(500).json({ error: 'Failed to reset day timetable' });
  }
});

module.exports = router;
