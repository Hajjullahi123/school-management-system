const http = require('http');

const BASE_URL = 'http://localhost:5000/api';
// Helper for requests
async function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api' + path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log('--- Starting Alumni System API Tests ---');

  try {
    // 1. Login as Admin
    console.log('\n[1] Logging in as Admin...');
    const loginRes = await request('POST', '/auth/login', {
      username: 'admin', // Assuming default admin
      password: 'password123' // You might need to adjust this based on seeded data
    });

    if (loginRes.status !== 200) {
      console.error('Login failed! Skipping tests. Ensure server is running and admin credentials are correct.');
      // Try fallback admin if needed or just exit
      return;
    }
    const token = loginRes.body.token;
    console.log('✅ Login successful');

    // 2. Create a Test Student (Need a student to promote)
    console.log('\n[2] Creating Test Student...');
    const studentRes = await request('POST', '/students/register', {
      firstName: 'Test',
      lastName: 'AlumniCandidate',
      email: `alumni.test.${Date.now()}@test.com`,
      gender: 'Male',
      dateOfBirth: '2000-01-01',
      admissionNumber: `TEST/${Date.now()}`,
      classId: 1 // Assuming class ID 1 exists
    }, token);

    let studentId;
    if (studentRes.status === 201) {
      studentId = studentRes.body.student.id;
      console.log('✅ Student created. ID:', studentId);
    } else {
      console.warn('⚠️ Could not create new student, this might fail unless we pick an existing ID. Response:', studentRes.body);
      // Attempt to find a student if create failed? 
      // For now, let's assume we proceed or fail.
    }

    if (studentId) {
      // 3. Promote to Alumni
      console.log('\n[3] Promoting Student to Alumni...');
      const createAlumniRes = await request('POST', '/alumni/admin/create', {
        studentId: studentId,
        graduationYear: 2024,
        alumniId: `AL/TEST/${Date.now()}`
      }, token);

      if (createAlumniRes.status === 201) {
        console.log('✅ Alumni record created:', createAlumniRes.body.alumniId);
      } else {
        console.error('❌ Failed to create alumni:', createAlumniRes.body);
      }

      // 4. Generate Credentials
      console.log('\n[4] Generating Credentials...');
      const credRes = await request('POST', '/alumni/admin/generate-credentials', {
        studentId: studentId
      }, token);

      if (credRes.status === 200) {
        console.log('✅ Credentials generated. Username:', credRes.body.username);
      } else {
        console.error('❌ Failed to generate credentials:', credRes.body);
      }
    }

    // 5. Record Donation
    console.log('\n[5] Recording Donation...');
    const donationRes = await request('POST', '/alumni/donation', {
      donorName: 'Test Automation Donor',
      amount: 50000,
      message: 'This is a test donation',
      isAnonymous: false,
      alumniId: null // record as general donation
    });

    if (donationRes.status === 201) {
      console.log('✅ Donation recorded successfully.');
    } else {
      console.error('❌ Failed to record donation:', donationRes.body);
    }

    // 6. Fetch Donations
    console.log('\n[6] Fetching Donations...');
    const getDonationRes = await request('GET', '/alumni/donations');
    if (getDonationRes.status === 200 && Array.isArray(getDonationRes.body)) {
      console.log(`✅ Fetched ${getDonationRes.body.length} donations.`);
    } else {
      console.error('❌ Failed to fetch donations.');
    }

    console.log('\n--- Tests Completed ---');

  } catch (error) {
    console.error('Test script error:', error);
  }
}

runTests();
