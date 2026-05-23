const { PrismaClient } = require('@prisma/client');

// Use the production DATABASE_URL
process.env.DATABASE_URL = "postgresql://postgres:HFy83KXM3lAwbGgCksnblx8JiSF9nMvwuAI6NReovKZWYWkSSAaYro6lEGvVwPyF@178.105.151.152:5432/postgres";

const prisma = new PrismaClient();

async function main() {
  console.log("Connecting to database and fetching users...");
  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      role: true,
      firstName: true,
      lastName: true
    },
    take: 10
  });
  console.log("--- Users ---");
  console.log(JSON.stringify(users, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
