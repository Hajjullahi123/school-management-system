const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- EMERGENCY WEEKEND FIX ---');
  
  // Update all schools to have Mon, Tue, Wed as weekends (1,2,3)
  // as requested by the user.
  const updateCount = await prisma.school.updateMany({
    data: {
      weekendDays: '1,2,3'
    }
  });

  console.log(`Updated ${updateCount.count} school(s) to weekendDays: "1,2,3" (Mon, Tue, Wed).`);

  // Verify the update
  const schools = await prisma.school.findMany({
    select: { id: true, name: true, weekendDays: true }
  });
  
  console.log('\nVerification:');
  schools.forEach(s => {
    console.log(`- School: ${s.name} (ID: ${s.id}) | Weekend Days: ${s.weekendDays}`);
  });
}

main()
  .catch(e => {
    console.error('Error during emergency fix:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
