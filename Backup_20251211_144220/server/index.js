const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();

// Middleware
// CORS configuration for local network hosting
// This allows access from any computer on your school network
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // Allow localhost for development
    if (origin.includes('localhost')) return callback(null, true);

    // Allow any IP on local network (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
    const localNetworkPattern = /^http:\/\/(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3}):\d+$/;

    if (localNetworkPattern.test(origin)) {
      return callback(null, true);
    }

    // Reject other origins
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// File upload middleware
const fileUpload = require('express-fileupload');
app.use(fileUpload({
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
  useTempFiles: true,
  tempFileDir: '/tmp/'
}));

// Serve uploaded files statically
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/students', require('./routes/students'));
app.use('/api/subjects', require('./routes/subjects'));
app.use('/api/exams', require('./routes/exams'));
app.use('/api/results', require('./routes/results-enhanced')); // Enhanced results with 5 components
app.use('/api/reports', require('./routes/reports')); // NEW: Report generation
app.use('/api/report-card', require('./routes/report-card'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/academic-sessions', require('./routes/academic-sessions'));
app.use('/api/terms', require('./routes/terms'));
app.use('/api/classes', require('./routes/classes'));
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
app.use('/api/timetable', require('./routes/timetable')); // Class Timetable
app.use('/api/notices', require('./routes/notices')); // Notices & Announcements
app.use('/api/lms', require('./routes/lms')); // Homework & Resources
app.use('/api/parents', require('./routes/parents')); // Parent Portal
// app.use('/api/system', require('./routes/system-settings')); // System settings (current term/session) - TEMPORARILY DISABLED

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
