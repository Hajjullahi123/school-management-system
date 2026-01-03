const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/audit');

// GET /api/news-events - Get all published news/events (public)
router.get('/', async (req, res) => {
  try {
    const { type, limit } = req.query;
    const schoolParam = req.query.school;
    let schoolId = req.schoolId;

    if (!schoolId && schoolParam) {
      const school = await prisma.school.findFirst({
        where: {
          OR: [
            { id: isNaN(parseInt(schoolParam)) ? -1 : parseInt(schoolParam) },
            { slug: schoolParam }
          ]
        }
      });
      if (school) schoolId = school.id;
    }

    if (!schoolId) {
      return res.status(400).json({ error: 'School identifier is required' });
    }

    const where = {
      isPublished: true,
      schoolId: schoolId
    };

    if (type && (type === 'news' || type === 'event')) {
      where.type = type;
    }

    const items = await prisma.newsEvent.findMany({
      where,
      include: {
        User: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit ? parseInt(limit) : undefined
    });

    res.json(items);
  } catch (error) {
    console.error('Error fetching news/events:', error);
    res.status(500).json({ error: 'Failed to fetch news/events' });
  }
});

// GET /api/news-events/all - Get all news/events including unpublished (admin only)
router.get('/all', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const items = await prisma.newsEvent.findMany({
      where: { schoolId: req.schoolId },
      include: {
        User: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(items);
  } catch (error) {
    console.error('Error fetching all news/events:', error);
    res.status(500).json({ error: 'Failed to fetch news/events' });
  }
});

// GET /api/news-events/:id - Get single news/event by ID (public if published)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const item = await prisma.newsEvent.findFirst({
      where: {
        id: parseInt(id),
        schoolId: req.schoolId
      },
      include: {
        User: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    if (!item) {
      return res.status(404).json({ error: 'News/event not found' });
    }

    // If not published, only admin can view (and must be same school)
    if (!item.isPublished && (!req.user || req.user.role !== 'admin' || req.schoolId !== item.schoolId)) {
      return res.status(403).json({ error: 'This item is not published yet' });
    }

    res.json(item);
  } catch (error) {
    console.error('Error fetching news/event:', error);
    res.status(500).json({ error: 'Failed to fetch news/event' });
  }
});

// POST /api/news-events - Create new news/event (admin only)
router.post('/', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { title, content, type, eventDate, imageUrl } = req.body;

    if (!title || !content || !type) {
      return res.status(400).json({ error: 'Title, content, and type are required' });
    }

    if (!['news', 'event'].includes(type)) {
      return res.status(400).json({ error: 'Type must be either "news" or "event"' });
    }

    const item = await prisma.newsEvent.create({
      data: {
        schoolId: req.schoolId,
        title,
        content,
        type,
        eventDate: eventDate ? new Date(eventDate) : null,
        imageUrl,
        authorId: req.user.id
      },
      include: {
        User: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    res.status(201).json(item);

    // Log the action
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'CREATE',
      resource: 'NEWS_EVENT',
      details: {
        itemId: item.id,
        title: item.title,
        type: item.type
      },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Error creating news/event:', error);
    res.status(500).json({ error: 'Failed to create news/event' });
  }
});

// PUT /api/news-events/:id - Update news/event (admin only)
router.put('/:id', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, type, eventDate, imageUrl, isPublished } = req.body;

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (type !== undefined) updateData.type = type;
    if (eventDate !== undefined) updateData.eventDate = eventDate ? new Date(eventDate) : null;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (isPublished !== undefined) updateData.isPublished = isPublished;

    const item = await prisma.newsEvent.update({
      where: {
        id: parseInt(id),
        schoolId: req.schoolId
      },
      data: updateData,
      include: {
        User: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    res.json(item);

    // Log the action
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'UPDATE',
      resource: 'NEWS_EVENT',
      details: {
        itemId: item.id,
        updates: Object.keys(updateData)
      },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Error updating news/event:', error);
    res.status(500).json({ error: 'Failed to update news/event' });
  }
});

// PUT /api/news-events/:id/publish - Toggle publish status (admin only)
router.put('/:id/publish', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { isPublished } = req.body;

    const item = await prisma.newsEvent.update({
      where: {
        id: parseInt(id),
        schoolId: req.schoolId
      },
      data: { isPublished },
      include: {
        User: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    res.json(item);

    // Log the action
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: item.isPublished ? 'PUBLISH' : 'UNPUBLISH',
      resource: 'NEWS_EVENT',
      details: {
        itemId: item.id
      },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Error toggling publish status:', error);
    res.status(500).json({ error: 'Failed to toggle publish status' });
  }
});

// DELETE /api/news-events/:id - Delete news/event (admin only)
router.delete('/:id', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.newsEvent.delete({
      where: {
        id: parseInt(id),
        schoolId: req.schoolId
      }
    });

    res.json({ message: 'News/event deleted successfully' });

    // Log the deletion
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'DELETE',
      resource: 'NEWS_EVENT',
      details: {
        itemId: parseInt(id)
      },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Error deleting news/event:', error);
    res.status(500).json({ error: 'Failed to delete news/event' });
  }
});

module.exports = router;
