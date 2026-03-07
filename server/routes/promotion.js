const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { checkSubscription } = require('../middleware/subscription');
const { logAction } = require('../utils/audit');

const { generateAlumniUsername } = require('../utils/usernameGenerator');

// 1. Get students eligible for promotion/graduation from a class (Admin/Principal only)
router.get('/class/:classId/eligibility', authenticate, checkSubscription, authorize(['admin', 'principal']), async (req, res) => {
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
router.post('/promote', authenticate, checkSubscription, authorize(['admin', 'principal']), async (req, res) => {
  const { studentIds, targetClassId, generateDocuments, graduationYear, programType } = req.body;

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

    const school = await prisma.school.findUnique({
      where: { id: req.schoolId },
      select: { code: true }
    });
    const schoolCode = school?.code || 'SCH';

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

          // Generate Completion Documents if requested
          if (generateDocuments) {
            const studentInfo = await tx.student.findUnique({
              where: { id: studentId },
              select: { admissionNumber: true }
            });

            const certYear = graduationYear || new Date().getFullYear();
            const certificateNumber = `CERT/${schoolCode}/${certYear}/${studentInfo.admissionNumber}`;
            await tx.certificate.upsert({
              where: { studentId: studentId },
              update: {
                certificateNumber,
                graduationYear: parseInt(certYear),
                programType: programType || null,
                issuedBy: req.user.id
              },
              create: {
                schoolId: req.schoolId,
                studentId: studentId,
                certificateNumber,
                graduationYear: parseInt(certYear),
                programType: programType || null,
                issuedBy: req.user.id
              }
            });

            const testimonialNumber = `TEST/${schoolCode}/${certYear}/${studentInfo.admissionNumber}`;
            await tx.testimonial.upsert({
              where: { studentId: studentId },
              update: {
                testimonialNumber,
                programType: programType || null,
                issuedBy: req.user.id
              },
              create: {
                schoolId: req.schoolId,
                studentId: studentId,
                testimonialNumber,
                conduct: 'Good',
                character: '',
                programType: programType || null,
                issuedBy: req.user.id
              }
            });

            // Also create Alumni record so they appear in Alumni/Document Management
            // but keep their student status as 'active' (unlike /graduate)
            const alumniRef = await tx.alumni.findUnique({
              where: { studentId: studentId },
              select: { alumniId: true }
            });
            const alumniId = alumniRef?.alumniId || `ALM-${certYear}-${studentInfo.admissionNumber}`;

            await tx.alumni.upsert({
              where: { studentId: studentId },
              update: {
                graduationYear: parseInt(certYear),
                programType: programType || null,
                alumniId
              },
              create: {
                schoolId: req.schoolId,
                studentId: studentId,
                graduationYear: parseInt(certYear),
                programType: programType || null,
                alumniId,
                isPublic: false
              }
            });
          }

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
router.post('/graduate', authenticate, checkSubscription, authorize(['admin', 'principal']), async (req, res) => {
  const { studentIds, graduationYear, programType } = req.body;

  if (!studentIds || !Array.isArray(studentIds) || !graduationYear) {
    return res.status(400).json({ error: 'Student IDs and graduation year are required' });
  }

  try {
    const school = await prisma.school.findUnique({
      where: { id: req.schoolId },
      select: { code: true }
    });

    const currentSession = await prisma.academicSession.findFirst({
      where: {
        isCurrent: true,
        schoolId: req.schoolId
      }
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
            select: {
              classId: true,
              admissionNumber: true,
              user: { select: { firstName: true, lastName: true } }
            }
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
          // Include school code to prevent global collisions
          const schoolCode = school?.code || 'SCH';

          // Generate new format username/alumniId
          const alumniId = await generateAlumniUsername(
            req.schoolId,
            schoolCode,
            student.user.firstName,
            student.user.lastName,
            graduationYear
          );

          await tx.alumni.upsert({
            where: {
              studentId: studentId
            },
            update: {
              graduationYear: parseInt(graduationYear),
              alumniId: alumniId,
              programType: programType || null
            },
            create: {
              schoolId: req.schoolId,
              studentId,
              graduationYear: parseInt(graduationYear),
              alumniId,
              programType: programType || null
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

          // 4. Generate Certificate & Testimonial (Skipped for Transfer/Expulsion)
          const skipDocuments = programType === 'Transfer/Other' || programType === 'Expulsion';

          if (!skipDocuments) {
            const certificateNumber = `CERT/${schoolCode}/${graduationYear}/${student.admissionNumber}`;
            await tx.certificate.upsert({
              where: { studentId: studentId },
              update: {
                certificateNumber,
                graduationYear: parseInt(graduationYear),
                programType: programType || null,
                issuedBy: req.user.id
              },
              create: {
                schoolId: req.schoolId,
                studentId: studentId,
                certificateNumber,
                graduationYear: parseInt(graduationYear),
                programType: programType || null,
                issuedBy: req.user.id
              }
            });

            const testimonialNumber = `TEST/${schoolCode}/${graduationYear}/${student.admissionNumber}`;
            await tx.testimonial.upsert({
              where: { studentId: studentId },
              update: {
                testimonialNumber,
                programType: programType || null,
                issuedBy: req.user.id
              },
              create: {
                schoolId: req.schoolId,
                studentId: studentId,
                testimonialNumber,
                conduct: 'Good',
                character: '',
                programType: programType || null,
                issuedBy: req.user.id
              }
            });
          }
        });

        graduated.push(parseInt(id));
      } catch (e) {
        console.error(`Graduation error for student ${id}:`, e.message || e);
        failed.push({ id: parseInt(id), error: e.message || 'Unknown error' });
      }
    }

    res.json({
      message: `Successfully graduated ${graduated.length} students to the Alumni Portal.${failed.length > 0 ? ` Failed: ${failed.length}` : ''}`,
      graduated,
      failed,
      errors: failed.length > 0 ? `${failed.length} student(s) failed during graduation. Check server logs for details.` : undefined
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
router.get('/history', authenticate, checkSubscription, authorize(['admin', 'principal']), async (req, res) => {
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

// 5. Aggregate Transcript Data (Admin/Principal only)
router.get('/transcript/:studentId', authenticate, checkSubscription, authorize(['admin', 'principal']), async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId);

    // 1. Get student & school details
    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId: req.schoolId },
      include: {
        user: { select: { firstName: true, lastName: true, username: true } },
        classModel: true,
        school: true,
        alumniProfile: { select: { graduationYear: true, alumniId: true } }
      }
    });

    if (!student) return res.status(404).json({ error: 'Student not found' });

    // 2. Get all results, ordered by session and term
    const results = await prisma.result.findMany({
      where: { studentId, schoolId: req.schoolId },
      include: {
        subject: { select: { name: true, code: true } },
        academicSession: { select: { name: true, id: true } },
        term: { select: { name: true, id: true } }
      },
      orderBy: [
        { academicSessionId: 'asc' },
        { termId: 'asc' }
      ]
    });

    // 3. Get promotion history to show transitions
    const history = await prisma.promotionHistory.findMany({
      where: { studentId, schoolId: req.schoolId },
      include: {
        fromClass: { select: { name: true, arm: true } },
        toClass: { select: { name: true, arm: true } },
        academicSession: { select: { name: true } }
      },
      orderBy: { createdAt: 'asc' }
    });

    // 4. Group results by session and term for easier frontend rendering
    const sessions = {};
    results.forEach(r => {
      const sName = r.academicSession.name;
      const tName = r.term.name;

      if (!sessions[sName]) sessions[sName] = {};
      if (!sessions[sName][tName]) sessions[sName][tName] = { results: [], average: 0 };

      sessions[sName][tName].results.push({
        subject: r.subject.name,
        code: r.subject.code,
        score: r.totalScore,
        grade: r.grade,
        position: r.positionInClass
      });
    });

    // Calculate averages per term
    Object.keys(sessions).forEach(sKey => {
      Object.keys(sessions[sKey]).forEach(tKey => {
        const term = sessions[sKey][tKey];
        const sum = term.results.reduce((acc, curr) => acc + curr.score, 0);
        term.average = term.results.length > 0 ? (sum / term.results.length).toFixed(2) : 0;
      });
    });

    // Remap alumniProfile -> alumni for frontend compatibility
    const studentData = { ...student, alumni: student.alumniProfile };
    delete studentData.alumniProfile;

    res.json({
      student: studentData,
      academicHistory: sessions,
      promotionHistory: history,
      generatedAt: new Date()
    });
  } catch (error) {
    console.error('Transcript aggregation error:', error);
    res.status(500).json({ error: 'Failed to aggregate transcript data' });
  }
});

// 6. Public Verification Route (Public)
router.get('/verify/:studentId', async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId);

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        user: { select: { firstName: true, lastName: true } },
        school: { select: { name: true, logo: true, isActivated: true } },
        alumni: { select: { graduationYear: true } }
      }
    });

    if (!student) return res.status(404).json({ error: 'Verification record not found' });

    res.json({
      verified: true,
      studentName: `${student.user.firstName} ${student.user.lastName}`,
      schoolName: student.school.name,
      graduationYear: student.alumni?.graduationYear,
      status: student.status,
      lastUpdated: student.updatedAt
    });
  } catch (error) {
    res.status(500).json({ error: 'Verification system error' });
  }
});

module.exports = router;
