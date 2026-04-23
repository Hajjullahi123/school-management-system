const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/audit');

// Get all departments for a school
router.get('/', authenticate, authorize(['admin', 'principal', 'superadmin']), async (req, res) => {
  try {
    const departments = await prisma.department.findMany({
      where: { schoolId: req.schoolId },
      include: {
        head: {
          select: { id: true, firstName: true, lastName: true, role: true }
        },
        _count: {
          select: { staff: true }
        },
        staff: {
          select: { id: true, firstName: true, lastName: true, departmentId: true }
        },
        subjects: {
          select: { id: true, name: true, code: true }
        }
      }
    });
    res.json(departments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new department
router.post('/', authenticate, authorize(['admin', 'principal', 'superadmin']), async (req, res) => {
  try {
    const { name, headId, subjectIds } = req.body;
    
    // Check if name exists
    const existing = await prisma.department.findFirst({
      where: { schoolId: req.schoolId, name }
    });
    if (existing) return res.status(400).json({ error: 'Department name already exists' });

    // If headId provided, check if they are already an HOD
    if (headId) {
       const existingHOD = await prisma.department.findFirst({
         where: { schoolId: req.schoolId, headId: parseInt(headId) }
       });
       if (existingHOD) return res.status(400).json({ error: 'Selected staff is already an HOD of another department' });
    }

    const department = await prisma.department.create({
      data: {
        name,
        headId: headId ? parseInt(headId) : null,
        schoolId: req.schoolId,
        subjects: subjectIds && subjectIds.length > 0 ? {
          connect: subjectIds.map(id => ({ id: parseInt(id) }))
        } : undefined
      }
    });

    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'CREATE_DEPARTMENT',
      resource: 'DEPARTMENT',
      details: { name, headId },
      ipAddress: req.ip
    });

    res.json(department);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Assign staff to department
router.post('/:id/staff', authenticate, authorize(['admin', 'principal', 'superadmin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { staffIds } = req.body; // Array of user IDs
    
    await prisma.user.updateMany({
      where: { id: { in: staffIds }, schoolId: req.schoolId },
      data: { departmentId: parseInt(id) }
    });

    res.json({ message: 'Staff assigned successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Assign subjects to department
router.post('/:id/subjects', authenticate, authorize(['admin', 'principal', 'superadmin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { subjectIds } = req.body; // Array of subject IDs
    
    await prisma.subject.updateMany({
      where: { id: { in: subjectIds }, schoolId: req.schoolId },
      data: { departmentId: parseInt(id) }
    });

    res.json({ message: 'Subjects assigned successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a department
router.put('/:id', authenticate, authorize(['admin', 'principal', 'superadmin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, headId, subjectIds } = req.body;

    // Check if staff is already an HOD elsewhere
    if (headId) {
      const existingHOD = await prisma.department.findFirst({
        where: { 
          schoolId: req.schoolId, 
          headId: parseInt(headId),
          NOT: { id: parseInt(id) }
        }
      });
      if (existingHOD) return res.status(400).json({ error: 'Selected staff is already an HOD of another department' });
    }

    const department = await prisma.department.update({
      where: { id: parseInt(id), schoolId: req.schoolId },
      data: {
        name,
        headId: headId ? parseInt(headId) : null,
        subjects: subjectIds ? {
          set: subjectIds.map(sid => ({ id: parseInt(sid) }))
        } : undefined
      }
    });

    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'UPDATE_DEPARTMENT',
      resource: 'DEPARTMENT',
      details: { id, name, headId },
      ipAddress: req.ip
    });

    res.json(department);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send a Nudge (Guided)
router.post('/nudge', authenticate, async (req, res) => {
  try {
    const { receiverId, type, message } = req.body;
    
    const department = await prisma.department.findFirst({
      where: { headId: req.user.id, schoolId: req.schoolId }
    });

    if (!department) return res.status(403).json({ error: 'Only HODs can send nudges' });

    const nudge = await prisma.nudge.create({
      data: {
        senderId: req.user.id,
        receiverId: parseInt(receiverId),
        departmentId: department.id,
        type,
        message
      }
    });

    res.json(nudge);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get My Nudges (For Teacher Dashboard)
router.get('/my-nudges', authenticate, async (req, res) => {
  try {
    const nudges = await prisma.nudge.findMany({
      where: { receiverId: req.user.id, isRead: false },
      include: {
        sender: { select: { firstName: true, lastName: true } },
        department: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(nudges);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark Nudge as Read
router.post('/nudges/:id/read', authenticate, async (req, res) => {
  try {
    await prisma.nudge.update({
      where: { id: parseInt(req.params.id), receiverId: req.user.id },
      data: { isRead: true }
    });
    res.json({ message: 'Nudge cleared' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/departments/auto-nudge/scan
router.get('/auto-nudge/scan', authenticate, async (req, res) => {
   try {
      const statusRes = await fetchDepartmentStatus(req.user.id, req.schoolId);
      if (!statusRes) return res.status(404).json({ error: 'Department not found' });
      const laggingCount = statusRes.staff.filter(s => s.needsUpdate || !s.hasTargets).length;
      res.json({ laggingCount, totalStaff: statusRes.staff.length });
   } catch (error) { res.status(500).json({ error: error.message }); }
});

// POST /api/departments/auto-nudge/execute
router.post('/auto-nudge/execute', authenticate, async (req, res) => {
   try {
      const department = await prisma.department.findFirst({
         where: { headId: req.user.id, schoolId: req.schoolId }
      });
      if (!department) return res.status(403).json({ error: 'Only an HOD can execute this action' });

      const currentTerm = await prisma.term.findFirst({ where: { schoolId: req.schoolId, isCurrent: true } });
      const staffMembers = await prisma.user.findMany({
         where: { departmentId: department.id, schoolId: req.schoolId },
         include: { classesAsTeacher: { select: { id: true } } }
      });

      let nudgesSent = 0;
      for (const teacher of staffMembers) {
         const classIds = teacher.classesAsTeacher.map(c => c.id);
         const targetsCount = (currentTerm && classIds.length > 0) ? await prisma.quranTarget.count({
            where: { schoolId: req.schoolId, termId: currentTerm.id, classId: { in: classIds } }
         }) : 0;
         const hasTargets = classIds.length === 0 || targetsCount >= classIds.length;
         
         const lastRecord = await prisma.quranRecord.findFirst({
            where: { teacherId: teacher.id, schoolId: req.schoolId },
            orderBy: { createdAt: 'desc' }
         });
         const needsUpdate = lastRecord ? (new Date() - new Date(lastRecord.createdAt) > 86400000 * 3) : true;

         if (!hasTargets || needsUpdate) {
            await prisma.nudge.create({
               data: {
                  senderId: req.user.id,
                  receiverId: teacher.id,
                  departmentId: department.id,
                  type: !hasTargets ? 'TARGET_MISSING' : 'PROGRESS_LAGGING',
                  message: `[AUTOMATED SCAN] Academic compliance alert. Please reconcile your ${!hasTargets ? 'term targets' : 'student progress records'} immediately.`
               }
            });
            nudgesSent++;
         }
      }

      res.json({ message: `Scanned ${staffMembers.length} staff members. Dispatched ${nudgesSent} corrective nudges.` });
   } catch (error) { res.status(500).json({ error: error.message }); }
});

// Get department status (Safety-Hardened)
router.get('/my-department/status', authenticate, async (req, res) => {
  try {
    const status = await fetchDepartmentStatus(req.user.id, req.schoolId);
    if (!status) return res.status(403).json({ error: 'You are not a Head of Department' });
    res.json(status);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// GET /api/departments/benchmarking (Performance Optimized)
router.get('/benchmarking', authenticate, authorize(['admin', 'principal']), async (req, res) => {
  try {
    const departments = await prisma.department.findMany({
      where: { schoolId: req.schoolId },
      include: {
        _count: { select: { staff: true, nudges: true } },
        staff: {
          select: {
            id: true,
            classesAsTeacher: { select: { id: true } }
          }
        }
      }
    });

    const currentTerm = await prisma.term.findFirst({
      where: { schoolId: req.schoolId, isCurrent: true }
    });

    // Strategy: Batch fetch all targets and last records to avoid N+1 queries
    const benchmarkStats = await Promise.all(departments.map(async (dept) => {
      const staffMetrics = await Promise.all(dept.staff.map(async (teacher) => {
        const classIds = teacher.classesAsTeacher.map(c => c.id);
        const targetsCount = (currentTerm && classIds.length > 0) ? await prisma.quranTarget.count({
          where: { schoolId: req.schoolId, termId: currentTerm.id, classId: { in: classIds } }
        }) : 0;
        
        const hasTargets = classIds.length === 0 || targetsCount >= classIds.length;
        const lastRecord = await prisma.quranRecord.findFirst({
          where: { teacherId: teacher.id, schoolId: req.schoolId },
          orderBy: { createdAt: 'desc' }
        });
        const isUpToDate = lastRecord ? (new Date() - new Date(lastRecord.createdAt) < 86400000 * 3) : false;

        return { hasTargets, isUpToDate };
      }));

      const targetCompliance = staffMetrics.length > 0 ? (staffMetrics.filter(m => m.hasTargets).length / staffMetrics.length) * 100 : 100;
      const recordCompliance = staffMetrics.length > 0 ? (staffMetrics.filter(m => m.isUpToDate).length / staffMetrics.length) * 100 : 100;

      return {
        id: dept.id,
        name: dept.name,
        staffCount: dept._count.staff,
        nudgeCount: dept._count.nudges,
        targetComplianceScore: Math.round(targetCompliance),
        recordComplianceScore: Math.round(recordCompliance),
        overallScore: Math.round((targetCompliance + recordCompliance) / 2)
      };
    }));

    res.json(benchmarkStats.sort((a, b) => b.overallScore - a.overallScore));
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Centralized helper for status logic (Hardened)
async function fetchDepartmentStatus(headId, schoolId) {
   const department = await prisma.department.findFirst({
      where: { headId, schoolId },
      include: { 
        staff: { 
          include: { 
            classesAsTeacher: { select: { id: true } } 
          } 
        } 
      }
   });
   if (!department) return null;

   const currentTerm = await prisma.term.findFirst({ where: { schoolId, isCurrent: true } });
   
   const staffStatus = await Promise.all(department.staff.map(async (teacher) => {
      const classIds = teacher.classesAsTeacher.map(c => c.id);
      const targetsCount = (currentTerm && classIds.length > 0) ? await prisma.quranTarget.count({
        where: { schoolId, termId: currentTerm.id, classId: { in: classIds } }
      }) : 0;
      const lastRecord = await prisma.quranRecord.findFirst({
        where: { teacherId: teacher.id, schoolId },
        orderBy: { createdAt: 'desc' }
      });
      return {
        id: teacher.id,
        firstName: teacher.firstName,
        lastName: teacher.lastName,
        photoUrl: teacher.photoUrl,
        role: teacher.role,
        hasTargets: classIds.length === 0 || targetsCount >= classIds.length,
        lastUpdate: lastRecord ? lastRecord.createdAt : null,
        needsUpdate: lastRecord ? (new Date() - new Date(lastRecord.createdAt) > 86400000 * 3) : true
      };
   }));
   return { departmentName: department.name, staff: staffStatus };
}

module.exports = router;
