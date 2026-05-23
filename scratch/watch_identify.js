async function check() {
  try {
    const response = await fetch('https://educatechportal.com/api/debug/inspect-parents');
    const status = response.status;
    const body = await response.text();
    console.log(`[${new Date().toISOString()}] Status: ${status}`);
    if (status === 200) {
      console.log('SUCCESS! Response:', body.substring(0, 200));
      process.exit(0);
    } else {
      console.log('Error Body:', body.substring(0, 150));
    }
  } catch (err) {
    console.error('Fetch error:', err.message);
  }
}

async function loop() {
  for (let i = 0; i < 40; i++) {
    await check();
    await new Promise(resolve => setTimeout(resolve, 10000));
  }
}

loop();
