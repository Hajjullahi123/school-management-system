const { Client } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;

console.log('Testing connection with URL (redacted password):', connectionString.replace(/:[^:]+@/, ':****@'));

const client = new Client({
  connectionString: connectionString,
});

async function testConnection() {
  try {
    await client.connect();
    console.log('✅ Successfully connected to database!');
    const res = await client.query('SELECT NOW() as current_time, current_database() as db_name');
    console.log('Current time from DB:', res.rows[0].current_time);
    console.log('Connected to DB:', res.rows[0].db_name);
    
    const schoolCount = await client.query('SELECT COUNT(*) FROM "School"');
    console.log('Total schools in DB:', schoolCount.rows[0].count);
    
  } catch (err) {
    console.error('❌ Connection error:', err.message);
    console.error('Stack trace:', err.stack);
  } finally {
    await client.end();
  }
}

testConnection();
