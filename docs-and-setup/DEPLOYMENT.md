# growmore Deployment Guide

## Deploying to Render (Free Tier)

### Prerequisites
1. MongoDB Atlas account (free tier)
2. Render account
3. GitHub repository

### Step 1: MongoDB Atlas Setup

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Create a database user
4. Whitelist all IP addresses (0.0.0.0/0) for Render
5. Get your connection string:
   ```   ```

### Step 2: Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin your-repo-url
git push -u origin main
```

### Step 3: Deploy on Render

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: growmore-app
   - **Region**: Choose closest to you
   - **Branch**: main
   - **Root Directory**: (leave empty)
   - **Environment**: Node
   - **Build Command**: `./build.sh`
   - **Start Command**: `cd backend && npm start`
   - **Plan**: Free

5. Add Environment Variables:
   ```
   NODE_ENV=production
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_super_secret_key_at_least_32_characters
   FRONTEND_URL=https://your-app-name.onrender.com
   PORT=10000
   
   # Optional: Twilio (for SMS)
   TWILIO_ACCOUNT_SID=
   TWILIO_AUTH_TOKEN=
   TWILIO_PHONE_NUMBER=
   ```

6. Click "Create Web Service"

### Step 4: Initial Database Setup

Once deployed, seed the database with default users:

```bash
# SSH into your Render service or use Render Shell
cd backend
node seed.js
```

Or manually create users via MongoDB Atlas interface.

### Step 5: Access Your App

Your app will be available at: `https://your-app-name.onrender.com`

**Default Login Credentials:**
- **Driver**: Phone: 9999999999, Password: driver123
- **Supervisor**: Phone: 8888888888, Password: super123

## Important Notes for Render Free Tier

1. **Spin-down**: Free tier services spin down after 15 minutes of inactivity
2. **First Request**: May take 30-50 seconds to wake up
3. **Bandwidth**: 100GB/month bandwidth limit
4. **Build Time**: Limited build minutes per month

## Local Development

### Setup

1. Install dependencies:
```bash
npm run install-all
```

2. Create environment files:

**backend/.env**:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/growmore
JWT_SECRET=local_dev_secret_key_change_in_production
NODE_ENV=development
FRONTEND_URL=https://growmoreapp2-0.onrender.com
```

**frontend/.env**:
```
REACT_APP_API_URL=api
REACT_APP_SOCKET_URL=api
```

3. Seed database:
```bash
cd backend
node seed.js
```

4. Run development servers:
```bash
npm run dev
```

Frontend: https://growmoreapp2-0.onrender.com
Backend: api

## SMS Configuration (Optional)

### Twilio Setup

1. Sign up at [Twilio](https://www.twilio.com/)
2. Get free trial credits
3. Get a phone number
4. Add credentials to environment variables

Without Twilio, the app will work in MOCK mode (SMS logged to console).

## Troubleshooting

### Issue: Can't connect to MongoDB
- Check IP whitelist in MongoDB Atlas
- Verify connection string format
- Check environment variables

### Issue: Socket.io not connecting
- Ensure FRONTEND_URL matches your deployment URL
- Check CORS configuration

### Issue: Build fails on Render
- Check build logs
- Ensure build.sh has execute permissions: `chmod +x build.sh`
- Verify all dependencies are in package.json

## Security Checklist

✅ Strong JWT_SECRET (minimum 32 characters)
✅ MongoDB connection string secured
✅ CORS configured for production domain
✅ Helmet.js for HTTP headers
✅ Rate limiting enabled
✅ Input validation on all endpoints
✅ Password hashing with bcrypt
✅ XSS protection

## Monitoring

Monitor your deployment:
- Render Dashboard → Your Service → Logs
- MongoDB Atlas → Metrics
- Check error logs regularly

## Support

For issues or questions, check:
1. Render documentation: https://render.com/docs
2. MongoDB Atlas docs: https://docs.atlas.mongodb.com/
3. Project README.md