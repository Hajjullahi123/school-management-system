const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/audit');

// Helper function to get term order for sorting
const getTermOrder = (termName) => {
  const name = termName.toLowerCase();
  if (name.includes('first') || name.includes('1st')) return 1;
  if (name.includes('second') || name.includes('2nd')) return 2;
  if (name.includes('third') || name.includes('3rd')) return 3;
  return 4; // Unknown terms go last
};

// Get all terms
router.get('/', authenticate, async (req, res) => {
  try {
    const { academicSessionId } = req.query;

    const where = { schoolId: req.schoolId };
    if (academicSessionId) {
      where.academicSessionId = parseInt(academicSessionId);
    }

    const terms = await prisma.term.findMany({
      where,
      include: {
        academicSession: true,
        _count: {
          select: { results: true }
        }
      }
    });

    // Sort terms by session (descending) and then by term order (First, Second, Third)
    terms.sort((a, b) => {
      // First sort by academic session (most recent first)
      const sessionCompare = b.academicSession.name.localeCompare(a.academicSession.name);
      if (sessionCompare !== 0) return sessionCompare;

      // Then sort by term order (First, Second, Third)
      return getTermOrder(a.name) - getTermOrder(b.name);
    });

    res.json(terms);
  } catch (error) {
    console.error('Get terms error:', error);
    res.status(500).json({ error: 'Failed to fetch terms' });
  }
});

// Get current term
router.get('/current', authenticate, async (req, res) => {
  try {
    const schoolId = req.schoolId || (req.query.schoolId ? parseInt(req.query.schoolId) : undefined);

    if (!schoolId) {
      return res.status(400).json({ error: 'School ID is required' });
    }

    const term = await prisma.term.findFirst({
      where: {
        isCurrent: true,
        schoolId: schoolId
      },
      include: {
        academicSession: true
      }
    });

    if (!term) {
      return res.status(404).json({ error: 'No current term found' });
    }

    res.json(term);
  } catch (error) {
    console.error('Get current term error:', error);
    res.status(500).json({ error: 'Failed to fetch current term' });
  }
});

// Create term (Admin only)
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { academicSessionId, name, startDate, endDate, isCurrent } = req.body;

    if (!academicSessionId || !name || !startDate || !endDate) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // If setting as current, unset other current terms in THIS school
    if (isCurrent) {
      await prisma.term.updateMany({
        where: {
          isCurrent: true,
          schoolId: req.schoolId
        },
        data: { isCurrent: false }
      });
    }

    const term = await prisma.term.create({
      data: {
        schoolId: req.schoolId,
        academicSessionId: parseInt(academicSessionId),
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isCurrent: isCurrent || false
      },
      include: {
        academicSession: true
      }
    });

    res.status(201).json(term);

    // Log creation
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'CREATE',
      resource: 'TERM',
      details: {
        termId: term.id,
        sessionId: parseInt(academicSessionId),
        name: term.name,
        isCurrent: term.isCurrent
      },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Create term error:', error);
    res.status(500).json({ error: 'Failed to create term' });
  }
});

// Update term (Admin only)
router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, startDate, endDate, isCurrent } = req.body;

    // If setting as current, unset other current terms in THIS school
    if (isCurrent) {
      await prisma.term.updateMany({
        where: {
          isCurrent: true,
          schoolId: req.schoolId,
          id: { not: parseInt(id) }
        },
        data: { isCurrent: false }
      });
    }

    const term = await prisma.term.update({
      where: {
        id: parseInt(id),
        schoolId: req.schoolId
      },
      data: {
        name,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        isCurrent
      },
      include: {
        academicSession: true
      }
    });

    res.json(term);

    // Log update
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'UPDATE',
      resource: 'TERM',
      details: {
        termId: term.id,
        updates: Object.keys(req.body)
      },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Update term error:', error);
    res.status(500).json({ error: 'Failed to update term' });
  }
});

// Delete term (Admin only)
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.term.delete({
      where: {
        id: parseInt(id),
        schoolId: req.schoolId
      }
    });

    res.json({ message: 'Term deleted successfully' });

    // Log deletion
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'DELETE',
      resource: 'TERM',
      details: {
        termId: parseInt(id)
      },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Delete term error:', error);
    res.status(500).json({ error: 'Failed to delete term' });
  }
});

// Set term as current (Admin only)
router.put('/:id/set-current', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    // Unset all other current terms in THIS school
    await prisma.term.updateMany({
      where: {
        isCurrent: true,
        schoolId: req.schoolId
      },
      data: { isCurrent: false }
    });

    // Set this term as current
    const term = await prisma.term.update({
      where: {
        id: parseInt(id),
        schoolId: req.schoolId
      },
      data: { isCurrent: true },
      include: {
        academicSession: true
      }
    });

    res.json({ message: 'Current term updated successfully', term });

    // Log set-current
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'UPDATE',
      resource: 'TERM',
      details: {
        termId: term.id,
        action: 'SET_CURRENT'
      },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Set current term error:', error);
    res.status(500).json({ error: 'Failed to set current term' });
  }
});

module.exports = router;
