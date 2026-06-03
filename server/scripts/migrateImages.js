require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const cloudinary = require('cloudinary').v2;
const prisma = new PrismaClient();

const isCloudinaryConfigured = process.env.CLOUDINARY_CLOUD_NAME && 
                               process.env.CLOUDINARY_API_KEY && 
                               process.env.CLOUDINARY_API_SECRET;

if (!isCloudinaryConfigured) {
  console.error("FATAL: Cloudinary environment variables are not configured.");
  console.error("Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your .env or Coolify settings.");
  process.exit(1);
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Helper to check if a URL is a base64 data URI
const isBase64 = (str) => {
  return str && str.startsWith('data:');
};

// Helper to upload a base64 string to Cloudinary
const uploadToCloudinary = async (base64String, folder) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload(base64String, {
      folder: `school_management/${folder}`,
      resource_type: 'auto'
    }, (error, result) => {
      if (error) reject(error);
      else resolve(result.secure_url);
    });
  });
};

async function migrateImages() {
  console.log("=========================================");
  console.log("STARTING BASE64 TO CLOUDINARY MIGRATION");
  console.log("=========================================");
  
  let totalMigrated = 0;
  let totalErrors = 0;

  // 1. Schools
  console.log("\n--> Checking School configurations...");
  const schools = await prisma.school.findMany();
  for (const school of schools) {
    const updates = {};
    if (isBase64(school.logoUrl)) updates.logoUrl = await uploadToCloudinary(school.logoUrl, 'branding');
    if (isBase64(school.principalSignatureUrl)) updates.principalSignatureUrl = await uploadToCloudinary(school.principalSignatureUrl, 'branding');
    if (isBase64(school.brochureFileUrl)) updates.brochureFileUrl = await uploadToCloudinary(school.brochureFileUrl, 'documents');
    if (isBase64(school.admissionGuideFileUrl)) updates.admissionGuideFileUrl = await uploadToCloudinary(school.admissionGuideFileUrl, 'documents');

    if (Object.keys(updates).length > 0) {
      try {
        await prisma.school.update({ where: { id: school.id }, data: updates });
        totalMigrated += Object.keys(updates).length;
        console.log(`  - Migrated ${Object.keys(updates).length} files for School ID ${school.id}`);
      } catch (err) {
        console.error(`  - Error updating School ID ${school.id}:`, err.message);
        totalErrors++;
      }
    }
  }

  // 2. Users (Staff / Admins)
  console.log("\n--> Checking User profiles...");
  const users = await prisma.user.findMany();
  for (const user of users) {
    const updates = {};
    if (isBase64(user.photoUrl)) updates.photoUrl = await uploadToCloudinary(user.photoUrl, 'users');
    if (isBase64(user.signatureUrl)) updates.signatureUrl = await uploadToCloudinary(user.signatureUrl, 'users');

    if (Object.keys(updates).length > 0) {
      try {
        await prisma.user.update({ where: { id: user.id }, data: updates });
        totalMigrated += Object.keys(updates).length;
        console.log(`  - Migrated ${Object.keys(updates).length} files for User ID ${user.id}`);
      } catch (err) {
        console.error(`  - Error updating User ID ${user.id}:`, err.message);
        totalErrors++;
      }
    }
  }

  // 3. Students
  console.log("\n--> Checking Student profiles...");
  const students = await prisma.student.findMany();
  for (const student of students) {
    if (isBase64(student.photoUrl)) {
      try {
        const cloudUrl = await uploadToCloudinary(student.photoUrl, 'students');
        await prisma.student.update({ where: { id: student.id }, data: { photoUrl: cloudUrl } });
        totalMigrated++;
        console.log(`  - Migrated photo for Student ID ${student.id}`);
      } catch (err) {
        console.error(`  - Error updating Student ID ${student.id}:`, err.message);
        totalErrors++;
      }
    }
  }

  // 4. Teachers
  console.log("\n--> Checking Teacher profiles...");
  const teachers = await prisma.teacher.findMany();
  for (const teacher of teachers) {
    if (isBase64(teacher.photoUrl)) {
      try {
        const cloudUrl = await uploadToCloudinary(teacher.photoUrl, 'teachers');
        await prisma.teacher.update({ where: { id: teacher.id }, data: { photoUrl: cloudUrl } });
        totalMigrated++;
        console.log(`  - Migrated photo for Teacher ID ${teacher.id}`);
      } catch (err) {
        console.error(`  - Error updating Teacher ID ${teacher.id}:`, err.message);
        totalErrors++;
      }
    }
  }

  // 5. Certificates
  console.log("\n--> Checking Certificates...");
  const certificates = await prisma.certificate.findMany();
  for (const cert of certificates) {
    if (isBase64(cert.passportUrl)) {
      try {
        const cloudUrl = await uploadToCloudinary(cert.passportUrl, 'certificates');
        await prisma.certificate.update({ where: { id: cert.id }, data: { passportUrl: cloudUrl } });
        totalMigrated++;
        console.log(`  - Migrated passport for Certificate ID ${cert.id}`);
      } catch (err) {
        console.error(`  - Error updating Certificate ID ${cert.id}:`, err.message);
        totalErrors++;
      }
    }
  }

  console.log("\n=========================================");
  console.log("MIGRATION COMPLETE!");
  console.log(`Successfully moved ${totalMigrated} files to Cloudinary.`);
  if (totalErrors > 0) {
    console.log(`Failed to migrate ${totalErrors} files.`);
  }
  console.log("=========================================\n");
  
  process.exit(0);
}

migrateImages().catch(console.error);
