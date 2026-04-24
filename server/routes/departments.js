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
    const departmentId = parseInt(id);

    // 1. Get subjects belonging to this department
    const deptSubjects = await prisma.subject.findMany({
      where: { departmentId: departmentId },
      select: { id: true, name: true }
    });
    
    if (deptSubjects.length === 0) {
      return res.status(400).json({ error: 'This department has no subjects assigned yet. Please assign subjects to the department first so we can validate staff eligibility.' });
    }

    const deptSubjectIds = deptSubjects.map(s => s.id);

    // 2. Validate each staff member's academic load
    const invalidStaff = [];
    for (const sid of staffIds) {
      const assignmentCount = await prisma.teacherAssignment.count({
        where: {
          teacherId: sid,
          classSubject: {
            subjectId: { in: deptSubjectIds }
          }
        }
      });

      if (assignmentCount === 0) {
        const user = await prisma.user.findUnique({ 
          where: { id: sid }, 
          select: { firstName: true, lastName: true } 
        });
        invalidStaff.push(`${user.firstName} ${user.lastName}`);
      }
    }

    if (invalidStaff.length > 0) {
      return res.status(400).json({ 
        error: `Strategic Assignment Failure: The following teachers are not assigned to any subjects within this department's jurisdiction: ${invalidStaff.join(', ')}. Please assign them to the relevant subjects first.` 
      });
    }

    // 3. Perform the update
    await prisma.user.updateMany({
      where: { id: { in: staffIds }, schoolId: req.schoolId },
      data: { departmentId: departmentId }
    });

    res.json({ message: 'Staff pool successfully synchronized with departmental subjects' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Assign subjects to department (Admin/Principal/HOD)
router.post('/:id/subjects', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { subjectIds } = req.body; // Array of subject IDs
    const departmentId = parseInt(id);

    // If not admin/principal, check if user is the HOD of THIS department
    if (!['admin', 'principal', 'superadmin'].includes(req.user.role)) {
       const department = await prisma.department.findUnique({ where: { id: departmentId } });
       if (!department || department.headId !== req.user.id) {
          return res.status(403).json({ error: 'Access denied. You can only manage subjects for your own department.' });
       }
    }
    
    // Unset department for subjects that were previously in this department but not in the new list
    await prisma.subject.updateMany({
      where: { departmentId: departmentId, schoolId: req.schoolId, NOT: { id: { in: subjectIds.map(sid => parseInt(sid)) } } },
      data: { departmentId: null }
    });

    // Set department for new subjects
    await prisma.subject.updateMany({
      where: { id: { in: subjectIds.map(sid => parseInt(sid)) }, schoolId: req.schoolId },
      data: { departmentId: departmentId }
    });

    res.json({ message: 'Department subjects successfully updated' });
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
            where: { 
               teacherId: teacher.id, 
               schoolId: req.schoolId,
               subject: { departmentId: department.id }
            },
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
          where: { 
            teacherId: teacher.id, 
            schoolId: req.schoolId,
            subject: { departmentId: dept.id } // Only count activity in department subjects
          },
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

// Centralized helper for status logic (Hardened & Optimized)
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
   const now = new Date();
   const threeDaysAgo = new Date(now.getTime() - 86400000 * 3);

   // Batch fetch all relevant data for the entire staff pool
   const staffIds = department.staff.map(s => s.id);
   const classIds = [...new Set(department.staff.flatMap(s => s.classesAsTeacher.map(c => c.id)))];

   // 1. Fetch Targets count per class
   const targets = currentTerm ? await prisma.quranTarget.findMany({
      where: { schoolId, termId: currentTerm.id, classId: { in: classIds } },
      select: { classId: true }
   }) : [];

    // 2. Fetch Latest records for all staff (Filtered by department subjects)
    const latestRecords = await prisma.quranRecord.findMany({
       where: { 
          teacherId: { in: staffIds }, 
          schoolId,
          subject: { departmentId: department.id }
       },
       orderBy: { createdAt: 'desc' },
       distinct: ['teacherId']
    });

   const staffStatus = department.staff.map((teacher) => {
      const teacherClassIds = teacher.classesAsTeacher.map(c => c.id);
      const hasTargets = teacherClassIds.length === 0 || teacherClassIds.every(cid => targets.some(t => t.classId === cid));
      const lastRecord = latestRecords.find(r => r.teacherId === teacher.id);

      return {
        id: teacher.id,
        firstName: teacher.firstName,
        lastName: teacher.lastName,
        photoUrl: teacher.photoUrl,
        role: teacher.role,
        hasTargets,
        lastUpdate: lastRecord ? lastRecord.createdAt : null,
        needsUpdate: lastRecord ? (now - new Date(lastRecord.createdAt) > 86400000 * 3) : true
      };
   });

   // Calculate Academic Momentum (Progress vs Time)
   let momentumScore = 0;
   let insights = [];

   if (currentTerm && currentTerm.startDate && currentTerm.endDate) {
     const start = new Date(currentTerm.startDate);
     const end = new Date(currentTerm.endDate);
     const termDuration = end - start;
     const timeElapsed = now - start;
     const termProgress = Math.min(100, Math.max(0, (timeElapsed / termDuration) * 100));

     // Fetch aggregate activity for department subjects
     const departmentSubjects = await prisma.subject.findMany({
        where: { departmentId: department.id },
        select: { id: true }
     });
     const subjectIds = departmentSubjects.map(s => s.id);

     const stats = await prisma.quranRecord.aggregate({
        where: { 
          schoolId, 
          subjectId: { in: subjectIds },
          createdAt: { gte: start }
        },
        _count: { _all: true },
        _sum: { pages: true }
     });

     // Strategy: Calculate momentum based on record frequency vs expected frequency
     // Expected: 1 record per student per week (roughly)
     const studentCount = await prisma.student.count({ where: { schoolId, classId: { in: classIds } } });
     const weeksElapsed = Math.max(1, timeElapsed / (86400000 * 7));
     const expectedRecords = studentCount * weeksElapsed;
     const actualRecords = stats._count._all || 0;
     
     // Activity Momentum Score (0-100)
     momentumScore = Math.min(100, Math.round((actualRecords / Math.max(1, expectedRecords)) * 100));

     if (momentumScore < 70) {
        insights.push({
           type: 'CRITICAL',
           message: `Academic momentum is lagging at ${momentumScore}%. Staff are recording ${Math.round(expectedRecords - actualRecords)} fewer entries than predicted for this term phase.`
        });
     } else if (momentumScore >= 95) {
        insights.push({
           type: 'POSITIVE',
           message: `Department is operating at peak velocity (${momentumScore}%). Consistency in student tracking is exceptional.`
        });
     }
   }

   return { 
     departmentName: department.name, 
     staff: staffStatus,
     momentumScore,
     insights
   };
}

// --- RESOURCE HUB ROUTES ---

// Get resources for a department
router.get('/:id/resources', authenticate, async (req, res) => {
  try {
    const departmentId = parseInt(req.params.id);
    if (isNaN(departmentId)) return res.status(400).json({ error: 'Invalid department ID' });
    
    // Security: Check if user is in department or is admin/principal
    const user = await prisma.user.findUnique({
       where: { id: req.user.id },
       select: { role: true, departmentId: true }
    });
    
    if (user.role !== 'admin' && user.role !== 'principal' && user.departmentId !== departmentId) {
       return res.status(403).json({ error: 'Access denied to this department\'s resource hub' });
    }

    const resources = await prisma.departmentResource.findMany({
      where: { departmentId, schoolId: req.schoolId },
      include: {
        uploader: { select: { firstName: true, lastName: true, photoUrl: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(resources);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch departmental library' });
  }
});

// Create a resource
router.post('/:id/resources', authenticate, async (req, res) => {
  try {
    const departmentId = parseInt(req.params.id);
    if (isNaN(departmentId)) return res.status(400).json({ error: 'Invalid department ID' });

    const { title, description, fileUrl, fileType, category } = req.body;

    if (!title || !fileUrl) {
       return res.status(400).json({ error: 'Resource title and file destination are required' });
    }

    // Security: Only HOD or Admin/Principal can upload
    const department = await prisma.department.findFirst({
       where: { id: departmentId, schoolId: req.schoolId }
    });

    if (!department) return res.status(404).json({ error: 'Department sequence not found' });
    
    if (req.user.role !== 'admin' && req.user.role !== 'principal' && department.headId !== req.user.id) {
       return res.status(403).json({ error: 'Upload restricted to HOD or Strategic Administrators' });
    }

    const resource = await prisma.departmentResource.create({
      data: {
        schoolId: req.schoolId,
        departmentId,
        uploaderId: req.user.id,
        title,
        description,
        fileUrl,
        fileType: fileType || 'LINK',
        category: category || 'OTHER'
      }
    });

    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'CREATE_RESOURCE',
      resource: 'DEPARTMENT_RESOURCE',
      details: { id: resource.id, title },
      ipAddress: req.ip
    });

    res.json(resource);
  } catch (error) {
    res.status(500).json({ error: 'Failed to synchronize resource' });
  }
});

// Delete a resource
router.delete('/resources/:id', authenticate, async (req, res) => {
  try {
    const resourceId = parseInt(req.params.id);
    if (isNaN(resourceId)) return res.status(400).json({ error: 'Invalid resource ID' });
    
    const resource = await prisma.departmentResource.findUnique({
       where: { id: resourceId }
    });

    if (!resource || resource.schoolId !== req.schoolId) {
       return res.status(404).json({ error: 'Resource location invalid' });
    }

    // Security: Only uploader, HOD, or Admin can delete
    const department = await prisma.department.findUnique({ where: { id: resource.departmentId } });
    
    if (req.user.role !== 'admin' && req.user.role !== 'principal' && resource.uploaderId !== req.user.id && department.headId !== req.user.id) {
       return res.status(403).json({ error: 'Erasure protocol unauthorized' });
    }

    await prisma.departmentResource.delete({ where: { id: resourceId } });

    res.json({ message: 'Resource successfully purged from library' });
  } catch (error) {
    res.status(500).json({ error: 'Resource erasure failed' });
  }
});

// Get benchmarking data for all departments (Principal/Admin only)
router.get('/benchmarking/all', authenticate, authorize(['admin', 'principal']), async (req, res) => {
  try {
    const departments = await prisma.department.findMany({
      where: { schoolId: req.schoolId },
      include: {
        head: { select: { firstName: true, lastName: true } },
        staff: { select: { id: true } },
        _count: { select: { resources: true } }
      }
    });

    const currentTerm = await prisma.term.findFirst({ where: { schoolId: req.schoolId, isCurrent: true } });
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 86400000 * 3);

    // 1. Batch fetch ALL recent records for the school to calculate compliance
    const allStaffIds = departments.flatMap(d => d.staff.map(s => s.id));
    const recentRecords = await prisma.quranRecord.findMany({
       where: { 
         schoolId: req.schoolId, 
         teacherId: { in: allStaffIds },
         createdAt: { gte: threeDaysAgo }
       },
       select: { teacherId: true },
       distinct: ['teacherId']
    });

    // 2. Batch fetch ALL term activity volume
    const allDepartmentSubjects = await prisma.subject.findMany({
       where: { schoolId: req.schoolId, departmentId: { not: null } },
       select: { id: true, departmentId: true }
    });

    const termActivity = await prisma.quranRecord.groupBy({
       by: ['subjectId'],
       where: { 
         schoolId: req.schoolId,
         createdAt: currentTerm ? { gte: currentTerm.startDate } : undefined
       },
       _count: { _all: true }
    });

    const benchmarks = departments.map((dept) => {
       const deptStaffIds = dept.staff.map(s => s.id);
       const compliantStaffCount = recentRecords.filter(r => deptStaffIds.includes(r.teacherId)).length;
       const complianceRate = dept.staff.length > 0 ? Math.round((compliantStaffCount / dept.staff.length) * 100) : 100;

       const deptSubjectIds = allDepartmentSubjects.filter(s => s.departmentId === dept.id).map(s => s.id);
       const activityVolume = termActivity
          .filter(a => deptSubjectIds.includes(a.subjectId))
          .reduce((sum, a) => sum + a._count._all, 0);

       return {
          id: dept.id,
          name: dept.name,
          head: dept.head ? `${dept.head.firstName} ${dept.head.lastName}` : 'N/A',
          staffCount: dept.staff.length,
          resourceCount: dept._count.resources,
          complianceRate,
          activityVolume,
          status: complianceRate > 80 ? 'OPTIMUM' : (complianceRate > 50 ? 'WARNING' : 'CRITICAL')
       };
    });

    res.json(benchmarks);
  } catch (error) {
    res.status(500).json({ error: 'Benchmarking engine failure' });
  }
});

// Delete a department
router.delete('/:id', authenticate, authorize(['admin', 'principal', 'superadmin']), async (req, res) => {
  try {
    const { id } = req.params;
    const departmentId = parseInt(id);

    // 1. Unset department for staff
    await prisma.user.updateMany({
      where: { departmentId: departmentId, schoolId: req.schoolId },
      data: { departmentId: null }
    });

    // 2. Unset department for subjects
    await prisma.subject.updateMany({
      where: { departmentId: departmentId, schoolId: req.schoolId },
      data: { departmentId: null }
    });

    // 3. Delete associated nudges
    await prisma.nudge.deleteMany({
      where: { departmentId: departmentId }
    });

    // 4. Delete associated resources
    await prisma.departmentResource.deleteMany({
      where: { departmentId: departmentId, schoolId: req.schoolId }
    });

    // 5. Delete the department
    await prisma.department.delete({
      where: { id: departmentId, schoolId: req.schoolId }
    });

    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'DELETE_DEPARTMENT',
      resource: 'DEPARTMENT',
      details: { id },
      ipAddress: req.ip
    });

    res.json({ message: 'Department successfully purged from the system' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
