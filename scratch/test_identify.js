async function test() {
  try {
    const response = await fetch('http://idlygbh1muz36hr338psw3hl.178.105.151.152.sslip.io/api/auth/identify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        identifier: 'DQA/HY/2026/002'
      })
    });
    
    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    const data = await response.text();
    console.log('Response Body:', data);
  } catch (err) {
    console.error('Error:', err);
  }
}

test();
