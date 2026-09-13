require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const prisma = new PrismaClient();
const dbPath = path.join(__dirname, 'prisma', 'dev.db');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY);

const query = (sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => {
    if (err) reject(err);
    else resolve(rows);
  });
});

const tablesInOrder = [
  'School', 'GlobalSettings', 'AcademicSession', 'Term', 'User', 'Class', 'Subject',
  'ClassSubject', 'Teacher', 'Parent', 'Student', 'TeacherAssignment',
  'Result', 'AttendanceRecord', 'FeeRecord', 'FeePayment', 'MiscellaneousFee',
  'MiscellaneousFeePayment', 'StaffAttendance', 'Homework', 'HomeworkSubmission',
  'LearningResource', 'Timetable', 'Notice', 'ParentTeacherMessage', 'CBTExam',
  'CBTResult', 'CBTQuestion', 'CBTQuestionBank', 'StudentReportCard',
  'QuranTarget', 'QuranRecord', 'NewsEvent', 'GalleryImage', 'Alumni',
  'PromotionHistory', 'SchoolHoliday'
];

const booleanFields = new Set([
  'enableAutoBackup', 'enableOnlinePayment', 'emailSecure', 'enableSMS',
  'whatsappBotEnabled', 'isActivated', 'subscriptionActive', 'examMode',
  'isSetupComplete', 'enableStaffAttendanceReport', 'isActive',
  'mustChangePassword', 'isScholarship', 'isExamRestricted', 'isAvailable',
  'isCurrent', 'isResultPublished', 'isPublished', 'isProgressivePublished',
  'isSubmitted', 'isClearedForExam'
]);

async function migrate() {
  try {
    console.log('--- STARTING CLEAN FULL MIGRATION ---');

    // 1. CLEAN SUPABASE (Reverse order)
    console.log('\nStep 1: Cleaning Supabase Database...');
    const reversed = [...tablesInOrder].reverse();
    for (const table of reversed) {
      const modelName = table.charAt(0).toLowerCase() + table.slice(1);
      try {
        await prisma[modelName].deleteMany();
        process.stdout.write(`${table} `);
      } catch (e) {
        // Silently skip if table doesn't exist or is already empty
      }
    }
    console.log('\nCleanup Complete.');

    // 2. MIGRATE (In order)
    console.log('\nStep 2: Migrating Data from SQLite...');
    for (const table of tablesInOrder) {
      const rows = await query(`SELECT * FROM "${table}"`);
      if (rows.length === 0) continue;

      console.log(`\nMigrating ${rows.length} records from ${table}...`);
      const modelName = table.charAt(0).toLowerCase() + table.slice(1);

      let successCount = 0;
      for (const row of rows) {
        try {
          const data = { ...row };
          for (const key in data) {
            // Dates
            if (key.endsWith('At') || key.endsWith('Date') || key === 'startDate' || key === 'endDate' || key === 'expiresAt' || key === 'dateOfBirth') {
              if (data[key]) data[key] = new Date(data[key]);
            }
            // Booleans
            const lowerKey = key.toLowerCase();
            if (booleanFields.has(key) || lowerKey.startsWith('is') || lowerKey.startsWith('enable') || lowerKey.includes('active') || lowerKey.includes('enabled') || key === 'mustChangePassword' || key === 'emailSecure' || key === 'examMode') {
              if (typeof data[key] === 'number') data[key] = (data[key] === 1);
            }
            // Remove nulls
            if (data[key] === null) delete data[key];
          }

          await prisma[modelName].upsert({
            where: { id: row.id },
            update: data,
            create: data
          });
          successCount++;
          if (successCount % 50 === 0) process.stdout.write('.');
        } catch (err) {
          if (successCount < 5) console.error(`\n[ERROR] ${table} ID ${row.id}:`, err.message);
        }
      }
      console.log(`\nFinished ${table}: ${successCount}/${rows.length} Success`);
    }

    console.log('\n=========================================');
    console.log('MIGRATION COMPLETED SUCCESSFULLY!');
    console.log('=========================================');

  } catch (error) {
    console.error('\nFATAL ERROR during migration:', error.message);
  } finally {
    db.close();
    await prisma.$disconnect();
  }
}

migrate();
function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
