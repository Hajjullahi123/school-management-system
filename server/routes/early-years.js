const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/audit');

// Default Early Years Domains & Sub-domains (Al-Bayyinah Progress Report Template + Islamic Development)
const DEFAULT_EARLY_YEARS_DOMAINS = [
  {
    name: '01 GENERAL INFORMATION',
    code: '01',
    sortOrder: 1,
    skills: [
      { name: 'Knows full name', sortOrder: 1 },
      { name: 'Knows class', sortOrder: 2 },
      { name: 'Knows school name', sortOrder: 3 }
    ]
  },
  {
    name: '02 LANGUAGE & READING READINESS',
    code: '02',
    sortOrder: 2,
    skills: [
      { name: 'Can identify sounds', sortOrder: 1 },
      { name: 'Can say rhyme', sortOrder: 2 },
      { name: 'Can scribble', sortOrder: 3 },
      { name: 'Reads left to right', sortOrder: 4 },
      { name: 'Shows interest in writing', sortOrder: 5 },
      { name: 'Speaks in complete sentences', sortOrder: 6 },
      { name: 'Uses adequate vocabulary', sortOrder: 7 },
      { name: 'Works left to right', sortOrder: 8 }
    ]
  },
  {
    name: '03 NUMERACY & SCIENCE READINESS',
    code: '03',
    sortOrder: 3,
    skills: [
      { name: 'Can add up to 6', sortOrder: 1 },
      { name: 'Can count on 5s to 50', sortOrder: 2 },
      { name: 'Can subtract up to 3', sortOrder: 3 },
      { name: 'Identifies 10 basic colours', sortOrder: 4 },
      { name: 'Identifies 10 basic numbers', sortOrder: 5 },
      { name: 'Identifies numbers 1–30', sortOrder: 6 },
      { name: 'Identifies more and less', sortOrder: 7 },
      { name: 'Sorts objects by colours', sortOrder: 8 },
      { name: 'Sorts objects by shapes', sortOrder: 9 }
    ]
  },
  {
    name: '04 PHYSICAL DEVELOPMENT & MOTOR SKILLS',
    code: '04',
    sortOrder: 4,
    skills: [
      { name: 'Holds pencil/marker correctly', sortOrder: 1 },
      { name: 'Manipulation movements', sortOrder: 2 },
      { name: 'Organised play', sortOrder: 3 },
      { name: 'Safety rules', sortOrder: 4 },
      { name: 'Uses crayon effectively', sortOrder: 5 }
    ]
  },
  {
    name: '05 SOCIAL & EMOTIONAL READINESS',
    code: '05',
    sortOrder: 5,
    skills: [
      { name: 'Displays self-control', sortOrder: 1 },
      { name: 'Adapts easily to new situations', sortOrder: 2 },
      { name: 'Keeps hands to self', sortOrder: 3 },
      { name: 'Observes rules and regulations', sortOrder: 4 },
      { name: 'Participates in group activities', sortOrder: 5 },
      { name: 'Plays well with others', sortOrder: 6 },
      { name: 'Shows self-confidence', sortOrder: 7 },
      { name: 'Takes care of own needs', sortOrder: 8 }
    ]
  },
  {
    name: '06 ISLAMIC & MORAL DEVELOPMENT',
    code: '06',
    sortOrder: 6,
    skills: [
      { name: 'Knows basic Surahs (e.g. Al-Fatihah, Al-Ikhlas)', sortOrder: 1 },
      { name: 'Recites daily Duas', sortOrder: 2 },
      { name: 'Demonstrates Islamic etiquettes & manners', sortOrder: 3 },
      { name: 'Identifies basic Arabic letters', sortOrder: 4 }
    ]
  }
];

// Helper to seed defaults for a school
async function seedDefaultEarlyYearsDomains(rawSchoolId) {
  const schoolId = parseInt(rawSchoolId);
  if (!schoolId || isNaN(schoolId)) return;

  for (const domainData of DEFAULT_EARLY_YEARS_DOMAINS) {
    const createdDomain = await prisma.earlyYearsDomain.create({
      data: {
        schoolId,
        name: domainData.name,
        code: domainData.code,
        sortOrder: domainData.sortOrder,
        isActive: true
      }
    });

    if (domainData.skills && domainData.skills.length > 0) {
      await prisma.earlyYearsSkill.createMany({
        data: domainData.skills.map(s => ({
          schoolId,
          domainId: createdDomain.id,
          name: s.name,
          sortOrder: s.sortOrder,
          isActive: true
        })),
        skipDuplicates: true
      });
    }
  }
}

// GET /api/early-years/domains - List domains (supports optional ?classId=X)
router.get('/domains', authenticate, async (req, res) => {
  try {
    const schoolId = parseInt(req.schoolId);
    const classId = req.query.classId ? parseInt(req.query.classId) : null;
    let domains = [];

    if (classId) {
      domains = await prisma.earlyYearsDomain.findMany({
        where: { schoolId, classId },
        include: {
          skills: { orderBy: { sortOrder: 'asc' } }
        },
        orderBy: { sortOrder: 'asc' }
      });
    }

    if (!domains || domains.length === 0) {
      domains = await prisma.earlyYearsDomain.findMany({
        where: { schoolId, classId: null },
        include: {
          skills: { orderBy: { sortOrder: 'asc' } }
        },
        orderBy: { sortOrder: 'asc' }
      });
    }

    if (domains.length === 0) {
      await seedDefaultEarlyYearsDomains(schoolId);
      domains = await prisma.earlyYearsDomain.findMany({
        where: { schoolId, classId: null },
        include: {
          skills: { orderBy: { sortOrder: 'asc' } }
        },
        orderBy: { sortOrder: 'asc' }
      });
    }

    res.json(domains);
  } catch (error) {
    console.error('Fetch early years domains error:', error);
    res.status(500).json({ error: 'Failed to fetch early years domains' });
  }
});

// GET /api/early-years/class/:classId/domains - Get domains for a specific class with customization flag
router.get('/class/:classId/domains', authenticate, async (req, res) => {
  try {
    const classId = parseInt(req.params.classId);
    const schoolId = parseInt(req.schoolId);

    let classDomains = await prisma.earlyYearsDomain.findMany({
      where: { schoolId, classId },
      include: {
        skills: { orderBy: { sortOrder: 'asc' } }
      },
      orderBy: { sortOrder: 'asc' }
    });

    const isCustomized = classDomains.length > 0;

    if (!isCustomized) {
      classDomains = await prisma.earlyYearsDomain.findMany({
        where: { schoolId, classId: null },
        include: {
          skills: { orderBy: { sortOrder: 'asc' } }
        },
        orderBy: { sortOrder: 'asc' }
      });

      if (classDomains.length === 0) {
        await seedDefaultEarlyYearsDomains(schoolId);
        classDomains = await prisma.earlyYearsDomain.findMany({
          where: { schoolId, classId: null },
          include: {
            skills: { orderBy: { sortOrder: 'asc' } }
          },
          orderBy: { sortOrder: 'asc' }
        });
      }
    }

    res.json({ isCustomized, domains: classDomains });
  } catch (error) {
    console.error('Fetch class early years domains error:', error);
    res.status(500).json({ error: 'Failed to fetch class domains' });
  }
});

// POST /api/early-years/class/:classId/domains - Save custom domain & skill structure for a class
router.post('/class/:classId/domains', authenticate, authorize(['admin', 'principal']), async (req, res) => {
  try {
    const classId = parseInt(req.params.classId);
    const schoolId = parseInt(req.schoolId);
    const { domains } = req.body;

    if (!Array.isArray(domains)) {
      return res.status(400).json({ error: 'Domains must be an array' });
    }

    // Delete existing class-specific domains & skills
    await prisma.earlyYearsSkill.deleteMany({
      where: { schoolId, classId }
    });
    await prisma.earlyYearsDomain.deleteMany({
      where: { schoolId, classId }
    });

    // Create new class-specific domains & skills
    for (let dIdx = 0; dIdx < domains.length; dIdx++) {
      const d = domains[dIdx];
      const createdDomain = await prisma.earlyYearsDomain.create({
        data: {
          schoolId,
          classId,
          name: d.name.trim(),
          code: d.code ? d.code.trim() : null,
          sortOrder: d.sortOrder !== undefined ? parseInt(d.sortOrder) : dIdx + 1,
          isActive: d.isActive !== undefined ? !!d.isActive : true
        }
      });

      if (Array.isArray(d.skills) && d.skills.length > 0) {
        for (let sIdx = 0; sIdx < d.skills.length; sIdx++) {
          const s = d.skills[sIdx];
          await prisma.earlyYearsSkill.create({
            data: {
              schoolId,
              classId,
              domainId: createdDomain.id,
              name: s.name.trim(),
              description: s.description ? s.description.trim() : null,
              sortOrder: s.sortOrder !== undefined ? parseInt(s.sortOrder) : sIdx + 1,
              isActive: s.isActive !== undefined ? !!s.isActive : true
            }
          });
        }
      }
    }

    logAction({
      schoolId,
      userId: req.user.id,
      action: 'UPDATE',
      resource: 'CLASS_EARLY_YEARS_DOMAINS',
      details: { classId, count: domains.length },
      ipAddress: req.ip
    });

    const updatedDomains = await prisma.earlyYearsDomain.findMany({
      where: { schoolId, classId },
      include: { skills: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { sortOrder: 'asc' }
    });

    res.json({ isCustomized: true, domains: updatedDomains });
  } catch (error) {
    console.error('Save class early years domains error:', error);
    res.status(500).json({ error: 'Failed to save class domains' });
  }
});

// POST /api/early-years/class/:classId/domains/reset - Reset class domains to school defaults
router.post('/class/:classId/domains/reset', authenticate, authorize(['admin', 'principal']), async (req, res) => {
  try {
    const classId = parseInt(req.params.classId);
    const schoolId = parseInt(req.schoolId);

    await prisma.earlyYearsSkill.deleteMany({
      where: { schoolId, classId }
    });
    await prisma.earlyYearsDomain.deleteMany({
      where: { schoolId, classId }
    });

    let defaultDomains = await prisma.earlyYearsDomain.findMany({
      where: { schoolId, classId: null },
      include: { skills: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { sortOrder: 'asc' }
    });

    if (defaultDomains.length === 0) {
      await seedDefaultEarlyYearsDomains(schoolId);
      defaultDomains = await prisma.earlyYearsDomain.findMany({
        where: { schoolId, classId: null },
        include: { skills: { orderBy: { sortOrder: 'asc' } } },
        orderBy: { sortOrder: 'asc' }
      });
    }

    logAction({
      schoolId,
      userId: req.user.id,
      action: 'RESET',
      resource: 'CLASS_EARLY_YEARS_DOMAINS',
      details: { classId },
      ipAddress: req.ip
    });

    res.json({ isCustomized: false, domains: defaultDomains });
  } catch (error) {
    console.error('Reset class early years domains error:', error);
    res.status(500).json({ error: 'Failed to reset class domains' });
  }
});

// POST /api/early-years/domains/reset - Reset to standard default template domains
router.post('/domains/reset', authenticate, authorize(['admin', 'principal']), async (req, res) => {
  try {
    const schoolId = parseInt(req.schoolId);

    await prisma.earlyYearsSkill.deleteMany({
      where: { schoolId, classId: null }
    });
    await prisma.earlyYearsDomain.deleteMany({
      where: { schoolId, classId: null }
    });

    await seedDefaultEarlyYearsDomains(schoolId);

    const domains = await prisma.earlyYearsDomain.findMany({
      where: { schoolId, classId: null },
      include: {
        skills: {
          orderBy: { sortOrder: 'asc' }
        }
      },
      orderBy: { sortOrder: 'asc' }
    });

    res.json(domains);
  } catch (error) {
    console.error('Reset early years domains error:', error);
    res.status(500).json({ error: 'Failed to reset domains' });
  }
});

// POST /api/early-years/domains - Create parent domain
router.post('/domains', authenticate, authorize(['admin', 'principal']), async (req, res) => {
  try {
    const { name, code, sortOrder } = req.body;
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Domain name is required' });
    }

    const domain = await prisma.earlyYearsDomain.create({
      data: {
        schoolId: req.schoolId,
        name: name.trim(),
        code: code ? code.trim() : null,
        sortOrder: sortOrder !== undefined ? parseInt(sortOrder) : 0,
        isActive: true
      },
      include: {
        skills: true
      }
    });

    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'CREATE',
      resource: 'EARLY_YEARS_DOMAIN',
      details: { domainId: domain.id, name: domain.name },
      ipAddress: req.ip
    });

    res.status(201).json(domain);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'A domain with this name already exists' });
    }
    console.error('Create early years domain error:', error);
    res.status(500).json({ error: 'Failed to create domain' });
  }
});

// PUT /api/early-years/domains/:id - Update domain
router.put('/domains/:id', authenticate, authorize(['admin', 'principal']), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, sortOrder, isActive } = req.body;

    if (name !== undefined && name.trim() === '') {
      return res.status(400).json({ error: 'Domain name cannot be empty' });
    }

    const domain = await prisma.earlyYearsDomain.update({
      where: { id: parseInt(id), schoolId: req.schoolId },
      data: {
        name: name !== undefined ? name.trim() : undefined,
        code: code !== undefined ? (code ? code.trim() : null) : undefined,
        sortOrder: sortOrder !== undefined ? parseInt(sortOrder) : undefined,
        isActive: isActive !== undefined ? !!isActive : undefined
      },
      include: {
        skills: {
          orderBy: { sortOrder: 'asc' }
        }
      }
    });

    res.json(domain);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'A domain with this name already exists' });
    }
    console.error('Update early years domain error:', error);
    res.status(500).json({ error: 'Failed to update domain' });
  }
});

// DELETE /api/early-years/domains/:id - Delete domain & child sub-domains
router.delete('/domains/:id', authenticate, authorize(['admin', 'principal']), async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.earlyYearsDomain.delete({
      where: { id: parseInt(id), schoolId: req.schoolId }
    });

    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'DELETE',
      resource: 'EARLY_YEARS_DOMAIN',
      details: { domainId: parseInt(id) },
      ipAddress: req.ip
    });

    res.json({ message: 'Domain deleted successfully' });
  } catch (error) {
    console.error('Delete early years domain error:', error);
    res.status(500).json({ error: 'Failed to delete domain' });
  }
});

// POST /api/early-years/domains/:domainId/skills - Add sub-domain / skill
router.post('/domains/:domainId/skills', authenticate, authorize(['admin', 'principal']), async (req, res) => {
  try {
    const { domainId } = req.params;
    const { name, description, sortOrder } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Sub-domain skill name is required' });
    }

    const parentDomain = await prisma.earlyYearsDomain.findFirst({
      where: { id: parseInt(domainId), schoolId: req.schoolId }
    });

    if (!parentDomain) {
      return res.status(404).json({ error: 'Parent domain not found' });
    }

    const skill = await prisma.earlyYearsSkill.create({
      data: {
        schoolId: req.schoolId,
        domainId: parseInt(domainId),
        name: name.trim(),
        description: description ? description.trim() : null,
        sortOrder: sortOrder !== undefined ? parseInt(sortOrder) : 0,
        isActive: true
      }
    });

    res.status(201).json(skill);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'A sub-domain skill with this name already exists in this domain' });
    }
    console.error('Create sub-domain skill error:', error);
    res.status(500).json({ error: 'Failed to create sub-domain skill' });
  }
});

// PUT /api/early-years/skills/:id - Update sub-domain skill
router.put('/skills/:id', authenticate, authorize(['admin', 'principal']), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, sortOrder, isActive } = req.body;

    if (name !== undefined && name.trim() === '') {
      return res.status(400).json({ error: 'Sub-domain skill name cannot be empty' });
    }

    const skill = await prisma.earlyYearsSkill.update({
      where: { id: parseInt(id), schoolId: req.schoolId },
      data: {
        name: name !== undefined ? name.trim() : undefined,
        description: description !== undefined ? (description ? description.trim() : null) : undefined,
        sortOrder: sortOrder !== undefined ? parseInt(sortOrder) : undefined,
        isActive: isActive !== undefined ? !!isActive : undefined
      }
    });

    res.json(skill);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'A sub-domain skill with this name already exists in this domain' });
    }
    console.error('Update sub-domain skill error:', error);
    res.status(500).json({ error: 'Failed to update sub-domain skill' });
  }
});

// DELETE /api/early-years/skills/:id - Delete sub-domain skill
router.delete('/skills/:id', authenticate, authorize(['admin', 'principal']), async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.earlyYearsSkill.delete({
      where: { id: parseInt(id), schoolId: req.schoolId }
    });

    res.json({ message: 'Sub-domain skill deleted successfully' });
  } catch (error) {
    console.error('Delete sub-domain skill error:', error);
    res.status(500).json({ error: 'Failed to delete sub-domain skill' });
  }
});

module.exports = router;
