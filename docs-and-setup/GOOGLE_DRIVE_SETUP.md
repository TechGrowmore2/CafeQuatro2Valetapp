# Google Drive Setup for growmore Car Images

## Overview
Your car images will be automatically uploaded to your Google Drive folder:
**https://drive.google.com/drive/folders/1bEzlAaDsu0aNKflPUf-ajR2pI4LTwgnD**

Benefits:
- ✅ **Free unlimited storage** via Google Drive
- ✅ **No MongoDB limits** - only URLs stored in database
- ✅ **Automatic backups** via Google Drive
- ✅ **Global access** - images accessible from anywhere
- ✅ **Secure** - Files stored in your Google account

## Quick Setup (5 Minutes)

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Name it: **growmore** → Click "Create"
4. Wait for project creation (30 seconds)

### Step 2: Enable Google Drive API

1. In Google Cloud Console, go to **"APIs & Services"** → **"Library"**
2. Search for: **"Google Drive API"**
3. Click on it → Click **"Enable"**
4. Wait for activation (10 seconds)

### Step 3: Create Service Account

1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"Create Credentials"** → **"Service Account"**
3. Fill in:
   - **Service account name**: `growmore-storage`
   - **Service account ID**: (auto-generated)
4. Click **"Create and Continue"**
5. **Role**: Select **"Editor"** (or "Owner")
6. Click **"Continue"** → **"Done"**

### Step 4: Generate Service Account Key

1. On the Credentials page, find your service account
2. Click on the service account email
3. Go to **"Keys"** tab
4. Click **"Add Key"** → **"Create new key"**
5. Choose **"JSON"** → Click **"Create"**
6. A JSON file will download automatically
7. **IMPORTANT**: Keep this file secure!

### Step 5: Share Google Drive Folder

1. Open your Drive folder: https://drive.google.com/drive/folders/1bEzlAaDsu0aNKflPUf-ajR2pI4LTwgnD
2. Click **"Share"** (top right)
3. Copy the **service account email** from the JSON file (looks like: `growmore-storage@projectname.iam.gserviceaccount.com`)
4. Paste it in the share box
5. Set permission to **"Editor"**
6. **Uncheck** "Notify people"
7. Click **"Share"**

### Step 6: Configure growmore

1. Open the downloaded JSON file in a text editor
2. **Copy the entire contents** (it should look like this):
```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...",
  "client_email": "growmore-storage@...",
  "client_id": "...",
  ...
}
```

3. Open `backend/.env`
4. Paste it on ONE line after `GOOGLE_DRIVE_CREDENTIALS=`:

```env
GOOGLE_DRIVE_CREDENTIALS={"type":"service_account","project_id":"your-project","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\\n...","client_email":"...","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"..."}
```

**IMPORTANT**: Remove ALL line breaks and spaces between properties!

5. Save the file

### Step 7: Test the Integration

1. Restart your server: `npm run dev`
2. Login as driver
3. Create a booking with car images
4. Check console logs for: `"Images uploaded: [...]"`
5. **Verify in Google Drive** - images should appear in your folder!

## Troubleshooting

### "Google Drive not configured - using local storage"
- Check if `GOOGLE_DRIVE_CREDENTIALS` is set in `.env`
- Ensure the JSON is on ONE line with no line breaks
- Check for syntax errors in the JSON

### "Permission denied" or "403 Forbidden"
- Make sure you shared the Drive folder with the service account email
- Grant "Editor" permissions
- Wait 1-2 minutes for permissions to propagate

### "Invalid credentials"
- Verify the JSON file is complete and properly formatted
- Make sure you're using the service account JSON (not OAuth client)
- Check for any extra quotes or special characters

### Images not appearing in Drive
- Verify the folder ID in `googleDrive.js` matches your folder
- Check if files are in the correct folder
- Look for upload errors in server console

## Viewing Images in Your App

Once uploaded to Google Drive, images will be automatically accessible via direct links like:
```
https://drive.google.com/uc?export=view&id=FILE_ID
```

These links are stored in MongoDB and displayed in your app.

## Security Best Practices

1. **Never commit** the service account JSON to Git
2. **Add to .gitignore**: `*.json` (if not already there)
3. **Restrict permissions**: Only grant "Editor" to the specific folder
4. **Rotate keys**: Regenerate service account keys periodically
5. **Monitor usage**: Check Google Cloud Console for unusual activity

## Switching Between Local and Google Drive

**Use Google Drive**: Set `GOOGLE_DRIVE_CREDENTIALS` in `.env`
**Use Local Storage**: Leave `GOOGLE_DRIVE_CREDENTIALS` empty

The system automatically falls back to local storage if Google Drive is not configured.

## Storage Limits

**Google Drive Free Tier:**
- 15 GB total (shared with Gmail and Google Photos)
- 750 GB daily upload limit
- 10 TB individual file size limit

**Estimated Usage:**
- ~2 MB per booking (4 images × 0.5 MB)
- 15 GB = ~7,500 bookings
- More than enough for most use cases!

## Production Deployment

For Render deployment:
1. Add `GOOGLE_DRIVE_CREDENTIALS` as environment variable
2. Use the **same JSON** (compressed to one line)
3. Images will automatically upload to Google Drive
4. No persistent disk needed on Render!

## Support

If you need help:
1. Check server console for error messages
2. Verify all steps were completed
3. Test with a simple upload first
4. Check Google Cloud Console logs

Enjoy automatic cloud storage for your car images! 🚗☁️
