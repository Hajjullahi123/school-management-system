const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'darul-quran-secret-key-change-in-production';

async function testFlow() {
  try {
    console.log('--- STARTING FULL API FLOW TEST FOR SCHOOL 3 ---');

    // 1. Find the admin user (should be corrected to 'admin' now)
    const user = await prisma.user.findFirst({
      where: { username: 'admin', schoolId: 3 }
    });

    if (!user) {
      console.error('FAILED: Admin user "admin" for School 3 not found.');
      // Check if the corrupted one still exists
      const corrupted = await prisma.user.findFirst({
        where: { username: 'aundefineda-admin', schoolId: 3 }
      });
      if (corrupted) console.log('Found corrupted "aundefineda-admin" instead.');
      return;
    }

    console.log(`PASS: Found user "${user.username}" (ID: ${user.id}) for School ${user.schoolId}`);

    // 2. Simulate Token Generation (from auth middleware/route)
    const token = jwt.sign(
      {
        id: user.id,
        schoolId: user.schoolId,
        username: user.username,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    console.log('PASS: Token generated successfully.');

    // 3. Simulate Request Scoping (from authenticate middleware)
    const decoded = jwt.verify(token, JWT_SECRET);
    const reqSchoolId = decoded.schoolId;
    console.log(`PASS: Decoded School ID: ${reqSchoolId} (Type: ${typeof reqSchoolId})`);

    // 4. Test Student Retrieval (from student route)
    const students = await prisma.student.findMany({
      where: { schoolId: reqSchoolId, status: 'active' },
      select: { id: true, admissionNumber: true }
    });
    console.log(`RESULT: Found ${students.length} active students.`);

    // 5. Test Class Retrieval (from classes route)
    const classes = await prisma.class.findMany({
      where: { schoolId: reqSchoolId, isActive: true },
      select: { id: true, name: true }
    });
    console.log(`RESULT: Found ${classes.length} active classes.`);

    if (students.length === 85 && classes.length === 4) {
      console.log('--- TEST PASSED: ALL RECORDS VISIBLE VIA API LOGIC ---');
    } else {
      console.error(`--- TEST FAILED: Counts mismatch. Expected 85/4, got ${students.length}/${classes.length} ---`);
    }

  } catch (e) {
    console.error('ERROR during test flow:', e);
  } finally {
    await prisma.$disconnect();
  }
}

testFlow();
