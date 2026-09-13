const { PrismaClient } = require('./node_modules/@prisma/client');

async function check() {
  const supabaseUrl = "postgresql://postgres.pxjjxorczgqyqnlqfhmt:EduTechAI123@aws-1-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require";
  const sqliteUrl = "file:./dev.db";

  console.log('--- CHECKING SQLITE ---');
  const prismaSqlite = new PrismaClient({ datasources: { db: { url: sqliteUrl } } });
  try {
    const student = await prismaSqlite.student.findFirst({
        where: { admissionNumber: 'dqa/ma/2026/010' },
        include: { school: true }
    });
    console.log('SQLite Result:', student ? `Found! School: ${student.school.name}` : 'Not found');
  } catch (e) {
    console.log('SQLite Error:', e.message);
  } finally {
    await prismaSqlite.$disconnect();
  }

  console.log('\n--- CHECKING SUPABASE ---');
  // Note: This might fail if the provider in schema.prisma is sqlite
  const prismaSupabase = new PrismaClient({ datasources: { db: { url: supabaseUrl } } });
  try {
    const student = await prismaSupabase.student.findFirst({
        where: { admissionNumber: 'dqa/ma/2026/010' },
        include: { school: true }
    });
    console.log('Supabase Result:', student ? `Found! School: ${student.school.name}` : 'Not found');
  } catch (e) {
    console.log('Supabase Error:', e.message);
  } finally {
    await prismaSupabase.$disconnect();
  }
}

check();
