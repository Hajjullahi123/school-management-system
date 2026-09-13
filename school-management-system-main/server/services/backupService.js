const cron = require('node-cron');
const prisma = require('../db');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');

/**
 * Cloud Backup Service
 * Schedules and executes nightly database backups to S3
 */
const initBackupService = () => {
  // Schedule: 2:00 AM Every Night
  cron.schedule('0 2 * * *', async () => {
    console.log('[BackupService] Starting scheduled nightly backup...');
    await performCloudBackup();
  });
  console.log('[BackupService] Nightly cloud backup scheduled for 02:00 AM.');
};

const performCloudBackup = async () => {
  try {
    const settings = await prisma.globalSettings.findFirst();
    if (!settings || !settings.enableAutoBackup) {
      console.log('[BackupService] Auto-backup is disabled in settings. Skipping.');
      return;
    }

    if (!settings.s3AccessKey || !settings.s3SecretKey || !settings.s3BucketName) {
      console.error('[BackupService] S3 Credentials missing in GlobalSettings. Cannot backup.');
      await prisma.globalSettings.update({
        where: { id: settings.id },
        data: { lastBackupStatus: 'Failed: Missing S3 Credentials' }
      });
      return;
    }

    // 1. Aggregate All System Data (Multi-School)
    const backupData = {
      timestamp: new Date().toISOString(),
      schools: await prisma.school.findMany({
        include: {
          students: true,
          users: true,
          classes: true,
          FeeRecord: true,
          results: true,
          attendanceRecords: true
        }
      })
    };

    const backupFileName = `full_system_backup_${Date.now()}.json`;
    const s3Client = new S3Client({
      region: settings.s3Region || 'us-east-1',
      credentials: {
        accessKeyId: settings.s3AccessKey,
        secretAccessKey: settings.s3SecretKey
      }
    });

    // 2. Upload to S3
    const command = new PutObjectCommand({
      Bucket: settings.s3BucketName,
      Key: `backups/${backupFileName}`,
      Body: JSON.stringify(backupData),
      ContentType: 'application/json'
    });

    await s3Client.send(command);

    // 3. Optional: Cleanup old backups (Retention Enforcement)
    try {
        const { ListObjectsV2Command, DeleteObjectCommand } = require('@aws-sdk/client-s3');
        const listCommand = new ListObjectsV2Command({
            Bucket: settings.s3BucketName,
            Prefix: 'backups/'
        });
        const list = await s3Client.send(listCommand);
        
        if (list.Contents) {
            const retentionMs = (settings.backupRetentionDays || 30) * 24 * 60 * 60 * 1000;
            const now = new Date().getTime();
            
            for (const obj of list.Contents) {
                if (now - new Date(obj.LastModified).getTime() > retentionMs) {
                    await s3Client.send(new DeleteObjectCommand({
                        Bucket: settings.s3BucketName,
                        Key: obj.Key
                    }));
                    console.log(`[BackupService] Deleted expired backup: ${obj.Key}`);
                }
            }
        }
    } catch (cleanupErr) {
        console.warn('[BackupService] Cleanup failed:', cleanupErr.message);
    }

    // 4. Update Status
    await prisma.globalSettings.update({
      where: { id: settings.id },
      data: {
        lastBackupDate: new Date(),
        lastBackupStatus: 'Success: Uploaded to S3'
      }
    });

    console.log(`[BackupService] Backup successful: ${backupFileName}`);
  } catch (error) {
    console.error('[BackupService] Backup FAILED:', error);
    try {
        const settings = await prisma.globalSettings.findFirst();
        if (settings) {
            await prisma.globalSettings.update({
                where: { id: settings.id },
                data: { lastBackupStatus: `Failed: ${error.message.substring(0, 100)}` }
            });
        }
    } catch (e) {}
  }
};

module.exports = { initBackupService, performCloudBackup };
