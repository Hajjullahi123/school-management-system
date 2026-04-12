const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/audit');

// Public route to fetch active showcase schools
router.get('/public', async (req, res) => {
  try {
    const schools = await prisma.showcaseSchool.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(schools);
  } catch (error) {
    console.error('[ShowcasePublic] Error:', error);
    res.status(500).json({ error: 'Failed to fetch showcase schools' });
  }
});

// Admin route to fetch all showcase schools (including inactive ones)
router.get('/', authenticate, authorize('superadmin'), async (req, res) => {
  try {
    const schools = await prisma.showcaseSchool.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(schools);
  } catch (error) {
    console.error('[ShowcaseAdmin] Error:', error);
    res.status(500).json({ error: 'Failed to fetch showcase schools' });
  }
});

// Create a new showcase school
router.post('/', authenticate, authorize('superadmin'), async (req, res) => {
  try {
    const { name, logoUrl } = req.body;

    if (!name || !logoUrl) {
      return res.status(400).json({ error: 'Name and logo are required' });
    }

    const school = await prisma.showcaseSchool.create({
      data: { name, logoUrl }
    });

    res.status(201).json(school);

    logAction({
      schoolId: req.schoolId || 0,
      userId: req.user.id,
      action: 'CREATE',
      resource: 'SHOWCASE_SCHOOL',
      details: { name },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('[ShowcaseCreate] Error:', error);
    res.status(500).json({ error: 'Failed to create showcase school' });
  }
});

// Update an existing showcase school
router.put('/:id', authenticate, authorize('superadmin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, logoUrl, isActive } = req.body;

    const school = await prisma.showcaseSchool.update({
      where: { id: parseInt(id) },
      data: { name, logoUrl, isActive }
    });

    res.json(school);

    logAction({
      schoolId: req.schoolId || 0,
      userId: req.user.id,
      action: 'UPDATE',
      resource: 'SHOWCASE_SCHOOL',
      details: { id, name },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('[ShowcaseUpdate] Error:', error);
    res.status(500).json({ error: 'Failed to update showcase school' });
  }
});

// Delete a showcase school
router.delete('/:id', authenticate, authorize('superadmin'), async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.showcaseSchool.delete({
      where: { id: parseInt(id) }
    });

    res.json({ success: true, message: 'Showcase school deleted' });

    logAction({
      schoolId: req.schoolId || 0,
      userId: req.user.id,
      action: 'DELETE',
      resource: 'SHOWCASE_SCHOOL',
      details: { id },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('[ShowcaseDelete] Error:', error);
    res.status(500).json({ error: 'Failed to delete showcase school' });
  }
});

module.exports = router;
