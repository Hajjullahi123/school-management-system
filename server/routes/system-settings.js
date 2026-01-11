const express = require('express');
const router = express.Router();
const prisma = require('../db');

// SECRET EMERGENCY CLEANUP & DIAGNOSTIC ROUTE
// Usage: GET /api/system/emergency-db-fix?secret=REPAIR2026
router.get('/emergency-db-fix', async (req, res) => {
  const { secret } = req.query;
  if (secret !== 'REPAIR2026') {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const fs = require('fs');
  const path = require('path');
  const results = [];

  try {
    // 1. Diagnostics (ID, SLUG, NAME)
    const schools = await prisma.school.findMany({
      select: { id: true, slug: true, name: true, isActivated: true }
    });
    const admins = await prisma.user.findMany({
      where: { role: 'admin' },
      select: { id: true, username: true, schoolId: true }
    });

    // 2. Clear stale URLs (Sanitization)
    const modelsToClean = [
      { name: 'school', field: 'logoUrl' },
      { name: 'student', field: 'photoUrl' },
      { name: 'teacher', field: 'photoUrl' },
      { name: 'galleryImage', field: 'imageUrl' },
      { name: 'newsEvent', field: 'imageUrl' },
      { name: 'learningResource', field: 'fileUrl' },
      { name: 'alumni', field: 'profilePicture' }
    ];

    for (const item of modelsToClean) {
      const records = await prisma[item.name].findMany({
        where: {
          OR: [
            { [item.field]: { contains: 'onrender.com' } },
            { [item.field]: { contains: 'http' } }
          ]
        }
      });

      if (records.length > 0) {
        results.push(`Cleaned ${records.length} links in ${item.name}`);
        for (const record of records) {
          const val = record[item.field];
          if (val && val.includes('/uploads/')) {
            const newPath = `/uploads/${val.split('/uploads/')[1]}`;
            await prisma[item.name].update({
              where: { id: record.id },
              data: { [item.field]: newPath }
            });
          }
        }
      }
    }

    // 3. Read Auth Logs (Last 20 lines)
    let logs = "No logs found.";
    const logPath = path.join(process.cwd(), 'auth-debug.log');
    if (fs.existsSync(logPath)) {
      const content = fs.readFileSync(logPath, 'utf8');
      logs = content.split('\n').filter(l => l.trim()).slice(-20).join('\n');
    }

    res.json({
      success: true,
      environment: {
        serverTime: new Date().toISOString(),
        schools,
        totalAdmins: admins.length,
        adminMapping: admins.map(a => `User [${a.username}] is the Admin for School ID [${a.schoolId}]`)
      },
      cleaningResults: results,
      recentAuthInsight: logs
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
