const prisma = require('./db');

async function inspectAbuhurairah() {
  const users = await prisma.user.findMany({
    where: { firstName: { contains: 'Abuhurairah' } },
    include: {
      parentProfile: true
    }
  });
  
  console.log('Users:');
  console.dir(users, { depth: null });

  const parents = await prisma.parent.findMany({
    where: { User: { firstName: { contains: 'Abuhurairah' } } },
    include: {
      parentChildren: true
    }
  });

  console.log('\nParents:');
  console.dir(parents, { depth: null });
}

inspectAbuhurairah().catch(console.error).finally(() => prisma.$disconnect());
