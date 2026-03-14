// Stability Overhaul v2 - Active PORT: 5115
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config();
const app = express();

// Global error handlers to catch unhandled errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('==================== UNCAUGHT EXCEPTION ====================');
  console.error('Error:', error);
  console.error('Stack:', error.stack);
  console.error('===========================================================');
  process.exit(1);
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

const fs = require('fs');
app.post('/api/log-client-error', (req, res) => {
  const body = req.body || {};
  const errorHtml = `[${new Date().toISOString()}] CLIENT ERROR: ${JSON.stringify(body)}\n`;
  fs.appendFileSync('logs/client-errors.log', errorHtml);
  console.log('LOGGED CLIENT ERROR:', body.message || 'Unknown error message');
  res.status(200).send('Logged');
});

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

// Modular Seeder
require('./seeder')(app);
const authRoutes = require('./routes/auth');
const { checkSubscription, requirePackage } = require('./middleware/subscription');
console.log('[Server] Domain resolver loaded.');
const { resolveDomain } = require('./middleware/domainResolver');
console.log('[Server] Domain resolver initialized.');

console.log('[Server] Starting route imports...');

// Import Route Modules
console.log('[Server] Importing userRoutes...');
const userRoutes = require('./routes/users');
console.log('[Server] Importing studentRoutes...');
const studentRoutes = require('./routes/students');
console.log('[Server] Importing subjectRoutes...');
const subjectRoutes = require('./routes/subjects');
console.log('[Server] Importing examRoutes...');
const examRoutes = require('./routes/exams');
console.log('[Server] Importing resultsRoutes...');
const resultsRoutes = require('./routes/results-enhanced');
console.log('[Server] Importing reportRoutes...');
const reportRoutes = require('./routes/reports');
console.log('[Server] Importing analyticsRoutes...');
const analyticsRoutes = require('./routes/analytics');
console.log('[Server] Importing advancedAnalyticsRoutes...');
const advancedAnalyticsRoutes = require('./routes/advanced-analytics');
console.log('[Server] Importing academicSessionRoutes...');
const academicSessionRoutes = require('./routes/academic-sessions');
console.log('[Server] Importing termRoutes...');
const termRoutes = require('./routes/terms');
console.log('[Server] Importing classRoutes...');
const classRoutes = require('./routes/classes');
console.log('[Server] Importing classSubjectRoutes...');
const classSubjectRoutes = require('./routes/class-subjects');
console.log('[Server] Importing assignmentRoutes...');
const assignmentRoutes = require('./routes/assignments');
console.log('[Server] Importing bulkResultRoutes...');
const bulkResultRoutes = require('./routes/bulk-results');
console.log('[Server] Importing emailRoutes...');
const emailRoutes = require('./routes/email');
console.log('[Server] Importing uploadRoutes...');
const uploadRoutes = require('./routes/upload');
console.log('[Server] Importing teacherAssignmentRoutes...');
const teacherAssignmentRoutes = require('./routes/teacher-assignments');
console.log('[Server] Importing bulkUploadRoutes...');
const bulkUploadRoutes = require('./routes/bulk-upload');
console.log('[Server] Importing scoresheetRoutes...');
const scoresheetRoutes = require('./routes/generate-scoresheet');
console.log('[Server] Importing feeRoutes...');
const feeRoutes = require('./routes/fee-management');
console.log('[Server] Importing feeStructureRoutes...');
const feeStructureRoutes = require('./routes/fee-structure');
console.log('[Server] Importing examCardRoutes...');
const examCardRoutes = require('./routes/exam-cards');
console.log('[Server] Importing teacherProfileRoutes...');
const teacherProfileRoutes = require('./routes/teachers');
console.log('[Server] Importing topStudentsRoutes...');
const topStudentsRoutes = require('./routes/top-students');
console.log('[Server] Importing licenseRoutes...');
const licenseRoutes = require('./routes/license');
console.log('[Server] Importing settingsRoutes...');
const settingsRoutes = require('./routes/settings');
console.log('[Server] Importing paymentRoutes...');
const paymentRoutes = require('./routes/payments');
console.log('[Server] Importing attendanceRoutes...');
const attendanceRoutes = require('./routes/attendance');
console.log('[Server] Importing staffAttendanceRoutes...');
const staffAttendanceRoutes = require('./routes/staff-attendance');
console.log('[Server] Importing messageRoutes...');
const messageRoutes = require('./routes/messages');
console.log('[Server] Importing timetableRoutes...');
const timetableRoutes = require('./routes/timetable');
console.log('[Server] Importing noticeRoutes...');
const noticeRoutes = require('./routes/notices');
console.log('[Server] Importing lmsRoutes...');
const lmsRoutes = require('./routes/lms');
console.log('[Server] Importing parentRoutes...');
const parentRoutes = require('./routes/parents');
console.log('[Server] Importing statusRoutes...');
const statusRoutes = require('./routes/system-settings');
console.log('[Server] Importing cbtRoutes...');
const cbtRoutes = require('./routes/cbt');
console.log('[Server] Importing reportExtraRoutes...');
const reportExtraRoutes = require('./routes/report-extras');
console.log('[Server] Importing quranTrackerRoutes...');
const quranTrackerRoutes = require('./routes/quran-tracker');
console.log('[Server] Importing galleryRoutes...');
const galleryRoutes = require('./routes/gallery');
console.log('[Server] Importing newsEventsRoutes...');
const newsEventsRoutes = require('./routes/news-events');
console.log('[Server] Importing promotionRoutes...');
const promotionRoutes = require('./routes/promotion');
console.log('[Server] Importing alumniRoutes...');
const alumniRoutes = require('./routes/alumni');
console.log('[Server] Importing auditRoutes...');
const auditRoutes = require('./routes/audit');
console.log('[Server] Importing teacherAvailabilityRoutes...');
const teacherAvailabilityRoutes = require('./routes/teacher-availability');
console.log('[Server] Importing superadminRoutes...');
const superadminRoutes = require('./routes/superadmin');
console.log('[Server] All route modules imported.');
const interventionRoutes = require('./routes/interventions');
console.log('[Server] Interventions route loaded.');
const platformBillingRoutes = require('./routes/platform-billing');
console.log('[Server] Platform billing route loaded.');
const backupRoutes = require('./routes/backup');
console.log('[Server] Backup route loaded.');
const whatsappRoutes = require('./routes/whatsapp');
console.log('[Server] Whatsapp route loaded.');
const miscFeesRoutes = require('./routes/misc-fees');
console.log('[Server] Misc fees route loaded.');
const holidayRoutes = require('./routes/holidays');
console.log('[Server] Holidays route loaded.');

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
app.use('/api/license', authenticate, licenseRoutes); // License activation itself needs to be accessible
app.use('/api/settings', settingsRoutes); // Protection handled inside router (GET is public)
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
app.use('/api/whatsapp', whatsappRoutes); // Public webhook endpoint for Twilio
app.use('/api/misc-fees', authenticate, checkSubscription, miscFeesRoutes);
app.use('/api/holidays', authenticate, checkSubscription, holidayRoutes);


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
      fs.appendFileSync('logs/server-debug.log', `[${new Date().toISOString()}] 404 ERROR: ${errorMsg}\n`);
    } catch (e) { }
    res.status(404).json({ error: errorMsg });
  });
}


// Graceful shutdown handlers
let activeServer = null;

const gracefulShutdown = async (signal) => {
  console.log(`[${signal}] Shutting down gracefully...`);
  
  // Set a timeout to force exit if shutdown hangs
  const forceExit = setTimeout(() => {
    console.error(`[${signal}] Forced exit after timeout.`);
    process.exit(1);
  }, 5000);

  try {
    if (activeServer) {
      await new Promise((resolve) => {
        activeServer.close(() => {
          console.log('HTTP server closed.');
          resolve();
        });
      });
    }

    const prisma = require('./db');
    await prisma.$disconnect();
    console.log('Prisma disconnected.');
    
    clearTimeout(forceExit);
    process.exit(0);
  } catch (err) {
    console.error('Error during graceful shutdown:', err);
    process.exit(1);
  }
};

// Handle nodemon-specific restart signal (SIGUSR2)
// Also standard signals for termination
process.once('SIGUSR2', () => gracefulShutdown('SIGUSR2'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

const forceKillPort = (port) => {
  if (process.platform !== 'win32') return false;
  const { execSync } = require('child_process');
  try {
    const output = execSync(`netstat -ano | findstr :${port}`).toString();
    const lines = output.split('\n');
    const pids = new Set();
    lines.forEach(line => {
      const match = line.match(/\s+LISTENING\s+(\d+)/);
      if (match) pids.add(match[1]);
    });
    let killed = false;
    pids.forEach(pid => {
      if (parseInt(pid) === process.pid) return; // Don't kill self
      console.warn(`[Server] Found zombie process ${pid} on port ${port}. Clearing...`);
      try {
        execSync(`taskkill /F /PID ${pid}`);
        killed = true;
      } catch (e) {}
    });
    return killed;
  } catch (e) {
    return false;
  }
};

const startServer = (portToTry, retryCount = 0) => {
  const MAX_RETRIES = 5;
  
  if (retryCount === 0) {
    console.log(`[Server] Initializing on port ${portToTry}...`);
    forceKillPort(portToTry);
  } else {
    console.log(`[Server] Retrying listener on port ${portToTry} (Attempt ${retryCount + 1})...`);
  }

  // Explicitly reset activeServer if it exists from a previous failed attempt
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
        const backoff = (retryCount + 1) * 1000;
        console.log(`[Server] Retrying in ${backoff}ms... (${retryCount + 1}/${MAX_RETRIES})`);
        setTimeout(() => {
          // If backoff fails, try one last force kill before the next attempt
          if (retryCount === 1) forceKillPort(portToTry); 
          startServer(portToTry, retryCount + 1);
        }, backoff);
      } else {
        console.error(`[Server] Port ${portToTry} is PERMANENTLY busy.`);
        console.error(`[Server] TIP: Restart your machine if this persists.`);
        process.exit(1);
      }
    } else {
      console.error('[Server] Fatal startup error:', err);
      process.exit(1);
    }
  });
};

const INITIAL_PORT = process.env.PORT || 3000;
startServer(parseInt(INITIAL_PORT));
