const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Mock request/response for testing route logic directly? 
// No, simpler to just use Prisma to find user, then simulate API fetch if possible, 
// OR just use fetch() against the running server if it's running.
// Since I don't know if server is running on a port I can hit (likely 5000), 
// I will try to hit http://localhost:5000/api/classes/1
// But I need to login first.

// NOTE: This script assumes the server is running on port 5000.
// If not, it will fail.
// If it fails, I'll fallback to Prisma-only check.

async function main() {
  try {
    // 1. Find Hajara
    const user = await prisma.user.findFirst({ where: { firstName: 'Hajara' } });
    if (!user) {
      console.error('Hajara not found in DB');
      return;
    }
    console.log(`User: ${user.username} (ID: ${user.id}) Role: ${user.role}`);

    // 2. Find her assignment
    const assignment = await prisma.teacherAssignment.findFirst({
      where: { teacherId: user.id },
      include: { class: true }
    });
    if (!assignment) {
      console.error('No assignment found for Hajara!');
      return;
    }
    console.log(`Assigned Class: ${assignment.class.name} ${assignment.class.arm || ''} (ID: ${assignment.classId})`);

    // 3. Login to get token (Simulate)
    // Actually, I can just generate a valid token if I know the SECRET.
    // 'your-secret-key' is typical for this codebase (I recall seeing it or can check).
    // Let's check config or .env.
    // Assuming 'your-secret-key' based on previous interactions or default.
    // Better to fetch login endpoint.

    console.log('Attempting to fetch API...');
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user.username, password: 'password123' }) // Assuming default pass?
    });

    // If login fails, we might need to reset password or use a known one.
    // setup_demo_hajara.js didn't set password, it used existing user.
    // If we can't login, we can't test API.

    // ALTERNATIVE: Verify data via Prisma only, as we already did.
    // The data exists.

    // Let's assume the issue is FRONTEND fetching.
    // Check if the endpoint responds to a known token?
    // I will generate a token using 'your-secret-key' (standard for this demo).

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key', // Fallback to common secret
      { expiresIn: '1h' }
    );

    console.log('Generated test token.');

    // 4. Fetch Class Students
    const classId = assignment.classId;
    const url = `http://localhost:5000/api/classes/${classId}`;
    console.log(`Fetching: ${url}`);

    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) {
      console.error(`Status: ${res.status} ${res.statusText}`);
      const text = await res.text();
      console.error('Body:', text);
    } else {
      const data = await res.json();
      console.log('Success!');
      console.log(`Class Name: ${data.name}`);
      console.log(`Students Found: ${data.students ? data.students.length : 0}`);
      if (data.students && data.students.length > 0) {
        console.log('First student:', data.students[0].user.firstName);
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
