const prisma = require('../db');
const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

/**
 * Service to handle automated database backups to AWS S3.
 * Only active if SuperAdmin has enabled it in GlobalSettings.
 */
const performFullBackup = async () => {
  try {
    const settings = await prisma.globalSettings.findFirst();
    if (!settings || !settings.enableAutoBackup || !settings.s3AccessKey) {
      console.log('[BackupService] Auto-backup is disabled or not configured.');
      return;
    }

    const dbPath = path.join(__dirname, '../prisma/dev.db');
    if (!fs.existsSync(dbPath)) {
      console.error('[BackupService] Database file not found at:', dbPath);
      return;
    }

    const s3Client = new S3Client({
      region: settings.s3Region || 'us-east-1',
      credentials: {
        accessKeyId: settings.s3AccessKey,
        secretAccessKey: settings.s3SecretKey
      }
    });

    const fileStream = fs.createReadStream(dbPath);
    const fileName = `backups/db-backup-${Date.now()}.sqlite`;

    const uploadParams = {
      Bucket: settings.s3BucketName,
      Key: fileName,
      Body: fileStream,
    };

    console.log(`[BackupService] Starting upload to S3: ${fileName}...`);
    await s3Client.send(new PutObjectCommand(uploadParams));
    console.log('[BackupService] Automated backup successful!');

  } catch (error) {
    console.error('[BackupService] Automated backup failed:', error);
  }
};

module.exports = { performFullBackup };
