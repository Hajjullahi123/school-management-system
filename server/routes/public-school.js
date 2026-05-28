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
        twitterUrl: true,
        youtubeUrl: true,
        linkedinUrl: true,
        academicCalendarUrl: true,
        eLibraryUrl: true,
        alumniNetworkUrl: true,
        brochureFileUrl: true,
        admissionGuideFileUrl: true,
        isActivated: true,
        websiteTheme: true,
        aboutUsText: true,
        foundedYear: true,
        testimonialsText: true,
        customPages: {
          where: { isActive: true },
          select: { title: true, slug: true }
        },
        GalleryImage: {
          where: { category: 'hero', isActive: true },
          select: { imageUrl: true }
        },
        newsEvents: {
          where: { isPublished: true },
          orderBy: { eventDate: 'desc' },
          take: 3,
          select: { id: true, title: true, type: true, eventDate: true, imageUrl: true, content: true }
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

// Submit admission inquiry
router.post('/:slug/inquiry', async (req, res) => {
  try {
    const { slug } = req.params;
    const { parentName, email, phone, gradeLevel, message } = req.body;

    const school = await prisma.school.findUnique({ where: { slug } });
    if (!school) return res.status(404).json({ error: 'School not found' });

    const inquiry = await prisma.admissionInquiry.create({
      data: {
        schoolId: school.id,
        parentName,
        email,
        phone,
        gradeLevel,
        message
      }
    });

    res.status(201).json({ success: true, message: 'Inquiry submitted successfully', inquiry });
  } catch (error) {
    console.error('[PublicSchool Inquiry] Error:', error);
    res.status(500).json({ error: 'Failed to submit inquiry' });
  }
});

// Subscribe to newsletter
router.post('/:slug/subscribe', async (req, res) => {
  try {
    const { slug } = req.params;
    const { email } = req.body;

    const school = await prisma.school.findUnique({ where: { slug } });
    if (!school) return res.status(404).json({ error: 'School not found' });

    // Check if already subscribed
    const existing = await prisma.newsletterSubscriber.findUnique({
      where: { schoolId_email: { schoolId: school.id, email } }
    });

    if (existing) {
      if (!existing.isActive) {
        await prisma.newsletterSubscriber.update({
          where: { id: existing.id },
          data: { isActive: true }
        });
        return res.json({ success: true, message: 'Subscription reactivated' });
      }
      return res.status(400).json({ error: 'Email is already subscribed' });
    }

    await prisma.newsletterSubscriber.create({
      data: {
        schoolId: school.id,
        email
      }
    });

    res.status(201).json({ success: true, message: 'Subscribed successfully' });
  } catch (error) {
    console.error('[PublicSchool Subscribe] Error:', error);
    res.status(500).json({ error: 'Failed to subscribe to newsletter' });
  }
});

// Fetch all staff/teachers for the public 'Meet Our Staff' page
router.get('/:slug/staff', async (req, res) => {
  try {
    const { slug } = req.params;
    const school = await prisma.school.findUnique({
      where: { slug: slug.trim() },
      select: { id: true, name: true, primaryColor: true, logoUrl: true, websiteTheme: true }
    });

    if (!school) return res.status(404).json({ error: 'School not found' });

    const staff = await prisma.user.findMany({
      where: {
        schoolId: school.id,
        isActive: true,
        role: { in: ['teacher', 'admin', 'principal', 'head_teacher'] } // Add roles you want public
      },
      select: {
        id: true,
        firstName: true,
        middleName: true,
        lastName: true,
        email: true,
        phone: true,
        photoUrl: true,
        role: true,
        department: { select: { id: true, name: true } },
        teacher: {
          select: {
            specialization: true,
            photoUrl: true,
            publicEmail: true,
            publicPhone: true,
            publicWhatsapp: true
          }
        }
      },
      orderBy: [
        { role: 'asc' }, // e.g. admin might show up before teacher or vice versa, modify if needed
        { firstName: 'asc' }
      ]
    });

    res.json({ school, staff });
  } catch (error) {
    console.error('[PublicSchool Staff] Error:', error);
    res.status(500).json({ error: 'Failed to fetch staff directory' });
  }
});

// Fetch all students in higher institution for the public display
router.get('/:slug/higher-students', async (req, res) => {
  try {
    const { slug } = req.params;
    const school = await prisma.school.findUnique({
      where: { slug: slug.trim() },
      select: { id: true, name: true, primaryColor: true, logoUrl: true, websiteTheme: true }
    });

    if (!school) return res.status(404).json({ error: 'School not found' });

    const students = await prisma.user.findMany({
      where: {
        schoolId: school.id,
        isActive: true,
        role: 'higher_student'
      },
      select: {
        id: true,
        firstName: true,
        middleName: true,
        lastName: true,
        email: true,
        phone: true,
        photoUrl: true,
        role: true,
        teacher: {
          select: {
            specialization: true,
            photoUrl: true,
            publicEmail: true,
            publicPhone: true,
            publicWhatsapp: true
          }
        }
      },
      orderBy: [
        { firstName: 'asc' }
      ]
    });

    res.json({ school, students });
  } catch (error) {
    console.error('[PublicSchool HigherStudents] Error:', error);
    res.status(500).json({ error: 'Failed to fetch students in higher institution' });
  }
});

module.exports = router;
