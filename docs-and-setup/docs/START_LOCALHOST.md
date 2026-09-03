# Running on Localhost - Quick Guide

## Prerequisites
- Node.js 16+ installed
- MongoDB running locally OR MongoDB Atlas connection string

## Step-by-Step Setup

### 1. Install Dependencies

**Backend:**
```bash
cd backend
npm install
```

**Frontend:**
```bash
cd frontend
npm install
```

### 2. Configure MongoDB

Create `backend/.env` file:
```env
MONGODB_URI=mongodb://localhost:27017/growmore
# OR use MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/growmore

JWT_SECRET=your-secret-key-here
FRONTEND_URL=https://growmoreapp2-0.onrender.com
PORT=5000
```

### 3. Seed Database (Optional - creates default users)

```bash
cd backend
node seed.js
```

This creates:
- Driver: Phone `9999999999`, Password `driver123`
- Supervisor: Phone `8888888888`, Password `super123`

### 4. Start Backend Server

```bash
cd backend
npm start
```

Backend will run on: **http://localhost:5000**

You should see:
```
✓ Server running on port 5000
✓ MongoDB connected
```

### 5. Start Frontend (in a new terminal)

```bash
cd frontend
npm start
```

Frontend will run on: **https://growmoreapp2-0.onrender.com**

The browser should automatically open. If not, navigate to https://growmoreapp2-0.onrender.com

## Configuration Details

### Frontend Configuration
- **API URL**: Automatically set to `http://localhost:5000` (in `src/services/api.js`)
- **Socket URL**: Automatically set to `http://localhost:5000` (in `src/services/socket.js`)
- **Proxy**: Set to `http://localhost:5000` in `package.json`

### Backend Configuration
- **Port**: 5000 (default, can be changed via PORT env variable)
- **CORS**: Configured to allow `https://growmoreapp2-0.onrender.com`
- **Socket.io**: Configured to connect from `https://growmoreapp2-0.onrender.com`

## Troubleshooting

### Port Already in Use

**Windows:**
```cmd
netstat -ano | findstr :5000
taskkill /PID <PID> /F

netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

**Mac/Linux:**
```bash
lsof -ti:5000 | xargs kill -9
lsof -ti:3000 | xargs kill -9
```

### MongoDB Connection Issues

**Local MongoDB:**
```bash
# Make sure MongoDB is running
mongod
```

**MongoDB Atlas:**
- Check your connection string
- Make sure your IP is whitelisted (or use 0.0.0.0/0 for development)
- Check username and password

### CORS Errors

If you see CORS errors:
1. Make sure backend is running on port 5000
2. Make sure frontend is running on port 3000
3. Check `backend/server.js` - CORS should allow `https://growmoreapp2-0.onrender.com`

### Socket.io Connection Issues

1. Check browser console for errors
2. Verify backend Socket.io is running (check terminal)
3. Make sure both frontend and backend are on localhost

## Testing the Setup

1. **Open Frontend**: https://growmoreapp2-0.onrender.com
2. **Login as Driver**: 
   - Phone: `9999999999`
   - Password: `driver123`
3. **Create a Booking**: Fill out the form and submit
4. **Check Backend**: Verify booking appears in database/console

## Default URLs

- **Frontend**: https://growmoreapp2-0.onrender.com
- **Backend API**: http://localhost:5000/api
- **Backend Health Check**: http://localhost:5000/api/health (if implemented)

## Environment Variables (Optional)

You can create `.env` files to override defaults:

**Frontend `.env`:**
```env
REACT_APP_API_URL=http://localhost:5000
REACT_APP_SOCKET_URL=http://localhost:5000
```

**Backend `.env`:**
```env
PORT=5000
FRONTEND_URL=https://growmoreapp2-0.onrender.com
MONGODB_URI=mongodb://localhost:27017/growmore
JWT_SECRET=your-secret-key
```

## Next Steps

Once running:
1. Test driver login
2. Create a booking
3. Test customer OTP login
4. Test supervisor dashboard
5. Test real-time features (Socket.io)

Happy coding! 🚀
