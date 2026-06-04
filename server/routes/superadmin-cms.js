const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GLOBAL SETTINGS
router.get('/settings', async (req, res) => {
  try {
    const settings = await prisma.globalSettings.findFirst();
    res.json(settings || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/settings', async (req, res) => {
  try {
    const data = req.body;
    let settings = await prisma.globalSettings.findFirst();
    if (settings) {
      settings = await prisma.globalSettings.update({
        where: { id: settings.id },
        data
      });
    } else {
      settings = await prisma.globalSettings.create({ data });
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GLOBAL NEWS
router.get('/news', async (req, res) => {
  try {
    const news = await prisma.globalNewsEvent.findMany({
      orderBy: { date: 'desc' }
    });
    res.json(news);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/news', async (req, res) => {
  try {
    const data = { ...req.body, date: new Date(req.body.date) };
    const news = await prisma.globalNewsEvent.create({ data });
    res.status(201).json(news);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/news/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = { ...req.body, date: new Date(req.body.date) };
    const news = await prisma.globalNewsEvent.update({
      where: { id: parseInt(id) },
      data
    });
    res.json(news);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/news/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.globalNewsEvent.delete({ where: { id: parseInt(id) } });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GLOBAL GALLERY
router.get('/gallery', async (req, res) => {
  try {
    const gallery = await prisma.globalGalleryImage.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(gallery);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/gallery', async (req, res) => {
  try {
    const gallery = await prisma.globalGalleryImage.create({ data: req.body });
    res.status(201).json(gallery);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/gallery/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.globalGalleryImage.delete({ where: { id: parseInt(id) } });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
