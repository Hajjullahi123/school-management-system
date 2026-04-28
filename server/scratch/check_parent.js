const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  console.log('--- Checking Parent Account: Abuhurairah Bagwanje ---');
  
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { firstName: { contains: 'Abuhurairah' } },
        { lastName: { contains: 'Bagwanje' } },
        { username: { contains: 'Bagwanje' } }
      ]
    },
    include: {
      Parent: {
        include: {
          parentChildren: {
            include: {
              classModel: true,
              user: true
            }
          }
        }
      }
    }
  });

  console.log(`Found ${users.length} matching users.`);
  
  for (const user of users) {
    console.log(`\nUser: ${user.firstName} ${user.lastName} (${user.username}) [ID: ${user.id}]`);
    console.log(`Role: ${user.role}, SchoolID: ${user.schoolId}`);
    
    if (user.Parent) {
      console.log(`Parent Profile: [ID: ${user.Parent.id}] Phone: ${user.Parent.phone}`);
      console.log(`Linked Students: ${user.Parent.parentChildren.length}`);
      for (const student of user.Parent.parentChildren) {
        console.log(`  - Student: ${student.user?.firstName} ${student.user?.lastName} (ID: ${student.id}) Class: ${student.classModel?.name}`);
      }
    } else {
      console.log('No Parent Profile found for this user.');
    }
  }

  console.log('\n--- Checking Students with matching parent name ---');
  const students = await prisma.student.findMany({
    where: {
      parentGuardianName: { contains: 'Bagwanje' }
    },
    include: {
      user: true,
      parent: {
        include: { User: true }
      }
    }
  });

  console.log(`Found ${students.length} matching students.`);
  for (const student of students) {
    console.log(`\nStudent: ${student.user?.firstName} ${student.user?.lastName} (ID: ${student.id})`);
    console.log(`Parent Name: ${student.parentGuardianName}, Phone: ${student.parentGuardianPhone}`);
    console.log(`Linked ParentID: ${student.parentId}`);
    if (student.parent) {
      console.log(`Linked Parent User: ${student.parent.user.firstName} ${student.parent.user.lastName} (ID: ${student.parent.user.id})`);
    } else {
      console.log('No parent link found in DB.');
    }
  }

  await prisma.$disconnect();
}

check();
