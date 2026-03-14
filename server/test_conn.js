const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
console.log('Attempting connection to Supabase...');
prisma.school.count()
  .then(count => {
    console.log('SUCCESS: Connected. School count:', count);
    process.exit(0);
  })
  .catch(err => {
    console.error('FAILURE: Could not connect.');
    console.error(err.message);
    process.exit(1);
  });
