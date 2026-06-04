const puppeteer = require('puppeteer');

(async () => {
  console.log('Launching browser...');
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  
  console.log('Visiting localhost:4173/edutech...');
  await page.goto('http://localhost:4173/edutech', {waitUntil: 'networkidle0'}).catch(e => console.log('Goto error:', e.message));
  
  await browser.close();
  console.log('Done.');
})();
