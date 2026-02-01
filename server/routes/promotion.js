const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/audit');

// 1. Get students eligible for promotion/graduation from a class (Admin/Principal only)
router.get('/class/:classId/eligibility', authenticate, authorize(['admin', 'principal']), async (req, res) => {
  try {
    const classId = parseInt(req.params.classId);

    // Get students in this class with their latest results
    const students = await prisma.student.findMany({
      where: {
        classId,
        status: 'active',
        schoolId: req.schoolId
      },
      include: {
        user: {
          select: { firstName: true, lastName: true, username: true }
        },
        reportCards: {
          where: { schoolId: req.schoolId },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    res.json(students);
  } catch (error) {
    console.error('Fetch eligibility error:', error);
    res.status(500).json({ error: 'Failed to fetch students for promotion' });
  }
});

// 2. Batch Promote Students (Admin/Principal only)
router.post('/promote', authenticate, authorize(['admin', 'principal']), async (req, res) => {
  const { studentIds, targetClassId } = req.body;

  if (!studentIds || !Array.isArray(studentIds) || !targetClassId) {
    return res.status(400).json({ error: 'Student IDs and target class are required' });
  }

  try {
    const currentSession = await prisma.academicSession.findFirst({
      where: {
        isCurrent: true,
        schoolId: req.schoolId
      }
    });

    const results = await prisma.$transaction(async (tx) => {
      const promoted = [];
      const failed = [];

      for (const id of studentIds) {
        try {
          const studentId = parseInt(id);

          // Get current student info to log history
          const student = await tx.student.findFirst({
            where: {
              id: studentId,
              schoolId: req.schoolId
            },
            select: { classId: true }
          });

          if (!student) throw new Error("Student not found in this school");

          // Update student's class
          const updated = await tx.student.update({
            where: {
              id: studentId,
              schoolId: req.schoolId
            },
            data: {
              classId: parseInt(targetClassId),
            }
          });

          // Log history
          await tx.promotionHistory.create({
            data: {
              schoolId: req.schoolId,
              studentId,
              fromClassId: student.classId,
              toClassId: parseInt(targetClassId),
              academicSessionId: currentSession?.id,
              type: 'promotion',
              performedBy: req.user.id
            }
          });

          promoted.push(updated.id);
        } catch (e) {
          console.error(`Promotion error for student ${id}:`, e);
          failed.push(id);
        }
      }

      return { promoted, failed };
    });

    res.json({
      message: `Successfully promoted ${results.promoted.length} students.`,
      ...results
    });

    // Log the batch promotion
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'BATCH_PROMOTE',
      resource: 'STUDENT',
      details: {
        count: results.promoted.length,
        targetClassId: parseInt(targetClassId),
        failedCount: results.failed.length
      },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Promotion error:', error);
    res.status(500).json({ error: 'An error occurred during batch promotion' });
  }
});

// 3. Batch Graduate Students (Migrate to Alumni) (Admin/Principal only)
router.post('/graduate', authenticate, authorize(['admin', 'principal']), async (req, res) => {
  const { studentIds, graduationYear } = req.body;

  if (!studentIds || !Array.isArray(studentIds) || !graduationYear) {
    return res.status(400).json({ error: 'Student IDs and graduation year are required' });
  }

  try {
    const currentSession = await prisma.academicSession.findFirst({
      where: { isCurrent: true }
    });

    const graduated = [];
    const failed = [];

    for (const id of studentIds) {
      try {
        await prisma.$transaction(async (tx) => {
          const studentId = parseInt(id);

          // Get current student info to log history
          const student = await tx.student.findFirst({
            where: {
              id: studentId,
              schoolId: req.schoolId
            },
            select: { classId: true, admissionNumber: true }
          });

          if (!student) {
            throw new Error(`Student ${studentId} not found`);
          }

          // 1. Update student status and remove from class
          await tx.student.update({
            where: {
              id: studentId,
              schoolId: req.schoolId
            },
            data: {
              status: 'alumni',
              classId: null // No longer in any class
            }
          });

          // 2. Create alumni profile
          const alumniId = `AL/${graduationYear}/${student.admissionNumber}`;

          await tx.alumni.upsert({
            where: {
              schoolId_studentId: {
                schoolId: req.schoolId,
                studentId: studentId
              }
            },
            update: {
              graduationYear: parseInt(graduationYear),
              alumniId: { set: alumniId }
            },
            create: {
              schoolId: req.schoolId,
              studentId,
              graduationYear: parseInt(graduationYear),
              alumniId
            }
          });

          // 3. Log history
          await tx.promotionHistory.create({
            data: {
              schoolId: req.schoolId,
              studentId,
              fromClassId: student.classId,
              toClassId: null,
              academicSessionId: currentSession?.id,
              type: 'graduation',
              performedBy: req.user.id
            }
          });
        });

        graduated.push(parseInt(id));
      } catch (e) {
        console.error(`Graduation error for student ${id}:`, e);
        failed.push(parseInt(id));
      }
    }

    res.json({
      message: `Successfully graduated ${graduated.length} students to the Alumni Portal.${failed.length > 0 ? ` Failed: ${failed.length}` : ''}`,
      graduated,
      failed
    });

    // Log the batch graduation
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'BATCH_GRADUATE',
      resource: 'STUDENT',
      details: {
        count: graduated.length,
        graduationYear: parseInt(graduationYear),
        failedCount: failed.length
      },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Graduation error:', error);
    res.status(500).json({ error: 'An error occurred during batch graduation process' });
  }
});

// 4. Get Promotion History (Admin/Principal only)
router.get('/history', authenticate, authorize(['admin', 'principal']), async (req, res) => {
  try {
    const history = await prisma.promotionHistory.findMany({
      where: { schoolId: req.schoolId },
      include: {
        student: {
          include: {
            user: { select: { firstName: true, lastName: true } }
          }
        },
        fromClass: true,
        toClass: true,
        academicSession: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(history);
  } catch (error) {
    console.error('Fetch history error:', error);
    res.status(500).json({ error: 'Failed to fetch promotion history' });
  }
});

module.exports = router;
