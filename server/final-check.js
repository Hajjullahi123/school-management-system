const http = require('http');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const token = jwt.sign(
  { id: 1, username: 'admin', role: 'superadmin' },
  process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production'
);

const endpoints = [
  '/api/superadmin/stats',
  '/api/superadmin/schools',
  '/api/superadmin/audit?limit=5',
  '/api/superadmin/global-settings'
];

async function check() {
  for (const path of endpoints) {
    console.log(`Checking ${path}...`);
    try {
      await new Promise((resolve, reject) => {
        const req = http.get({
          hostname: 'localhost',
          port: 5115,
          path,
          headers: { 'Authorization': `Bearer ${token}` }
        }, (res) => {
          let str = '';
          res.on('data', chunk => str += chunk);
          res.on('end', () => {
            console.log(`- Status: ${res.statusCode}`);
            if (res.statusCode !== 200) console.error(`- Error: ${str}`);
            resolve();
          });
        });
        req.on('error', reject);
        req.end();
      });
    } catch (e) {
      console.error(`- Failed: ${e.message}`);
    }
  }
}

check();
