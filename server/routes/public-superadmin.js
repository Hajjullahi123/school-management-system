const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

router.get('/', async (req, res) => {
  try {
    // We fetch global settings, latest news, and gallery for the landing page
    const settings = await prisma.globalSettings.findFirst();
    const newsEvents = await prisma.globalNewsEvent.findMany({
      where: { isPublished: true },
      orderBy: { date: 'desc' },
      take: 3
    });
    const gallery = await prisma.globalGalleryImage.findMany({
      orderBy: { createdAt: 'desc' },
      take: 6
    });
    
    // Format response to look like a "school" object so the frontend PublicSchoolLandingPage component can digest it perfectly.
    const fakeSchool = {
      id: 'superadmin',
      slug: 'edutech-slug',
      name: settings?.heroTitle || 'EduTech Systems',
      motto: settings?.heroSubtitle || 'Transforming Education',
      welcomeTitle: settings?.heroTitle || 'EduTech Systems',
      welcomeMessage: settings?.heroMessage || '',
      aboutUsText: settings?.aboutUsText || '',
      websiteTheme: settings?.websiteTheme || 'classic',
      primaryColor: '#1e40af', // defaults
      secondaryColor: '#3b82f6',
      accentColor: '#60a5fa',
      phone: settings?.contactPhone || '',
      email: settings?.contactEmail || '',
      facebookUrl: settings?.facebookUrl || '',
      instagramUrl: settings?.instagramUrl || '',
      whatsappUrl: settings?.whatsappUrl || '',
      // Attach the news and gallery to the school object
      newsEvents: newsEvents,
      GalleryImage: gallery,
      // Provide some stats maybe? We can leave these empty or default
      stats: {
        students: 0,
        teachers: 0,
        alumni: 0
      }
    };

    res.json(fakeSchool);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fetch all news
router.get('/news', async (req, res) => {
  try {
    const news = await prisma.globalNewsEvent.findMany({
      where: { isPublished: true },
      orderBy: { date: 'desc' }
    });
    res.json(news);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fetch all gallery
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

module.exports = router;
