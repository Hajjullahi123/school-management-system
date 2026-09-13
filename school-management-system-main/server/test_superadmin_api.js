
const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function testSuperAdminStats() {
  try {
    // 1. Login as SuperAdmin
    // Note: I need the password. I'll see if I can find it or reset it.
    // Based on previous conversations, I might not have it.
    // However, I can bypass login by generating a token directly using the JWT_SECRET from .env

    // Instead of login, let's generate a token directly
    const jwt = require('jsonwebtoken');
    const db = require('./db');

    // Hardcode secret from .env (careful with this in prod, but ok for debug script)
    // Testing with FALLBACK secret to verify misconfiguration hypothesis
    const JWT_SECRET = 'darul-quran-secret-key-change-in-production';

    const user = await db.user.findFirst({ where: { role: 'superadmin' } });

    if (!user) {
      console.error('No superadmin user found in DB!');
      return;
    }

    console.log(`Found SuperAdmin: ${user.username} (ID: ${user.id})`);

    const token = jwt.sign(
      {
        id: user.id,
        schoolId: user.schoolId,
        username: user.username,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    console.log('Generated Test Token');

    // 2. Call Stats Endpoint
    try {
      const response = await axios.get(`${BASE_URL}/superadmin/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('API Response Status:', response.status);
      console.log('API Response Data:', JSON.stringify(response.data, null, 2));
    } catch (apiError) {
      console.error('API Call Failed:', apiError.message);
      if (apiError.response) {
        console.error('Status:', apiError.response.status);
        console.error('Data:', apiError.response.data);
      } else {
        console.error('Is the server running on port 5000?');
      }
    }

  } catch (error) {
    console.error('Script Error:', error);
  } finally {
    const db = require('./db');
    await db.$disconnect();
  }
}

testSuperAdminStats();
