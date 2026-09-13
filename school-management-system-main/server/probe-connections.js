require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const baseLocalUrl = "postgresql://postgres.pxjjxorczgqyqnlqfhmt:EduTechAI123@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?sslmode=no-verify&pgbouncer=true";

const strategies = [
  {
    name: 'Original (Port 6543, no-verify)',
    url: baseLocalUrl
  },
  {
    name: 'Session Mode (Port 5432, require, no-pgbouncer)',
    url: baseLocalUrl.replace(':6543/', ':5432/').replace('pgbouncer=true', 'pgbouncer=false').replace('sslmode=no-verify', 'sslmode=require')
  },
  {
    name: 'Session Mode (Port 5432, no-verify, no-pgbouncer)',
    url: baseLocalUrl.replace(':6543/', ':5432/').replace('pgbouncer=true', 'pgbouncer=false')
  },
  {
    name: 'Session Mode (Port 5432, require, no-pgbouncer, timeout)',
    url: baseLocalUrl.replace(':6543/', ':5432/').replace('pgbouncer=true', 'pgbouncer=false').replace('sslmode=no-verify', 'sslmode=require') + '&connect_timeout=30'
  }
];

async function probe(strategy) {
  console.log(`\n--- Probing Strategy: ${strategy.name} ---`);
  console.log(`URL (redacted): ${strategy.url.replace(/:[^:]+@/, ':****@')}`);
  
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: strategy.url
      }
    }
  });
  
  try {
    const result = await prisma.$queryRaw`SELECT NOW()`;
    console.log(`✅ SUCCESS: ${strategy.name}`);
    return true;
  } catch (e) {
    console.log(`❌ FAILED: ${strategy.name}`);
    console.log(`Error: ${e.message.split('\n')[0]}`);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

async function runProbes() {
  for (const strategy of strategies) {
    const success = await probe(strategy);
    if (success) {
      console.log(`\n🎉 FOUND WORKING STRATEGY: ${strategy.name}`);
      console.log(`RECOMMENDED URL: ${strategy.url}`);
      // return; // Uncomment if you want to stop at first success
    }
  }
  console.log('\n--- Probe Complete ---');
}

runProbes();
