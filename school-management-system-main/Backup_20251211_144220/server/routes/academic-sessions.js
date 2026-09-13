const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

// Get all academic sessions
router.get('/', async (req, res) => {
  try {
    const sessions = await prisma.academicSession.findMany({
      include: {
        terms: true,
        _count: {
          select: { results: true }
        }
      },
      orderBy: { startDate: 'desc' }
    });
    res.json(sessions);
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: 'Failed to fetch academic sessions' });
  }
});

// Get current academic session
router.get('/current', async (req, res) => {
  try {
    const session = await prisma.academicSession.findFirst({
      where: { isCurrent: true },
      include: {
        terms: {
          orderBy: { startDate: 'asc' }
        }
      }
    });

    if (!session) {
      return res.status(404).json({ error: 'No current academic session found' });
    }

    res.json(session);
  } catch (error) {
    console.error('Get current session error:', error);
    res.status(500).json({ error: 'Failed to fetch current session' });
  }
});

// Create academic session (Admin only)
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { name, startDate, endDate, isCurrent } = req.body;

    if (!name || !startDate || !endDate) {
      return res.status(400).json({ error: 'Name, start date, and end date are required' });
    }

    // If setting as current, unset other current sessions
    if (isCurrent) {
      await prisma.academicSession.updateMany({
        where: { isCurrent: true },
        data: { isCurrent: false }
      });
    }

    const session = await prisma.academicSession.create({
      data: {
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isCurrent: isCurrent || false
      }
    });

    res.status(201).json(session);
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({ error: 'Failed to create academic session' });
  }
});

// Update academic session (Admin only)
router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, startDate, endDate, isCurrent } = req.body;

    // If setting as current, unset other current sessions
    if (isCurrent) {
      await prisma.academicSession.updateMany({
        where: {
          isCurrent: true,
          id: { not: parseInt(id) }
        },
        data: { isCurrent: false }
      });
    }

    const session = await prisma.academicSession.update({
      where: { id: parseInt(id) },
      data: {
        name,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        isCurrent
      }
    });

    res.json(session);
  } catch (error) {
    console.error('Update session error:', error);
    res.status(500).json({ error: 'Failed to update academic session' });
  }
});

// Delete academic session (Admin only)
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.academicSession.delete({
      where: { id: parseInt(id) }
    });

    res.json({ message: 'Academic session deleted successfully' });
  } catch (error) {
    console.error('Delete session error:', error);
    res.status(500).json({ error: 'Failed to delete academic session' });
  }
});

module.exports = router;
