const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');

const prisma = new PrismaClient();

// Set current academic session (Admin only)
router.post('/set-current-session', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    // Verify session exists
    const session = await prisma.academicSession.findUnique({
      where: { id: parseInt(sessionId) }
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Set all sessions to not current
    await prisma.academicSession.updateMany({
      data: { isCurrent: false }
    });

    // Set selected session as current
    await prisma.academicSession.update({
      where: { id: parseInt(sessionId) },
      data: { isCurrent: true }
    });

    res.json({
      message: 'Current session updated successfully',
      session: session
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
    const term = await prisma.term.findUnique({
      where: { id: parseInt(termId) },
      include: { academicSession: true }
    });

    if (!term) {
      return res.status(404).json({ error: 'Term not found' });
    }

    // Set all terms in the same session to not current
    await prisma.term.updateMany({
      where: { academicSessionId: term.academicSessionId },
      data: { isCurrent: false }
    });

    // Set selected term as current
    await prisma.term.update({
      where: { id: parseInt(termId) },
      data: { isCurrent: true }
    });

    res.json({
      message: 'Current term updated successfully',
      term: term
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
      where: { isCurrent: true }
    });

    const currentTerm = await prisma.term.findFirst({
      where: { isCurrent: true },
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
