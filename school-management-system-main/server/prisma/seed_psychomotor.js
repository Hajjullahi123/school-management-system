const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const domains = [
    // Affective Domain
    { name: 'Attentiveness', description: 'Attention in class' },
    { name: 'Honesty', description: 'Truthfulness' },
    { name: 'Neatness', description: 'Personal appearance' },
    { name: 'Politeness', description: 'Manners and respect' },
    { name: 'Punctuality', description: 'Punctuality to school/class' },
    { name: 'Self Control', description: 'Emotional stability' },
    { name: 'Obedience', description: 'Compliance with rules' },
    { name: 'Reliability', description: 'Trustworthiness' },
    { name: 'Responsibility', description: 'Sense of duty' },
    { name: 'Relationship', description: 'Relation with others' },

    // Psychomotor Domain
    { name: 'Handling Tools', description: 'Skill with tools' },
    { name: 'Drawing & Painting', description: 'Artistic skill' },
    { name: 'Handwriting', description: 'Legibility and neatness' },
    { name: 'Public Speaking', description: 'Oratory skills' },
    { name: 'Speech Fluency', description: 'Verbal expression' },
    { name: 'Sports & Games', description: 'Athletic participation' }
  ];

  // Get ALL schools
  const schools = await prisma.school.findMany();

  if (schools.length === 0) {
    console.log('No schools found to seed domains for.');
    return;
  }

  console.log(`Found ${schools.length} schools. Seeding for all...`);

  for (const school of schools) {
    console.log(`Seeding for school: ${school.name} (ID: ${school.id})`);
    for (const domain of domains) {
      await prisma.psychomotorDomain.upsert({
        where: {
          schoolId_name: {
            schoolId: school.id,
            name: domain.name
          }
        },
        update: {},
        create: {
          ...domain,
          schoolId: school.id
        },
      });
    }
  }

  console.log('Done seeding domains for all schools.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
