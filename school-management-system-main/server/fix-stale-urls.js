const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixUrls() {
  console.log('Starting URL fix script...');

  try {
    // 1. Fix School Logos
    const schools = await prisma.school.findMany();
    console.log(`Found ${schools.length} schools.`);

    for (const school of schools) {
      if (school.logoUrl && school.logoUrl.includes('onrender.com')) {
        const relativePath = school.logoUrl.split('/uploads/')[1];
        if (relativePath) {
          const newUrl = `/uploads/${relativePath}`;
          await prisma.school.update({
            where: { id: school.id },
            data: { logoUrl: newUrl }
          });
          console.log(`Fixed logoUrl for school: ${school.name}`);
        }
      }
    }

    // 2. Fix Student Photos
    const students = await prisma.student.findMany({
      where: {
        photoUrl: { contains: 'onrender.com' }
      }
    });
    console.log(`Found ${students.length} students with fixed-link photos.`);

    for (const student of students) {
      if (student.photoUrl && student.photoUrl.includes('onrender.com')) {
        const relativePath = student.photoUrl.split('/uploads/')[1];
        if (relativePath) {
          const newUrl = `/uploads/${relativePath}`;
          await prisma.student.update({
            where: { id: student.id },
            data: { photoUrl: newUrl }
          });
          console.log(`Fixed photoUrl for student ID: ${student.id}`);
        }
      }
    }

    // 3. Fix Gallery Images
    const galleryItems = await prisma.galleryImage.findMany();
    for (const item of galleryItems) {
      if (item.imageUrl && item.imageUrl.includes('onrender.com')) {
        const relativePath = item.imageUrl.split('/uploads/')[1];
        if (relativePath) {
          await prisma.galleryImage.update({
            where: { id: item.id },
            data: { imageUrl: `/uploads/${relativePath}` }
          });
          console.log(`Fixed Gallery Image: ${item.title}`);
        }
      }
    }

    // 4. Fix News/Events Images
    const newsItems = await prisma.newsEvent.findMany();
    for (const item of newsItems) {
      if (item.imageUrl && item.imageUrl.includes('onrender.com')) {
        const relativePath = item.imageUrl.split('/uploads/')[1];
        if (relativePath) {
          await prisma.newsEvent.update({
            where: { id: item.id },
            data: { imageUrl: `/uploads/${relativePath}` }
          });
          console.log(`Fixed News Image: ${item.title}`);
        }
      }
    }

    console.log('URL fix complete.');
  } catch (error) {
    console.error('Error during URL fix:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixUrls();
