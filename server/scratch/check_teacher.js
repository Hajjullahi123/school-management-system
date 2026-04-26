const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const logs = await prisma.auditLog.findMany({
    where: {
      action: { contains: 'LOGIN' }
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          username: true,
          role: true
        }
      }
    }
  });

  console.log('Recent Logins:', logs.map(l => ({
    userId: l.userId,
    name: l.user ? `${l.user.firstName} ${l.user.lastName}` : 'N/A',
    username: l.user?.username,
    role: l.user?.role,
    at: l.createdAt
  })));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
