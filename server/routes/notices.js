const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/audit');

// Get Notices
router.get('/', authenticate, async (req, res) => {
  try {
    const { role, id: userId } = req.user;

    // Fetch all active, non-expired notices for this school
    const allNotices = await prisma.notice.findMany({
      where: {
        schoolId: req.schoolId,
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      },
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { firstName: true, lastName: true } }
      }
    });

    // Filter by audience in JS so we have precise control:
    // - 'all'           → everyone
    // - 'teacher'       → only teachers
    // - 'student'       → only students
    // - 'parent'        → only parents
    // - 'admin'         → only admins
    // - 'principal'     → only principals
    // - 'accountant'    → only accountants
    // - 'user:123'      → only the specific user with id 123
    const notices = allNotices.filter(notice => {
      const aud = notice.audience;
      if (!aud || aud === 'all') return true;
      if (aud.startsWith('user:')) {
        return aud === `user:${userId}`; // Strict match — only this user
      }
      return aud === role; // Role-based audience
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
