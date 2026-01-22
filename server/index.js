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

// Routes
// DEBUG: File system check
app.get('/api/debug/files', (req, res) => {
  const fs = require('fs');
  const distPath = path.join(__dirname, '../client/dist');

  try {
    if (!fs.existsSync(distPath)) {
      return res.json({ error: 'Dist folder does not exist', path: distPath });
    }

    const files = fs.readdirSync(distPath);
    const assetsPath = path.join(distPath, 'assets');
    const assets = fs.existsSync(assetsPath) ? fs.readdirSync(assetsPath) : 'Assets folder missing';

    res.json({
      basePath: distPath,
      rootFiles: files,
      assets: assets
    });
  } catch (err) {
    res.json({ error: err.message, stack: err.stack });
  }
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/students', require('./routes/students'));
app.use('/api/subjects', require('./routes/subjects'));
app.use('/api/exams', require('./routes/exams'));
app.use('/api/results', require('./routes/results-enhanced')); // Enhanced results with 5 components
app.use('/api/reports', require('./routes/reports')); // NEW: Report generation
app.use('/api/report-card', require('./routes/report-card'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/advanced-analytics', require('./routes/advanced-analytics')); // Advanced AI-powered analytics
app.use('/api/academic-sessions', require('./routes/academic-sessions'));
app.use('/api/terms', require('./routes/terms'));
app.use('/api/classes', require('./routes/classes'));
app.use('/api/class-subjects', require('./routes/class-subjects')); // Class subject management
app.use('/api/assignments', require('./routes/assignments'));
app.use('/api/bulk-results', require('./routes/bulk-results'));
app.use('/api/email', require('./routes/email'));
app.use('/api/upload', require('./routes/upload')); // File upload for student photos
app.use('/api/teacher-assignments', require('./routes/teacher-assignments')); // Teacher-Subject-Class assignments
app.use('/api/bulk-upload', require('./routes/bulk-upload')); // Bulk student upload
app.use('/api/scoresheet', require('./routes/generate-scoresheet')); // CSV scoresheet generation
app.use('/api/fees', require('./routes/fee-management')); // Fee management
app.use('/api/fee-structure', require('./routes/fee-structure')); // Fee structure setup
app.use('/api/exam-cards', require('./routes/exam-cards')); // Examination cards
app.use('/api/teachers', require('./routes/teachers')); // Teacher profile management
app.use('/api/top-students', require('./routes/top-students')); // Top students showcase
app.use('/api/license', require('./routes/license')); // License management
app.use('/api/settings', require('./routes/settings')); // School settings & branding
app.use('/api/payments', require('./routes/payments')); // Online payments
app.use('/api/attendance', require('./routes/attendance')); // Attendance Management
app.use('/api/messages', require('./routes/messages')); // Parent-Teacher Messaging
app.use('/api/timetable', require('./routes/timetable')); // Class Timetable
app.use('/api/notices', require('./routes/notices')); // Notices & Announcements
app.use('/api/lms', require('./routes/lms')); // Homework & Resources
app.use('/api/parents', require('./routes/parents')); // Parent Portal
app.use('/api/system', require('./routes/system-settings')); // System settings (current term/session)
app.use('/api/cbt', require('./routes/cbt')); // Computer Based Test (CBT)
app.use('/api/report-extras', require('./routes/report-extras')); // Remarks & Psychomotor
app.use('/api/quran-tracker', require('./routes/quran-tracker')); // Qur'an Memorization Tracker
app.use('/api/gallery', require('./routes/gallery')); // Gallery Management
app.use('/api/news-events', require('./routes/news-events')); // News & Events
app.use('/api/promotion', require('./routes/promotion')); // Student Promotions & Graduation
app.use('/api/alumni', require('./routes/alumni'));
app.use('/api/audit', require('./routes/audit'));
app.use('/api/teacher-availability', require('./routes/teacher-availability'));
app.use('/api/superadmin', require('./routes/superadmin'));
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
    res.status(404).json({ error: `Route ${req.method} ${req.url} not found` });
  });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
