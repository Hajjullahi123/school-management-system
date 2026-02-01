const prisma = require('./db');
const fs = require('fs');

async function run() {
  const data = {};
  try {
    data.settings = await prisma.globalSettings.findFirst();
    data.superAdminUsers = await prisma.user.findMany({
      where: { role: 'superadmin' },
      select: { id: true, username: true, role: true }
    });
    // Check for demo_admin specifically
    data.demoAdmin = await prisma.user.findFirst({
      where: { username: 'demo_admin' }
    });

    fs.writeFileSync('db-inspect.json', JSON.stringify(data, null, 2));
    console.log('Done');
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

run();
