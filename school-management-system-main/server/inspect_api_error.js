
const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function inspectApi() {
  try {
    console.log('--- 1. Testing Login ---');
    // Using the default superadmin credentials I saw in seed files/logs
    // username: 'general', password: 'password123'
    try {
      const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
        username: 'general',
        password: 'password123'
      });

      console.log('Login Status:', loginRes.status);
      const token = loginRes.data.token;
      console.log('Token received:', token ? 'YES' : 'NO');

      if (!token) return;

      console.log('\n--- 2. Fetching Stats ---');
      const statsRes = await axios.get(`${BASE_URL}/superadmin/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('Stats Status:', statsRes.status);
      console.log('Stats Data:', JSON.stringify(statsRes.data, null, 2));

    } catch (error) {
      console.error('API Request Failed');
      if (error.response) {
        console.log('Status:', error.response.status);
        console.log('Data:', JSON.stringify(error.response.data, null, 2));
      } else {
        console.log('Error:', error.message);
      }
    }

  } catch (error) {
    console.error('Script Error:', error);
  }
}

inspectApi();
