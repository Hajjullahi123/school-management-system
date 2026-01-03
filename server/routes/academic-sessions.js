const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/audit');

// Get all academic sessions
router.get('/', authenticate, async (req, res) => {
  try {
    const sessions = await prisma.academicSession.findMany({
      where: { schoolId: req.schoolId },
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
router.get('/current', authenticate, async (req, res) => {
  try {
    // If we have a req.schoolId from authenticate, use it. 
    // Otherwise check query param for unauthenticated landing page support
    const schoolId = req.schoolId || (req.query.schoolId ? parseInt(req.query.schoolId) : undefined);

    if (!schoolId) {
      return res.status(400).json({ error: 'School ID is required' });
    }

    const session = await prisma.academicSession.findFirst({
      where: {
        isCurrent: true,
        schoolId: schoolId
      },
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

    // If setting as current, unset other current sessions for THIS school
    if (isCurrent) {
      await prisma.academicSession.updateMany({
        where: {
          isCurrent: true,
          schoolId: req.schoolId
        },
        data: { isCurrent: false }
      });
    }

    const session = await prisma.academicSession.create({
      data: {
        schoolId: req.schoolId,
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isCurrent: isCurrent || false
      }
    });

    res.status(201).json(session);

    // Log creation
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'CREATE',
      resource: 'ACADEMIC_SESSION',
      details: {
        sessionId: session.id,
        name: session.name,
        isCurrent: session.isCurrent
      },
      ipAddress: req.ip
    });
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

    // If setting as current, unset other current sessions for THIS school
    if (isCurrent) {
      await prisma.academicSession.updateMany({
        where: {
          isCurrent: true,
          schoolId: req.schoolId,
          id: { not: parseInt(id) }
        },
        data: { isCurrent: false }
      });
    }

    const session = await prisma.academicSession.update({
      where: {
        id: parseInt(id),
        schoolId: req.schoolId
      },
      data: {
        name,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        isCurrent
      }
    });

    res.json(session);

    // Log update
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'UPDATE',
      resource: 'ACADEMIC_SESSION',
      details: {
        sessionId: session.id,
        updates: Object.keys(req.body)
      },
      ipAddress: req.ip
    });
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
      where: {
        id: parseInt(id),
        schoolId: req.schoolId
      }
    });

    res.json({ message: 'Academic session deleted successfully' });

    // Log deletion
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'DELETE',
      resource: 'ACADEMIC_SESSION',
      details: {
        sessionId: parseInt(id)
      },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Delete session error:', error);
    res.status(500).json({ error: 'Failed to delete academic session' });
  }
});

// Set academic session as current (Admin only)
router.put('/:id/set-current', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    // Unset all other current sessions in THIS school
    await prisma.academicSession.updateMany({
      where: {
        isCurrent: true,
        schoolId: req.schoolId
      },
      data: { isCurrent: false }
    });

    // Set this session as current
    const session = await prisma.academicSession.update({
      where: {
        id: parseInt(id),
        schoolId: req.schoolId
      },
      data: { isCurrent: true }
    });

    res.json({ message: 'Current academic session updated successfully', session });

    // Log action
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'UPDATE',
      resource: 'ACADEMIC_SESSION',
      details: {
        sessionId: session.id,
        action: 'SET_CURRENT'
      },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Set current session error:', error);
    res.status(500).json({ error: 'Failed to set current academic session' });
  }
});

module.exports = router;
