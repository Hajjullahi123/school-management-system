const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

// Get all audit logs (Admin only)
router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { action, resource, userId, startDate, endDate, limit = 50, offset = 0 } = req.query;

    const where = {
      schoolId: req.schoolId
    };

    if (action) where.action = action;
    if (resource) where.resource = resource;
    if (userId) where.userId = parseInt(userId);

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          school: {
            select: { name: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset)
      }),
      prisma.auditLog.count({ where })
    ]);

    // Fetch user details manually to avoid complex includes if users are deleted
    const userIds = [...new Set(logs.map(log => log.userId).filter(Boolean))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, firstName: true, lastName: true, username: true }
    });

    const userMap = users.reduce((acc, user) => {
      acc[user.id] = user;
      return acc;
    }, {});

    const enrichedLogs = logs.map(log => ({
      ...log,
      user: log.userId ? userMap[log.userId] : null
    }));

    res.json({
      logs: enrichedLogs,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

module.exports = router;
