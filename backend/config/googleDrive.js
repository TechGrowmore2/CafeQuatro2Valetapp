const cloudinary = require('cloudinary').v2;

/**
 * Cloudinary Image Upload Service — Cafe Quattro Babulnath Valet
 * Replaces Google Drive (which does not support Service Account uploads to My Drive).
 *
 * Required env variables on Render:
 *   CLOUDINARY_CLOUD_NAME  — from Cloudinary dashboard
 *   CLOUDINARY_API_KEY     — from Cloudinary dashboard
 *   CLOUDINARY_API_SECRET  — from Cloudinary dashboard
 *
 * Free tier: 10 GB storage, 25 GB bandwidth/month — plenty for valet car images.
 */

let initialized = false;

const initCloudinary = () => {
  if (initialized) return true;
  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    console.warn('⚠ Cloudinary not configured — images will use local path fallback');
    return false;
  }
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  initialized = true;
  console.log('✓ Cloudinary image upload configured');
  return true;
};

// ─── Upload a single file buffer to Cloudinary ───────────────
const uploadToCloudinary = (file, bookingId) => {
  return new Promise((resolve, reject) => {
    // Folder: CafeQuattro2/VLT12345678 (or CafeQuattro2 if no bookingId)
    const folder = bookingId
      ? `CafeQuattro2/${bookingId}`
      : 'CafeQuattro2';

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        public_id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        overwrite: false,
      },
      (error, result) => {
        if (error) return reject(error);
        console.log(`  ✓ Uploaded to Cloudinary folder: ${folder}`);
        resolve(result.secure_url);
      }
    );

    // file.buffer exists when using memoryStorage (multer)
    // file.path exists when using diskStorage
    if (file.buffer) {
      const { Readable } = require('stream');
      const readable = new Readable();
      readable.push(file.buffer);
      readable.push(null);
      readable.pipe(uploadStream);
    } else if (file.path) {
      const fs = require('fs');
      fs.createReadStream(file.path).pipe(uploadStream);
    } else {
      reject(new Error('No file buffer or path found'));
    }
  });
};

// ─── Upload multiple files (optionally scoped to a bookingId folder) ──
const uploadMultipleFiles = async (files, bookingId = null) => {
  if (!files || files.length === 0) return [];

  const ready = initCloudinary();
  if (!ready) {
    // Fallback: return local paths if Cloudinary not configured
    return files.map(f => f.path || '');
  }

  try {
    const urls = await Promise.all(files.map(f => uploadToCloudinary(f, bookingId)));
    const folder = bookingId ? `CafeQuattro2/${bookingId}` : 'CafeQuattro2';
    console.log(`✓ Uploaded ${urls.length} image(s) to Cloudinary → ${folder}`);
    return urls;
  } catch (error) {
    console.error('Cloudinary upload error:', error.message);
    return files.map(f => f.path || '');
  }
};


// ─── Delete a file from Cloudinary ───────────────────────────
const deleteFromCloudinary = async (url) => {
  try {
    if (!url || !url.includes('cloudinary.com')) return false;
    initCloudinary();
    // Extract public_id from URL
    const parts = url.split('/');
    const folder = parts[parts.length - 2];
    const fileName = parts[parts.length - 1].split('.')[0];
    const publicId = `${folder}/${fileName}`;
    await cloudinary.uploader.destroy(publicId);
    return true;
  } catch (error) {
    console.error('Cloudinary delete error:', error.message);
    return false;
  }
};

// Keep same exports as old googleDrive.js so no other file needs changing
module.exports = {
  uploadMultipleFiles,
  uploadToGoogleDrive: uploadToCloudinary,   // alias for any direct usages
  deleteFromGoogleDrive: deleteFromCloudinary, // alias for any direct usages
  DRIVE_FOLDER_ID: 'CafeQuattro2',             // Cloudinary folder name
};
