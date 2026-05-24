process.env.DATABASE_URL="file:./dev.db";
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient().$extends({
  query: {
    $allModels: {
      findMany({ model, args, query }) {
        console.log('findMany intercepted for:', model);
        return query(args);
      }
    }
  }
});
prisma.user.findMany({ include: { student: true } }).then(()=>console.log('Done')).catch(console.error).finally(()=>process.exit(0));
