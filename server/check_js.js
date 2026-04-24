const https = require('https');
https.get('https://school-management-system-bkat.onrender.com/assets/index-DtpwxHjQ.js', (res) => {
  console.log('JS STATUS:', res.statusCode);
});
