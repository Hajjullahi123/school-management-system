const { Client } = require('pg');

async function testConnection() {
  const connectionString = "postgresql://postgres.pxjjxorczgqyqnlqfhmt:EduTechAI123@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?sslmode=no-verify&pgbouncer=true&connection_limit=1";
  
  const client = new Client({
    connectionString: connectionString,
  });

  try {
    console.log('Attempting to connect to Supabase...');
    await client.connect();
    console.log('CONNECTED successfully!');
    
    const res = await client.query('SELECT count(*) FROM "School"');
    console.log(`Found ${res.rows[0].count} schools in the database.`);
    
    const schoolRes = await client.query('SELECT name FROM "School" LIMIT 5');
    console.log('Schools found:', schoolRes.rows.map(r => r.name));

  } catch (err) {
    console.error('CONNECTION FAILED:', err.message);
  } finally {
    await client.end();
  }
}

testConnection();
