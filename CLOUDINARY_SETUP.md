# Cloudinary Setup Guide

## Why Cloudinary?

Your backend was losing images every time it redeployed because **Render uses an ephemeral filesystem** that wipes local files. Cloudinary solves this by storing images in the cloud.

## ✅ What's Been Updated

1. **Upload Middleware** (`Backend/middleware/uploadMiddleware.js`)
   - Now uses Cloudinary instead of local disk storage
   - Images are organized in a `flawless-beauty-parlour` folder

2. **Service Controller** (`Backend/controllers/serviceController.js`)
   - `uploadServiceImage()` now returns Cloudinary secure URLs

3. **User Controller** (`Backend/controllers/userController.js`)
   - `uploadProfileImage()` now uses Cloudinary URLs

4. **Dependencies Added**
   - `cloudinary` - Cloudinary Node.js SDK
   - `multer-storage-cloudinary` - Multer integration

## 🔧 How to Get Cloudinary Credentials

### Step 1: Go to Cloudinary Console

- Visit: https://console.cloudinary.com/

### Step 2: Navigate to Settings

- Click your account name → Settings
- Go to the "API Keys" tab

### Step 3: Copy Your Credentials

You'll need:

- **Cloud Name**: `dfh2cgo9u` (already in .env ✓)
- **API Key**: Copy from the console
- **API Secret**: Copy from the console ⚠️ Keep this secret!

### Step 4: Update .env File

Edit `Backend/.env` and replace:

```env
CLOUDINARY_CLOUD_NAME=dfh2cgo9u
CLOUDINARY_API_KEY=YOUR_API_KEY_HERE        # ← Paste here
CLOUDINARY_API_SECRET=YOUR_API_SECRET_HERE  # ← Paste here
```

### Step 5: Update Render Environment Variables

1. Go to your Render project dashboard
2. Settings → Environment
3. Add/update the three Cloudinary variables:
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
4. Save and redeploy

## 📊 Image Upload Flow

**Before (❌ Lost on redeploy)**:

```
Admin uploads → Local /uploads/ → Render redeploys → Images gone 😭
```

**After (✅ Persistent)**:

```
Admin uploads → Cloudinary → Always available 🎉
```

## 🔐 Security Notes

- Never commit `.env` with real credentials
- Keep `CLOUDINARY_API_SECRET` private
- API Secret should never be exposed to frontend

## ✨ Benefits

- ✅ Images persist after redeploys
- ✅ Automatic image optimization
- ✅ CDN distribution (faster loading)
- ✅ Unlimited storage on free tier
- ✅ Automatic image transformations

## 🚀 Next Steps

1. Get your API credentials from Cloudinary console
2. Update the `.env` file with credentials
3. Push to GitHub
4. Redeploy on Render (images will be stored in Cloudinary)
5. Test uploading a service image - it should now persist!
