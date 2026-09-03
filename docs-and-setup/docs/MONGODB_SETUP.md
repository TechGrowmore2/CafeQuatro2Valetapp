# MongoDB Atlas Setup Guide

## Your MongoDB Cluster Details

**Connection String:**
```
mongodb+srv://tech_db_user:<db_password>@growmore.kxyq1qh.mongodb.net/?appName=Growmore
```

## Step 1: Get Your Database Password

1. Go to [MongoDB Atlas](https://cloud.mongodb.com/)
2. Log in to your account
3. Navigate to **Database Access** in the left sidebar
4. Find the user `tech_db_user`
5. Click **Edit** and note your password (or reset it if needed)

## Step 2: Update .env File

1. Open `backend/.env` file
2. Replace `<db_password>` with your actual MongoDB password
3. The connection string should look like:
   ```
   
   ```

## Step 3: Configure Network Access

1. In MongoDB Atlas, go to **Network Access**
2. Click **Add IP Address**
3. For development, you can add:
   - **Current IP Address** (recommended)
   - Or **0.0.0.0/0** (allows from anywhere - use only for development)

## Step 4: Seed the Database

Run the seed script to create default users and venues:

```bash
cd backend
node seed.js
```

This will create:
- ✅ Admin user (Phone: 7777777777, Password: admin123)
- ✅ Supervisor user (Phone: 8888888888, Password: super123)
- ✅ Driver user (Phone: 9999999999, Password: driver123)
- ✅ Default venues with parking spots

## Step 5: Verify Connection

Start your backend server:

```bash
cd backend
npm start
```

You should see:
```
✓ MongoDB Connected
```

If you see connection errors, check:
1. ✅ Password is correct in `.env` file
2. ✅ Your IP is whitelisted in Network Access
3. ✅ Database user has proper permissions
4. ✅ Connection string format is correct

## Connection String Format

**Full format:**
```
mongodb+srv://username:password@cluster.mongodb.net/database_name?retryWrites=true&w=majority&appName=AppName
```

**Your specific format:**
```
mongodb+srv://tech_db_user:YOUR_PASSWORD@growmore.kxyq1qh.mongodb.net/growmore?retryWrites=true&w=majority&appName=Growmore
```

**Note:** The database name `growmore` will be created automatically if it doesn't exist.

## Troubleshooting

### Error: Authentication failed
- Check your password is correct
- Make sure there are no extra spaces in the connection string
- Verify the username is `tech_db_user`

### Error: IP not whitelisted
- Go to Network Access in MongoDB Atlas
- Add your current IP address
- Wait 1-2 minutes for changes to take effect

### Error: Connection timeout
- Check your internet connection
- Verify firewall isn't blocking MongoDB (port 27017)
- Try using `0.0.0.0/0` in Network Access (development only)

### Error: Database not found
- The database will be created automatically on first connection
- Or you can create it manually in MongoDB Atlas

## Security Best Practices

1. **Never commit `.env` file to Git** (it's already in `.gitignore`)
2. **Use strong passwords** for database users
3. **Restrict IP access** - only allow your server IPs in production
4. **Use environment variables** in production hosting
5. **Rotate passwords** regularly

## Next Steps

After successful connection:
1. ✅ Run `node seed.js` to populate initial data
2. ✅ Start backend: `npm start`
3. ✅ Start frontend: `cd ../frontend && npm start`
4. ✅ Test login with default credentials

## Default Login Credentials

After seeding:
- **Admin**: Phone `7777777777`, Password `admin123`
- **Supervisor**: Phone `8888888888`, Password `super123`
- **Driver**: Phone `9999999999`, Password `driver123`

**⚠️ Important**: Change these passwords in production!

---

Your MongoDB cluster is ready! 🚀
