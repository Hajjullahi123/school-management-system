// Stability Overhaul v2
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const path = require('path');
const compression = require('compression');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Ensure required directories exist
[
  'logs',
  'uploads',
  'uploads/students',
  'uploads/teachers',
  'uploads/teacher-photos',
  'uploads/documents',
  'uploads/certificates',
  'uploads/gallery',
  'uploads/news'
].forEach(dir => {
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`[Server] Created directory: ${dir}`);
    } catch (e) {
      console.warn(`[Server] Could not create directory ${dir}:`, e.message);
    }
  }
});

const app = express();
app.use(compression()); // Enable Gzip compression for all responses
let activeServer = null;

// Global error handlers
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('==================== UNCAUGHT EXCEPTION ====================');
  console.error('Error:', error);
  console.error('Stack:', error.stack);
  console.error('===========================================================');
  process.exit(1); // Exit so Render/PM2 can restart the process
});

/**
 * CRITICAL SYSTEM INTEGRITY GUARD
 * Verifies that essential security and auth exports exist before booting.
 * This prevents "undefined" middleware errors from crashing requests.
 */
try {
  const auth = require('./middleware/auth');
  const requiredAuthMethods = ['authenticate', 'authorize', 'optionalAuth'];
  
  requiredAuthMethods.forEach(method => {
    if (typeof auth[method] !== 'function') {
      throw new Error(`[CRITICAL] Auth module is missing required function: ${method}. Check server/middleware/auth.js exports!`);
    }
  });
  console.log('[Server] Security integrity checks passed.');
} catch (integrityError) {
  console.error('==================== INTEGRITY FAILURE ====================');
  console.error(integrityError.message);
  console.error('===========================================================');
  process.exit(1);
}

// Ping route for health checks
app.get('/ping', (req, res) => res.status(200).send('pong'));
app.get('/api/version', (req, res) => res.json({ version: '1.0.9-ai-fix-v4', timestamp: new Date().toISOString() }));

// Public Privacy Policy for App Stores
app.get('/privacy-policy', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Privacy Policy - Darul Qur'an Academy</title>
        <style>
          body { font-family: sans-serif; line-height: 1.6; max-width: 800px; margin: 40px auto; padding: 20px; color: #333; }
          h1 { color: #1a56db; }
          h2 { border-bottom: 2px solid #eee; padding-bottom: 10px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <h1>Privacy Policy</h1>
        <p><strong>Effective Date: March 15, 2026</strong></p>
        <p>Darul Qur'an Academy ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our mobile application and web portal.</p>
        
        <h2>1. Information We Collect</h2>
        <ul>
          <li><strong>Personal Information</strong>: Names, email addresses, phone numbers, and profile photos of students, parents, and staff.</li>
          <li><strong>Academic Data</strong>: Student grades, results, transcripts, and attendance records.</li>
          <li><strong>Financial Data</strong>: Records of school fee payments (we do not store credit card details; those are handled by secure third-party payment processors).</li>
          <li><strong>Device Info</strong>: Usage data and device identifiers to improve app performance and security.</li>
        </ul>

        <h2>2. How We Use Your Information</h2>
        <ul>
          <li>To provide and maintain the School Management System services.</li>
          <li>To notify you about changes to our services or school events.</li>
          <li>To facilitate academic reporting and communication between school stakeholders.</li>
          <li>To process payments and manage financial records.</li>
        </ul>

        <h2>3. Data Storage and Security</h2>
        <p>Your data is stored securely using industry-standard encryption. Access is restricted to authorized users based on their specific roles (e.g., Teachers can only see their classes, Parents can only see their own children).</p>

        <h2>4. Your Rights</h2>
        <p>Users have the right to request access to their personal data or request corrections. Staff and administrators may contact the school's IT department to manage data deletion requests.</p>
        
        <p style="margin-top: 50px; font-size: 0.8em; color: #777;">&copy; 2026 Darul Qur'an Academy. All rights reserved.</p>
      </body>
    </html>
  `);
});

// DEBUG ROUTE - Remove before delivery
app.get('/api/debug/inspect-users', async (req, res) => {
  try {
    const prisma = require('./db');
    const users = await prisma.user.findMany({
      select: { id: true, username: true, role: true, schoolId: true }
    });
    const schools = await prisma.school.findMany({
      select: { id: true, slug: true, name: true }
    });
    res.json({ users, schools });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve uploaded files statically with caching
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '7d', // Cache for 7 days
  immutable: true
}));

// Lightweight request logger — API routes only (avoids logging every static asset)
app.use('/api', (req, res, next) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[API] ${req.method} ${req.url}`);
  }
  next();
});

// Middleware
// CORS configuration
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || process.env.NODE_ENV === 'production') {
      return callback(null, true);
    }
    if (origin.includes('localhost')) return callback(null, true);
    callback(null, true);
  },
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cookieParser());

app.post('/api/log-client-error', (req, res) => {
  const body = req.body || {};
  const logMsg = `[${new Date().toISOString()}] CLIENT ERROR: ${JSON.stringify(body)}\n`;
  try {
    fs.appendFileSync('logs/client-errors.log', logMsg);
  } catch (e) {}
  console.log('LOGGED CLIENT ERROR:', body.message || 'Unknown error message');
  res.status(200).send('Logged');
});

const { authenticate, authorize, optionalAuth } = require('./middleware/auth');

// Modular Seeder
try {
  require('./seeder')(app);
} catch (e) {
  console.error('[Seeder] Failed to load seeder:', e.message);
}

const authRoutes = require('./routes/auth');
const { checkSubscription, requirePackage } = require('./middleware/subscription');
const { resolveDomain } = require('./middleware/domainResolver');

console.log('[Server] Starting route imports...');

// Import Route Modules
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
const staffAttendanceRoutes = require('./routes/staff-attendance');
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
const whatsappRoutes = require('./routes/whatsapp');
const miscFeesRoutes = require('./routes/misc-fees');
const holidayRoutes = require('./routes/holidays');
const academicsRoutes = require('./routes/academics');
const showcaseRoutes = require('./routes/showcase');
const advertRoutes = require('./routes/adverts');
const departmentRoutes = require('./routes/departments');

console.log('[Server] All route modules imported.');

// Resolve Custom Domains (White-Label)
app.use(resolveDomain);

// Public metadata (For login branding)
app.get('/api/public/global-settings', async (req, res) => {
  const prisma = require('./db');
  try {
    const settings = await prisma.globalSettings.findFirst();
    res.json(settings || { id: 1 });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Use Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', authenticate, checkSubscription, userRoutes);
app.use('/api/students', authenticate, checkSubscription, studentRoutes);
app.use('/api/subjects', authenticate, checkSubscription, subjectRoutes);
app.use('/api/exams', authenticate, checkSubscription, examRoutes);
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
app.use('/api/fees', authenticate, checkSubscription, feeRoutes);
app.use('/api/fee-structure', authenticate, checkSubscription, feeStructureRoutes);
app.use('/api/exam-cards', authenticate, checkSubscription, examCardRoutes);
app.use('/api/teachers', authenticate, checkSubscription, teacherProfileRoutes);
app.use('/api/top-students', topStudentsRoutes);
app.use('/api/license', authenticate, licenseRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/payments', authenticate, checkSubscription, paymentRoutes);
app.use('/api/attendance', authenticate, checkSubscription, attendanceRoutes);
app.use('/api/staff-attendance', authenticate, checkSubscription, staffAttendanceRoutes);
app.use('/api/messages', authenticate, checkSubscription, messageRoutes);
app.use('/api/timetable', authenticate, checkSubscription, timetableRoutes);
app.use('/api/notices', authenticate, checkSubscription, noticeRoutes);
app.use('/api/lms', authenticate, checkSubscription, lmsRoutes);
app.use('/api/parents', authenticate, checkSubscription, parentRoutes);
app.use('/api/system', authenticate, checkSubscription, statusRoutes);
app.use('/api/cbt', authenticate, checkSubscription, cbtRoutes);
app.use('/api/report-extras', authenticate, checkSubscription, reportExtraRoutes);
app.use('/api/quran-tracker', authenticate, checkSubscription, quranTrackerRoutes);
app.use('/api/gallery', authenticate, checkSubscription, galleryRoutes);
app.use('/api/news-events', authenticate, checkSubscription, newsEventsRoutes);
app.use('/api/promotion', promotionRoutes);
app.use('/api/alumni', alumniRoutes);
app.use('/api/certificates', require('./routes/certificates'));
app.use('/api/testimonials', require('./routes/testimonials'));
app.use('/api/interventions', authenticate, checkSubscription, interventionRoutes);
app.use('/api/audit', authenticate, checkSubscription, auditRoutes);
app.use('/api/teacher-availability', authenticate, checkSubscription, teacherAvailabilityRoutes);
app.use('/api/superadmin', authenticate, authorize('superadmin'), superadminRoutes);
app.use('/api/platform-billing', platformBillingRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/misc-fees', authenticate, checkSubscription, miscFeesRoutes);
app.use('/api/holidays', authenticate, checkSubscription, holidayRoutes);
app.use('/api/academics', authenticate, checkSubscription, academicsRoutes);
app.use('/api/showcase', showcaseRoutes);
app.use('/api/adverts', advertRoutes);
app.use('/api/departments', authenticate, checkSubscription, departmentRoutes);

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  const clientDistPath = path.join(__dirname, '../client/dist');
  app.use('/assets', express.static(path.join(clientDistPath, 'assets'), {
    maxAge: '1y', // Assets are hashed, so cache for 1 year
    immutable: true
  }));
  app.use(express.static(clientDistPath, {
    maxAge: '1y', // Cache assets for a long time
    immutable: true,
    index: false // Don't serve index.html via static middleware automatically
  }));

  // 1. API 404 Handler (JSON)
  app.use('/api/*', (req, res) => {
    console.warn(`[404] API Route not found: ${req.method} ${req.originalUrl}`);
    res.status(404).json({ 
      error: 'Not Found', 
      message: `The API endpoint ${req.originalUrl} does not exist on this server.` 
    });
  });

  // 2. Global Error Handler (JSON for API)
  app.use((err, req, res, next) => {
    if (req.url.startsWith('/api/')) {
      console.error(`[API ERROR] ${req.method} ${req.url}:`, err);
      return res.status(err.status || 500).json({
        error: 'Server Error',
        message: err.message || 'An unexpected error occurred on the server.'
      });
    }
    next(err);
  });

  // 3. Frontend Fallback (HTML) - ONLY for non-API, non-Upload GET requests
  app.get('*', (req, res) => {
    if (req.url.startsWith('/uploads/') || req.url.startsWith('/api/') || req.url.startsWith('/assets/')) {
      return res.status(404).json({ error: 'File or route not found' });
    }
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('Surrogate-Control', 'no-store');
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
  // 4. Development API 404 Handler
  app.use('/api/*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
  });

  // 5. Development Global Error Handler (Crucial for Multer errors)
  app.use((err, req, res, next) => {
    if (req.url.startsWith('/api/')) {
      console.error('[API ERROR]:', err.message);
      return res.status(err.status || 500).json({
        error: 'Server Error',
        message: err.message || 'An unexpected error occurred'
      });
    }
    next(err);
  });
}

const startServer = (portToTry, retryCount = 0) => {
  const MAX_RETRIES = 5;
  if (activeServer) {
    try { activeServer.close(); } catch (e) {}
    activeServer = null;
  }

  activeServer = app.listen(portToTry, () => {
    console.log(`[Server] SUCCESSFULLY RUNNING ON PORT ${portToTry}`);
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[Server] Port ${portToTry} is in use.`);
      if (retryCount < MAX_RETRIES) {
        setTimeout(() => startServer(portToTry, retryCount + 1), 1000);
      } else {
        process.exit(1);
      }
    } else {
      console.error('[Server] Fatal error:', err);
      process.exit(1);
    }
  });
};

const INITIAL_PORT = process.env.PORT || 3000;
startServer(parseInt(INITIAL_PORT));
