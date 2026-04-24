const prisma = require('./db');

async function checkLogoSizes() {
  const schools = await prisma.school.findMany({
    select: { id: true, name: true, slug: true, logoUrl: true }
  });

  console.log('--- SCHOOL LOGO SIZE AUDIT ---');
  schools.forEach(s => {
    const size = s.logoUrl ? s.logoUrl.length : 0;
    const isBase64 = s.logoUrl && s.logoUrl.startsWith('data:');
    console.log(`School: ${s.name} (${s.slug})`);
    console.log(`- Logo Size: ${(size / 1024).toFixed(2)} KB`);
    console.log(`- Format: ${isBase64 ? 'Base64' : 'URL/Path'}`);
    if (size > 100 * 1024) {
      console.log('  ⚠️ WARNING: Logo is too large (>100KB)');
    }
    console.log('---------------------------');
  });
}

checkLogoSizes().catch(console.error).finally(() => process.exit(0));
