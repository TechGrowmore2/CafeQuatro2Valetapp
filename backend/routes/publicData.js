const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const User = require('../models/User');
const Venue = require('../models/Venue');

/* ─────────────────────────────────────────────────────────────
   API-KEY MIDDLEWARE
   Validates the X-API-KEY header against the env variable.
   All routes in this file are read-only — no mutations.
   ───────────────────────────────────────────────────────────── */
const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  const expectedKey = process.env.PUBLIC_DATA_API_KEY;

  if (!expectedKey) {
    return res.status(503).json({ message: 'Public data API is not configured on this server' });
  }
  if (!apiKey || apiKey !== expectedKey) {
    return res.status(401).json({ message: 'Invalid or missing API key' });
  }
  next();
};

router.use(validateApiKey);

/* ═══════════════════════════════════════════════════════════════
   1. GET /api/public-data/health
   Quick connectivity check — the admin panel pings this first.
   ═══════════════════════════════════════════════════════════════ */
router.get('/health', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    res.json({
      status: 'OK',
      app: process.env.APP_NAME || 'GrowMore Valet Client',
      version: '1.0.0',
      database: dbStatus,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ status: 'ERROR', message: err.message });
  }
});

/* ═══════════════════════════════════════════════════════════════
   2. GET /api/public-data/summary
   Today's live snapshot — bookings, revenue, active counts.
   ═══════════════════════════════════════════════════════════════ */
router.get('/summary', async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    const todayFilter = { createdAt: { $gte: todayStart, $lte: todayEnd } };

    // Run all queries in parallel
    const [
      todayBookings,
      todayRevenue,
      allTimeRevenue,
      totalBookingsAllTime,
      activeBookings,
      statusCounts,
      paymentMethodBreakdown
    ] = await Promise.all([
      // Today's booking count
      Booking.countDocuments(todayFilter),

      // Today's revenue
      Booking.aggregate([
        { $match: { ...todayFilter, 'payment.status': 'completed', 'payment.amount': { $gt: 0 } } },
        { $group: { _id: null, total: { $sum: '$payment.amount' }, count: { $sum: 1 } } }
      ]),

      // All-time revenue
      Booking.aggregate([
        { $match: { 'payment.status': 'completed', 'payment.amount': { $gt: 0 } } },
        { $group: { _id: null, total: { $sum: '$payment.amount' }, count: { $sum: 1 } } }
      ]),

      // Total bookings all time
      Booking.countDocuments(),

      // Currently active (not completed/cancelled)
      Booking.countDocuments({ status: { $in: ['parked', 'recall-requested', 'in-transit', 'arrived'] } }),

      // Status breakdown for today
      Booking.aggregate([
        { $match: todayFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),

      // Payment method breakdown for today
      Booking.aggregate([
        { $match: { ...todayFilter, 'payment.status': 'completed' } },
        { $group: { _id: '$payment.method', total: { $sum: '$payment.amount' }, count: { $sum: 1 } } }
      ])
    ]);

    const statusMap = {};
    statusCounts.forEach(s => { statusMap[s._id] = s.count; });

    const paymentMap = {};
    paymentMethodBreakdown.forEach(p => {
      paymentMap[p._id || 'unknown'] = { amount: p.total, count: p.count };
    });

    res.json({
      today: {
        bookings: todayBookings,
        revenue: todayRevenue[0]?.total || 0,
        paidCount: todayRevenue[0]?.count || 0,
        active: activeBookings,
        statusBreakdown: statusMap,
        paymentMethods: paymentMap
      },
      allTime: {
        bookings: totalBookingsAllTime,
        revenue: allTimeRevenue[0]?.total || 0,
        paidCount: allTimeRevenue[0]?.count || 0
      },
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Public data summary error:', err);
    res.status(500).json({ message: 'Failed to fetch summary' });
  }
});

/* ═══════════════════════════════════════════════════════════════
   3. GET /api/public-data/bookings
   Paginated bookings list with optional filters.
   Query params: from, to, status, limit (default 50), page (default 1)
   ═══════════════════════════════════════════════════════════════ */
router.get('/bookings', async (req, res) => {
  try {
    const { from, to, status, limit = 50, page = 1 } = req.query;
    const filter = {};

    // Date range
    if (from || to) {
      filter.createdAt = {};
      if (from) {
        const fromDate = new Date(from);
        fromDate.setHours(0, 0, 0, 0);
        filter.createdAt.$gte = fromDate;
      }
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = toDate;
      }
    }

    // Status filter
    if (status) {
      if (status === 'active') {
        filter.status = { $in: ['parked', 'recall-requested', 'in-transit', 'arrived'] };
      } else {
        filter.status = status;
      }
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(200, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .populate('driver', 'name phone role')
        .select('-verification -accessToken -__v')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Booking.countDocuments(filter)
    ]);

    res.json({
      bookings,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (err) {
    console.error('Public data bookings error:', err);
    res.status(500).json({ message: 'Failed to fetch bookings' });
  }
});

/* ═══════════════════════════════════════════════════════════════
   4. GET /api/public-data/revenue
   Revenue analytics with daily/hourly breakdown.
   Query params: from, to (required)
   ═══════════════════════════════════════════════════════════════ */
router.get('/revenue', async (req, res) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) {
      return res.status(400).json({ message: 'Both from and to date params are required' });
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);
    fromDate.setHours(0, 0, 0, 0);
    toDate.setHours(23, 59, 59, 999);

    if (isNaN(fromDate) || isNaN(toDate) || fromDate > toDate) {
      return res.status(400).json({ message: 'Invalid date range' });
    }

    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

    const baseMatch = {
      'payment.status': 'completed',
      'payment.amount': { $gt: 0 },
      createdAt: { $gte: fromDate, $lte: toDate }
    };

    // Summary
    const [summaryResult, allBookingsInRange, paymentBreakdownData, paymentStatusData] = await Promise.all([
      Booking.aggregate([
        { $match: baseMatch },
        { $group: { _id: null, total: { $sum: '$payment.amount' }, count: { $sum: 1 } } }
      ]),
      Booking.aggregate([
        { $match: { createdAt: { $gte: fromDate, $lte: toDate } } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            active: { $sum: { $cond: [{ $in: ['$status', ['parked', 'recall-requested', 'in-transit', 'arrived']] }, 1, 0] } },
            completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } }
          }
        }
      ]),
      Booking.aggregate([
        { $match: baseMatch },
        { $group: { _id: '$payment.method', total: { $sum: '$payment.amount' }, count: { $sum: 1 } } }
      ]),
      Booking.aggregate([
        { $match: { createdAt: { $gte: fromDate, $lte: toDate } } },
        { $group: { _id: '$payment.status', count: { $sum: 1 }, total: { $sum: '$payment.amount' } } }
      ])
    ]);

    const diffDays = Math.ceil((toDate - fromDate) / (1000 * 60 * 60 * 24));

    let hourlyBreakdown = null;
    let dailyBreakdown = null;

    if (diffDays <= 3) {
      // ── HOURLY BREAKDOWN ──
      const hourlyData = await Booking.aggregate([
        { $match: baseMatch },
        { $addFields: { createdAtIST: { $add: ['$createdAt', IST_OFFSET_MS] } } },
        {
          $group: {
            _id: {
              year: { $year: '$createdAtIST' },
              month: { $month: '$createdAtIST' },
              day: { $dayOfMonth: '$createdAtIST' },
              hour: { $hour: '$createdAtIST' }
            },
            amount: { $sum: '$payment.amount' },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1 } }
      ]);

      const hourlyMap = {};
      hourlyData.forEach(h => {
        const key = `${h._id.year}-${String(h._id.month).padStart(2,'0')}-${String(h._id.day).padStart(2,'0')}-${String(h._id.hour).padStart(2,'0')}`;
        hourlyMap[key] = { amount: h.amount, count: h.count };
      });

      hourlyBreakdown = [];
      const cursor = new Date(fromDate);
      while (cursor <= toDate) {
        const istMs = cursor.getTime() + IST_OFFSET_MS;
        const istDate = new Date(istMs);
        const year = istDate.getUTCFullYear();
        const month = istDate.getUTCMonth() + 1;
        const day = istDate.getUTCDate();
        const hour = istDate.getUTCHours();
        const key = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}-${String(hour).padStart(2,'0')}`;
        const ampm = hour === 0 ? '12am' : hour < 12 ? `${hour}am` : hour === 12 ? '12pm' : `${hour-12}pm`;
        hourlyBreakdown.push({
          label: ampm, hour,
          date: `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`,
          amount: hourlyMap[key]?.amount || 0,
          count: hourlyMap[key]?.count || 0
        });
        cursor.setTime(cursor.getTime() + 60 * 60 * 1000);
      }
    } else {
      // ── DAILY BREAKDOWN ──
      const dailyData = await Booking.aggregate([
        { $match: baseMatch },
        { $addFields: { createdAtIST: { $add: ['$createdAt', IST_OFFSET_MS] } } },
        {
          $group: {
            _id: {
              year: { $year: '$createdAtIST' },
              month: { $month: '$createdAtIST' },
              day: { $dayOfMonth: '$createdAtIST' }
            },
            amount: { $sum: '$payment.amount' },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
      ]);

      const dailyMap = {};
      dailyData.forEach(d => {
        const key = `${d._id.year}-${String(d._id.month).padStart(2,'0')}-${String(d._id.day).padStart(2,'0')}`;
        dailyMap[key] = { amount: d.amount, count: d.count };
      });

      dailyBreakdown = [];
      const cursor = new Date(fromDate);
      while (cursor <= toDate) {
        const istMs = cursor.getTime() + IST_OFFSET_MS;
        const istDate = new Date(istMs);
        const year = istDate.getUTCFullYear();
        const month = istDate.getUTCMonth() + 1;
        const day = istDate.getUTCDate();
        const key = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
        dailyBreakdown.push({
          date: key,
          label: istDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', timeZone: 'Asia/Kolkata' }),
          amount: dailyMap[key]?.amount || 0,
          count: dailyMap[key]?.count || 0
        });
        cursor.setTime(cursor.getTime() + 24 * 60 * 60 * 1000);
      }
    }

    res.json({
      range: { from: fromDate, to: toDate, days: diffDays },
      summary: {
        revenue: summaryResult[0]?.total || 0,
        paidCount: summaryResult[0]?.count || 0,
        totalBookings: allBookingsInRange[0]?.total || 0,
        activeBookings: allBookingsInRange[0]?.active || 0,
        completedBookings: allBookingsInRange[0]?.completed || 0
      },
      paymentBreakdown: paymentBreakdownData.reduce((acc, item) => {
        acc[item._id || 'unknown'] = { amount: item.total, count: item.count };
        return acc;
      }, {}),
      paymentStatus: {
        completed: 0, failed: 0, pending: 0,
        ...paymentStatusData.reduce((acc, s) => {
          acc[s._id || 'pending'] = { count: s.count, total: s.total };
          return acc;
        }, {})
      },
      hourlyBreakdown,
      dailyBreakdown
    });
  } catch (err) {
    console.error('Public data revenue error:', err);
    res.status(500).json({ message: 'Failed to fetch revenue data' });
  }
});

/* ═══════════════════════════════════════════════════════════════
   5. GET /api/public-data/users
   All staff: drivers, supervisors, managers with booking counts.
   ═══════════════════════════════════════════════════════════════ */
router.get('/users', async (req, res) => {
  try {
    const [drivers, supervisors, managers] = await Promise.all([
      User.find({ role: 'driver' })
        .populate('supervisor', 'name phone')
        .populate('venue', 'name')
        .select('-password')
        .lean(),
      User.find({ role: 'supervisor' })
        .populate('manager', 'name phone')
        .populate('venue', 'name')
        .select('-password')
        .lean(),
      User.find({ role: 'manager' })
        .select('-password')
        .lean()
    ]);

    // Get booking counts per driver (today)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const driverBookingCounts = await Booking.aggregate([
      { $match: { createdAt: { $gte: todayStart } } },
      { $group: { _id: '$driver', count: { $sum: 1 } } }
    ]);
    const countMap = {};
    driverBookingCounts.forEach(d => { countMap[d._id?.toString()] = d.count; });

    // Attach counts to drivers
    const driversWithCounts = drivers.map(d => ({
      ...d,
      todayBookings: countMap[d._id.toString()] || 0
    }));

    res.json({
      drivers: driversWithCounts,
      supervisors,
      managers,
      counts: {
        drivers: drivers.length,
        supervisors: supervisors.length,
        managers: managers.length
      }
    });
  } catch (err) {
    console.error('Public data users error:', err);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

/* ═══════════════════════════════════════════════════════════════
   6. GET /api/public-data/venues
   All venues with their settings.
   ═══════════════════════════════════════════════════════════════ */
router.get('/venues', async (req, res) => {
  try {
    const venues = await Venue.find()
      .populate('supervisor', 'name phone')
      .lean();

    // Get booking counts per venue (today)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const venueBookingCounts = await Booking.aggregate([
      { $match: { createdAt: { $gte: todayStart } } },
      { $group: { _id: '$location.venue', count: { $sum: 1 }, revenue: { $sum: { $cond: [{ $eq: ['$payment.status', 'completed'] }, '$payment.amount', 0] } } } }
    ]);
    const venueMap = {};
    venueBookingCounts.forEach(v => { venueMap[v._id] = { count: v.count, revenue: v.revenue }; });

    const venuesWithStats = venues.map(v => ({
      ...v,
      todayBookings: venueMap[v.name]?.count || 0,
      todayRevenue: venueMap[v.name]?.revenue || 0
    }));

    res.json({ venues: venuesWithStats });
  } catch (err) {
    console.error('Public data venues error:', err);
    res.status(500).json({ message: 'Failed to fetch venues' });
  }
});

module.exports = router;
