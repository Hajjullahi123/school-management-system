const prisma = require('./db');

async function shrinkDatabase() {
  console.log('--- Emergency Database Shrink (502 Fix) ---');
  
  try {
    // 1. Identify Students with large Base64 photos (> 50KB)
    const students = await prisma.student.findMany({
      where: {
        photoUrl: { contains: 'base64' }
      },
      select: { id: true, photoUrl: true, admissionNumber: true }
    });

    console.log(`Found ${students.length} students with Base64 photos.`);
    
    let clearedCount = 0;
    for (const student of students) {
      if (student.photoUrl && student.photoUrl.length > 50000) {
        await prisma.student.update({
          where: { id: student.id },
          data: { photoUrl: null }
        });
        
        // Also clear from User if linked
        const s = await prisma.student.findUnique({ where: { id: student.id }, select: { userId: true } });
        if (s.userId) {
          await prisma.user.update({
            where: { id: s.userId },
            data: { photoUrl: null }
          });
        }
        clearedCount++;
      }
    }

    console.log(`✅ Success: Cleared ${clearedCount} large Base64 strings.`);
    console.log('Running VACUUM to reclaim space...');
    await prisma.$executeRawUnsafe('VACUUM;');
    console.log('--- System should now be stable (502 should stop) ---');

  } catch (error) {
    console.error('Shrink failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

shrinkDatabase();
