// Test script to create a user via API
// const fetch = require('node-fetch'); // Native fetch in Node 18+

async function testCreateUser() {
  try {
    // First, login to get a token
    console.log('Logging in as admin...');
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });

    if (!loginResponse.ok) {
      console.error('Login failed:', await loginResponse.text());
      return;
    }

    const { token } = await loginResponse.json();
    console.log('✓ Login successful');

    // Now try to create a teacher
    console.log('\nCreating a teacher...');
    const createResponse = await fetch('http://localhost:3000/api/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        username: 'testteacher999',
        password: 'test123',
        email: 'test@teacher.com',
        role: 'teacher',
        firstName: 'Test',
        lastName: 'Teacher',
        staffId: 'TCH999',
        specialization: 'Testing'
      })
    });

    const responseText = await createResponse.text();
    console.log('\nResponse status:', createResponse.status);
    console.log('Response body:', responseText);

    if (createResponse.ok) {
      console.log('\n✓ Teacher created successfully!');
    } else {
      console.log('\n✗ Failed to create teacher');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testCreateUser();
