const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { checkSubscription } = require('../middleware/subscription');
const { logAction } = require('../utils/audit');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

/**
 * @route   GET /api/backup/export
 * @desc    Export ALL data for a specific school as a JSON file
 * @access  Admin only
 */
router.get('/export', authenticate, checkSubscription, authorize(['admin']), async (req, res) => {
  try {
    const schoolId = req.schoolId;

    // Fetch all related data in parallel
    // Fetch all related data sequentially to minimize concurrent database connections on limited tiers
    const school = await prisma.school.findUnique({ where: { id: schoolId } });
    const users = await prisma.user.findMany({ where: { schoolId } });
    const students = await prisma.student.findMany({ where: { schoolId } });
    const teachers = await prisma.teacher.findMany({ where: { schoolId } });
    const classes = await prisma.class.findMany({ where: { schoolId } });
    const subjects = await prisma.subject.findMany({ where: { schoolId } });
    const academicSessions = await prisma.academicSession.findMany({ where: { schoolId } });
    const terms = await prisma.term.findMany({ where: { schoolId } });
    const feeRecords = await prisma.feeRecord.findMany({ where: { schoolId } });
    const feePayments = await prisma.feePayment.findMany({ where: { schoolId } });
    const results = await prisma.result.findMany({ where: { schoolId } });
    const attendance = await prisma.attendanceRecord.findMany({ where: { schoolId } });
    const homework = await prisma.homework.findMany({ where: { schoolId } });
    const learningResources = await prisma.learningResource.findMany({ where: { schoolId } });
    const messages = await prisma.parentTeacherMessage.findMany({ where: { schoolId } });
    const notices = await prisma.notice.findMany({ where: { schoolId } });
    const newsEvents = await prisma.newsEvent.findMany({ where: { schoolId } });
    const gallery = await prisma.galleryImage.findMany({ where: { schoolId } });
    const cbtExams = await prisma.cBTExam.findMany({ where: { schoolId } });
    const alumni = await prisma.alumni.findMany({ where: { schoolId } });
    const auditLogs = await prisma.auditLog.findMany({ where: { schoolId }, take: 500 });

    const backupData = {
      exportDate: new Date().toISOString(),
      version: "1.0.0",
      school,
      data: {
        users,
        students,
        teachers,
        classes,
        subjects,
        academicSessions,
        terms,
        feeRecords,
        feePayments,
        results,
        attendance,
        homework,
        learningResources,
        messages,
        notices,
        newsEvents,
        gallery,
        cbtExams,
        alumni,
        auditLogs
      }
    };

    res.setHeader('Content-disposition', `attachment; filename=backup_${school.slug}_${Date.now()}.json`);
    res.setHeader('Content-type', 'application/json');
    res.send(JSON.stringify(backupData, null, 2));

    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'EXPORT_DATA_JSON',
      resource: 'BACKUP',
      details: { format: 'json' },
      ipAddress: req.ip
    });

  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to generate data export' });
  }
});

/**
 * @route   GET /api/backup/export-assets
 * @desc    Zips and downloads all uploaded files (photos, etc) for the school
 * @access  Admin only
 */
router.get('/export-assets', authenticate, checkSubscription, authorize(['admin']), async (req, res) => {
  try {
    const school = await prisma.school.findUnique({ where: { id: req.schoolId } });
    const uploadDir = path.join(__dirname, '../uploads');

    // In a multi-tenant system with a shared uploads folder, we ideally prefix files with schoolSlug.
    // If not, we might need to filter files. For now, assuming school-specific subfolders if implemented,
    // or just zipping the whole relevant subset. 
    // CURRENT ARCHITECTURE check: are uploads partitioned?

    const archive = archiver('zip', { zlib: { level: 9 } });
    res.setHeader('Content-disposition', `attachment; filename=assets_${school.slug}_${Date.now()}.zip`);
    res.setHeader('Content-type', 'application/zip');

    archive.pipe(res);

    // If we have a standard naming convention like 'uploads/schoolSlug/...'
    const schoolUploadPath = path.join(uploadDir, school.slug);
    if (fs.existsSync(schoolUploadPath)) {
      archive.directory(schoolUploadPath, false);
    } else {
      // Fallback: If files are mixed, we'd need to pattern match.
      // For security in a real SaaS, we ONLY zip files belonging to this school.
      // Assuming for this MVP we might just zip common ones if they exist.
      archive.append("No specific school assets folder found.", { name: 'README.txt' });
    }

    archive.finalize();

    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'EXPORT_ASSETS_ZIP',
      resource: 'BACKUP',
      details: { format: 'zip' },
      ipAddress: req.ip
    });

  } catch (error) {
    console.error('Assets export error:', error);
    res.status(500).json({ error: 'Failed to generate assets export' });
  }
});

module.exports = router;
