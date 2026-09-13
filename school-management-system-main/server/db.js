const { PrismaClient } = require('@prisma/client');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Singleton pattern for ALL environments.
// In dev, Node.js module caching handles this; we use global.__prisma__ as an
// extra safety net to survive hot-reloads (e.g. nodemon) without leaking connections.
if (!global.__prisma__) {
  global.__prisma__ = new PrismaClient({
    log: [
      { level: 'error', emit: 'stdout' },
      { level: 'warn', emit: 'stdout' }
    ],
    errorFormat: 'pretty'
  });
}

// Define models that support soft deletion
const softDeleteModels = ['Student', 'FeeRecord', 'FeePayment', 'MiscellaneousFeePayment'];

// Extend Prisma Client with Soft Deletes
const prisma = global.__prisma__.$extends({
  query: {
    $allModels: {
      async delete({ model, args, query }) {
        if (softDeleteModels.includes(model)) {
          return global.__prisma__[model].update({
            ...args,
            data: { isDeleted: true, deletedAt: new Date() }
          });
        }
        return query(args);
      },
      async deleteMany({ model, args, query }) {
        if (softDeleteModels.includes(model)) {
          if (args.data) {
            args.data.isDeleted = true;
            args.data.deletedAt = new Date();
          }
          return global.__prisma__[model].updateMany({
            ...args,
            data: { isDeleted: true, deletedAt: new Date() }
          });
        }
        return query(args);
      },
      // Automatically hide deleted records from list queries
      async findMany({ model, args, query }) {
        if (softDeleteModels.includes(model)) {
          args = args || {};
          args.where = { ...(args.where || {}), isDeleted: false };
        }
        return query(args);
      },
      async findFirst({ model, args, query }) {
        if (softDeleteModels.includes(model)) {
          args = args || {};
          args.where = { ...(args.where || {}), isDeleted: false };
        }
        return query(args);
      }
    }
  }
});
// Optimization: Set SQLite pragmas for performance and concurrency
// WAL mode allows multiple readers and one writer concurrently.
async function applyPragmas() {
  try {
    const dbUrl = process.env.DATABASE_URL || '';
    if (dbUrl.includes('file:') || dbUrl.includes('.db')) {
      // Use $queryRawUnsafe because PRAGMA journal_mode returns a result row
      await prisma.$queryRawUnsafe('PRAGMA journal_mode=WAL;');
      await prisma.$queryRawUnsafe('PRAGMA synchronous=NORMAL;');
      console.log('[DB] SQLite optimizations applied (WAL mode).');
    }
  } catch (err) {
    console.warn('[DB] Could not apply SQLite optimizations:', err.message);
  }
}

// Optional: Log connection success
prisma.$connect()
  .then(async () => {
    console.log('[DB] Database connection established successfully.');
    await applyPragmas();
  })
  .catch((err) => console.error('[DB] Database connection failed:', err.message));

module.exports = prisma;
