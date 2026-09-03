# Image Storage Configuration

## Overview
Car images are stored locally on your drive to avoid exceeding MongoDB's free tier limits. Only the file paths are stored in the database.

## Setup Instructions

### 1. Choose Your Storage Location
Pick a location on your drive where you want to store car images. Examples:
- **Windows**: `D:\growmore\car-images` or `E:\Projects\growmore\uploads`
- **Linux/Mac**: `/home/user/growmore/car-images` or `/mnt/storage/growmore-images`

### 2. Update Environment Variable
Edit `backend/.env` and set the `IMAGE_STORAGE_PATH`:

```env
# Example for Windows
IMAGE_STORAGE_PATH=D:/growmore/car-images

# Example for Linux/Mac
IMAGE_STORAGE_PATH=/home/user/growmore/car-images
```

**Note**: Use forward slashes `/` even on Windows, or double backslashes `\\`

### 3. Optional: Leave Empty for Default
If you don't set `IMAGE_STORAGE_PATH`, images will be stored in:
```
backend/uploads/car-images/
```

## Features

- **Max 4 images per booking** - Front, back, left side, right side
- **Image validation** - Only JPG, PNG, GIF, WEBP allowed
- **Size limit** - 5MB per image
- **Automatic organization** - Files named as `car-{timestamp}-{random}.ext`
- **Database efficiency** - Only file paths stored in MongoDB (very small)

## Accessing Images

Images can be accessed via:
```
api/uploads/{filename}
```

Example: `api/uploads/car-1705488765432-123456789.jpg`

## Storage Requirements

- **Per booking**: ~2-8 MB (4 images × 0.5-2 MB each)
- **100 bookings**: ~200-800 MB
- **1000 bookings**: ~2-8 GB

Choose a drive with sufficient space based on expected volume.

## Backup Recommendations

1. **Regular backups**: Include the image folder in your backup routine
2. **Cloud sync** (optional): Use Google Drive, Dropbox, or OneDrive to sync the folder
3. **Database + Images**: Backup both MongoDB data and image folder together

## Production Deployment

For production on Render:

1. **Option 1: Cloud Storage** (Recommended)
   - Use AWS S3, Cloudflare R2, or Google Cloud Storage
   - Update `imageUpload.js` to use cloud storage SDK
   - Store only URLs in MongoDB

2. **Option 2: Render Disk**
   - Use Render's persistent disk (paid feature)
   - Set `IMAGE_STORAGE_PATH` to persistent disk mount point
   - Note: Free tier has no persistent storage

## Troubleshooting

**Images not uploading:**
- Check folder permissions (read/write access)
- Verify path exists and is correct in `.env`
- Check available disk space

**Images not displaying:**
- Verify file exists at the path
- Check server console for errors
- Ensure static file serving is enabled in server.js
