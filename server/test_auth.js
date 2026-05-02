const prisma = require('./db');
async function test() {
  try {
    const user = await prisma.user.findFirst({ where: { firstName: 'Abdullahi', lastName: 'Lawal' }});
    console.log('User:', user?.id);
    
    if(!user) return;
    
    const role = user.role;
    const schoolSelect = { id: true, slug: true, name: true, logoUrl: true, motto: true, isActivated: true, packageType: true };
    let include = { school: { select: schoolSelect } };
    if (role === 'teacher') {
      include.teacher = { select: { id: true, staffId: true, specialization: true, photoUrl: true } };
      include.classesAsTeacher = { select: { id: true, name: true, arm: true } };
    }
    
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true, username: true, role: true, schoolId: true,
        firstName: true, lastName: true, email: true,
        signatureUrl: true, mustChangePassword: true, photoUrl: true,
        departmentAsHead: { select: { id: true, name: true } },
        ...include
      }
    });
    console.log('Me query success!');
  } catch(e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}
test();
