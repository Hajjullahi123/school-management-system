const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/audit');

// GET /api/gallery/images - Get all active gallery images (public)
router.get('/images', async (req, res) => {
  try {
    const { category } = req.query;
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
      isActive: true,
      schoolId: schoolId
    };

    if (category && category !== 'all') {
      where.category = category;
    }

    const images = await prisma.galleryImage.findMany({
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
      }
    });

    res.json(images);
  } catch (error) {
    console.error('Error fetching gallery images:', error);
    res.status(500).json({ error: 'Failed to fetch gallery images' });
  }
});

// GET /api/gallery/categories - Get all unique categories
router.get('/categories', async (req, res) => {
  try {
    const categories = [
      { value: 'all', label: 'All Images' },
      { value: 'events', label: 'Events' },
      { value: 'facilities', label: 'Facilities' },
      { value: 'students', label: 'Students' },
      { value: 'sports', label: 'Sports' },
      { value: 'academic', label: 'Academic' },
      { value: 'other', label: 'Other' }
    ];

    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Setup multer for image uploads
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads directory
const galleryUploadsDir = path.join(__dirname, '../uploads/gallery');
if (!fs.existsSync(galleryUploadsDir)) {
  fs.mkdirSync(galleryUploadsDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, galleryUploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'gallery-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter for images
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, JPG, PNG, GIF) are allowed!'));
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: fileFilter
});

// GET /api/gallery/all - Get all images including inactive (admin only)
router.get('/all', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const images = await prisma.galleryImage.findMany({
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

    res.json(images);
  } catch (error) {
    console.error('Error fetching all gallery images:', error);
    res.status(500).json({ error: 'Failed to fetch gallery images' });
  }
});

// POST /api/gallery/images - Upload new image with file (admin only)
router.post('/images', authenticate, authorize(['admin']), upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded' });
    }

    const { title, description, category } = req.body;

    if (!title || !category) {
      // Delete uploaded file if validation fails
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Title and category are required' });
    }

    const imageUrl = `/uploads/gallery/${req.file.filename}`;

    const image = await prisma.galleryImage.create({
      data: {
        schoolId: req.schoolId,
        title,
        description: description || '',
        imageUrl,
        category,
        uploadedBy: req.user.id
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

    res.status(201).json(image);
  } catch (error) {
    console.error('Error creating gallery image:', error);
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'Failed to create gallery image' });
  }
});

// OLD POST route (deprecated - keeping for reference)
// POST /api/gallery/images - Upload new image (admin only)
router.post('/images-url', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { title, description, imageUrl, category } = req.body;

    if (!title || !imageUrl || !category) {
      return res.status(400).json({ error: 'Title, image URL, and category are required' });
    }

    const image = await prisma.galleryImage.create({
      data: {
        schoolId: req.schoolId,
        title,
        description,
        imageUrl,
        category,
        uploadedBy: req.user.id
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

    res.status(201).json(image);

    // Log the action
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'CREATE',
      resource: 'GALLERY_IMAGE',
      details: {
        imageId: image.id,
        title: image.title,
        category: image.category,
        method: 'url_entry'
      },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Error creating gallery image:', error);
    res.status(500).json({ error: 'Failed to create gallery image' });
  }
});

// PUT /api/gallery/images/:id - Update image (admin only)
router.put('/images/:id', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, category, isActive } = req.body;

    const image = await prisma.galleryImage.update({
      where: {
        id: parseInt(id),
        schoolId: req.schoolId
      },
      data: {
        title,
        description,
        category,
        isActive
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

    res.json(image);

    // Log the action
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'UPDATE',
      resource: 'GALLERY_IMAGE',
      details: {
        imageId: image.id,
        updates: Object.keys(req.body)
      },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Error updating gallery image:', error);
    res.status(500).json({ error: 'Failed to update gallery image' });
  }
});

// DELETE /api/gallery/images/:id - Delete image (admin only)
router.delete('/images/:id', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.galleryImage.delete({
      where: {
        id: parseInt(id),
        schoolId: req.schoolId
      }
    });

    res.json({ message: 'Gallery image deleted successfully' });

    // Log the deletion
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'DELETE',
      resource: 'GALLERY_IMAGE',
      details: {
        imageId: parseInt(id)
      },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Error deleting gallery image:', error);
    res.status(500).json({ error: 'Failed to delete gallery image' });
  }
});


// Simple upload endpoint (works!)
router.post('/upload', authenticate, authorize(['admin']), upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    const { title, description, category } = req.body;

    if (!title || !category) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Title and category required' });
    }

    const imageUrl = `/uploads/gallery/${req.file.filename}`;

    const image = await prisma.galleryImage.create({
      data: {
        schoolId: req.schoolId,
        title,
        description: description || '',
        imageUrl,
        category,
        uploadedBy: req.user.id
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

    res.status(201).json(image);

    // Log the action
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'CREATE',
      resource: 'GALLERY_IMAGE',
      details: {
        imageId: image.id,
        title: image.title,
        category: image.category,
        method: 'direct_upload'
      },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Upload error:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'Upload failed' });
  }
});

module.exports = router;
