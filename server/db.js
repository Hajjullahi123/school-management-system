const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient({
  log: [
    { level: 'error', emit: 'stdout' },
    { level: 'warn', emit: 'stdout' }
  ],
  errorFormat: 'pretty',
});

// Optional: Log connection success
prisma.$connect()
  .then(() => console.log('[DB] Database connection established successfully.'))
  .catch((err) => console.error('[DB] Database connection failed:', err.message));

module.exports = prisma;
