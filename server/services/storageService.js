const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');
const sharp = require('sharp');

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
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'school_management',
        resource_type: 'auto',
        ...options
      },
      (error, result) => {
        if (result) resolve(result.secure_url);
        else reject(error);
      }
    );
    Readable.from(buffer).pipe(uploadStream);
  });
};

/**
 * Central upload function with AUTO-SHRINK optimization
 */
const uploadFile = async (file, folder = 'general') => {
  let finalBuffer = file.buffer;

  // 1. AUTO-OPTIMIZE: Shrink student/teacher photos to save RAM and DB space
  if (folder === 'students' || folder === 'teachers') {
    try {
      finalBuffer = await sharp(file.buffer)
        .resize(300, 300, { fit: 'cover' }) // Square crop
        .jpeg({ quality: 80 }) // Compress to 80% quality
        .toBuffer();
      console.log(`[Storage] Optimized ${folder} photo from ${Math.round(file.buffer.length/1024)}KB to ${Math.round(finalBuffer.length/1024)}KB`);
    } catch (resizeErr) {
      console.warn('[Storage] Resizing failed, using original buffer:', resizeErr.message);
    }
  }

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
