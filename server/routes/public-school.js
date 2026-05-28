const express = require('express');
const router = express.Router();
const prisma = require('../db');

// Public route to fetch school branding by slug
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    const school = await prisma.school.findUnique({
      where: { slug: slug.trim() },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        customDomain: true,
        motto: true,
        welcomeTitle: true,
        welcomeMessage: true,
        primaryColor: true,
        secondaryColor: true,
        accentColor: true,
        address: true,
        phone: true,
        email: true,
        openingHours: true,
        facebookUrl: true,
        instagramUrl: true,
        whatsappUrl: true,
        eLibraryUrl: true,
        alumniNetworkUrl: true,
        brochureFileUrl: true,
        admissionGuideFileUrl: true,
        isActivated: true,
        websiteTheme: true,
        aboutUsText: true,
        testimonialsText: true,
        customPages: {
          where: { isActive: true },
          select: { title: true, slug: true }
        },
        GalleryImage: {
          where: { category: 'hero', isActive: true },
          select: { imageUrl: true }
        }
      }
    });

    if (!school) {
      return res.status(404).json({ error: 'School not found' });
    }

    if (!school.isActivated) {
      return res.status(403).json({ error: 'School account is currently inactive. Please contact administration.' });
    }

    // Don't send isActivated to public, it's just for check
    delete school.isActivated;

    res.json(school);
  } catch (error) {
    console.error('[PublicSchool] Error:', error);
    res.status(500).json({ error: 'Failed to fetch school details' });
  }
});

module.exports = router;
