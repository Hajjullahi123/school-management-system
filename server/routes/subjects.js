const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/audit');

// Get all subjects
router.get('/', authenticate, async (req, res) => {
  try {
    const subjects = await prisma.subject.findMany({
      where: { schoolId: req.schoolId }
    });
    res.json(subjects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create subject (Admin/Principal only)
router.post('/', authenticate, authorize(['admin', 'principal']), async (req, res) => {
  try {
    const { name, code } = req.body;

    // Validate required fields
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Subject name is required' });
    }

    // Check if subject with same name already exists
    const existingByName = await prisma.subject.findFirst({
      where: {
        schoolId: req.schoolId,
        name: name.trim()
      }
    });

    if (existingByName) {
      return res.status(400).json({
        error: `A subject named "${name}" already exists. Please use a different name or edit the existing subject.`
      });
    }

    // Check if subject with same code already exists (if code is provided)
    if (code && code.trim() !== '') {
      const existingByCode = await prisma.subject.findFirst({
        where: {
          schoolId: req.schoolId,
          code: code.trim()
        }
      });

      if (existingByCode) {
        return res.status(400).json({
          error: `A subject with code "${code}" already exists (${existingByCode.name}). Please use a different code.`
        });
      }
    }

    const subject = await prisma.subject.create({
      data: {
        schoolId: req.schoolId,
        name: name.trim(),
        code: code?.trim() === '' ? null : code?.trim()
      }
    });

    res.json(subject);

    // Log creation
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'CREATE',
      resource: 'SUBJECT',
      details: {
        subjectId: subject.id,
        name: subject.name,
        code: subject.code
      },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Subject creation error:', error);

    // Handle Prisma unique constraint errors (backup in case validation missed something)
    if (error.code === 'P2002') {
      const field = error.meta?.target?.[1] || 'field';
      if (field === 'code') {
        return res.status(400).json({ error: 'A subject with this code already exists' });
      }
      return res.status(400).json({ error: 'This subject already exists in the system' });
    }

    res.status(500).json({ error: 'Failed to create subject. Please try again.' });
  }
});

// Update subject (Admin/Principal only)
router.put('/:id', authenticate, authorize(['admin', 'principal']), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code } = req.body;
    const subject = await prisma.subject.update({
      where: {
        id: parseInt(id),
        schoolId: req.schoolId
      },
      data: {
        name,
        code: code?.trim() === '' ? null : code
      }
    });
    res.json(subject);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete subject (Admin/Principal only)
router.delete('/:id', authenticate, authorize(['admin', 'principal']), async (req, res) => {
  try {
    const { id } = req.params;
    const subjectId = parseInt(id);

    // Perform a pre-check for dependencies to provide specific feedback
    const [resultCount, timetableCount, homeworks, resources, cbtExams, classSubjects] = await Promise.all([
      prisma.result.count({ where: { subjectId, schoolId: req.schoolId } }),
      prisma.timetable.count({ where: { subjectId, schoolId: req.schoolId } }),
      prisma.homework.findMany({
        where: { subjectId, schoolId: req.schoolId },
        include: { class: { select: { name: true, arm: true } } }
      }),
      prisma.learningResource.findMany({
        where: { subjectId, schoolId: req.schoolId },
        include: { class: { select: { name: true, arm: true } } }
      }),
      prisma.cBTExam.findMany({
        where: { subjectId, schoolId: req.schoolId },
        include: { class: { select: { name: true, arm: true } } }
      }),
      prisma.classSubject.findMany({
        where: { subjectId, schoolId: req.schoolId },
        include: { class: { select: { name: true, arm: true } } }
      })
    ]);

    const dependencies = [];
    if (resultCount > 0) dependencies.push(`${resultCount} Student Result(s)`);
    if (timetableCount > 0) dependencies.push(`${timetableCount} Timetable Entry/Entries`);

    if (homeworks.length > 0) {
      const classNames = [...new Set(homeworks.map(h => `${h.class.name}${h.class.arm ? ` ${h.class.arm}` : ''}`))].join(', ');
      dependencies.push(`Homework Assignment(s) for: ${classNames}`);
    }
    if (resources.length > 0) {
      const classNames = [...new Set(resources.map(r => `${r.class.name}${r.class.arm ? ` ${r.class.arm}` : ''}`))].join(', ');
      dependencies.push(`Learning Resource(s) for: ${classNames}`);
    }
    if (cbtExams.length > 0) {
      const classNames = [...new Set(cbtExams.map(e => `${e.class.name}${e.class.arm ? ` ${e.class.arm}` : ''}`))].join(', ');
      dependencies.push(`CBT Exam(s) for: ${classNames}`);
    }
    if (classSubjects.length > 0) {
      const classNames = classSubjects.map(cs => `${cs.class.name}${cs.class.arm ? ` ${cs.class.arm}` : ''}`).join(', ');
      dependencies.push(`Class Assignment(s) for: ${classNames}`);
    }

    if (dependencies.length > 0) {
      return res.status(400).json({
        error: `Cannot delete subject. It is currently linked to:\n- ${dependencies.join('\n- ')}\n\nHOW TO FIX:\n1. Go to the respective modules (Results, Timetable, LMS, CBT, or Class Subjects).\n2. Remove the entries for this subject in the classes listed above.\n3. Once all links are removed, you can delete the subject here.`
      });
    }

    await prisma.subject.delete({
      where: {
        id: subjectId,
        schoolId: req.schoolId
      }
    });
    res.json({ message: 'Subject deleted successfully' });

    // Log deletion
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'DELETE',
      resource: 'SUBJECT',
      details: {
        subjectId: subjectId
      },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Subject deletion error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
