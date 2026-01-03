const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

// Get Notices
router.get('/', authenticate, async (req, res) => {
  try {
    const { role } = req.user;

    // Filter notices based on audience
    const notices = await prisma.notice.findMany({
      where: {
        isActive: true,
        OR: [
          { audience: 'all' },
          { audience: role } // 'student' or 'teacher' or 'admin'
        ]
      },
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { firstName: true, lastName: true } }
      }
    });

    res.json(notices);
  } catch (error) {
    console.error('Get notices error:', error);
    res.status(500).json({ error: 'Failed to fetch notices' });
  }
});

// Create Notice (Admin Only)
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { title, content, audience } = req.body;

    const notice = await prisma.notice.create({
      data: {
        title,
        content,
        audience, // 'all', 'student', 'teacher'
        authorId: req.user.id
      }
    });

    res.status(201).json(notice);
  } catch (error) {
    console.error('Create notice error:', error);
    res.status(500).json({ error: 'Failed to create notice' });
  }
});

// Delete Notice
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    await prisma.notice.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Notice deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

module.exports = router;
