const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

// Public verification route
router.get('/verify/:testimonialNumber', async (req, res) => {
  try {
    const { testimonialNumber } = req.params;

    const testimonial = await prisma.testimonial.findUnique({
      where: { testimonialNumber },
      include: {
        student: {
          include: {
            user: { select: { firstName: true, lastName: true } }
          }
        },
        school: { select: { name: true, logoUrl: true } }
      }
    });

    if (!testimonial) {
      return res.status(404).json({ verified: false, error: 'Testimonial not found' });
    }

    res.json({
      verified: true,
      studentName: testimonial.student.middleName ? `${testimonial.student.user.firstName} ${testimonial.student.user.lastName} ${testimonial.student.middleName}` : `${testimonial.student.user.firstName} ${testimonial.student.user.lastName}`,
      schoolName: testimonial.school.name,
      conduct: testimonial.conduct,
      character: testimonial.character,
      dateIssued: testimonial.dateIssued,
      testimonialNumber: testimonial.testimonialNumber
    });
  } catch (error) {
    console.error('Testimonial verification error:', error);
    res.status(500).json({ verified: false, error: 'Verification system error' });
  }
});

// Bulk generate testimonials for a specific graduation year (Admin/Principal only)
router.post('/bulk-generate', authenticate, authorize(['admin', 'principal']), async (req, res) => {
  try {
    const { graduationYear, programType, conduct, character, remarks } = req.body;

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
        const testimonialNumber = `TEST/${schoolCode}/${graduationYear}/${student.admissionNumber}`;

        const testimonial = await prisma.testimonial.upsert({
          where: {
            schoolId_studentId: {
              schoolId: req.schoolId,
              studentId: person.studentId
            }
          },
          update: {
            conduct: conduct || undefined,
            character: character || undefined,
            remarks: remarks || undefined,
            programType: programType || undefined,
            dateIssued: new Date(),
            issuedBy: req.user.id
          },
          create: {
            schoolId: req.schoolId,
            studentId: person.studentId,
            testimonialNumber,
            conduct: conduct || 'Good',
            character: character || '',
            remarks: remarks || '',
            programType: programType || null,
            issuedBy: req.user.id
          }
        });
        results.push(testimonial);
      } catch (err) {
        errors.push({ studentId: person.studentId, error: err.message });
      }
    }

    res.json({
      message: `Successfully processed ${results.length} testimonials. ${skipped.length} students skipped due to status.`,
      count: results.length,
      skippedCount: skipped.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Error in bulk testimonial generation:', error);
    res.status(500).json({ error: 'Failed to bulk generate testimonials' });
  }
});

// Get all testimonials for a graduation year (Admin/Principal only)
router.get('/bulk/:year', authenticate, authorize(['admin', 'principal']), async (req, res) => {
  try {
    const graduationYear = parseInt(req.params.year);

    const testimonials = await prisma.testimonial.findMany({
      where: {
        schoolId: req.schoolId,
        student: {
          alumniProfile: {
            graduationYear: graduationYear
          }
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

    res.json(testimonials);
  } catch (error) {
    console.error('Error fetching bulk testimonials:', error);
    res.status(500).json({ error: 'Failed to fetch testimonials' });
  }
});

// Get all testimonials for students who transitioned from a specific class in a specific session
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

    const testimonials = await prisma.testimonial.findMany({
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

    res.json(testimonials);
  } catch (error) {
    console.error('Error fetching bulk history testimonials:', error);
    res.status(500).json({ error: 'Failed to fetch history testimonials' });
  }
});

// Generate or regenerate testimonial for a student (Admin/Principal only)
router.post('/generate/:studentId', authenticate, authorize(['admin', 'principal']), async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId);
    const { conduct, character, remarks, programType } = req.body;

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
      return res.status(400).json({ error: 'Testimonial can only be generated for students with a graduation/completion record' });
    }

    const schoolCode = student.school.code || 'SCH';
    const graduationYear = student.alumniProfile.graduationYear;
    const testimonialNumber = `TEST/${schoolCode}/${graduationYear}/${student.admissionNumber}`;

    // Upsert testimonial (create or update)
    const testimonial = await prisma.testimonial.upsert({
      where: {
        schoolId_studentId: {
          schoolId: req.schoolId,
          studentId
        }
      },
      update: {
        conduct: conduct || undefined,
        character: character || undefined,
        remarks: remarks || undefined,
        dateIssued: new Date(),
        issuedBy: req.user.id
      },
      create: {
        schoolId: req.schoolId,
        studentId,
        testimonialNumber,
        conduct: conduct || 'Good',
        character: character || '',
        remarks,
        programType: programType || null,
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
      message: 'Testimonial generated successfully',
      testimonial
    });
  } catch (error) {
    console.error('Error generating testimonial:', error);
    res.status(500).json({ error: 'Failed to generate testimonial' });
  }
});

// Update testimonial details (Admin/Principal only)
router.put('/:studentId', authenticate, authorize(['admin', 'principal']), async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId);
    const { conduct, character, remarks, programType } = req.body;
    console.log(`[DEBUG] Updating testimonial for student ${studentId}:`, { conduct, character, remarks, programType });

    const testimonial = await prisma.testimonial.updateMany({
      where: {
        studentId,
        schoolId: req.schoolId
      },
      data: {
        conduct: conduct !== undefined ? conduct : undefined,
        character: character !== undefined ? character : undefined,
        remarks: remarks !== undefined ? (remarks === '' ? null : remarks) : undefined,
        programType: programType !== undefined ? (programType === '' ? null : programType) : undefined
      }
    });

    console.log(`[DEBUG] Update result:`, testimonial);

    if (testimonial.count === 0) {
      return res.status(404).json({ error: 'Testimonial not found' });
    }

    res.json({ message: 'Testimonial updated successfully' });
  } catch (error) {
    console.error('Error updating testimonial:', error);
    res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
});

// Get testimonial for a student (Admin/Principal only)
router.get('/:studentId', authenticate, authorize(['admin', 'principal']), async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId);
    console.log(`[DEBUG] Fetching testimonial for student ID: ${studentId}, School ID: ${req.schoolId}`);

    if (isNaN(studentId)) {
      console.error(`[ERROR] Invalid studentId provided: ${req.params.studentId}`);
      return res.status(400).json({ error: 'Invalid student ID' });
    }

    const testimonial = await prisma.testimonial.findFirst({
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

    if (!testimonial) {
      console.log(`[DEBUG] Testimonial NOT FOUND for student ID: ${studentId}`);
      return res.status(404).json({ error: 'Testimonial not found for this student' });
    }

    console.log(`[DEBUG] Testimonial FOUND for student ID: ${studentId}`);
    res.json(testimonial);
  } catch (error) {
    console.error('Error fetching testimonial:', error);
    res.status(500).json({ error: 'Failed to fetch testimonial: ' + error.message });
  }
});

module.exports = router;
