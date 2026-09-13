const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/audit');

// Public route to fetch active advertisements
router.get('/public', async (req, res) => {
  try {
    const adverts = await prisma.advert.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(adverts);
  } catch (error) {
    console.error('[AdvertPublic] Error:', error);
    res.status(500).json({ error: 'Failed to fetch adverts' });
  }
});

// Admin route to fetch all adverts
router.get('/', authenticate, authorize('superadmin'), async (req, res) => {
  try {
    const adverts = await prisma.advert.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(adverts);
  } catch (error) {
    console.error('[AdvertAdmin] Error:', error);
    res.status(500).json({ error: 'Failed to fetch adverts' });
  }
});

// Create a new advert
router.post('/', authenticate, authorize('superadmin'), async (req, res) => {
  try {
    const { title, imageUrl, targetUrl, isActive } = req.body;

    if (!title || !imageUrl) {
      return res.status(400).json({ error: 'Title and imageUrl are required' });
    }

    const advert = await prisma.advert.create({
      data: { title, imageUrl, targetUrl, isActive: isActive !== undefined ? isActive : true }
    });

    res.status(201).json(advert);

    logAction({
      schoolId: req.schoolId || 0,
      userId: req.user.id,
      action: 'CREATE',
      resource: 'ADVERT',
      details: { title },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('[AdvertCreate] Error:', error);
    res.status(500).json({ error: 'Failed to create advert' });
  }
});

// Update an existing advert
router.put('/:id', authenticate, authorize('superadmin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, imageUrl, targetUrl, isActive } = req.body;

    const advert = await prisma.advert.update({
      where: { id: parseInt(id) },
      data: { title, imageUrl, targetUrl, isActive }
    });

    res.json(advert);

    logAction({
      schoolId: req.schoolId || 0,
      userId: req.user.id,
      action: 'UPDATE',
      resource: 'ADVERT',
      details: { id, title },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('[AdvertUpdate] Error:', error);
    res.status(500).json({ error: 'Failed to update advert' });
  }
});

// Delete an advert
router.delete('/:id', authenticate, authorize('superadmin'), async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.advert.delete({
      where: { id: parseInt(id) }
    });

    res.json({ success: true, message: 'Advert deleted' });

    logAction({
      schoolId: req.schoolId || 0,
      userId: req.user.id,
      action: 'DELETE',
      resource: 'ADVERT',
      details: { id },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('[AdvertDelete] Error:', error);
    res.status(500).json({ error: 'Failed to delete advert' });
  }
});

module.exports = router;
