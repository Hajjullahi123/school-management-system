const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');

const isCloudinaryConfigured = process.env.CLOUDINARY_CLOUD_NAME && 
                               process.env.CLOUDINARY_API_KEY && 
                               process.env.CLOUDINARY_API_SECRET;

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
  console.log('[Storage] Cloudinary integration enabled.');
}

const uploadFromBuffer = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    // Timeout to prevent hanging connections
    const timeoutId = setTimeout(() => {
      reject(new Error('Cloudinary upload timed out after 15 seconds'));
    }, 15000);

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'school_management',
        resource_type: 'auto',
        timeout: 15000,
        ...options
      },
      (error, result) => {
        clearTimeout(timeoutId);
        if (result && result.secure_url) {
          resolve(result.secure_url);
        } else {
          reject(error || new Error('Unknown Cloudinary upload error'));
        }
      }
    );

    // Handle stream errors
    uploadStream.on('error', (err) => {
      clearTimeout(timeoutId);
      reject(err);
    });

    Readable.from(buffer).pipe(uploadStream);
  });
};

/**
 * Central upload function with AUTO-SHRINK optimization
 */
const uploadFile = async (file, folder = 'general') => {
  let finalBuffer = file.buffer;

  // 1. AUTO-OPTIMIZE: Frontend already shrinks student/teacher photos to save RAM and DB space.
  // We do NOT use sharp() here because processing raw HEIC files causes C++ segmentation faults (Failed to fetch).

  if (!isCloudinaryConfigured) {
    // Fallback: Convert to optimized Base64
    const base64 = finalBuffer.toString('base64');
    return `data:image/jpeg;base64,${base64}`;
  }

  try {
    const options = { 
        folder: `school_management/${folder}`,
        resource_type: 'auto'
    };
    
    return await uploadFromBuffer(finalBuffer, options);
  } catch (error) {
    console.error('[Storage] Cloudinary upload failed, falling back to Base64:', error.message);
    const base64 = finalBuffer.toString('base64');
    return `data:image/jpeg;base64,${base64}`;
  }
};

module.exports = {
  uploadFile,
  isCloudinaryConfigured
};
