const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Build Process...');

try {
  // 1. Install Client Dependencies
  console.log('📦 Installing Client Dependencies...');
  // Force install dev dependencies too, just in case
  execSync('cd client && npm install --include=dev --no-audit', { stdio: 'inherit' });

  // 2. Build Client
  console.log('🏗️ Building Client...');
  execSync('cd client && npm run build', { stdio: 'inherit' });

  // 3. Install Server Dependencies
  console.log('📦 Installing Server Dependencies...');
  execSync('cd server && npm install --no-audit', { stdio: 'inherit' });

  // 4. Update Prisma Schema for PostgreSQL (Render)
  const isDesktopBuild = process.argv.includes('--desktop');

  if (!isDesktopBuild) {
    console.log('🔄 Configuring Database for Cloud (PostgreSQL)...');
    const schemaPath = path.join(__dirname, 'server', 'prisma', 'schema.prisma');
    let schema = fs.readFileSync(schemaPath, 'utf8');

    // Replace sqlite with postgresql
    if (schema.includes('provider = "sqlite"')) {
      schema = schema.replace('provider = "sqlite"', 'provider = "postgresql"');
      schema = schema.replace('url      = "file:./dev.db"', 'url      = env("DATABASE_URL")');
      fs.writeFileSync(schemaPath, schema);
      console.log('✅ Database provider updated to PostgreSQL');
    } else {
      console.log('ℹ️ Database provider already configured or not found');
    }
  } else {
    console.log('🏖️ Desktop Build Detected: Skipping PostgreSQL configuration (Keeping SQLite)');
  }

  // 5. Generate Prisma Client
  console.log('✨ Generating Prisma Client...');
  execSync('cd server && npx prisma generate', { stdio: 'inherit' });

  console.log('✅ Build Complete!');
} catch (error) {
  console.error('❌ Build Failed:', error.message);
  process.exit(1);
}
