const http = require('http');

const data = JSON.stringify({
  username: 'admin',
  password: 'admin123'
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

console.log('Testing Login API Endpoint...');
console.log('Target: http://localhost:3000/api/auth/login');

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  console.log(`HEADERS: ${JSON.stringify(res.headers)}`);

  let body = '';
  res.setEncoding('utf8');
  res.on('data', (chunk) => {
    body += chunk;
  });

  res.on('end', () => {
    console.log('BODY:', body);
    if (res.statusCode === 200) {
      console.log('✅ API Login Test PASSED');
    } else {
      console.log('❌ API Login Test FAILED');
    }
  });
});

req.on('error', (e) => {
  console.error(`❌ Request error: ${e.message}`);
});

req.write(data);
req.end();
