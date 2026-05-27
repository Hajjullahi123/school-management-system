const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticate } = require('../middleware/auth');
const { logAction } = require('../utils/audit');

// ================= PUBLIC ROUTES =================

// Get all active custom pages for a school (used for Navbar)
router.get('/public/:schoolSlug', async (req, res) => {
  try {
    const school = await prisma.school.findUnique({
      where: { slug: req.params.schoolSlug },
      select: { id: true }
    });

    if (!school) return res.status(404).json({ error: 'School not found' });

    const pages = await prisma.customPage.findMany({
      where: { schoolId: school.id, isActive: true },
      select: { id: true, title: true, slug: true },
      orderBy: { createdAt: 'asc' }
    });

    res.json(pages);
  } catch (error) {
    console.error('Error fetching public custom pages:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a specific custom page content
router.get('/public/:schoolSlug/:pageSlug', async (req, res) => {
  try {
    const school = await prisma.school.findUnique({
      where: { slug: req.params.schoolSlug },
      select: { id: true }
    });

    if (!school) return res.status(404).json({ error: 'School not found' });

    const page = await prisma.customPage.findFirst({
      where: { schoolId: school.id, slug: req.params.pageSlug, isActive: true },
    });

    if (!page) return res.status(404).json({ error: 'Page not found' });

    res.json(page);
  } catch (error) {
    console.error('Error fetching public custom page:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ================= ADMIN ROUTES =================

// Get all custom pages (Admin)
router.get('/admin', authenticate, async (req, res) => {
  try {
    const pages = await prisma.customPage.findMany({
      where: { schoolId: req.schoolId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(pages);
  } catch (error) {
    console.error('Error fetching admin custom pages:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new custom page
router.post('/admin', authenticate, async (req, res) => {
  const { title, slug, content, isActive } = req.body;
  if (!title || !slug || !content) return res.status(400).json({ error: 'Title, slug, and content are required' });

  try {
    const newPage = await prisma.customPage.create({
      data: {
        schoolId: req.schoolId,
        title,
        slug,
        content,
        isActive: isActive !== undefined ? isActive : true
      }
    });

    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'CREATE',
      resource: 'CUSTOM_PAGE',
      details: { pageId: newPage.id, slug },
      ipAddress: req.ip
    });

    res.json(newPage);
  } catch (error) {
    console.error('Error creating custom page:', error);
    if (error.code === 'P2002') return res.status(400).json({ error: 'A page with this URL slug already exists.' });
    res.status(500).json({ error: 'Failed to create page' });
  }
});

// Update a custom page
router.put('/admin/:id', authenticate, async (req, res) => {
  const pageId = parseInt(req.params.id);
  const { title, slug, content, isActive } = req.body;

  try {
    const page = await prisma.customPage.update({
      where: { id: pageId, schoolId: req.schoolId },
      data: {
        ...(title && { title }),
        ...(slug && { slug }),
        ...(content && { content }),
        ...(isActive !== undefined && { isActive })
      }
    });

    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'UPDATE',
      resource: 'CUSTOM_PAGE',
      details: { pageId },
      ipAddress: req.ip
    });

    res.json(page);
  } catch (error) {
    console.error('Error updating custom page:', error);
    if (error.code === 'P2025') return res.status(404).json({ error: 'Page not found' });
    if (error.code === 'P2002') return res.status(400).json({ error: 'A page with this URL slug already exists.' });
    res.status(500).json({ error: 'Failed to update page' });
  }
});

// Delete a custom page
router.delete('/admin/:id', authenticate, async (req, res) => {
  const pageId = parseInt(req.params.id);

  try {
    await prisma.customPage.delete({
      where: { id: pageId, schoolId: req.schoolId }
    });

    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'DELETE',
      resource: 'CUSTOM_PAGE',
      details: { pageId },
      ipAddress: req.ip
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting custom page:', error);
    if (error.code === 'P2025') return res.status(404).json({ error: 'Page not found' });
    res.status(500).json({ error: 'Failed to delete page' });
  }
});

module.exports = router;
