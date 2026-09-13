// Diagnostic script to check parent state in production database
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== PRODUCTION PARENT DIAGNOSTIC ===\n');
  
  // 1. List all schools
  const schools = await prisma.school.findMany({
    select: { id: true, name: true, slug: true }
  });
  console.log('Schools:', JSON.stringify(schools, null, 2));
  
  // 2. Count parents per school
  for (const school of schools) {
    const parentCount = await prisma.parent.count({ where: { schoolId: school.id } });
    const parentUsers = await prisma.user.count({ where: { schoolId: school.id, role: 'parent' } });
    const studentsWithParent = await prisma.student.count({ where: { schoolId: school.id, parentId: { not: null } } });
    const totalStudents = await prisma.student.count({ where: { schoolId: school.id } });
    
    console.log(`\n--- School "${school.name}" (ID: ${school.id}, slug: ${school.slug}) ---`);
    console.log(`  Parent records in Parent table: ${parentCount}`);
    console.log(`  Users with role=parent: ${parentUsers}`);
    console.log(`  Students with parentId linked: ${studentsWithParent} / ${totalStudents}`);
  }
  
  // 3. Check for orphaned parent users (users with role='parent' but no Parent record)
  const orphanedParentUsers = await prisma.user.findMany({
    where: {
      role: 'parent',
      Parent: null  // No corresponding Parent profile
    },
    select: { id: true, username: true, firstName: true, lastName: true, schoolId: true }
  });
  
  console.log(`\n=== ORPHANED PARENT USERS (role=parent but no Parent record) ===`);
  console.log(`Count: ${orphanedParentUsers.length}`);
  if (orphanedParentUsers.length > 0) {
    console.log(JSON.stringify(orphanedParentUsers, null, 2));
  }
  
  // 4. List all Parent records with their linked children
  const allParents = await prisma.parent.findMany({
    include: {
      User: { select: { id: true, firstName: true, lastName: true, username: true, schoolId: true } },
      parentChildren: { select: { id: true, admissionNumber: true, parentId: true } }
    }
  });
  
  console.log(`\n=== ALL PARENT RECORDS ===`);
  console.log(`Count: ${allParents.length}`);
  for (const p of allParents) {
    console.log(`  Parent ID ${p.id}: ${p.User.firstName} ${p.User.lastName} (user: ${p.User.username}, school: ${p.schoolId})`);
    console.log(`    Children: ${p.parentChildren.length} - ${p.parentChildren.map(c => c.admissionNumber).join(', ') || 'NONE'}`);
  }
  
  // 5. Check specifically for the user "Muhammad Mahi"
  const muhammadUsers = await prisma.user.findMany({
    where: {
      OR: [
        { firstName: { contains: 'Muhammad' } },
        { firstName: { contains: 'Mahi' } },
        { lastName: { contains: 'Mahi' } }
      ],
      role: 'parent'
    },
    include: {
      Parent: {
        include: {
          parentChildren: { select: { id: true, admissionNumber: true, parentId: true } }
        }
      }
    }
  });
  
  console.log(`\n=== MUHAMMAD MAHI SEARCH ===`);
  console.log(`Found: ${muhammadUsers.length}`);
  for (const u of muhammadUsers) {
    console.log(`  User ID ${u.id}: ${u.firstName} ${u.lastName} (username: ${u.username})`);
    console.log(`  Parent profile exists: ${!!u.Parent}`);
    if (u.Parent) {
      console.log(`  Parent ID: ${u.Parent.id}, Phone: ${u.Parent.phone}, School: ${u.Parent.schoolId}`);
      console.log(`  Children: ${u.Parent.parentChildren.length}`);
    }
  }
}

main()
  .catch(e => console.error('Error:', e))
  .finally(() => prisma.$disconnect());
