const http = require('http');

// 1. Login to get token
const loginData = JSON.stringify({
  username: 'admin',
  password: 'admin123'
});

const loginOptions = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': loginData.length
  }
};

console.log('1. Logging in as admin...');

const loginReq = http.request(loginOptions, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    if (res.statusCode === 200) {
      const { token } = JSON.parse(body);
      console.log('✅ Login successful. Token received.');
      fetchClasses(token);
    } else {
      console.log('❌ Login failed:', body);
    }
  });
});

loginReq.write(loginData);
loginReq.end();

// 2. Fetch Classes
function fetchClasses(token) {
  console.log('2. Fetching classes...');

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/classes',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  };

  const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      console.log('BODY:', body);
      try {
        const data = JSON.parse(body);
        if (Array.isArray(data)) {
          console.log(`✅ Success: Received array of ${data.length} classes`);
        } else {
          console.log('❌ Error: Response is NOT an array');
        }
      } catch (e) {
        console.log('❌ Error parsing JSON:', e.message);
      }
    });
  });

  req.end();
}
