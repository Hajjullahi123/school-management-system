const https = require('https');
https.get('https://school-management-system-bkat.onrender.com/', (res) => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    const match = body.match(/<script type="module" crossorigin src="(.*?)">/);
    console.log('INDEX:', match ? match[1] : 'No script tag');
  });
});
