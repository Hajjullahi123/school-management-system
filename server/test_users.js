const prisma = require('./db');
prisma.user.findMany({
  include: {
    student: { include: { classModel: true } },
    teacher: true,
    Parent: { include: { parentChildren: { include: { user: { select: { firstName: true, lastName: true } } } } } }
  }
}).then(()=>console.log('OK')).catch(console.error).finally(()=>process.exit(0));
