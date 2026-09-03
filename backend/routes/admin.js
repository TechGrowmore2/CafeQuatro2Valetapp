const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Booking = require('../models/Booking');
const Venue = require('../models/Venue');
const { auth, authorize } = require('../middleware/auth');

// Get all supervisors (Admin, Manager)
router.get('/supervisors', auth, authorize('admin', 'manager'), async (req, res) => {
  try {
    const supervisors = await User.find({ role: 'supervisor' })
      .select('-password')
      .sort({ createdAt: -1 });
    res.json({ supervisors });
  } catch (error) {
    console.error('Get supervisors error:', error);
    res.status(500).json({ message: 'Failed to fetch supervisors' });
  }
});

// Get all drivers (Admin, Manager)
router.get('/drivers', auth, authorize('admin', 'manager'), async (req, res) => {
  try {
    const drivers = await User.find({ role: 'driver' })
      .populate('supervisor', 'name phone')
      .select('-password')
      .sort({ createdAt: -1 });
    res.json({ drivers });
  } catch (error) {
    console.error('Get drivers error:', error);
    res.status(500).json({ message: 'Failed to fetch drivers' });
  }
});

// Create supervisor (Admin only)
router.post('/supervisors',
  auth,
  authorize('admin'),
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('phone').isMobilePhone().withMessage('Invalid phone number'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, phone, password, managerId, venueId } = req.body;

      // Check if supervisor already exists
      const existingUser = await User.findOne({ phone });
      if (existingUser) {
        return res.status(400).json({ message: 'User with this phone number already exists' });
      }

      // Verify manager if provided
      if (managerId) {
        const manager = await User.findById(managerId);
        if (!manager || manager.role !== 'manager') {
          return res.status(400).json({ message: 'Invalid manager' });
        }
      }

      const supervisor = new User({
        name,
        phone,
        password,
        role: 'supervisor',
        manager: managerId || null,
        venue: venueId || null
      });

      await supervisor.save();

      res.status(201).json({
        message: 'Supervisor created successfully',
        supervisor: {
          _id: supervisor._id,
          name: supervisor.name,
          phone: supervisor.phone,
          role: supervisor.role
        }
      });
    } catch (error) {
      console.error('Create supervisor error:', error);
      res.status(500).json({ message: 'Failed to create supervisor' });
    }
  }
);

// Create driver (Admin only)
router.post('/drivers',
  auth,
  authorize('admin'),
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('phone').isMobilePhone().withMessage('Invalid phone number'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('supervisorId').notEmpty().withMessage('Supervisor is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, phone, password, supervisorId, venueId } = req.body;

      // Check if driver already exists
      const existingUser = await User.findOne({ phone });
      if (existingUser) {
        return res.status(400).json({ message: 'User with this phone number already exists' });
      }

      // Verify supervisor exists
      const supervisor = await User.findById(supervisorId);
      if (!supervisor || supervisor.role !== 'supervisor') {
        return res.status(400).json({ message: 'Invalid supervisor' });
      }

      const driver = new User({
        name,
        phone,
        password,
        role: 'driver',
        supervisor: supervisorId,
        venue: venueId || null
      });

      await driver.save();
      await driver.populate('supervisor', 'name phone');

      res.status(201).json({
        message: 'Driver created successfully',
        driver: {
          _id: driver._id,
          name: driver.name,
          phone: driver.phone,
          role: driver.role,
          supervisor: driver.supervisor
        }
      });
    } catch (error) {
      console.error('Create driver error:', error);
      res.status(500).json({ message: 'Failed to create driver' });
    }
  }
);

// Update supervisor (Admin only)
router.put('/supervisors/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const { name, phone, password, isActive, managerId, venueId } = req.body;
    const supervisor = await User.findById(req.params.id);

    if (!supervisor || supervisor.role !== 'supervisor') {
      return res.status(404).json({ message: 'Supervisor not found' });
    }

    if (name) supervisor.name = name;
    if (phone) supervisor.phone = phone;
    if (password) supervisor.password = password;
    if (typeof isActive !== 'undefined') supervisor.isActive = isActive;
    
    if (managerId !== undefined) {
      if (managerId) {
        const manager = await User.findById(managerId);
        if (!manager || manager.role !== 'manager') {
          return res.status(400).json({ message: 'Invalid manager' });
        }
      }
      supervisor.manager = managerId || null;
    }

    if (venueId !== undefined) {
      supervisor.venue = venueId || null;
    }

    await supervisor.save();

    res.json({
      message: 'Supervisor updated successfully',
      supervisor: {
        _id: supervisor._id,
        name: supervisor.name,
        phone: supervisor.phone,
        role: supervisor.role,
        manager: supervisor.manager,
        venue: supervisor.venue,
        isActive: supervisor.isActive
      }
    });
  } catch (error) {
    console.error('Update supervisor error:', error);
    res.status(500).json({ message: 'Failed to update supervisor' });
  }
});

// Update driver (Admin only)
router.put('/drivers/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const { name, phone, password, supervisorId, venueId, isActive } = req.body;
    const driver = await User.findById(req.params.id);

    if (!driver || driver.role !== 'driver') {
      return res.status(404).json({ message: 'Driver not found' });
    }

    if (name) driver.name = name;
    if (phone) driver.phone = phone;
    if (password) driver.password = password;
    if (supervisorId) {
      const supervisor = await User.findById(supervisorId);
      if (!supervisor || supervisor.role !== 'supervisor') {
        return res.status(400).json({ message: 'Invalid supervisor' });
      }
      driver.supervisor = supervisorId;
    }
    if (venueId !== undefined) {
      driver.venue = venueId || null;
    }
    if (typeof isActive !== 'undefined') driver.isActive = isActive;

    await driver.save();
    await driver.populate('supervisor', 'name phone');

    res.json({
      message: 'Driver updated successfully',
      driver: {
        _id: driver._id,
        name: driver.name,
        phone: driver.phone,
        role: driver.role,
        supervisor: driver.supervisor,
        venue: driver.venue,
        isActive: driver.isActive
      }
    });
  } catch (error) {
    console.error('Update driver error:', error);
    res.status(500).json({ message: 'Failed to update driver' });
  }
});
// Delete booking (Admin only)
router.delete('/bookings/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    await Booking.findByIdAndDelete(req.params.id);

    res.json({ message: 'Booking deleted successfully' });
  } catch (error) {
    console.error('Delete booking error:', error);
    res.status(500).json({ message: 'Failed to delete booking' });
  }
});

// Delete supervisor (Admin only)
router.delete('/supervisors/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const supervisor = await User.findById(req.params.id);

    if (!supervisor || supervisor.role !== 'supervisor') {
      return res.status(404).json({ message: 'Supervisor not found' });
    }

    // Check if supervisor has assigned drivers
    const assignedDrivers = await User.countDocuments({ supervisor: req.params.id });
    if (assignedDrivers > 0) {
      return res.status(400).json({ 
        message: `Cannot delete supervisor. ${assignedDrivers} driver(s) are assigned to this supervisor.` 
      });
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({ message: 'Supervisor deleted successfully' });
  } catch (error) {
    console.error('Delete supervisor error:', error);
    res.status(500).json({ message: 'Failed to delete supervisor' });
  }
});

// Delete driver (Admin only)
router.delete('/drivers/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const driver = await User.findById(req.params.id);

    if (!driver || driver.role !== 'driver') {
      return res.status(404).json({ message: 'Driver not found' });
    }

    // Check if driver has active bookings
    const activeBookings = await Booking.countDocuments({ 
      driver: req.params.id,
      status: { $nin: ['completed', 'cancelled'] }
    });

    if (activeBookings > 0) {
      return res.status(400).json({ 
        message: `Cannot delete driver. ${activeBookings} active booking(s) exist.` 
      });
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({ message: 'Driver deleted successfully' });
  } catch (error) {
    console.error('Delete driver error:', error);
    res.status(500).json({ message: 'Failed to delete driver' });
  }
});

// Get statistics (Admin, Manager)
router.get('/stats', auth, authorize('admin', 'manager'), async (req, res) => {
  try {
    const totalSupervisors = await User.countDocuments({ role: 'supervisor' });
    const totalDrivers = await User.countDocuments({ role: 'driver' });
    const activeSupervisors = await User.countDocuments({ role: 'supervisor', isActive: true });
    const activeDrivers = await User.countDocuments({ role: 'driver', isActive: true });
    const totalBookings = await Booking.countDocuments();
    const activeBookings = await Booking.countDocuments({ status: { $nin: ['completed', 'cancelled'] } });
    const completedBookings = await Booking.countDocuments({ status: 'completed' });
    const totalVenues = await Venue.countDocuments();
    const activeVenues = await Venue.countDocuments({ isActive: true });

    res.json({
      supervisors: { total: totalSupervisors, active: activeSupervisors },
      drivers: { total: totalDrivers, active: activeDrivers },
      bookings: { total: totalBookings, active: activeBookings, completed: completedBookings },
      venues: { total: totalVenues, active: activeVenues }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Failed to fetch statistics' });
  }
});

// ===== VENUE MANAGEMENT ROUTES =====

// Get all venues (Admin, Manager)
router.get('/venues', auth, authorize('admin', 'manager'), async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'manager') {
      // Find all supervisors assigned to this manager
      const supervisors = await User.find({ role: 'supervisor', manager: req.user._id }).select('_id');
      const supervisorIds = supervisors.map(s => s._id);
      query.supervisor = { $in: supervisorIds };
    }

    const venues = await Venue.find(query)
      .populate('supervisor', 'name phone')
      .sort({ createdAt: -1 });
    res.json({ venues });
  } catch (error) {
    console.error('Get venues error:', error);
    res.status(500).json({ message: 'Failed to fetch venues' });
  }
});

// Create venue (Admin only)
router.post('/venues',
  auth,
  authorize('admin'),
  [
    body('name').trim().notEmpty().withMessage('Venue name is required'),
    body('requiresUpfrontPayment').isBoolean().withMessage('Payment setting is required'),
    body('supervisorId').optional()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, requiresUpfrontPayment, supervisorId, parkingSpots, parkingFee } = req.body;

      // Check if venue already exists
      const existingVenue = await Venue.findOne({ name: new RegExp(`^${name}$`, 'i') });
      if (existingVenue) {
        return res.status(400).json({ message: 'Venue with this name already exists' });
      }

      // If requires upfront payment, verify supervisor
      if (requiresUpfrontPayment && supervisorId) {
        const supervisor = await User.findById(supervisorId);
        if (!supervisor || supervisor.role !== 'supervisor') {
          return res.status(400).json({ message: 'Invalid supervisor' });
        }
      }

      const venue = new Venue({
        name,
        requiresUpfrontPayment,
        supervisor: requiresUpfrontPayment ? supervisorId : null,
        parkingSpots: parkingSpots && Array.isArray(parkingSpots) ? parkingSpots.filter(spot => spot.trim() !== '') : [],
        parkingFee: parkingFee !== undefined ? parseFloat(parkingFee) : 100
      });

      await venue.save();
      await venue.populate('supervisor', 'name phone');

      res.status(201).json({
        message: 'Venue created successfully',
        venue
      });
    } catch (error) {
      console.error('Create venue error:', error);
      res.status(500).json({ message: 'Failed to create venue' });
    }
  }
);

// Update venue (Admin only)
router.put('/venues/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const { name, requiresUpfrontPayment, supervisorId, isActive, parkingSpots } = req.body;
    const venue = await Venue.findById(req.params.id);

    if (!venue) {
      return res.status(404).json({ message: 'Venue not found' });
    }

    if (name) venue.name = name;
    if (typeof requiresUpfrontPayment !== 'undefined') {
      venue.requiresUpfrontPayment = requiresUpfrontPayment;
    }

    if (parkingFee !== undefined && parkingFee !== null && parkingFee !== '') {
      venue.parkingFee = parseFloat(parkingFee);
    }

    if (requiresUpfrontPayment && supervisorId) {
      const supervisor = await User.findById(supervisorId);
      if (!supervisor || supervisor.role !== 'supervisor') {
        return res.status(400).json({ message: 'Invalid supervisor' });
      }
      venue.supervisor = supervisorId;
    } else if (!requiresUpfrontPayment) {
      venue.supervisor = null;
    }

    if (typeof isActive !== 'undefined') venue.isActive = isActive;
    if (parkingSpots && Array.isArray(parkingSpots)) {
      venue.parkingSpots = parkingSpots.filter(spot => spot.trim() !== '');
    }

    await venue.save();
    await venue.populate('supervisor', 'name phone');

    res.json({
      message: 'Venue updated successfully',
      venue
    });
  } catch (error) {
    console.error('Update venue error:', error);
    res.status(500).json({ message: 'Failed to update venue' });
  }
});

// Delete venue (Admin only)
router.delete('/venues/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const venue = await Venue.findById(req.params.id);

    if (!venue) {
      return res.status(404).json({ message: 'Venue not found' });
    }

    await Venue.findByIdAndDelete(req.params.id);

    res.json({ message: 'Venue deleted successfully' });
  } catch (error) {
    console.error('Delete venue error:', error);
    res.status(500).json({ message: 'Failed to delete venue' });
  }
});

// ===== NEW: LIVE RIDES (Admin, Manager — all active bookings) =====
router.get('/live-rides', auth, authorize('admin', 'manager'), async (req, res) => {
  try {
    const rides = await Booking.find({
      status: { $nin: ['completed', 'cancelled'] }
    })
      .populate('driver', 'name phone')
      .sort({ createdAt: -1 });
    res.json({ rides, count: rides.length });
  } catch (error) {
    console.error('Live rides error:', error);
    res.status(500).json({ message: 'Failed to fetch live rides' });
  }
});

// ===== NEW: ALL BOOKINGS with search + filter + pagination (Admin, Manager) =====
router.get('/all-bookings', auth, authorize('admin', 'manager'), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 15,
      status,
      search,
      from,
      to,
      sort = 'newest'
    } = req.query;

    const query = {};

    // Scoping for Manager
    if (req.user.role === 'manager') {
      // Find supervisors assigned to manager
      const supervisors = await User.find({ role: 'supervisor', manager: req.user._id }).select('_id');
      const supervisorIds = supervisors.map(s => s._id);
      // Find drivers assigned to those supervisors
      const drivers = await User.find({ role: 'driver', supervisor: { $in: supervisorIds } }).select('_id');
      const driverIds = drivers.map(d => d._id);
      
      query.driver = { $in: driverIds };
    }

    // Status filter
    if (status) {
      query.status = status;
    }

    // Date range filter
    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to) {
        const endDate = new Date(to);
        endDate.setHours(23, 59, 59, 999);
        query.createdAt.$lte = endDate;
      }
    }

    // Search by booking ID, customer name/phone
    if (search) {
      query.$or = [
        { bookingId: { $regex: search, $options: 'i' } },
        { 'customer.name': { $regex: search, $options: 'i' } },
        { 'customer.phone': { $regex: search, $options: 'i' } },
        { 'vehicle.number': { $regex: search, $options: 'i' } }
      ];
    }

    const sortOrder = sort === 'oldest' ? 1 : -1;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [bookings, total] = await Promise.all([
      Booking.find(query)
        .populate({
          path: 'driver',
          select: 'name phone supervisor venue',
          populate: [
            { path: 'supervisor', select: 'name phone venue' },
            { path: 'venue', select: 'name' }
          ]
        })
        .sort({ createdAt: sortOrder })
        .skip(skip)
        .limit(parseInt(limit)),
      Booking.countDocuments(query)
    ]);

    res.json({ bookings, total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (error) {
    console.error('All bookings error:', error);
    res.status(500).json({ message: 'Failed to fetch bookings' });
  }
});

// ===== ADMIN: UPDATE BOOKING PAYMENT (method + status) =====
router.patch('/bookings/:id/payment', auth, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { paymentMethod, paymentStatus } = req.body;

    const VALID_METHODS  = ['cash', 'upi', 'card', 'razorpay', 'staff', 'foc', 'qr'];
    const VALID_STATUSES = ['unpaid', 'paid'];

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (paymentMethod && VALID_METHODS.includes(paymentMethod)) {
      booking.payment = { ...booking.payment, method: paymentMethod };
      // FOC bookings are always marked paid
      if (paymentMethod === 'foc') booking.paymentStatus = 'paid';
    }
    if (paymentStatus && VALID_STATUSES.includes(paymentStatus)) {
      booking.paymentStatus = paymentStatus;
    }

    await booking.save();
    await booking.populate('driver', 'name phone');

    console.log(`Admin updated payment for booking ${booking.bookingId}: method=${booking.payment?.method}, status=${booking.paymentStatus}`);
    res.json({ message: 'Payment updated successfully', booking });
  } catch (error) {
    console.error('Admin update payment error:', error);
    res.status(500).json({ message: 'Failed to update payment' });
  }
});

// ===== ADMIN: DELETE BOOKING =====
router.delete('/bookings/:id', auth, authorize('admin', 'manager'), async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    await Booking.findByIdAndDelete(req.params.id);
    console.log(`Admin deleted booking ${booking.bookingId}`);
    res.json({ message: 'Booking deleted successfully' });
  } catch (error) {
    console.error('Admin delete booking error:', error);
    res.status(500).json({ message: 'Failed to delete booking' });
  }
});

// ===== NEW: CUSTOMER RIDES — lookup by phone (Admin, Manager) =====
router.get('/customer-rides', auth, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone) {
      return res.status(400).json({ message: 'Phone number is required' });
    }

    const bookings = await Booking.find({ 'customer.phone': phone })
      .populate('driver', 'name phone')
      .sort({ createdAt: -1 });

    // Try to get customer name from first booking
    const customerName = bookings.length > 0 ? bookings[0].customer?.name : null;

    // Also check if they exist as a registered customer
    const customerUser = await User.findOne({ phone, role: 'customer' }).select('name');

    res.json({
      customerName: customerUser?.name || customerName || null,
      phone,
      bookings,
      totalBookings: bookings.length,
      completedBookings: bookings.filter(b => b.status === 'completed').length,
      totalSpend: bookings.filter(b => b.status === 'completed').reduce((sum, b) => sum + (b.payment?.amount || 0), 0)
    });
  } catch (error) {
    console.error('Customer rides error:', error);
    res.status(500).json({ message: 'Failed to fetch customer rides' });
  }
});

// ===== ENHANCED: REVENUE & TRANSACTION STATS (Admin, Manager, Supervisor) =====
router.get('/revenue-stats', auth, authorize('admin', 'manager', 'supervisor'), async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - 7);
    const monthStart = new Date(now); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    const last30Start = new Date(now); last30Start.setDate(now.getDate() - 29); last30Start.setHours(0, 0, 0, 0);

    // Build role-based driver filter for statistics
    let driverFilter = {};
    if (req.user.role === 'supervisor') {
      const assignedDrivers = await User.find({ role: 'driver', supervisor: req.user._id }).select('_id');
      const driverIds = assignedDrivers.map(d => d._id);
      driverFilter = { driver: { $in: driverIds } };
    } else if (req.user.role === 'manager') {
      const supervisors = await User.find({ role: 'supervisor', manager: req.user._id }).select('_id');
      const supervisorIds = supervisors.map(s => s._id);
      const assignedDrivers = await User.find({ role: 'driver', supervisor: { $in: supervisorIds } }).select('_id');
      const driverIds = assignedDrivers.map(d => d._id);
      driverFilter = { driver: { $in: driverIds } };
    }

    const [todayRev, weekRev, monthRev, totalRev] = await Promise.all([
      Booking.aggregate([
        { $match: { ...driverFilter, 'payment.status': 'completed', createdAt: { $gte: todayStart }, 'payment.amount': { $gt: 0 } } },
        { $group: { _id: null, total: { $sum: '$payment.amount' }, count: { $sum: 1 } } }
      ]),
      Booking.aggregate([
        { $match: { ...driverFilter, 'payment.status': 'completed', createdAt: { $gte: weekStart }, 'payment.amount': { $gt: 0 } } },
        { $group: { _id: null, total: { $sum: '$payment.amount' }, count: { $sum: 1 } } }
      ]),
      Booking.aggregate([
        { $match: { ...driverFilter, 'payment.status': 'completed', createdAt: { $gte: monthStart }, 'payment.amount': { $gt: 0 } } },
        { $group: { _id: null, total: { $sum: '$payment.amount' }, count: { $sum: 1 } } }
      ]),
      Booking.aggregate([
        { $match: { ...driverFilter, 'payment.status': 'completed', 'payment.amount': { $gt: 0 } } },
        { $group: { _id: null, total: { $sum: '$payment.amount' }, count: { $sum: 1 } } }
      ])
    ]);

    // Payment method breakdown (all time)
    const paymentBreakdown = await Booking.aggregate([
      { $match: { ...driverFilter, 'payment.status': 'completed' } },
      { $group: { _id: '$payment.method', total: { $sum: '$payment.amount' }, count: { $sum: 1 } } }
    ]);

    // Payment status counts (successful / failed / pending)
    const paymentStatusCounts = await Booking.aggregate([
      { $match: { ...driverFilter } },
      { $group: { _id: '$payment.status', count: { $sum: 1 }, total: { $sum: '$payment.amount' } } }
    ]);
    const statusMap = {};
    paymentStatusCounts.forEach(s => { statusMap[s._id || 'pending'] = { count: s.count, total: s.total }; });

    // Day-wise breakdown for last 30 days
    const dailyData = await Booking.aggregate([
      {
        $match: {
          ...driverFilter,
          'payment.status': 'completed',
          'payment.amount': { $gt: 0 },
          createdAt: { $gte: last30Start }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          amount: { $sum: '$payment.amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    // Build a full 30-day array (fill gaps with 0)
    const dailyMap = {};
    dailyData.forEach(d => {
      const dateStr = `${d._id.year}-${String(d._id.month).padStart(2,'0')}-${String(d._id.day).padStart(2,'0')}`;
      dailyMap[dateStr] = { amount: d.amount, count: d.count };
    });

    const dailyBreakdown = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const key = d.toISOString().split('T')[0];
      dailyBreakdown.push({
        date: key,
        label: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
        amount: dailyMap[key]?.amount || 0,
        count: dailyMap[key]?.count || 0
      });
    }

    // Weekly grouping (last 12 weeks)
    const weeklyData = await Booking.aggregate([
      {
        $match: {
          ...driverFilter,
          'payment.status': 'completed',
          'payment.amount': { $gt: 0 },
          createdAt: { $gte: new Date(now.getTime() - 84 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: { week: { $week: '$createdAt' }, year: { $year: '$createdAt' } },
          amount: { $sum: '$payment.amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.week': 1 } }
    ]);

    // Monthly grouping (last 12 months)
    const monthlyData = await Booking.aggregate([
      {
        $match: {
          ...driverFilter,
          'payment.status': 'completed',
          'payment.amount': { $gt: 0 },
          createdAt: { $gte: new Date(now.getFullYear() - 1, now.getMonth(), 1) }
        }
      },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          amount: { $sum: '$payment.amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const monthlyBreakdown = monthlyData.map(m => ({
      label: `${monthNames[m._id.month - 1]} ${m._id.year}`,
      amount: m.amount,
      count: m.count
    }));

    const weeklyBreakdown = weeklyData.map(w => ({
      label: `Wk ${w._id.week}`,
      amount: w.amount,
      count: w.count
    }));

    res.json({
      today:   { amount: todayRev[0]?.total || 0,  count: todayRev[0]?.count || 0 },
      week:    { amount: weekRev[0]?.total || 0,   count: weekRev[0]?.count || 0 },
      month:   { amount: monthRev[0]?.total || 0,  count: monthRev[0]?.count || 0 },
      allTime: { amount: totalRev[0]?.total || 0,  count: totalRev[0]?.count || 0 },
      paymentBreakdown: paymentBreakdown.reduce((acc, item) => {
        acc[item._id || 'unknown'] = { amount: item.total, count: item.count };
        return acc;
      }, {}),
      paymentStatus: {
        successful: statusMap['completed'] || { count: 0, total: 0 },
        failed:     statusMap['failed']    || { count: 0, total: 0 },
        pending:    statusMap['pending']   || { count: 0, total: 0 }
      },
      dailyBreakdown,
      weeklyBreakdown,
      monthlyBreakdown
    });
  } catch (error) {
    console.error('Revenue stats error:', error);
    res.status(500).json({ message: 'Failed to fetch revenue stats' });
  }
});

// GET /api/admin/revenue-stats/custom?from=ISO&to=ISO
// Custom date-range analytics: summary + hourly (<=3 days) or daily breakdown
router.get('/revenue-stats/custom', auth, authorize('admin', 'manager', 'supervisor'), async (req, res) => {
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

    // Build role-based driver filter
    let driverFilter = {};
    if (req.user.role === 'supervisor') {
      const assignedDrivers = await User.find({ role: 'driver', supervisor: req.user._id }).select('_id');
      driverFilter = { driver: { $in: assignedDrivers.map(d => d._id) } };
    } else if (req.user.role === 'manager') {
      const supervisors = await User.find({ role: 'supervisor', manager: req.user._id }).select('_id');
      const supervisorIds = supervisors.map(s => s._id);
      const assignedDrivers = await User.find({ role: 'driver', supervisor: { $in: supervisorIds } }).select('_id');
      driverFilter = { driver: { $in: assignedDrivers.map(d => d._id) } };
    }

    const baseMatch = {
      ...driverFilter,
      'payment.status': 'completed',
      'payment.amount': { $gt: 0 },
      createdAt: { $gte: fromDate, $lte: toDate }
    };

    // Summary totals for the custom range
    const [summaryResult, allBookingsInRange] = await Promise.all([
      Booking.aggregate([
        { $match: baseMatch },
        { $group: { _id: null, total: { $sum: '$payment.amount' }, count: { $sum: 1 } } }
      ]),
      Booking.aggregate([
        { $match: { ...driverFilter, createdAt: { $gte: fromDate, $lte: toDate } } },
        { $group: { _id: null, total: { $sum: 1 }, active: { $sum: { $cond: [{ $in: ['$status', ['parked', 'recall-requested', 'in-transit', 'arrived']] }, 1, 0] } }, completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } } } }
      ])
    ]);

    // Payment method breakdown for the range
    const paymentBreakdownData = await Booking.aggregate([
      { $match: { ...driverFilter, 'payment.status': 'completed', createdAt: { $gte: fromDate, $lte: toDate } } },
      { $group: { _id: '$payment.method', total: { $sum: '$payment.amount' }, count: { $sum: 1 } } }
    ]);

    // Payment status counts for the range
    const paymentStatusData = await Booking.aggregate([
      { $match: { ...driverFilter, createdAt: { $gte: fromDate, $lte: toDate } } },
      { $group: { _id: '$payment.status', count: { $sum: 1 }, total: { $sum: '$payment.amount' } } }
    ]);
    const statusMap = {};
    paymentStatusData.forEach(s => { statusMap[s._id || 'pending'] = { count: s.count, total: s.total }; });

    // Determine range size in days to decide granularity
    const diffDays = Math.ceil((toDate - fromDate) / (1000 * 60 * 60 * 24));

    let hourlyBreakdown = null;
    let dailyBreakdown = null;

    if (diffDays <= 3) {
      // ── HOURLY BREAKDOWN (for single day or up to 3-day range) ──
      const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // +05:30 in milliseconds
      const hourlyData = await Booking.aggregate([
        { $match: baseMatch },
        {
          $addFields: {
            createdAtIST: { $add: ['$createdAt', IST_OFFSET_MS] }
          }
        },
        {
          $group: {
            _id: {
              year:  { $year:       '$createdAtIST' },
              month: { $month:      '$createdAtIST' },
              day:   { $dayOfMonth: '$createdAtIST' },
              hour:  { $hour:       '$createdAtIST' }
            },
            amount: { $sum: '$payment.amount' },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1 } }
      ]);

      // Build a map for quick lookup (keys are IST-based)
      const hourlyMap = {};
      hourlyData.forEach(h => {
        const key = `${h._id.year}-${String(h._id.month).padStart(2,'0')}-${String(h._id.day).padStart(2,'0')}-${String(h._id.hour).padStart(2,'0')}`;
        hourlyMap[key] = { amount: h.amount, count: h.count };
      });

      // Fill every hour in the range with 0 if no data.
      // Cursor is in IST: fromDate is already midnight IST (set by the API caller)
      hourlyBreakdown = [];
      const cursor = new Date(fromDate);
      while (cursor <= toDate) {
        // Convert cursor to IST to build the matching key
        const istMs = cursor.getTime() + IST_OFFSET_MS;
        const istDate = new Date(istMs);
        const year  = istDate.getUTCFullYear();
        const month = istDate.getUTCMonth() + 1;
        const day   = istDate.getUTCDate();
        const hour  = istDate.getUTCHours();
        const key = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}-${String(hour).padStart(2,'0')}`;
        const ampm = hour === 0 ? '12am' : hour < 12 ? `${hour}am` : hour === 12 ? '12pm' : `${hour-12}pm`;
        const dayLabel = diffDays > 1 ? ` ${istDate.toLocaleDateString('en-IN', { day:'2-digit', month:'short', timeZone: 'Asia/Kolkata' })}` : '';
        hourlyBreakdown.push({
          label: `${ampm}${dayLabel}`,
          hour,
          date: `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`,
          amount: hourlyMap[key]?.amount || 0,
          count: hourlyMap[key]?.count || 0
        });
        cursor.setTime(cursor.getTime() + 60 * 60 * 1000); // advance by 1 hour
      }
    } else {
      // ── DAILY BREAKDOWN (for ranges > 3 days) ──
      const IST_OFFSET_MS_D = 5.5 * 60 * 60 * 1000;
      const dailyData = await Booking.aggregate([
        { $match: baseMatch },
        {
          $addFields: {
            createdAtIST: { $add: ['$createdAt', IST_OFFSET_MS_D] }
          }
        },
        {
          $group: {
            _id: {
              year:  { $year:       '$createdAtIST' },
              month: { $month:      '$createdAtIST' },
              day:   { $dayOfMonth: '$createdAtIST' }
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
        // Convert cursor to IST for consistent key matching
        const istMs = cursor.getTime() + IST_OFFSET_MS_D;
        const istDate = new Date(istMs);
        const year  = istDate.getUTCFullYear();
        const month = istDate.getUTCMonth() + 1;
        const day   = istDate.getUTCDate();
        const key = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
        dailyBreakdown.push({
          date: key,
          label: istDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', timeZone: 'Asia/Kolkata' }),
          amount: dailyMap[key]?.amount || 0,
          count: dailyMap[key]?.count || 0
        });
        cursor.setTime(cursor.getTime() + 24 * 60 * 60 * 1000); // advance by 1 day
      }
    }

    res.json({
      range: { from: fromDate, to: toDate, days: diffDays },
      summary: {
        amount: summaryResult[0]?.total || 0,
        count: summaryResult[0]?.count || 0,
        totalBookings: allBookingsInRange[0]?.total || 0,
        activeBookings: allBookingsInRange[0]?.active || 0,
        completedBookings: allBookingsInRange[0]?.completed || 0
      },
      paymentBreakdown: paymentBreakdownData.reduce((acc, item) => {
        acc[item._id || 'unknown'] = { amount: item.total, count: item.count };
        return acc;
      }, {}),
      paymentStatus: {
        successful: statusMap['completed'] || { count: 0, total: 0 },
        failed:     statusMap['failed']    || { count: 0, total: 0 },
        pending:    statusMap['pending']   || { count: 0, total: 0 }
      },
      hourlyBreakdown,  // non-null only when diffDays <= 3
      dailyBreakdown    // non-null only when diffDays > 3
    });
  } catch (error) {
    console.error('Custom revenue stats error:', error);
    res.status(500).json({ message: 'Failed to fetch custom analytics' });
  }
});

// ===== MANAGER MANAGEMENT ROUTES =====

// Get all managers (Admin only)
router.get('/managers', auth, authorize('admin'), async (req, res) => {
  try {
    const managers = await User.find({ role: 'manager' })
      .select('-password')
      .sort({ createdAt: -1 });
    res.json({ managers });
  } catch (error) {
    console.error('Get managers error:', error);
    res.status(500).json({ message: 'Failed to fetch managers' });
  }
});

// Create manager (Admin only)
router.post('/managers',
  auth,
  authorize('admin'),
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('phone').isMobilePhone().withMessage('Invalid phone number'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, phone, password } = req.body;

      const existingUser = await User.findOne({ phone });
      if (existingUser) {
        return res.status(400).json({ message: 'User with this phone number already exists' });
      }

      const manager = new User({
        name,
        phone,
        password,
        role: 'manager'
      });

      await manager.save();

      res.status(201).json({
        message: 'Manager created successfully',
        manager: {
          _id: manager._id,
          name: manager.name,
          phone: manager.phone,
          role: manager.role
        }
      });
    } catch (error) {
      console.error('Create manager error:', error);
      res.status(500).json({ message: 'Failed to create manager' });
    }
  }
);

// Update manager (Admin only)
router.put('/managers/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const { name, phone, password, isActive } = req.body;
    const manager = await User.findById(req.params.id);

    if (!manager || manager.role !== 'manager') {
      return res.status(404).json({ message: 'Manager not found' });
    }

    if (name) manager.name = name;
    if (phone) manager.phone = phone;
    if (password) manager.password = password;
    if (typeof isActive !== 'undefined') manager.isActive = isActive;

    await manager.save();

    res.json({
      message: 'Manager updated successfully',
      manager: {
        _id: manager._id,
        name: manager.name,
        phone: manager.phone,
        role: manager.role,
        isActive: manager.isActive
      }
    });
  } catch (error) {
    console.error('Update manager error:', error);
    res.status(500).json({ message: 'Failed to update manager' });
  }
});

// Delete manager (Admin only)
router.delete('/managers/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const manager = await User.findById(req.params.id);

    if (!manager || manager.role !== 'manager') {
      return res.status(404).json({ message: 'Manager not found' });
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({ message: 'Manager deleted successfully' });
  } catch (error) {
    console.error('Delete manager error:', error);
    res.status(500).json({ message: 'Failed to delete manager' });
  }
});

module.exports = router;

