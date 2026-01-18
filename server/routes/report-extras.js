const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/audit');

// Get grading domains (psychomotor, etc)
router.get('/domains', authenticate, async (req, res) => {
  try {
    const domains = await prisma.psychomotorDomain.findMany({
      where: {
        isActive: true,
        schoolId: req.schoolId
      },
      orderBy: { name: 'asc' }
    });
    res.json(domains);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch domains' });
  }
});

// Get remarks/psychomotor for a student in a term
router.get('/:studentId/:termId', authenticate, async (req, res) => {
  try {
    const { studentId, termId } = req.params;

    const reportExtras = await prisma.studentReportCard.findFirst({
      where: {
        studentId: parseInt(studentId),
        termId: parseInt(termId),
        schoolId: req.schoolId
      }
    });

    if (!reportExtras) {
      // Return empty structure instead of 404 to simplify frontend logic
      return res.json({
        formMasterRemark: '',
        principalRemark: '',
        psychomotorRatings: []
      });
    }

    // Parse JSON string to object
    const ratings = reportExtras.psychomotorRatings ? JSON.parse(reportExtras.psychomotorRatings) : [];

    res.json({
      ...reportExtras,
      psychomotorRatings: ratings
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch report details' });
  }
});

// Save remarks/psychomotor
router.post('/save', authenticate, authorize(['admin', 'teacher']), async (req, res) => {
  try {
    const {
      studentId,
      termId,
      classId,
      formMasterRemark,
      principalRemark,
      psychomotorRatings
    } = req.body;

    // Get Term to find Session Id
    const term = await prisma.term.findFirst({
      where: {
        id: parseInt(termId),
        schoolId: req.schoolId
      }
    });

    if (!term) return res.status(404).json({ error: 'Term not found' });

    // Upsert
    const reportCard = await prisma.studentReportCard.upsert({
      where: {
        schoolId_studentId_termId_academicSessionId: {
          schoolId: req.schoolId,
          studentId: parseInt(studentId),
          termId: parseInt(termId),
          academicSessionId: term.academicSessionId
        }
      },
      update: {
        formMasterRemark,
        // Only update principal remark if provided (or if admin?)
        // principalRemark, 
        // Logic: if user is admin, they can update principal remark. If teacher, maybe they can too as per requirements "remark on behalf of headmaster"
        principalRemark,
        psychomotorRatings: JSON.stringify(psychomotorRatings)
      },
      create: {
        schoolId: req.schoolId,
        studentId: parseInt(studentId),
        termId: parseInt(termId),
        academicSessionId: term.academicSessionId,
        classId: parseInt(classId),
        formMasterRemark,
        principalRemark,
        psychomotorRatings: JSON.stringify(psychomotorRatings)
      }
    });

    res.json(reportCard);

    // Log the action
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'UPDATE',
      resource: 'REPORT_CARD_EXTRAS',
      details: {
        studentId: parseInt(studentId),
        termId: parseInt(termId),
        classId: parseInt(classId),
        hasFormMasterRemark: !!formMasterRemark,
        hasPrincipalRemark: !!principalRemark,
        psychomotorCount: psychomotorRatings?.length || 0
      },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Save report extras error:', error);
    res.status(500).json({ error: 'Failed to save report details' });
  }
});

// Get remark suggestions based on grade
router.get('/suggestions/:grade', authenticate, (req, res) => {
  const { grade } = req.params;
  const { getSuggestedRemarks } = require('../utils/grading');
  const suggestions = getSuggestedRemarks(grade.toUpperCase());
  res.json(suggestions);
});

module.exports = router;
