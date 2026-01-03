const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

// Helper function to get term order for sorting
const getTermOrder = (termName) => {
  const name = termName.toLowerCase();
  if (name.includes('first') || name.includes('1st')) return 1;
  if (name.includes('second') || name.includes('2nd')) return 2;
  if (name.includes('third') || name.includes('3rd')) return 3;
  return 4; // Unknown terms go last
};

// Get all terms
router.get('/', async (req, res) => {
  try {
    const { academicSessionId } = req.query;

    const where = {};
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
router.get('/current', async (req, res) => {
  try {
    const term = await prisma.term.findFirst({
      where: { isCurrent: true },
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

    // If setting as current, unset other current terms
    if (isCurrent) {
      await prisma.term.updateMany({
        where: { isCurrent: true },
        data: { isCurrent: false }
      });
    }

    const term = await prisma.term.create({
      data: {
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

    // If setting as current, unset other current terms
    if (isCurrent) {
      await prisma.term.updateMany({
        where: {
          isCurrent: true,
          id: { not: parseInt(id) }
        },
        data: { isCurrent: false }
      });
    }

    const term = await prisma.term.update({
      where: { id: parseInt(id) },
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
      where: { id: parseInt(id) }
    });

    res.json({ message: 'Term deleted successfully' });
  } catch (error) {
    console.error('Delete term error:', error);
    res.status(500).json({ error: 'Failed to delete term' });
  }
});

// Set term as current (Admin only)
router.put('/:id/set-current', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    // Unset all other current terms
    await prisma.term.updateMany({
      where: { isCurrent: true },
      data: { isCurrent: false }
    });

    // Set this term as current
    const term = await prisma.term.update({
      where: { id: parseInt(id) },
      data: { isCurrent: true },
      include: {
        academicSession: true
      }
    });

    res.json({ message: 'Current term updated successfully', term });
  } catch (error) {
    console.error('Set current term error:', error);
    res.status(500).json({ error: 'Failed to set current term' });
  }
});

module.exports = router;
