const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL + "&connection_limit=1"
    }
  }
});

async function checkUser() {
  try {
    console.log('Searching for users containing "fatima"...');
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: 'fatima', mode: 'insensitive' } },
          { email: { contains: 'fatima', mode: 'insensitive' } }
        ]
      },
      include: { school: true }
    });
    console.log(`Found ${users.length} users:`);
    console.log(JSON.stringify(users, null, 2));

    const students = await prisma.student.findMany({
        where: {
            OR: [
                { firstName: { contains: 'fatima', mode: 'insensitive' } },
                { lastName: { contains: 'fatima', mode: 'insensitive' } }
            ]
        },
        include: { user: true, school: true }
    });
    console.log(`Found ${students.length} students:`);
    console.log(JSON.stringify(students.map(s => ({ 
        id: s.id, 
        name: `${s.firstName} ${s.lastName}`,
        admissionNumber: s.admissionNumber,
        school: s.school?.name,
        hasUser: !!s.user
    })), null, 2));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();
