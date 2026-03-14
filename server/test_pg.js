const { Client } = require('pg');

async function testPg() {
  const client = new Client({
    connectionString: "postgresql://postgres.pxjjxorczgqyqnlqfhmt:EduTechAI123@aws-1-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require"
  });

  try {
    console.log('Attempting to connect with pg client...');
    await client.connect();
    console.log('Successfully connected with pg client!');
    const res = await client.query('SELECT NOW()');
    console.log('Current time from DB:', res.rows[0]);
  } catch (err) {
    console.error('Connection error with pg client:', err);
  } finally {
    await client.end();
  }
}

testPg();
