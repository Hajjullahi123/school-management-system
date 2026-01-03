const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/audit');

// Set current academic session (Admin only)
router.post('/set-current-session', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    // Verify session exists
    const session = await prisma.academicSession.findFirst({
      where: {
        id: parseInt(sessionId),
        schoolId: req.schoolId
      }
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Set all sessions to not current in THIS school
    await prisma.academicSession.updateMany({
      where: { schoolId: req.schoolId },
      data: { isCurrent: false }
    });

    // Set selected session as current
    await prisma.academicSession.update({
      where: {
        id: parseInt(sessionId),
        schoolId: req.schoolId
      },
      data: { isCurrent: true }
    });

    res.json({
      message: 'Current session updated successfully',
      session: session
    });

    // Log the action
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'SET_CURRENT_SESSION',
      resource: 'SYSTEM_SETTINGS',
      details: {
        sessionId: parseInt(sessionId),
        sessionName: session.name
      },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Error setting current session:', error);
    res.status(500).json({ error: 'Failed to update current session' });
  }
});

// Set current term (Admin only)
router.post('/set-current-term', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { termId } = req.body;

    if (!termId) {
      return res.status(400).json({ error: 'Term ID is required' });
    }

    // Verify term exists
    const term = await prisma.term.findFirst({
      where: {
        id: parseInt(termId),
        schoolId: req.schoolId
      },
      include: { academicSession: true }
    });

    if (!term) {
      return res.status(404).json({ error: 'Term not found' });
    }

    // Set all terms in the same session to not current
    await prisma.term.updateMany({
      where: {
        academicSessionId: term.academicSessionId,
        schoolId: req.schoolId
      },
      data: { isCurrent: false }
    });

    // Set selected term as current
    await prisma.term.update({
      where: {
        id: parseInt(termId),
        schoolId: req.schoolId
      },
      data: { isCurrent: true }
    });

    res.json({
      message: 'Current term updated successfully',
      term: term
    });

    // Log the action
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'SET_CURRENT_TERM',
      resource: 'SYSTEM_SETTINGS',
      details: {
        termId: parseInt(termId),
        termName: term.name,
        sessionId: term.academicSessionId
      },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Error setting current term:', error);
    res.status(500).json({ error: 'Failed to update current term' });
  }
});

// Get system settings
router.get('/settings', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const currentSession = await prisma.academicSession.findFirst({
      where: {
        isCurrent: true,
        schoolId: req.schoolId
      }
    });

    const currentTerm = await prisma.term.findFirst({
      where: {
        isCurrent: true,
        schoolId: req.schoolId
      },
      include: { academicSession: true }
    });

    res.json({
      currentSession,
      currentTerm
    });
  } catch (error) {
    console.error('Error getting system settings:', error);
    res.status(500).json({ error: 'Failed to get system settings' });
  }
});

module.exports = router;
