const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/audit');

// Default initial section presets to seed if a school has none
const DEFAULT_SECTION_PRESETS = [
  { name: 'Primary', code: 'PRI', assignment1Weight: 10, assignment2Weight: 10, test1Weight: 10, test2Weight: 10, examWeight: 60 },
  { name: 'JSS', code: 'JSS', assignment1Weight: 5, assignment2Weight: 5, test1Weight: 10, test2Weight: 10, examWeight: 70 },
  { name: 'SSS', code: 'SSS', assignment1Weight: 5, assignment2Weight: 5, test1Weight: 10, test2Weight: 10, examWeight: 70 }
];

// Ensure default sections exist for school if missing
async function ensureDefaultSections(schoolId) {
  const count = await prisma.section.count({ where: { schoolId } });
  if (count === 0) {
    for (const preset of DEFAULT_SECTION_PRESETS) {
      await prisma.section.create({
        data: {
          schoolId,
          ...preset
        }
      });
    }
  }
}

// Auto-link unassigned classes (sectionId == null) to matching section by name/code prefix
async function linkClassesToSections(schoolId) {
  try {
    const unlinkedClasses = await prisma.class.findMany({
      where: { schoolId, sectionId: null }
    });

    if (unlinkedClasses.length > 0) {
      const sections = await prisma.section.findMany({
        where: { schoolId }
      });

      for (const cls of unlinkedClasses) {
        const clsNameLower = cls.name.trim().toLowerCase();
        const matchedSec = sections.find(s => {
          const secNameLower = s.name.trim().toLowerCase();
          const secCodeLower = s.code ? s.code.trim().toLowerCase() : '';
          return clsNameLower.startsWith(secNameLower) || 
                 (secCodeLower && clsNameLower.startsWith(secCodeLower)) ||
                 clsNameLower.includes(secNameLower);
        });

        if (matchedSec) {
          await prisma.class.update({
            where: { id: cls.id },
            data: { sectionId: matchedSec.id }
          }).catch(() => {});
        }
      }
    }
  } catch (err) {
    console.error('[Sections] Error auto-linking classes:', err);
  }
}

// GET /api/sections - List all sections for the school
router.get('/', authenticate, async (req, res) => {
  try {
    const schoolIdInt = parseInt(req.schoolId);
    await ensureDefaultSections(schoolIdInt);
    await linkClassesToSections(schoolIdInt);

    const where = { schoolId: schoolIdInt };
    if (req.assignedSectionIds && req.assignedSectionIds.length > 0) {
      where.id = { in: req.assignedSectionIds };
    }

    const sections = await prisma.section.findMany({
      where,
      include: {
        classes: {
          select: { id: true, name: true, arm: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    res.json(sections);
  } catch (error) {
    console.error('Error fetching sections:', error);
    res.status(500).json({ error: 'Failed to fetch sections' });
  }
});

// POST /api/sections - Create a new dynamic custom section (e.g. SAT & SUN)
router.post('/', authenticate, authorize(['admin', 'principal', 'superadmin']), async (req, res) => {
  try {
    const schoolIdInt = parseInt(req.schoolId);
    const {
      name,
      code,
      assignment1Weight = 5,
      assignment2Weight = 5,
      test1Weight = 10,
      test2Weight = 10,
      examWeight = 70,
      expectedArrivalTime = '07:30',
      lateCutoffTime = '08:15',
      lateGraceMinutes = 15,
      attendanceDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Section name is required' });
    }

    const a1 = parseInt(assignment1Weight) || 0;
    const a2 = parseInt(assignment2Weight) || 0;
    const t1 = parseInt(test1Weight) || 0;
    const t2 = parseInt(test2Weight) || 0;
    const ex = parseInt(examWeight) || 0;

    const total = a1 + a2 + t1 + t2 + ex;
    if (total !== 100) {
      return res.status(400).json({ error: `Total assessment weights must equal 100%. Current sum: ${total}%` });
    }

    const daysStr = Array.isArray(attendanceDays) ? JSON.stringify(attendanceDays) : (typeof attendanceDays === 'string' ? attendanceDays : '["Monday","Tuesday","Wednesday","Thursday","Friday"]');

    const section = await prisma.section.create({
      data: {
        schoolId: schoolIdInt,
        name: name.trim(),
        code: code ? code.trim().toUpperCase() : null,
        assignment1Weight: a1,
        assignment2Weight: a2,
        test1Weight: t1,
        test2Weight: t2,
        examWeight: ex,
        expectedArrivalTime: expectedArrivalTime || '07:30',
        lateCutoffTime: lateCutoffTime || '08:15',
        lateGraceMinutes: parseInt(lateGraceMinutes) || 15,
        attendanceDays: daysStr
      }
    });

    res.json({ message: 'Section created successfully', section });

    logAction({
      schoolId: schoolIdInt,
      userId: req.user.id,
      action: 'CREATE',
      resource: 'SECTION',
      details: { sectionId: section.id, name: section.name },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Error creating section:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'A section with this name already exists in your school' });
    }
    res.status(500).json({ error: 'Failed to create section' });
  }
});

// PUT /api/sections/:id - Update section weights, attendance rules, or name
router.put('/:id', authenticate, authorize(['admin', 'sub_admin', 'principal', 'superadmin']), async (req, res) => {
  try {
    const { id } = req.params;
    const schoolIdInt = parseInt(req.schoolId);
    const {
      name,
      code,
      assignment1Weight,
      assignment2Weight,
      test1Weight,
      test2Weight,
      examWeight,
      expectedArrivalTime,
      lateCutoffTime,
      lateGraceMinutes,
      attendanceDays
    } = req.body;

    const sectionId = parseInt(id);

    // Sub-Admin Section Scope Validation
    if (req.user.role === 'sub_admin') {
      if (!req.assignedSectionIds || req.assignedSectionIds.length === 0) {
        return res.status(403).json({ error: 'Access denied: You are not assigned to configure any sections.' });
      }
      if (!req.assignedSectionIds.includes(sectionId)) {
        return res.status(403).json({ error: 'Access denied: You are not assigned to configure this section.' });
      }
    }

    const existing = await prisma.section.findFirst({
      where: { id: sectionId, schoolId: schoolIdInt }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Section not found' });
    }

    const a1 = assignment1Weight !== undefined ? parseInt(assignment1Weight) : existing.assignment1Weight;
    const a2 = assignment2Weight !== undefined ? parseInt(assignment2Weight) : existing.assignment2Weight;
    const t1 = test1Weight !== undefined ? parseInt(test1Weight) : existing.test1Weight;
    const t2 = test2Weight !== undefined ? parseInt(test2Weight) : existing.test2Weight;
    const ex = examWeight !== undefined ? parseInt(examWeight) : existing.examWeight;

    const total = a1 + a2 + t1 + t2 + ex;
    if (total !== 100) {
      return res.status(400).json({ error: `Total assessment weights must equal 100%. Current sum: ${total}%` });
    }

    let daysStr = existing.attendanceDays;
    if (attendanceDays !== undefined) {
      daysStr = Array.isArray(attendanceDays) ? JSON.stringify(attendanceDays) : (typeof attendanceDays === 'string' ? attendanceDays : existing.attendanceDays);
    }

    const updated = await prisma.section.update({
      where: { id: sectionId },
      data: {
        name: name ? name.trim() : existing.name,
        code: code !== undefined ? (code ? code.trim().toUpperCase() : null) : existing.code,
        assignment1Weight: a1,
        assignment2Weight: a2,
        test1Weight: t1,
        test2Weight: t2,
        examWeight: ex,
        expectedArrivalTime: expectedArrivalTime !== undefined ? expectedArrivalTime : existing.expectedArrivalTime,
        lateCutoffTime: lateCutoffTime !== undefined ? lateCutoffTime : existing.lateCutoffTime,
        lateGraceMinutes: lateGraceMinutes !== undefined ? (parseInt(lateGraceMinutes) || 15) : existing.lateGraceMinutes,
        attendanceDays: daysStr
      }
    });

    res.json({ message: 'Section updated successfully', section: updated });
  } catch (error) {
    console.error('Error updating section:', error);
    res.status(500).json({ error: 'Failed to update section' });
  }
});

// DELETE /api/sections/:id - Safely delete section
router.delete('/:id', authenticate, authorize(['admin', 'principal', 'superadmin']), async (req, res) => {
  try {
    const { id } = req.params;
    const schoolIdInt = parseInt(req.schoolId);
    const sectionId = parseInt(id);

    const section = await prisma.section.findFirst({
      where: { id: sectionId, schoolId: schoolIdInt },
      include: { classes: { select: { id: true } } }
    });

    if (!section) {
      return res.status(404).json({ error: 'Section not found' });
    }

    if (section.classes && section.classes.length > 0) {
      return res.status(400).json({ error: `Cannot delete section "${section.name}" because it currently has ${section.classes.length} class(es) assigned to it. Reassign or remove those classes first.` });
    }

    await prisma.section.delete({
      where: { id: sectionId }
    });

    res.json({ message: 'Section deleted successfully' });
  } catch (error) {
    console.error('Error deleting section:', error);
    res.status(500).json({ error: 'Failed to delete section' });
  }
});

// POST /api/sections/assign-classes - Batch assign classes to a section
router.post('/assign-classes', authenticate, authorize(['admin', 'principal', 'superadmin']), async (req, res) => {
  try {
    const schoolIdInt = parseInt(req.schoolId);
    const { sectionId, classIds } = req.body;

    if (!Array.isArray(classIds)) {
      return res.status(400).json({ error: 'classIds must be an array' });
    }

    const targetSectionId = sectionId ? parseInt(sectionId) : null;

    await prisma.class.updateMany({
      where: {
        id: { in: classIds.map(id => parseInt(id)) },
        schoolId: schoolIdInt
      },
      data: {
        sectionId: targetSectionId
      }
    });

    res.json({ message: 'Classes updated successfully' });
  } catch (error) {
    console.error('Error assigning classes to section:', error);
    res.status(500).json({ error: 'Failed to assign classes to section' });
  }
});

// GET /api/sections/admin-assignments - Get section assignments for sub-admins
router.get('/admin-assignments', authenticate, authorize(['admin', 'sub_admin', 'principal', 'superadmin']), async (req, res) => {
  try {
    const schoolIdInt = parseInt(req.schoolId);
    const assignments = await prisma.sectionAdminAccess.findMany({
      where: {
        Section: { schoolId: schoolIdInt }
      },
      include: {
        User: { select: { id: true, firstName: true, lastName: true, username: true, role: true } },
        Section: { select: { id: true, name: true, code: true } }
      }
    });
    res.json(assignments);
  } catch (error) {
    console.error('Error fetching section admin assignments:', error);
    res.status(500).json({ error: 'Failed to fetch section admin assignments' });
  }
});

// POST /api/sections/assign-admin - Assign sub-admin to sections
router.post('/assign-admin', authenticate, authorize(['admin', 'principal', 'superadmin']), async (req, res) => {
  try {
    const schoolIdInt = parseInt(req.schoolId);
    const { userId, sectionIds } = req.body;

    const uId = parseInt(userId);
    if (!uId || !Array.isArray(sectionIds)) {
      return res.status(400).json({ error: 'userId and sectionIds array are required' });
    }

    // Verify user belongs to school
    const targetUser = await prisma.user.findFirst({
      where: { id: uId, schoolId: schoolIdInt }
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found in this school' });
    }

    // Delete existing section assignments for this user
    await prisma.sectionAdminAccess.deleteMany({
      where: { userId: uId }
    });

    // Create new assignments
    if (sectionIds.length > 0) {
      const dataToCreate = sectionIds.map(secId => ({
        userId: uId,
        sectionId: parseInt(secId)
      }));

      await prisma.sectionAdminAccess.createMany({
        data: dataToCreate
      });
    }

    res.json({ message: 'User section access updated successfully' });
  } catch (error) {
    console.error('Error assigning user to section:', error);
    res.status(500).json({ error: 'Failed to update section access' });
  }
});

module.exports = router;
