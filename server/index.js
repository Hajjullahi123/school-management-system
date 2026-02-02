const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config();

const app = express();

// Global error handlers to catch unhandled errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('==================== UNCAUGHT EXCEPTION ====================');
  console.error('Error:', error);
  console.error('Stack:', error.stack);
  console.error('===========================================================');
  // Don't exit immediately - let's see what's happening
  // process.exit(1);
});
// ... (keep middle lines hidden/implicit if not changing) ...

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Debug middleware to log all requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Middleware
// CORS configuration for local network hosting
// This allows access from any computer on your school network
app.use(cors({
  origin: function (origin, callback) {
    // In production (Render), allow the deployed domain
    // Also allow no origin (mobile apps, curl)
    if (!origin || process.env.NODE_ENV === 'production') {
      return callback(null, true);
    }

    // Allow localhost for development
    if (origin.includes('localhost')) return callback(null, true);

    // Allow any IP on local network (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
    const localNetworkPattern = /^http:\/\/(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3}):\d+$/;

    if (localNetworkPattern.test(origin)) {
      return callback(null, true);
    }

    // Valid origin?
    callback(null, true);
  },
  credentials: true
}));
// Increase body size limit for base64 images (10MB)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cookieParser());

// File upload middleware
// app.use(fileUpload({
//   limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
//   useTempFiles: true,
//   tempFileDir: '/tmp/'
// }));

// Serve uploaded files statically
// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const { authenticate, authorize, optionalAuth } = require('./middleware/auth');

// DEBUG: Full Seeding Endpoint
app.get('/api/debug/seed', async (req, res) => {
  const prisma = require('./db');
  const bcrypt = require('bcryptjs');
  try {
    const results = [];
    results.push('🚀 Starting Full Demo Data Seeding...');

    const passwordHash = await bcrypt.hash('password123', 12);

    // 1. Ensure School exists
    const school = await prisma.school.upsert({
      where: { slug: 'demo-academy' },
      update: { isActivated: true, isSetupComplete: true },
      create: {
        slug: 'demo-academy',
        name: 'Demo Excellence Academy',
        address: '123 Demo Street, Innovation Hub',
        phone: '0800-DEMO-ACADEMY',
        email: 'info@demoacademy.com',
        primaryColor: '#0f172a',
        secondaryColor: '#3b82f6',
        isActivated: true,
        packageType: 'premium',
        maxStudents: 1000,
        isSetupComplete: true
      }
    });
    results.push(`✅ School: ${school.name}`);

    // 2. Admin User
    const adminUser = await prisma.user.upsert({
      where: { schoolId_username: { schoolId: school.id, username: 'demo.admin' } },
      update: { passwordHash, isActive: true },
      create: {
        schoolId: school.id,
        username: 'demo.admin',
        passwordHash,
        email: 'admin@demo.com',
        role: 'admin',
        firstName: 'System',
        lastName: 'Admin',
        isActive: true
      }
    });
    results.push(`✅ Admin User: ${adminUser.username}`);

    // 3. Academic Session & Term
    const session = await prisma.academicSession.upsert({
      where: { schoolId_name: { schoolId: school.id, name: '2025/2026 Academic Session' } },
      update: { isCurrent: true },
      create: {
        schoolId: school.id,
        name: '2025/2026 Academic Session',
        startDate: new Date('2025-09-01'),
        endDate: new Date('2026-07-31'),
        isCurrent: true
      }
    });
    const term = await prisma.term.upsert({
      where: { schoolId_academicSessionId_name: { schoolId: school.id, academicSessionId: session.id, name: 'First Term' } },
      update: { isCurrent: true },
      create: {
        schoolId: school.id,
        academicSessionId: session.id,
        name: 'First Term',
        startDate: new Date('2025-09-01'),
        endDate: new Date('2025-12-15'),
        isCurrent: true
      }
    });
    results.push(`✅ Session and Term created`);

    // 4. Classes
    const classJSS1 = await prisma.class.upsert({
      where: { schoolId_name_arm: { schoolId: school.id, name: 'JSS 1', arm: 'Gold' } },
      update: { isActive: true },
      create: { schoolId: school.id, name: 'JSS 1', arm: 'Gold', isActive: true }
    });
    results.push(`✅ Class JSS 1 Gold created`);

    // 5. Subjects
    const subjectMaths = await prisma.subject.upsert({
      where: { schoolId_code: { schoolId: school.id, code: 'MTH101' } },
      update: { name: 'Mathematics' },
      create: { schoolId: school.id, name: 'Mathematics', code: 'MTH101' }
    });
    results.push(`✅ Subject Mathematics created`);

    // 6. Students (Creating 5 students)
    const studentNames = [
      { first: 'Abubakar', last: 'Sadiq' },
      { first: 'Fatima', last: 'Zahra' },
      { first: 'Musa', last: 'Kamal' },
      { first: 'Aisha', last: 'Bello' },
      { first: 'Ibrahim', last: 'Musa' }
    ];

    for (let i = 0; i < studentNames.length; i++) {
      const s = studentNames[i];
      const admissionNumber = `DEMO/2025/${String(i + 1).padStart(3, '0')}`;
      const username = admissionNumber.toLowerCase().replace(/\//g, '');

      const user = await prisma.user.upsert({
        where: { schoolId_username: { schoolId: school.id, username } },
        update: { isActive: true },
        create: {
          schoolId: school.id,
          username,
          passwordHash,
          role: 'student',
          firstName: s.first,
          lastName: s.last,
          isActive: true,
          student: {
            create: {
              schoolId: school.id,
              admissionNumber,
              classId: classJSS1.id,
              parentGuardianName: `Parent of ${s.first}`,
              parentPhone: '0123456789',
              rollNo: admissionNumber,
              isScholarship: i === 0
            }
          }
        },
        include: { student: true }
      });

      // Fee Record
      const expectedAmount = user.student.isScholarship ? 0 : 45000;
      const paidAmount = i === 1 ? 45000 : (i === 2 ? 20000 : 0);

      await prisma.feeRecord.upsert({
        where: {
          studentId_academicSessionId_termId: {
            studentId: user.student.id,
            academicSessionId: session.id,
            termId: term.id
          }
        },
        update: { paidAmount, balance: expectedAmount - paidAmount },
        create: {
          schoolId: school.id,
          studentId: user.student.id,
          academicSessionId: session.id,
          termId: term.id,
          expectedAmount,
          paidAmount,
          balance: expectedAmount - paidAmount,
          isClearedForExam: user.student.isScholarship || paidAmount >= expectedAmount
        }
      });
    }
    results.push(`✅ ${studentNames.length} Students created with Fee Records`);

    res.json({ success: true, results });
  } catch (err) {
    console.error('Seeding Error:', err);
    res.status(500).json({ success: false, error: err.message, stack: err.stack });
  }
});
const { checkSubscription, requirePackage } = require('./middleware/subscription');
const { resolveDomain } = require('./middleware/domainResolver');

// Import Route Modules
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const studentRoutes = require('./routes/students');
const subjectRoutes = require('./routes/subjects');
const examRoutes = require('./routes/exams');
const resultsRoutes = require('./routes/results-enhanced');
const reportRoutes = require('./routes/reports');
const analyticsRoutes = require('./routes/analytics');
const advancedAnalyticsRoutes = require('./routes/advanced-analytics');
const academicSessionRoutes = require('./routes/academic-sessions');
const termRoutes = require('./routes/terms');
const classRoutes = require('./routes/classes');
const classSubjectRoutes = require('./routes/class-subjects');
const assignmentRoutes = require('./routes/assignments');
const bulkResultRoutes = require('./routes/bulk-results');
const emailRoutes = require('./routes/email');
const uploadRoutes = require('./routes/upload');
const teacherAssignmentRoutes = require('./routes/teacher-assignments');
const bulkUploadRoutes = require('./routes/bulk-upload');
const scoresheetRoutes = require('./routes/generate-scoresheet');
const feeRoutes = require('./routes/fee-management');
const feeStructureRoutes = require('./routes/fee-structure');
const examCardRoutes = require('./routes/exam-cards');
const teacherProfileRoutes = require('./routes/teachers');
const topStudentsRoutes = require('./routes/top-students');
const licenseRoutes = require('./routes/license');
const settingsRoutes = require('./routes/settings');
const paymentRoutes = require('./routes/payments');
const attendanceRoutes = require('./routes/attendance');
const messageRoutes = require('./routes/messages');
const timetableRoutes = require('./routes/timetable');
const noticeRoutes = require('./routes/notices');
const lmsRoutes = require('./routes/lms');
const parentRoutes = require('./routes/parents');
const statusRoutes = require('./routes/system-settings');
const cbtRoutes = require('./routes/cbt');
const reportExtraRoutes = require('./routes/report-extras');
const quranTrackerRoutes = require('./routes/quran-tracker');
const galleryRoutes = require('./routes/gallery');
const newsEventsRoutes = require('./routes/news-events');
const promotionRoutes = require('./routes/promotion');
const alumniRoutes = require('./routes/alumni');
const auditRoutes = require('./routes/audit');
const teacherAvailabilityRoutes = require('./routes/teacher-availability');
const superadminRoutes = require('./routes/superadmin');
const interventionRoutes = require('./routes/interventions');
const platformBillingRoutes = require('./routes/platform-billing');
const backupRoutes = require('./routes/backup');

// Resolve Custom Domains (White-Label)
app.use(resolveDomain);

// Use Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', authenticate, checkSubscription, userRoutes);
app.use('/api/students', authenticate, checkSubscription, studentRoutes);
app.use('/api/subjects', authenticate, checkSubscription, subjectRoutes);
app.use('/api/exams', authenticate, checkSubscription, requirePackage('standard'), examRoutes);
app.use('/api/results', authenticate, checkSubscription, resultsRoutes);
app.use('/api/reports', authenticate, checkSubscription, reportRoutes);
app.use('/api/analytics', authenticate, checkSubscription, analyticsRoutes);
app.use('/api/advanced-analytics', authenticate, checkSubscription, advancedAnalyticsRoutes);
app.use('/api/academic-sessions', authenticate, checkSubscription, academicSessionRoutes);
app.use('/api/terms', authenticate, checkSubscription, termRoutes);
app.use('/api/classes', authenticate, checkSubscription, classRoutes);
app.use('/api/class-subjects', authenticate, checkSubscription, classSubjectRoutes);
app.use('/api/assignments', authenticate, checkSubscription, assignmentRoutes);
app.use('/api/bulk-results', authenticate, checkSubscription, bulkResultRoutes);
app.use('/api/email', authenticate, checkSubscription, emailRoutes);
app.use('/api/upload', authenticate, checkSubscription, uploadRoutes);
app.use('/api/teacher-assignments', authenticate, checkSubscription, teacherAssignmentRoutes);
app.use('/api/bulk-upload', authenticate, checkSubscription, bulkUploadRoutes);
app.use('/api/scoresheet', authenticate, checkSubscription, scoresheetRoutes);
app.use('/api/fees', authenticate, checkSubscription, requirePackage('basic'), feeRoutes);
app.use('/api/fee-structure', authenticate, checkSubscription, requirePackage('basic'), feeStructureRoutes);
app.use('/api/exam-cards', authenticate, checkSubscription, examCardRoutes);
app.use('/api/teachers', authenticate, checkSubscription, teacherProfileRoutes);
app.use('/api/top-students', authenticate, checkSubscription, topStudentsRoutes);
app.use('/api/license', authenticate, licenseRoutes); // License activation itself needs to be accessible
app.use('/api/settings', authenticate, checkSubscription, settingsRoutes);
app.use('/api/payments', authenticate, checkSubscription, paymentRoutes);
app.use('/api/attendance', authenticate, checkSubscription, attendanceRoutes);
app.use('/api/messages', authenticate, checkSubscription, messageRoutes);
app.use('/api/timetable', authenticate, checkSubscription, timetableRoutes);
app.use('/api/notices', authenticate, checkSubscription, noticeRoutes);
app.use('/api/lms', authenticate, checkSubscription, lmsRoutes);
app.use('/api/parents', authenticate, checkSubscription, parentRoutes);
app.use('/api/system', authenticate, checkSubscription, statusRoutes);
app.use('/api/cbt', authenticate, checkSubscription, requirePackage('standard'), cbtRoutes);
app.use('/api/report-extras', authenticate, checkSubscription, reportExtraRoutes);
app.use('/api/quran-tracker', authenticate, checkSubscription, requirePackage('premium'), quranTrackerRoutes);
app.use('/api/gallery', authenticate, checkSubscription, galleryRoutes);
app.use('/api/news-events', authenticate, checkSubscription, newsEventsRoutes);
app.use('/api/promotion', authenticate, checkSubscription, promotionRoutes);
app.use('/api/alumni', authenticate, checkSubscription, requirePackage('standard'), alumniRoutes);
app.use('/api/interventions', authenticate, checkSubscription, interventionRoutes);
app.use('/api/audit', authenticate, checkSubscription, auditRoutes);
app.use('/api/teacher-availability', authenticate, checkSubscription, teacherAvailabilityRoutes);
app.use('/api/superadmin', authenticate, authorize('superadmin'), superadminRoutes);
app.use('/api/platform-billing', authenticate, platformBillingRoutes);
app.use('/api/backup', backupRoutes);


// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  // Serve static files from the React app
  // Serve static files from the React app
  const clientDistPath = path.join(__dirname, '../client/dist');
  console.log('Static files path:', clientDistPath);

  // Explicitly serve assets to avoid any middleware confusion
  app.use('/assets', express.static(path.join(clientDistPath, 'assets')));

  app.use(express.static(clientDistPath));

  // Handle client-side routing - return index.html for any remaining requests
  app.get('*', (req, res) => {
    // If it's a request for an upload or API that wasn't caught, return 404 instead of SPA
    if (req.url.startsWith('/uploads/') || req.url.startsWith('/api/')) {
      return res.status(404).send('File or route not found');
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
} else {
  // 404 handler for development/API only
  app.use((req, res) => {
    const errorMsg = `Route ${req.method} ${req.url} not found (from ${req.ip})`;
    console.error(`[404] ${errorMsg}`);
    try {
      const fs = require('fs');
      fs.appendFileSync('server-debug.log', `[${new Date().toISOString()}] 404 ERROR: ${errorMsg}\n`);
    } catch (e) { }
    res.status(404).json({ error: errorMsg });
  });
}

const PORT = process.env.PORT || 3000;
const { performFullBackup } = require('./services/backupService');

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

  // Initialize Automated Offsite Backups
  performFullBackup().catch(err => console.error('Backup Error:', err));
});
