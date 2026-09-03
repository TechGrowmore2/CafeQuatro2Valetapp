# growmore - Valet Parking Management System

A professional web-based valet parking management system built with the MERN stack.

![growmore](https://img.shields.io/badge/Version-1.0.0-orange) ![License](https://img.shields.io/badge/License-MIT-blue) ![Node](https://img.shields.io/badge/Node-16+-green)

## ✨ Features

### 🎯 Driver Dashboard
- **Create Bookings**: Quick customer & vehicle registration
- **Manage Bookings**: Real-time booking management
- **Car Recall**: Instant notifications when customers request their car
- **OTP Verification**: Secure car handover process
- **Payment Options**: Cash & QR code support

### 👤 Customer Portal
- **OTP Login**: Secure passwordless authentication via SMS
- **Track Bookings**: Real-time status updates
- **Car Recall**: One-click car recall button
- **Live ETA**: See estimated arrival time
- **SMS Notifications**: Booking confirmations & updates

### 👔 Supervisor Dashboard
- **Live Monitoring**: View all active bookings
- **Statistics**: Today's bookings, revenue, completion rate
- **Driver Management**: Monitor driver performance
- **Issue Tracking**: Handle customer concerns

### 🔔 Real-Time Features
- Socket.io powered instant notifications
- Live status updates across all dashboards
- Multi-user concurrent access
- Automatic reconnection handling

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ ([Download](https://nodejs.org/))
- MongoDB ([Install](https://www.mongodb.com/try/download/community)) or MongoDB Atlas account
- Git

### Installation (Windows)

1. **Clone or extract the project**
2. **Run the setup script**:
   ```cmd
   setup.bat
   ```

### Installation (Mac/Linux)

```bash
# Install dependencies
npm run install-all

# Copy environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### Configuration

1. **Update `backend/.env`**:
   ```env
   MONGODB_URI=mongodb://localhost:27017/growmore
   # Or use MongoDB Atlas connection string
   ```

2. **Seed the database** (creates default users):
   ```bash
   cd backend
   node seed.js
   ```

### Run the Application

**Option 1: Run separately (Recommended for development)**

```bash
# Terminal 1 - Start Backend
cd backend
npm install
npm start
# Backend will run on http://localhost:5000

# Terminal 2 - Start Frontend
cd frontend
npm install
npm start
# Frontend will run on https://growmoreapp2-0.onrender.com
```

**Option 2: Run both together (if you have a script)**

```bash
# Run both frontend and backend
npm run dev
```

- **Frontend**: https://growmoreapp2-0.onrender.com
- **Backend API**: http://localhost:5000/api

## 🔐 Default Login Credentials

**Driver:**
- Phone: `9999999999`
- Password: `driver123`

**Supervisor:**
- Phone: `8888888888`
- Password: `super123`

**Customer:**
- Any 10-digit phone number
- OTP: Check terminal (in mock mode) or SMS (with Twilio)

## 📱 Complete User Flow

1. **Driver** creates a booking for customer's car
2. **Customer** receives SMS with booking link
3. **Customer** logs in via OTP and sees booking details
4. **Customer** clicks "Recall Car" when ready to leave
5. **Driver** receives instant notification
6. **Driver** sets estimated arrival time (e.g., "10 minutes")
7. **Customer** sees live ETA countdown
8. **Driver** marks "Arrived" when reaching with car
9. **Customer** receives OTP on phone/dashboard
10. **Customer** verifies car and gives OTP to driver
11. **Driver** enters OTP, collects payment, completes booking
12. **Both** see booking in completed history

## 🌐 Deployment

### Deploy to Render (Free Tier)

**Detailed guide**: See [DEPLOYMENT.md](DEPLOYMENT.md)

**Quick steps:**
1. Create MongoDB Atlas cluster (free)
2. Push code to GitHub
3. Deploy on Render
4. Add environment variables
5. Your app is live! 🎉

**Works perfectly on free tier:**
- ✅ Unlimited bookings
- ✅ Multiple concurrent users
- ✅ Real-time Socket.io
- ✅ Persistent MongoDB storage

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│                  FRONTEND (React)                │
│  - Driver Dashboard  - Customer Portal          │
│  - Supervisor Dashboard  - Authentication       │
└──────────────┬──────────────────────────────────┘
               │
          ┌────┴────┐
          │ REST API │
          │ Socket.io│
          └────┬────┘
               │
┌──────────────┴──────────────────────────────────┐
│           BACKEND (Node.js/Express)              │
│  - JWT Auth  - Real-time Events                 │
│  - SMS Service  - Business Logic                │
└──────────────┬──────────────────────────────────┘
               │
┌──────────────┴──────────────────────────────────┐
│              DATABASE (MongoDB)                  │
│  - Users  - Bookings  - Audit Logs              │
└─────────────────────────────────────────────────┘
```

```

## 📚 Documentation

- **[Quick Start Guide](QUICKSTART.md)** - Get started in 5 minutes
- **[Deployment Guide](DEPLOYMENT.md)** - Deploy to production
- **[Testing Guide](TESTING.md)** - Complete testing checklist

## 🛠️ Tech Stack

**Frontend:**
- React 18 with Hooks
- React Router v6 (Navigation)
- Framer Motion (Animations)
- Socket.io-client (Real-time)
- Axios (HTTP client)
- React Hot Toast (Notifications)
- Lucide React (Icons)

**Backend:**
- Node.js + Express
- MongoDB + Mongoose
- Socket.io (WebSockets)
- JWT (Authentication)
- bcrypt (Password hashing)
- Twilio (SMS - optional)

**Security:**
- Helmet.js (HTTP headers)
- CORS protection
- Rate limiting
- Input validation
- XSS prevention

**DevOps:**
- Render (Hosting)
- MongoDB Atlas (Database)
- Git (Version control)

## 📖 API Endpoints

### Authentication
- `POST /api/auth/login` - Driver/Supervisor login
- `POST /api/auth/customer/request-otp` - Request OTP
- `POST /api/auth/customer/verify-otp` - Verify OTP & login
- `GET /api/auth/me` - Get current user

### Bookings
- `POST /api/bookings` - Create booking (Driver)
- `GET /api/bookings/my-bookings` - Get driver's bookings
- `GET /api/bookings/all` - Get all bookings (Supervisor)
- `GET /api/bookings/customer-bookings` - Customer bookings
- `POST /api/bookings/:id/recall` - Recall car (Customer)
- `POST /api/bookings/:id/estimate-arrival` - Set ETA (Driver)
- `POST /api/bookings/:id/arrived` - Mark arrived (Driver)
- `POST /api/bookings/:id/verify-complete` - Complete booking

### Users
- `GET /api/users/drivers` - Get all drivers (Supervisor)
- `POST /api/users/create` - Create user (Supervisor)

## 🎨 UI/UX Features

- **Responsive Design**: Works on all devices
- **Smooth Animations**: Framer Motion powered
- **Real-time Updates**: No page refresh needed
- **Toast Notifications**: Clear user feedback
- **Loading States**: Better user experience
- **Error Handling**: Graceful error recovery
- **Professional Theme**: White & Orange color scheme

## 🔒 Security Features

✅ **Authentication**: JWT tokens with expiration
✅ **Password Security**: bcrypt hashing (10 rounds)
✅ **Input Validation**: Express-validator
✅ **Rate Limiting**: 100 requests per 15 minutes
✅ **CORS**: Configured for production
✅ **XSS Protection**: Helmet.js middleware
✅ **SQL Injection**: MongoDB parameterized queries
✅ **Session Management**: Secure token storage

## 🧪 Testing

Run the complete testing suite:

```bash
# Backend tests (if implemented)
cd backend && npm test

# Frontend tests
cd frontend && npm test
```

See [TESTING.md](TESTING.md) for manual testing checklist.

## 🐛 Troubleshooting

### Common Issues

**MongoDB Connection Failed**
```bash
# Make sure MongoDB is running
mongod

# Or check your Atlas connection string
```

**Port Already in Use**
```bash
# Kill process on port 5000
npx kill-port 5000

# Kill process on port 3000
npx kill-port 3000
```

**Dependencies Not Installing**
```bash
# Clear cache
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

**Socket.io Not Connecting**
- Check FRONTEND_URL in backend/.env
- Verify CORS settings
- Check firewall/antivirus

## 📊 Features Breakdown

### MVP Features (Current)
✅ Driver authentication & dashboard
✅ Customer OTP login
✅ Create & manage bookings
✅ Real-time car recall
✅ OTP verification
✅ Payment collection
✅ Supervisor monitoring
✅ SMS notifications (mock/Twilio)
✅ Responsive design
✅ Production deployment

### Future Enhancements
- [ ] Advanced analytics & reports
- [ ] Mobile apps (React Native)
- [ ] QR code scanning
- [ ] Payment gateway integration
- [ ] Multi-location support
- [ ] Customer ratings
- [ ] Automated pricing
- [ ] Parking spot mapping

## 🤝 Contributing

This is a professional project. To contribute:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - Free to use and modify

Copyright (c) 2026 growmore

## 🆘 Support

For issues or questions:

1. Check documentation (README, QUICKSTART, DEPLOYMENT)
2. Review [TESTING.md](TESTING.md) checklist
3. Check existing GitHub issues
4. Create a new issue with details

## 📞 Contact

For business inquiries or support, please create an issue on GitHub.

---

**Built with ❤️ using the MERN Stack**

Made for professional valet parking operations. Scalable, secure, and production-ready.

🚀 **Happy Parking!**
