const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');

/**
 * STORAGE SERVICE
 * Handles uploading files to Cloudinary with an automatic fallback mechanism.
 * Configure these in your .env file:
 * CLOUDINARY_CLOUD_NAME
 * CLOUDINARY_API_KEY
 * CLOUDINARY_API_SECRET
 */

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
} else {
  console.warn('[Storage] Cloudinary credentials missing. Falling back to local Base64 storage.');
}

/**
 * Upload a buffer to Cloudinary
 * @param {Buffer} buffer - File buffer from multer
 * @param {Object} options - Cloudinary upload options (folder, etc)
 * @returns {Promise<string>} - The resulting secure URL
 */
const uploadFromBuffer = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'school_management',
        resource_type: 'auto',
        ...options
      },
      (error, result) => {
        if (result) {
          resolve(result.secure_url);
        } else {
          reject(error);
        }
      }
    );

    Readable.from(buffer).pipe(uploadStream);
  });
};

/**
 * Central upload function
 * @param {Object} file - Multer file object
 * @param {string} folder - Destination folder (students, teachers, etc)
 * @returns {Promise<string>} - URL of the uploaded file
 */
const uploadFile = async (file, folder = 'general') => {
  if (!isCloudinaryConfigured) {
    // Fallback: Convert to Base64 (Old behavior)
    const base64 = file.buffer.toString('base64');
    return `data:${file.mimetype};base64,${base64}`;
  }

  try {
    // Determine transformations based on folder
    const options = { folder: `school_management/${folder}` };
    
    // Auto-crop student and teacher photos to save space
    if (folder === 'students' || folder === 'teachers') {
      options.transformation = [
        { width: 400, height: 400, crop: 'limit' },
        { quality: 'auto' },
        { fetch_format: 'auto' }
      ];
    }

    return await uploadFromBuffer(file.buffer, options);
  } catch (error) {
    console.error('[Storage] Cloudinary upload failed, falling back to Base64:', error.message);
    const base64 = file.buffer.toString('base64');
    return `data:${file.mimetype};base64,${base64}`;
  }
};

module.exports = {
  uploadFile,
  isCloudinaryConfigured
};
