const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/audit');

// Get Notices
router.get('/', authenticate, async (req, res) => {
  try {
    const { role } = req.user;

    // Filter notices based on audience
    const notices = await prisma.notice.findMany({
      where: {
        schoolId: req.schoolId,
        isActive: true,
        OR: [
          { audience: 'all' },
          { audience: role },
          { audience: `user:${req.user.id}` }
        ],
        AND: [
          {
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: new Date() } }
            ]
          }
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

// Create Notice (Admin/Principal Only)
router.post('/', authenticate, authorize(['admin', 'principal']), async (req, res) => {
  try {
    const { title, content, audience } = req.body;

    const notice = await prisma.notice.create({
      data: {
        schoolId: req.schoolId,
        title,
        content,
        audience, // 'all', 'student', 'teacher'
        authorId: req.user.id
      }
    });

    res.status(201).json(notice);

    // Log the action
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'CREATE',
      resource: 'NOTICE',
      details: {
        noticeId: notice.id,
        title: notice.title,
        audience: notice.audience
      },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Create notice error:', error);
    res.status(500).json({ error: 'Failed to create notice' });
  }
});

// Delete Notice (Admin/Principal Only)
router.delete('/:id', authenticate, authorize(['admin', 'principal']), async (req, res) => {
  try {
    await prisma.notice.delete({
      where: {
        id: parseInt(req.params.id),
        schoolId: req.schoolId
      }
    });
    res.json({ message: 'Notice deleted' });

    // Log the deletion
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'DELETE',
      resource: 'NOTICE',
      details: {
        noticeId: parseInt(req.params.id)
      },
      ipAddress: req.ip
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

module.exports = router;
