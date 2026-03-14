const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

// Public verification route
router.get('/verify/:certificateNumber', async (req, res) => {
  try {
    const { certificateNumber } = req.params;

    const certificate = await prisma.certificate.findUnique({
      where: { certificateNumber },
      include: {
        student: {
          include: {
            user: { select: { firstName: true, lastName: true } }
          }
        },
        school: { select: { name: true, logoUrl: true } }
      }
    });

    if (!certificate) {
      return res.status(404).json({ verified: false, error: 'Certificate not found' });
    }

    res.json({
      verified: true,
      studentName: `${certificate.student.user.firstName} ${certificate.student.user.lastName}`,
      schoolName: certificate.school.name,
      graduationYear: certificate.graduationYear,
      dateIssued: certificate.dateIssued,
      certificateNumber: certificate.certificateNumber
    });
  } catch (error) {
    console.error('Certificate verification error:', error);
    res.status(500).json({ verified: false, error: 'Verification system error' });
  }
});

// Generate or regenerate certificate for a student (Admin/Principal only)
router.post('/generate/:studentId', authenticate, authorize(['admin', 'principal']), async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId);

    // Get student and verify they are alumni
    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId: req.schoolId },
      include: {
        alumniProfile: true,
        school: { select: { code: true } }
      }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    if (!student.alumniProfile) {
      return res.status(400).json({ error: 'Certificate can only be generated for students with a graduation/completion record' });
    }

    const schoolCode = student.school.code || 'SCH';
    const graduationYear = student.alumniProfile.graduationYear;
    const certificateNumber = `CERT/${schoolCode}/${graduationYear}/${student.admissionNumber}`;
    const { programType, content, commencementYear } = req.body;

    // Upsert certificate (create or update)
    const certificate = await prisma.certificate.upsert({
      where: {
        schoolId_studentId: {
          schoolId: req.schoolId,
          studentId
        }
      },
      update: {
        dateIssued: new Date(),
        issuedBy: req.user.id,
        content: content || undefined,
        commencementYear: commencementYear ? parseInt(commencementYear) : undefined
      },
      create: {
        schoolId: req.schoolId,
        studentId,
        certificateNumber,
        graduationYear,
        programType: programType || null,
        content: content || null,
        commencementYear: commencementYear ? parseInt(commencementYear) : null,
        issuedBy: req.user.id
      },
      include: {
        student: {
          include: {
            user: { select: { firstName: true, lastName: true } }
          }
        }
      }
    });

    res.json({
      message: 'Certificate generated successfully',
      certificate
    });
  } catch (error) {
    console.error('Error generating certificate:', error);
    res.status(500).json({ error: 'Failed to generate certificate' });
  }
});

// Bulk generate certificates for a specific graduation year (Admin/Principal only)
router.post('/bulk-generate', authenticate, authorize(['admin', 'principal']), async (req, res) => {
  try {
    const { graduationYear, programType, content, commencementYear } = req.body;

    if (!graduationYear) {
      return res.status(400).json({ error: 'Graduation year is required' });
    }

    // Get all alumni for this school and year
    const alumni = await prisma.alumni.findMany({
      where: {
        schoolId: req.schoolId,
        graduationYear: parseInt(graduationYear)
      },
      include: {
        student: {
          include: {
            school: { select: { code: true } }
          }
        }
      }
    });

    if (alumni.length === 0) {
      return res.status(404).json({ error: 'No alumni found for the specified graduation year' });
    }

    const results = [];
    const errors = [];
    const skipped = [];

    // Process each alumni
    for (const person of alumni) {
      try {
        // [RESTRICTION] Skip Transfer/Other and Expulsion
        if (person.programType === 'Transfer/Other' || person.programType === 'Expulsion') {
          skipped.push({ studentId: person.studentId, reason: person.programType });
          continue;
        }

        const student = person.student;
        const schoolCode = student.school.code || 'SCH';
        const certificateNumber = `CERT/${schoolCode}/${graduationYear}/${student.admissionNumber}`;

        const certificate = await prisma.certificate.upsert({
          where: {
            schoolId_studentId: {
              schoolId: req.schoolId,
              studentId: person.studentId
            }
          },
          update: {
            dateIssued: new Date(),
            issuedBy: req.user.id,
            programType: programType || undefined,
            content: content || undefined,
            commencementYear: commencementYear ? parseInt(commencementYear) : undefined
          },
          create: {
            schoolId: req.schoolId,
            studentId: person.studentId,
            certificateNumber,
            graduationYear: parseInt(graduationYear),
            programType: programType || null,
            content: content || null,
            commencementYear: commencementYear ? parseInt(commencementYear) : null,
            issuedBy: req.user.id
          }
        });
        results.push(certificate);
      } catch (err) {
        errors.push({ studentId: person.studentId, error: err.message });
      }
    }

    res.json({
      message: `Successfully processed ${results.length} certificates. ${skipped.length} students skipped due to status.`,
      count: results.length,
      skippedCount: skipped.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Error in bulk certificate generation:', error);
    res.status(500).json({ error: 'Failed to bulk generate certificates' });
  }
});

// Get all certificates for a graduation year (Admin/Principal only)
router.get('/bulk/:year', authenticate, authorize(['admin', 'principal']), async (req, res) => {
  try {
    const graduationYear = parseInt(req.params.year);

    const certificates = await prisma.certificate.findMany({
      where: {
        schoolId: req.schoolId,
        graduationYear: graduationYear
      },
      include: {
        student: {
          include: {
            user: { select: { firstName: true, lastName: true, username: true } },
            alumniProfile: { select: { graduationYear: true, alumniId: true, programType: true } },
            classModel: { select: { name: true } }
          }
        },
        school: { select: { name: true, logoUrl: true, address: true, primaryColor: true } },
        issuer: { select: { firstName: true, lastName: true } }
      },
      orderBy: {
        student: {
          user: {
            firstName: 'asc'
          }
        }
      }
    });

    res.json(certificates);
  } catch (error) {
    console.error('Error fetching bulk certificates:', error);
    res.status(500).json({ error: 'Failed to fetch certificates' });
  }
});

// Get all certificates for students who transitioned from a specific class in a specific session
router.get('/bulk-history/:classId/:sessionId', authenticate, authorize(['admin', 'principal']), async (req, res) => {
  try {
    const classId = parseInt(req.params.classId);
    const sessionId = parseInt(req.params.sessionId);

    // Get all students who have a promotion history from this class
    const transitions = await prisma.promotionHistory.findMany({
      where: {
        fromClassId: classId,
        academicSessionId: sessionId,
        student: {
          schoolId: req.schoolId
        }
      },
      select: {
        studentId: true
      }
    });

    const studentIds = transitions.map(t => t.studentId);

    if (studentIds.length === 0) {
      return res.json([]);
    }

    const certificates = await prisma.certificate.findMany({
      where: {
        schoolId: req.schoolId,
        studentId: {
          in: studentIds
        }
      },
      include: {
        student: {
          include: {
            user: { select: { firstName: true, lastName: true, username: true } },
            alumniProfile: { select: { graduationYear: true, alumniId: true, programType: true } },
            classModel: { select: { name: true } }
          }
        },
        school: { select: { name: true, logoUrl: true, address: true, primaryColor: true } },
        issuer: { select: { firstName: true, lastName: true } }
      },
      orderBy: {
        student: {
          user: {
            firstName: 'asc'
          }
        }
      }
    });

    res.json(certificates);
  } catch (error) {
    console.error('Error fetching bulk history certificates:', error);
    res.status(500).json({ error: 'Failed to fetch history certificates' });
  }
});

// Update certificate (Admin/Principal only)
router.put('/:certificateId', authenticate, authorize(['admin', 'principal']), async (req, res) => {
  try {
    const certificateId = parseInt(req.params.certificateId);
    const { content, commencementYear, programType } = req.body;

    const certificate = await prisma.certificate.update({
      where: {
        id: certificateId,
        schoolId: req.schoolId
      },
      data: {
        content,
        commencementYear: commencementYear ? parseInt(commencementYear) : undefined,
        programType: programType !== undefined ? programType : undefined
      }
    });

    res.json({ message: 'Certificate updated successfully', certificate });
  } catch (error) {
    console.error('Error updating certificate:', error);
    res.status(500).json({ error: 'Failed to update certificate' });
  }
});

// Get certificate for a student (Admin/Principal only)
router.get('/:studentId', authenticate, authorize(['admin', 'principal']), async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId);

    const certificate = await prisma.certificate.findFirst({
      where: {
        studentId,
        schoolId: req.schoolId
      },
      include: {
        student: {
          include: {
            user: { select: { firstName: true, lastName: true, username: true } },
            alumniProfile: { select: { graduationYear: true, alumniId: true } },
            classModel: { select: { name: true } }
          }
        },
        school: { select: { name: true, logoUrl: true, address: true, primaryColor: true } },
        issuer: { select: { firstName: true, lastName: true } }
      }
    });

    console.log(`[DEBUG] Certificate fetch for student ${studentId}:`, JSON.stringify(certificate, null, 2));

    if (!certificate) {
      return res.status(404).json({ error: 'Certificate not found for this student' });
    }

    if (!certificate.student) {
      console.error(`[ERROR] Certificate found but student relation missing for cert ID ${certificate.id}`);
    } else if (!certificate.student.user) {
      console.error(`[ERROR] Student found but user relation missing for student ID ${certificate.student.id}`);
    }

    res.json(certificate);
  } catch (error) {
    console.error('Error fetching certificate:', error);
    res.status(500).json({ error: 'Failed to fetch certificate' });
  }
});

module.exports = router;
