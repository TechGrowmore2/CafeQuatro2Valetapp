const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const smsService      = require('../services/smsService');
const whatsappService  = require('../services/whatsappService');
const emailService    = require('../services/emailService');

// Store OTPs temporarily (in production, use Redis)
const otpStore = new Map();

// Generate OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Driver/Supervisor/Admin Login
router.post('/login',
  [
    body('phone').isMobilePhone().withMessage('Invalid phone number'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { phone, password, role } = req.body;

      console.log('Login attempt:', { phone, role });

      // Find user by phone first, optionally filter by role if provided
      const query = { phone, isActive: true };
      if (role) {
        query.role = role;
      }
      
      const user = await User.findOne(query);
      if (!user) {
        console.log('User not found:', { phone, role });
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      console.log('User found:', { name: user.name, phone: user.phone, role: user.role });

      const isMatch = await user.comparePassword(password);
      console.log('Password match:', isMatch);
      
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const token = jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        token,
        user: {
          id: user._id,
          name: user.name,
          phone: user.phone,
          role: user.role
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Customer - Request OTP
router.post('/customer/request-otp',
  [
    body('phone').isMobilePhone().withMessage('Invalid phone number')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { phone } = req.body;
      const otp = generateOTP();
      
      // Store OTP with 10 minute expiry
      otpStore.set(phone, {
        otp,
        expiry: Date.now() + 10 * 60 * 1000
      });

      // (Email OTP removed because customer login only uses phone number)

      // Send OTP via SMS (backup)
      await smsService.sendOTP(phone, otp);

      // Send OTP via WhatsApp
      try {
        await whatsappService.sendOTP(phone, otp);
        console.log('✓ OTP WhatsApp sent to:', phone);
      } catch (waErr) {
        console.error('✗ OTP WhatsApp failed:', waErr.message);
      }

      res.json({ message: 'OTP sent successfully', mock: !smsService.msg91Enabled });
    } catch (error) {
      console.error('OTP request error:', error);
      res.status(500).json({ message: 'Failed to send OTP' });
    }
  }
);

// Customer - Verify OTP and Login
router.post('/customer/verify-otp',
  [
    body('phone').isMobilePhone().withMessage('Invalid phone number'),
    body('otp').isLength({ min: 6, max: 6 }).withMessage('Invalid OTP'),
    body('name').optional().trim()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { phone, otp, name } = req.body;

      // Verify OTP
      const storedOTP = otpStore.get(phone);
      if (!storedOTP || storedOTP.expiry < Date.now()) {
        return res.status(401).json({ message: 'OTP expired or invalid' });
      }

      if (storedOTP.otp !== otp) {
        return res.status(401).json({ message: 'Invalid OTP' });
      }

      // Clear OTP
      otpStore.delete(phone);

      // Find or create customer
      let user = await User.findOne({ phone, role: 'customer' });
      if (!user) {
        user = new User({
          phone,
          name: name || 'Customer',
          role: 'customer'
        });
        await user.save();
      }

      const token = jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        token,
        user: {
          id: user._id,
          name: user.name,
          phone: user.phone,
          role: user.role
        }
      });
    } catch (error) {
      console.error('OTP verification error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Customer - Token-based Auto Login
router.get('/customer/access/:token', async (req, res) => {
  try {
    let { token: accessToken } = req.params;
    if (accessToken && accessToken.startsWith('{{1}}')) {
      accessToken = accessToken.replace('{{1}}', '');
    }
    console.log(`🔑 Access link requested with token: "${accessToken}"`);
    const Booking = require('../models/Booking');

    // Find booking by access token
    const booking = await Booking.findOne({ accessToken });
    
    if (!booking) {
      return res.status(404).json({ message: 'Invalid or expired link' });
    }

    // Check 8-hour expiry window from when the link was created
    const LINK_EXPIRY_MS = 8 * 60 * 60 * 1000; // 8 hours
    const tokenAge = Date.now() - new Date(booking.accessTokenCreatedAt || booking.createdAt).getTime();
    if (tokenAge > LINK_EXPIRY_MS) {
      return res.status(401).json({ message: 'This link has expired. Please log in via the customer login page.' });
    }

    // Find or create customer user
    let user = await User.findOne({ 
      phone: booking.customer.phone, 
      role: 'customer' 
    });

    if (!user) {
      user = new User({
        name: booking.customer.name,
        phone: booking.customer.phone,
        role: 'customer',
        isActive: true
      });
      await user.save();
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        role: user.role
      },
      bookingId: booking._id
    });
  } catch (error) {
    console.error('Token login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get current user
router.get('/me', require('../middleware/auth').auth, async (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      name: req.user.name,
      phone: req.user.phone,
      role: req.user.role
    }
  });
});

// Get driver info by phone (public — used by QR booking form)
// Returns driver name + venue parkingFee so form can pre-fill amount
router.get('/driver-info/:phone', async (req, res) => {
  try {
    const Venue = require('../models/Venue');
    const driver = await User.findOne({ phone: req.params.phone, role: 'driver', isActive: true })
      .populate('venue', 'name parkingFee requiresUpfrontPayment');

    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    let venueObj = driver.venue;
    if (!venueObj && driver.supervisor) {
      venueObj = await Venue.findOne({ supervisor: driver.supervisor });
    }
    if (!venueObj) {
      venueObj = await Venue.findOne({ isActive: true });
    }

    res.json({
      name: driver.name,
      parkingFee: venueObj?.parkingFee ?? 100,
      venueName: venueObj?.name || null,
      requiresUpfrontPayment: venueObj?.requiresUpfrontPayment ?? true
    });
  } catch (error) {
    console.error('Driver info error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
