const http = require('http');

function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    }).on('error', reject);
  });
}

async function testApi() {
  const baseUrl = 'http://localhost:5000';

  console.log('\n--- Test 1: Public fetch (No school param) ---');
  try {
    const res = await get(`${baseUrl}/api/alumni/directory`);
    console.log('Status:', res.status);
    console.log('Data:', res.data);
  } catch (e) {
    console.log('Error:', e.message);
  }

  console.log('\n--- Test 2: Public fetch (school=3) ---');
  try {
    const res = await get(`${baseUrl}/api/alumni/directory?school=3`);
    console.log('Status:', res.status);
    if (Array.isArray(res.data)) {
      console.log('Results Count:', res.data.length);
      if (res.data.length > 0) {
        console.log('First result:', res.data[0].student.user.firstName, res.data[0].student.user.lastName);
      }
    } else {
      console.log('Data:', res.data);
    }
  } catch (e) {
    console.log('Error:', e.message);
  }

  console.log('\n--- Test 3: Public fetch (school=amana-academy) ---');
  try {
    const res = await get(`${baseUrl}/api/alumni/directory?school=amana-academy`);
    console.log('Status:', res.status);
    if (Array.isArray(res.data)) {
      console.log('Results Count:', res.data.length);
    } else {
      console.log('Data:', res.data);
    }
  } catch (e) {
    console.log('Error:', e.message);
  }
}

testApi();
