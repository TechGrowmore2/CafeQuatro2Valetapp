require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");

const app = express();

// ✅ REQUIRED for Render / reverse proxy (fix express-rate-limit X-Forwarded-For error)
app.set("trust proxy", 1);

const server = http.createServer(app);

// ✅ Email Service (Brevo API mode)
const emailService = require("./services/emailService");

// ✅ Socket.io setup
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "https://cafequattro2valetapp.onrender.com",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// ✅ Middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        "script-src": ["'self'", "'unsafe-inline'", "https://checkout.razorpay.com"],
        "frame-src": ["'self'", "https://api.razorpay.com", "https://checkout.razorpay.com"],
        "connect-src": ["'self'", "https://api.razorpay.com", "wss:", "ws:", "https://api.brevo.com"],
        "img-src": ["'self'", "data:", "https://*.razorpay.com", "blob:"],
      },
    },
  })
);

app.use(
  cors({
    origin: [process.env.FRONTEND_URL, process.env.ADMIN_PANEL_URL, "https://cafequattro2valetapp.onrender.com"].filter(Boolean),
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // increased slightly
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/", limiter);

// ===== Utility: Remove duplicate bookings for same vehicle + same status within a time window =====
async function cleanupDuplicateBookings(Booking) {
  try {
    // Find all 'parked' bookings grouped by vehicle number, check for duplicates within 5 minutes
    const recentCutoff = new Date(Date.now() - 10 * 60 * 1000); // last 10 minutes
    const recentParked = await Booking.find({
      status: { $in: ['parked', 'recall-requested'] },
      createdAt: { $gte: recentCutoff }
    }).select('_id bookingId vehicle.number createdAt payment.razorpay.orderId').lean();

    // Group by vehicle number
    const vehicleGroups = {};
    for (const b of recentParked) {
      const key = b.vehicle && b.vehicle.number ? b.vehicle.number : null;
      if (!key) continue;
      if (!vehicleGroups[key]) vehicleGroups[key] = [];
      vehicleGroups[key].push(b);
    }

    let deletedCount = 0;
    for (const [vehicleNum, bookings] of Object.entries(vehicleGroups)) {
      if (bookings.length <= 1) continue;

      // Sort by creation time, keep the oldest
      bookings.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      const toDelete = bookings.slice(1); // delete all but first

      for (const dup of toDelete) {
        const timeDiff = Math.abs(new Date(dup.createdAt) - new Date(bookings[0].createdAt));
        if (timeDiff < 5 * 60 * 1000) { // within 5 minutes
          await Booking.findByIdAndDelete(dup._id);
          console.log(`🗑 Auto-deleted duplicate booking ${dup.bookingId} for vehicle ${vehicleNum} (created ${timeDiff}ms after ${bookings[0].bookingId})`);
          deletedCount++;
        }
      }
    }
    if (deletedCount > 0) {
      console.log(`✓ Cleanup: Removed ${deletedCount} duplicate booking(s)`);
    }
    return deletedCount;
  } catch (err) {
    console.error('Cleanup error:', err.message);
    return 0;
  }
}

// ===== Utility: Clean up duplicate Razorpay orderId entries before creating unique index =====
async function cleanupDuplicateRazorpayOrders(Booking) {
  try {
    // Find all bookings that have a razorpay orderId
    const razorpayBookings = await Booking.find(
      { 'payment.razorpay.orderId': { $exists: true, $ne: null, $ne: '' } },
      { _id: 1, bookingId: 1, 'payment.razorpay.orderId': 1, createdAt: 1 }
    ).lean();

    // Group by orderId
    const orderGroups = {};
    for (const b of razorpayBookings) {
      const ordId = b.payment && b.payment.razorpay && b.payment.razorpay.orderId;
      if (!ordId) continue;
      if (!orderGroups[ordId]) orderGroups[ordId] = [];
      orderGroups[ordId].push(b);
    }

    let dedupCount = 0;
    for (const [orderId, bookings] of Object.entries(orderGroups)) {
      if (bookings.length <= 1) continue;
      // Sort oldest first, keep oldest
      bookings.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      const toDelete = bookings.slice(1);
      for (const dup of toDelete) {
        await Booking.findByIdAndDelete(dup._id);
        console.log(`🗑 Pre-index cleanup: Removed duplicate Razorpay booking ${dup.bookingId} (orderId: ${orderId})`);
        dedupCount++;
      }
    }
    if (dedupCount > 0) {
      console.log(`✓ Pre-index cleanup: Removed ${dedupCount} duplicate Razorpay booking(s)`);
    }
    return dedupCount;
  } catch (err) {
    console.error('Razorpay dedup error:', err.message);
    return 0;
  }
}

// ✅ MongoDB Connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log("✓ MongoDB Connected");
    try {
      const Booking = require("./models/Booking");

      // STEP 1: Remove pre-existing duplicate Razorpay orderId bookings
      // (MongoDB cannot build a unique index if duplicates already exist)
      await cleanupDuplicateRazorpayOrders(Booking);

      // STEP 2: Remove any recent duplicate vehicle bookings left over from race conditions
      await cleanupDuplicateBookings(Booking);

      // STEP 3: Now sync unique indexes safely
      try {
        await Booking.syncIndexes();
        console.log("✓ MongoDB Booking Indexes Synced (Enforced unique Razorpay keys)");
      } catch (indexErr) {
        console.error("Index sync failed (non-fatal):", indexErr.message);
      }

      // STEP 4: Sync payment status fields
      const resPaid = await Booking.updateMany(
        { paymentStatus: "paid", "payment.status": { $ne: "completed" } },
        { $set: { "payment.status": "completed" } }
      );
      if (resPaid.modifiedCount > 0) {
        console.log(`✓ Synced ${resPaid.modifiedCount} paid bookings to payment.status='completed'`);
      }
      const resUnpaid = await Booking.updateMany(
        { paymentStatus: "unpaid", "payment.status": { $ne: "pending" } },
        { $set: { "payment.status": "pending" } }
      );
      if (resUnpaid.modifiedCount > 0) {
        console.log(`✓ Synced ${resUnpaid.modifiedCount} unpaid bookings to payment.status='pending'`);
      }

      // STEP 5: Start periodic background cleanup every 60 seconds
      setInterval(() => cleanupDuplicateBookings(Booking), 60 * 1000);
      console.log("✓ Started periodic duplicate booking cleanup (every 60s)");

    } catch (err) {
      console.error("Migration/Index Sync error:", err);
    }
  })
  .catch((err) => console.error("MongoDB Connection Error:", err));

// ✅ Make io accessible to routes
app.set("io", io);

// ✅ Socket.io connection handling
io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);

  socket.on("join-driver", (driverId) => {
    socket.join(`driver-${driverId}`);
    console.log(`Driver ${driverId} joined`);
  });

  socket.on("join-customer", (customerId) => {
    socket.join(`customer-${customerId}`);
    console.log(`Customer ${customerId} joined`);
  });

  socket.on("join-supervisor", (supervisorId) => {
    socket.join(`supervisor-${supervisorId}`);
    socket.join("supervisors");
    console.log(`Supervisor ${supervisorId} joined`);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

// ✅ Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/bookings", require("./routes/bookings"));
app.use("/api/users", require("./routes/users"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/venues", require("./routes/venues"));
app.use("/api/payment", require("./routes/payment"));
app.use("/api/public-data", require("./routes/publicData"));

// ✅ Serve uploaded images
const { UPLOAD_PATH } = require("./config/imageUpload");
app.use("/uploads", express.static(UPLOAD_PATH));

// ✅ Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "growmore API is running ✅" });
});

// ✅ TEST WHATSAPP (ChatMitra)
app.get("/api/test-whatsapp", async (req, res) => {
  try {
    const whatsappService = require("./services/whatsappService");
    const phone = req.query.phone;
    const otp = req.query.otp || '123456';

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: "Please provide ?phone=9876543210",
        enabled: whatsappService.enabled,
        apiUrl: process.env.CHATMITRA_API_URL || 'NOT SET',
        apiKeySet: !!process.env.CHATMITRA_API_KEY
      });
    }

    const result = await whatsappService.sendOTP(phone, otp);
    res.json({ success: true, result });
  } catch (err) {
    console.error("Test WhatsApp Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ✅ TEST EMAIL API (Brevo API mode)
app.get("/api/test-email", async (req, res) => {
  try {
    const to = req.query.to || process.env.TEST_EMAIL_TO;

    if (!to) {
      return res.status(400).json({
        success: false,
        message: "Please provide ?to=email@example.com OR set TEST_EMAIL_TO in env",
      });
    }

    const result = await emailService.sendEmail(
      to,
      "Test Email from Render ✅",
      "<h2>Hello from Render</h2><p>Brevo API Email system is working!</p>"
    );

    res.json({ success: true, result });
  } catch (err) {
    console.error("Test Email Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ✅ Serve React frontend in production (Render fix)
if (process.env.NODE_ENV === "production") {
  // CRA build path: /frontend/build
  const buildPath = path.join(__dirname, "..", "frontend", "build");

  // Serve static React files
  app.use(express.static(buildPath));

  // React Router support
  app.get("*", (req, res) => {
    // Skip API routes
    if (req.path.startsWith("/api")) {
      return res.status(404).json({ message: "API endpoint not found" });
    }

    res.sendFile(path.join(buildPath, "index.html"));
  });
}

// ✅ Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: "Something went wrong!",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// ✅ Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`✓ Server running on port ${PORT}`);
});
