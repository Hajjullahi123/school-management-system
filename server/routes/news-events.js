const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/audit');
const multer = require('multer');
const path = require('path');

// Use memory storage for Base64 DB persistence (survives Render's ephemeral filesystem)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, JPG, PNG, GIF, WEBP) are allowed'));
    }
  }
});

// Helper: convert buffer to data URI
function fileToBase64(file) {
  const base64 = file.buffer.toString('base64');
  return `data:${file.mimetype};base64,${base64}`;
}

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

// GET /api/news-events/all - Get all news/events including unpublished (admin/principal only)
router.get('/all', authenticate, authorize(['admin', 'principal']), async (req, res) => {
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

// POST /api/news-events - Create new news/event (admin/principal only)
router.post('/', authenticate, authorize(['admin', 'principal']), upload.single('image'), async (req, res) => {
  try {
    const { title, content, type, eventDate } = req.body;
    let { imageUrl } = req.body;

    if (!title || !content || !type) {
      return res.status(400).json({ error: 'Title, content, and type are required' });
    }

    if (!['news', 'event'].includes(type)) {
      return res.status(400).json({ error: 'Type must be either "news" or "event"' });
    }

    // Convert to base64 if a photo was uploaded
    if (req.file) {
      imageUrl = fileToBase64(req.file);
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

// PUT /api/news-events/:id - Update news/event (admin/principal only)
router.put('/:id', authenticate, authorize(['admin', 'principal']), upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, type, eventDate, isPublished } = req.body;
    let { imageUrl } = req.body;

    // Convert to base64 if a photo was uploaded
    if (req.file) {
      imageUrl = fileToBase64(req.file);
    }

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

// PUT /api/news-events/:id/publish - Toggle publish status (admin/principal only)
router.put('/:id/publish', authenticate, authorize(['admin', 'principal']), async (req, res) => {
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

// DELETE /api/news-events/:id - Delete news/event (admin/principal only)
router.delete('/:id', authenticate, authorize(['admin', 'principal']), async (req, res) => {
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
