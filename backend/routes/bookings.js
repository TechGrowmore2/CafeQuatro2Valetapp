const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Booking = require('../models/Booking');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');
const smsService = require('../services/smsService');
const whatsappService = require('../services/whatsappService');
const emailService = require('../services/emailService');
const { upload } = require('../config/imageUpload');
const { uploadMultipleFiles } = require('../config/googleDrive');
const { acquireOrderLock, releaseOrderLock } = require('../utils/orderLock');

console.log('📋 Booking routes module loaded with enhanced logging - v2.0');


// Generate OTP for verification
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Create Booking (Driver only)
router.post('/',
  auth,
  authorize('driver'),
  upload.array('carImages', 4), // Allow up to 4 images
  [
    body('customerPhone').isMobilePhone().withMessage('Invalid phone number'),
    body('vehicleType').optional().isIn(['car', 'bike', 'suv']).withMessage('Invalid vehicle type'),
    body('vehicleNumber').trim().isLength({ min: 4 }).withMessage('Vehicle number must be at least 4 characters'),
    body('parkingSpot').optional().trim(),
    body('venue').optional().trim(),
    body('paymentMethod').optional().isIn(['cash', 'upi', 'staff', 'foc']).withMessage('Invalid payment method'),
    body('paymentAmount').optional().isFloat({ min: 0 }).withMessage('Invalid payment amount')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        customerPhone,
        customerEmail,
        vehicleType,
        vehicleNumber,
        vehicleModel,
        vehicleColor,
        parkingSpot,
        venue,
        notes,
        hasValuables,
        valuables,
        paymentMethod,
        paymentAmount
      } = req.body;

      // Use customerName from form if provided, else try DB, else fall back to phone
      let customerName = req.body.customerName || '';
      if (!customerName) {
        try {
          const existingCustomer = await User.findOne({ phone: customerPhone, role: 'customer' });
          customerName = existingCustomer ? existingCustomer.name : customerPhone;
        } catch (err) {
          customerName = customerPhone;
          console.log('Customer not found in database, using phone as name');
        }
      }

      console.log('=== Creating New Booking ===');
      console.log('Customer:', { name: customerName, phone: customerPhone, email: customerEmail || 'No email' });
      console.log('Vehicle:', { type: vehicleType, number: vehicleNumber });

      // Parse valuables if it's a JSON string
      let valuablesList = [];
      if (valuables) {
        try {
          valuablesList = JSON.parse(valuables);
        } catch (e) {
          valuablesList = Array.isArray(valuables) ? valuables : [];
        }
      }

      // Fetch admin-set venue fee for driver's venue or supervisor's venue (default 100)
      let venueFee = 100;
      try {
        const Venue = require('../models/Venue');
        let venueObj = null;
        if (req.user.venue) {
          venueObj = await Venue.findById(req.user.venue);
        }
        if (!venueObj && req.user.supervisor) {
          venueObj = await Venue.findOne({ supervisor: req.user.supervisor });
        }
        if (!venueObj) {
          venueObj = await Venue.findOne({ isActive: true });
        }
        if (venueObj && typeof venueObj.parkingFee === 'number') {
          venueFee = venueObj.parkingFee;
        }
      } catch (err) {
        console.error('Error fetching driver venue parking fee:', err);
      }

      const calculatedAmount = paymentAmount ? parseFloat(paymentAmount) : venueFee;

      const booking = new Booking({
        driver: req.user._id,
        customer: {
          phone: customerPhone,
          name: customerName,
          email: customerEmail || null
        },
        vehicle: {
          type: vehicleType || 'car',
          number: vehicleNumber.toUpperCase(),
          images: [],
          hasValuables: hasValuables === 'true' || hasValuables === true,
          valuables: valuablesList
        },
        location: {
          parkingSpot,
          venue
        },
        notes,
        payment: {
          method: paymentMethod || 'cash',
          amount: calculatedAmount,
          status: paymentMethod && paymentMethod !== 'foc' ? 'completed' : (paymentMethod === 'foc' ? 'completed' : 'completed'),
          paidAt: new Date()
        },
        paymentStatus: 'paid',
        status: 'parked'
      });

      // Upload images to Cloudinary (scoped to bookingId folder)
      if (req.files && req.files.length > 0) {
        console.log(`Uploading ${req.files.length} images to Cloudinary (${booking.bookingId})...`);
        booking.vehicle.images = await uploadMultipleFiles(req.files, booking.bookingId);
        console.log('Images uploaded successfully:', booking.vehicle.images);
      }

      await booking.save();
      await booking.populate('driver', 'name phone');

      console.log('Booking created successfully:', {
        id: booking._id,
        bookingId: booking.bookingId,
        driver: booking.driver._id,
        customer: booking.customer.phone,
        status: booking.status
      });

      // Generate direct access link with token
      const accessLink = `${process.env.FRONTEND_URL || 'https://cafequattro2valetapp.onrender.com'}/customer/access/${booking.accessToken}`;
      console.log('📱 Access link generated:', accessLink);
      console.log('🔑 Access Token:', booking.accessToken);

      // Send Email to customer (if email provided)
      if (customerEmail) {
        console.log(`\n📧 SENDING BOOKING CONFIRMATION EMAIL`);
        console.log('To:', customerEmail);
        console.log('Customer Name:', customerName);
        console.log('Booking ID:', booking.bookingId);
        console.log('Vehicle Number:', vehicleNumber);
        console.log('Venue:', venue || 'Not specified');
        console.log('Access Link:', accessLink);
        console.log('---');
        try {
          await emailService.sendBookingConfirmation(
            customerEmail,
            customerName,
            booking.bookingId,
            accessLink,
            vehicleNumber,
            venue
          );
          console.log('✓ Booking confirmation email sent successfully to:', customerEmail);
        } catch (emailError) {
          console.error('✗ Failed to send email to:', customerEmail, emailError.message);
        }
      } else {
        console.log('No email provided - skipping email notification');
      }

      // Send SMS + WhatsApp confirmation (idempotent — only if not already sent)
      const claimedForNotif = await Booking.findOneAndUpdate(
        { _id: booking._id, 'notificationsSent.bookingConfirmation': false },
        { $set: { 'notificationsSent.bookingConfirmation': true } },
        { new: false }
      );
      if (claimedForNotif) {
        console.log(`\n📱 SENDING BOOKING CONFIRMATION SMS`);
        console.log('To:', customerPhone);
        console.log('Booking ID:', booking.bookingId);
        console.log('Access Link:', accessLink);
        console.log('---');
        try {
          await smsService.sendBookingConfirmation(customerPhone, booking.bookingId, accessLink);
          console.log('✓ Booking confirmation SMS sent to:', customerPhone);
        } catch (smsError) {
          console.error('✗ SMS failed:', customerPhone, smsError.message);
        }
        try {
          await whatsappService.sendBookingConfirmation(customerPhone, customerName, booking.bookingId, booking.accessToken);
          console.log('✓ Booking confirmation WhatsApp sent to:', customerPhone);
        } catch (waError) {
          console.error('✗ WhatsApp failed:', customerPhone, waError.message);
        }
      } else {
        console.log('⚠ Booking confirmation notification already sent — skipping duplicate.');
      }

      // Emit to supervisor dashboard
      const io = req.app.get('io');
      io.to('supervisors').emit('new-booking', {
        booking: booking.toObject()
      });
      console.log('New booking event emitted to supervisors');

      console.log('=== Booking Creation Complete ===\n');

      res.status(201).json({
        message: 'Booking created successfully',
        booking,
        accessLink
      });
    } catch (error) {
      console.error('Create booking error:', error);
      res.status(500).json({ message: 'Failed to create booking' });
    }
  }
);

// Get Driver's Bookings
router.get('/my-bookings', auth, authorize('driver'), async (req, res) => {
  try {
    const { status, from, to } = req.query;
    const query = { driver: req.user._id };

    console.log('Fetching bookings for driver:', req.user._id);

    if (status) {
      query.status = status;
    } else {
      // By default, exclude completed bookings
      query.status = { $nin: ['completed', 'cancelled'] };
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

    const bookings = await Booking.find(query)
      .sort({ createdAt: -1 })
      .populate('driver', 'name phone');

    console.log(`Found ${bookings.length} bookings for driver (status: ${status || 'active'}, range: ${from || ''} to ${to || ''})`);
    res.json({ bookings });
  } catch (error) {
    console.error('Get bookings error:', error);
    console.error('Error details:', error.message);
    res.status(500).json({ message: 'Failed to fetch bookings', error: error.message });
  }
});

// Get All Bookings (Supervisor only - shows only their assigned drivers' bookings)
router.get('/all', auth, authorize('supervisor'), async (req, res) => {
  try {
    const { status, from, to } = req.query;

    // Find all drivers assigned to this supervisor
    const assignedDrivers = await User.find({
      role: 'driver',
      supervisor: req.user._id
    }).select('_id');

    const driverIds = assignedDrivers.map(d => d._id);

    const query = {
      driver: { $in: driverIds }
    };

    if (status) {
      if (status.includes(',')) {
        query.status = { $in: status.split(',') };
      } else {
        query.status = status;
      }
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

    const bookings = await Booking.find(query)
      .sort({ createdAt: -1 })
      .populate('driver', 'name phone');

    res.json({ bookings });
  } catch (error) {
    console.error('Get all bookings error:', error);
    res.status(500).json({ message: 'Failed to fetch bookings' });
  }
});

// Get Customer's Bookings
router.get('/customer-bookings', auth, authorize('customer'), async (req, res) => {
  try {
    const bookings = await Booking.find({ 'customer.phone': req.user.phone })
      .sort({ createdAt: -1 })
      .populate('driver', 'name phone');

    res.json({ bookings });
  } catch (error) {
    console.error('Get customer bookings error:', error);
    res.status(500).json({ message: 'Failed to fetch bookings' });
  }
});

// Get Single Booking (Public with booking ID)
router.get('/:id', async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('driver', 'name phone');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    res.json({ booking });
  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({ message: 'Failed to fetch booking' });
  }
});

// Update Booking (Driver only — vehicle security, customer info, notes, images)
router.put('/:id', auth, authorize('driver'), upload.array('carImages', 4), async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.driver.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this booking' });
    }

    const {
      customerName, vehicleNumber,
      notes, hasValuables, valuables,
      payment, paymentStatus, driverName,
      complementary
    } = req.body;

    // Customer info
    if (customerName) booking.customer.name = customerName;

    // Vehicle info
    if (vehicleNumber) booking.vehicle.number = vehicleNumber.toUpperCase();

    // Vehicle security
    if (hasValuables !== undefined) {
      booking.vehicle.hasValuables = hasValuables === 'true' || hasValuables === true;
    }
    if (valuables) {
      try {
        booking.vehicle.valuables = JSON.parse(valuables);
      } catch (e) {
        booking.vehicle.valuables = Array.isArray(valuables) ? valuables : [];
      }
    }
    if (driverName !== undefined) {
      booking.vehicle.driverName = driverName;
    }

    // New images (append to existing, scoped to bookingId folder)
    if (req.files && req.files.length > 0) {
      const { uploadMultipleFiles } = require('../config/googleDrive');
      const newUrls = await uploadMultipleFiles(req.files, booking.bookingId);
      booking.vehicle.images = [...(booking.vehicle.images || []), ...newUrls];
    }

    // Notes
    if (notes !== undefined) booking.notes = notes;

    // Mark as Complementary (FOC — Free of Charge) — only valid for cash bookings
    if (complementary === 'true' || complementary === true) {
      booking.payment = {
        ...booking.payment,
        method: 'foc',
        status: 'completed',
        paidAt: new Date()
      };
      booking.paymentStatus = 'paid';
      console.log(`Booking ${booking.bookingId} marked as complementary (FOC) by driver ${req.user.name}`);
    } else {
      // Payment
      if (payment) booking.payment = { ...booking.payment, ...payment };
      if (paymentStatus) booking.paymentStatus = paymentStatus;
    }

    await booking.save();
    await booking.populate('driver', 'name phone');
    console.log('Booking updated by driver:', booking.bookingId);
    res.json({ message: 'Booking updated successfully', booking });
  } catch (error) {
    console.error('Update booking error:', error);
    res.status(500).json({ message: 'Failed to update booking', error: error.message });
  }
}
);

// ===== PUBLIC: Customer Self-Booking via Driver QR =====
// POST /bookings/public  — no auth required, driver identified by phone
router.post('/public',
  upload.array('carImages', 4),
  [
    body('driverPhone').notEmpty().withMessage('Driver phone is required'),
    body('customerPhone').isMobilePhone().withMessage('Invalid customer phone'),
    body('customerName').optional().trim(),
    body('vehicleNumber').trim().isLength({ min: 4 }).withMessage('Vehicle number must be at least 4 characters'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        driverPhone, customerPhone, customerName, customerEmail,
        vehicleNumber, notes, hasValuables, valuables,
        razorpayOrderId, razorpayPaymentId, razorpaySignature, paymentAmount,
        paymentMethod
      } = req.body;

      const isRazorpay = !paymentMethod || paymentMethod === 'razorpay';

      // ===== Razorpay Payment Verification (if selected) =====
      if (isRazorpay) {
        if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
          return res.status(402).json({ message: 'Payment is required before creating a booking.' });
        }

        const crypto = require('crypto');
        const secret = process.env.RAZORPAY_KEY_SECRET || 'YOUR_KEY_SECRET_HERE';
        const expectedSig = crypto
          .createHmac('sha256', secret)
          .update(`${razorpayOrderId}|${razorpayPaymentId}`)
          .digest('hex');

        if (expectedSig !== razorpaySignature) {
          console.error('Public booking: Razorpay signature mismatch');
          return res.status(400).json({ message: 'Payment verification failed. Please retry payment.' });
        }

        console.log('✓ Razorpay payment verified for public booking. PaymentId:', razorpayPaymentId);

        // ===== DEDUPLICATION CHECK =====
        // ===== IN-MEMORY LOCK: Prevent race condition between webhook and redirect =====
        if (!acquireOrderLock(razorpayOrderId)) {
          console.log(`⏳ Public API: Order ${razorpayOrderId} is being processed by another request - waiting 2.5s...`);
          await new Promise(resolve => setTimeout(resolve, 2500));
          const racedBooking = await Booking.findOne({
            $or: [
              { 'payment.razorpay.orderId': razorpayOrderId },
              { 'payment.razorpay.paymentId': razorpayPaymentId }
            ]
          }).populate('driver', 'name phone');
          if (racedBooking) {
            console.log(`✓ Public API: Found booking created by concurrent request for order ${razorpayOrderId} (${racedBooking.bookingId})`);
            const accessLink = `${process.env.FRONTEND_URL || 'https://cafequattro2valetapp.onrender.com'}/customer/access/${racedBooking.accessToken}`;
            return res.status(200).json({ message: 'Booking already exists', booking: racedBooking, accessLink });
          }
          // Lock holder may have failed - proceed to create
          acquireOrderLock(razorpayOrderId);
        }

        const queryConds = [];
        if (razorpayOrderId) queryConds.push({ 'payment.razorpay.orderId': razorpayOrderId });
        if (razorpayPaymentId) queryConds.push({ 'payment.razorpay.paymentId': razorpayPaymentId });

        if (queryConds.length > 0) {
          const existingBooking = await Booking.findOne({ $or: queryConds })
            .populate('driver', 'name phone');

          if (existingBooking) {
            releaseOrderLock(razorpayOrderId);
            console.log(`✓ Public API Deduplication: Booking already exists for order ${razorpayOrderId} (${existingBooking.bookingId})`);
            const accessLink = `${process.env.FRONTEND_URL || 'https://cafequattro2valetapp.onrender.com'}/customer/access/${existingBooking.accessToken}`;
            return res.status(200).json({
              message: 'Booking already exists',
              booking: existingBooking,
              accessLink
            });
          }
        }
      }

      // ===== VEHICLE NUMBER 15-MIN DEDUPLICATION (all payment methods) =====
      const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
      const vehicleNumberUpper = (vehicleNumber || '').trim().toUpperCase();
      const recentVehicleBooking = await Booking.findOne({
        'vehicle.number': vehicleNumberUpper,
        status: { $ne: 'cancelled' },
        createdAt: { $gte: fifteenMinsAgo }
      }).populate('driver', 'name phone');

      if (recentVehicleBooking) {
        console.log(`⚠ Vehicle dedup: Booking already exists for vehicle ${vehicleNumberUpper} within last 15 min (${recentVehicleBooking.bookingId})`);
        const accessLink = `${process.env.FRONTEND_URL || 'https://cafequattro2valetapp.onrender.com'}/customer/access/${recentVehicleBooking.accessToken}`;
        return res.status(200).json({
          message: 'Booking already exists for this vehicle',
          booking: recentVehicleBooking,
          accessLink
        });
      }

      // Find driver by phone
      const driver = await User.findOne({ phone: driverPhone, role: 'driver' });
      if (!driver) {
        return res.status(404).json({ message: 'Driver not found for this QR code' });
      }

      // Parse valuables
      let valuablesList = [];
      if (valuables) {
        try { valuablesList = JSON.parse(valuables); } catch (e) { valuablesList = []; }
      }

      // Fetch admin-set venue fee for driver's venue (default 100)
      let venueFee = 100;
      try {
        const Venue = require('../models/Venue');
        let venueObj = null;
        if (driver.venue) {
          venueObj = await Venue.findById(driver.venue);
        }
        if (!venueObj && driver.supervisor) {
          venueObj = await Venue.findOne({ supervisor: driver.supervisor });
        }
        if (!venueObj) {
          venueObj = await Venue.findOne({ isActive: true });
        }
        if (venueObj && typeof venueObj.parkingFee === 'number') {
          venueFee = venueObj.parkingFee;
        }
      } catch (err) {
        console.error('Error fetching venue parking fee for public booking:', err);
      }

      const parsedAmount = paymentAmount ? parseFloat(paymentAmount) : venueFee;

      const paymentObj = isRazorpay ? {
        method: 'razorpay',
        amount: parsedAmount,
        status: 'completed',
        paidAt: new Date(),
        razorpay: {
          orderId: razorpayOrderId,
          paymentId: razorpayPaymentId,
          signature: razorpaySignature
        }
      } : {
        method: 'cash',
        amount: parsedAmount,
        status: 'pending'
      };

      const booking = new Booking({
        driver: driver._id,
        customer: {
          phone: customerPhone,
          name: customerName || customerPhone,
          email: customerEmail || null
        },
        vehicle: {
          type: 'car',
          number: vehicleNumber.toUpperCase(),
          images: [],
          hasValuables: hasValuables === 'true' || hasValuables === true,
          valuables: valuablesList
        },
        location: { venue: '', parkingSpot: '' },
        notes: notes || '',
        payment: paymentObj,
        paymentStatus: isRazorpay ? 'paid' : 'unpaid',
        status: 'parked'
      });

      // Upload images if provided (scoped to bookingId folder)
      if (req.files && req.files.length > 0) {
        const { uploadMultipleFiles } = require('../config/googleDrive');
        booking.vehicle.images = await uploadMultipleFiles(req.files, booking.bookingId);
      }

      try {
        await booking.save();
        if (isRazorpay) releaseOrderLock(razorpayOrderId);
        await booking.populate('driver', 'name phone');
      } catch (saveError) {
        if (isRazorpay) releaseOrderLock(razorpayOrderId);
        if (saveError.code === 11000 && (
          saveError.message.includes('orderId') ||
          saveError.message.includes('paymentId') ||
          (saveError.keyValue && (saveError.keyValue['payment.razorpay.orderId'] || saveError.keyValue['payment.razorpay.paymentId']))
        )) {
          console.log(`✓ Public API Race Condition Handled: Booking was inserted by webhook/another process for order ${razorpayOrderId}`);
          const existingBooking = await Booking.findOne({
            $or: [
              { 'payment.razorpay.orderId': razorpayOrderId },
              { 'payment.razorpay.paymentId': razorpayPaymentId }
            ]
          }).populate('driver', 'name phone');

          if (existingBooking) {
            const accessLink = `${process.env.FRONTEND_URL || 'https://cafequattro2valetapp.onrender.com'}/customer/access/${existingBooking.accessToken}`;
            return res.status(200).json({
              message: 'Booking already exists',
              booking: existingBooking,
              accessLink
            });
          }
        }
        throw saveError;
      }

      // Generate access link for customer to track
      const accessLink = `${process.env.FRONTEND_URL || 'https://cafequattro2valetapp.onrender.com'}/customer/access/${booking.accessToken}`;

      // Send SMS + WhatsApp confirmation (idempotent — only if not already sent)
      const claimedForNotif = await Booking.findOneAndUpdate(
        { _id: booking._id, 'notificationsSent.bookingConfirmation': false },
        { $set: { 'notificationsSent.bookingConfirmation': true } },
        { new: false }
      );
      if (claimedForNotif) {
        try {
          await smsService.sendBookingConfirmation(customerPhone, booking.bookingId, accessLink);
        } catch (e) { console.error('SMS failed:', e.message); }
        try {
          await whatsappService.sendBookingConfirmation(customerPhone, customerName, booking.bookingId, booking.accessToken);
          console.log('✓ WhatsApp booking confirmation sent to:', customerPhone);
        } catch (e) { console.error('WhatsApp failed:', e.message); }

        // Send Email if provided
        if (customerEmail) {
          try {
            await emailService.sendBookingConfirmation(customerEmail, customerName, booking.bookingId, accessLink, vehicleNumber, '');
          } catch (e) { console.error('Email failed:', e.message); }
        }
      } else {
        console.log('⚠ Booking confirmation notification already sent — skipping duplicate.');
      }

      // Notify driver via socket
      const io = req.app.get('io');
      if (io) {
        io.to(`driver-${driver._id}`).emit('new-customer-booking', {
          bookingId: booking.bookingId,
          booking: booking.toObject()
        });
      }

      console.log('Public booking created for driver:', driver.phone, 'Booking:', booking.bookingId, '| Razorpay:', razorpayPaymentId);
      res.status(201).json({ message: 'Booking created successfully', booking, accessLink });
    } catch (error) {
      console.error('Public booking error:', error);
      res.status(500).json({ message: 'Failed to create booking' });
    }
  }
);

// Customer Recall Car
router.post('/:id/recall', auth, authorize('customer'), async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.customer.phone !== req.user.phone) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    if (booking.status !== 'parked') {
      return res.status(400).json({ message: 'Booking cannot be recalled' });
    }

    booking.status = 'recall-requested';
    booking.recall.requestedAt = new Date();
    await booking.save();

    console.log('Customer recall requested:', { bookingId: booking.bookingId, customer: booking.customer.phone });

    // Notify driver via socket
    const io = req.app.get('io');
    io.to(`driver-${booking.driver}`).emit('recall-request', {
      bookingId: booking.bookingId,
      booking: booking.toObject()
    });
    console.log('Recall notification sent to driver via socket');

    res.json({
      message: 'Recall request sent to driver',
      booking
    });
  } catch (error) {
    console.error('Recall error:', error);
    res.status(500).json({ message: 'Failed to recall car' });
  }
});

// Driver: Initiate Recall
router.post('/:id/driver-recall', auth, authorize('driver'), async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.driver.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    if (booking.status !== 'parked') {
      return res.status(400).json({ message: 'Booking cannot be recalled' });
    }

    booking.status = 'recall-requested';
    booking.recall.requestedAt = new Date();
    await booking.save();

    console.log('Driver initiated recall:', { bookingId: booking.bookingId, driver: req.user._id });

    res.json({
      message: 'Recall initiated. Set arrival time.',
      booking
    });
  } catch (error) {
    console.error('Driver recall error:', error);
    res.status(500).json({ message: 'Failed to recall car' });
  }
});

// Driver: Set Estimated Arrival Time
router.post('/:id/estimate-arrival', auth, authorize('driver'), async (req, res) => {
  try {
    const { estimatedMinutes } = req.body;

    if (!estimatedMinutes || estimatedMinutes < 1) {
      return res.status(400).json({ message: 'Invalid estimated time' });
    }

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.driver.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    booking.status = 'in-transit';
    booking.recall.estimatedArrival = parseInt(estimatedMinutes);
    await booking.save();

    console.log('=== Setting Estimated Arrival Time ===');
    console.log('Booking ID:', booking.bookingId);
    console.log('Estimated arrival:', estimatedMinutes, 'minutes');
    console.log('Customer:', booking.customer.phone);

    // Notify customer via socket
    const io = req.app.get('io');
    io.to(`customer-${booking.customer.phone}`).emit('car-in-transit', {
      bookingId: booking.bookingId,
      estimatedMinutes
    });
    console.log('In-transit notification sent to customer via socket');

    // Send SMS + WhatsApp recall notifications (idempotent — only if not already sent)
    const claimedRecall = await Booking.findOneAndUpdate(
      { _id: booking._id, 'notificationsSent.recallNotification': false },
      { $set: { 'notificationsSent.recallNotification': true } },
      { new: false }
    );
    if (claimedRecall) {
      // Send Email notification (if email available)
      if (booking.customer.email) {
        console.log(`\n📧 SENDING RECALL NOTIFICATION EMAIL`);
        try {
          await emailService.sendRecallNotification(
            booking.customer.email,
            booking.customer.name,
            booking.bookingId,
            estimatedMinutes
          );
          console.log('✓ Recall notification email sent successfully to:', booking.customer.email);
        } catch (emailError) {
          console.error('✗ Failed to send recall email to:', booking.customer.email, emailError.message);
        }
      }

      console.log(`\n📱 SENDING RECALL NOTIFICATION SMS`);
      try {
        await smsService.sendRecallNotification(
          booking.customer.phone, booking.bookingId, estimatedMinutes
        );
        console.log('✓ Recall SMS sent to:', booking.customer.phone);
      } catch (smsError) {
        console.error('✗ Recall SMS failed:', smsError.message);
      }
      try {
        await whatsappService.sendRecallNotification(
          booking.customer.phone, booking.bookingId, estimatedMinutes
        );
        console.log('✓ Recall WhatsApp sent to:', booking.customer.phone);
      } catch (waError) {
        console.error('✗ Recall WhatsApp failed:', waError.message);
      }
    } else {
      console.log('⚠ Recall notification already sent — skipping duplicate.');
    }

    console.log('=== Arrival Time Set Complete ===\n');

    res.json({
      message: 'Estimated arrival time set',
      booking
    });
  } catch (error) {
    console.error('Set arrival error:', error);
    res.status(500).json({ message: 'Failed to set arrival time' });
  }
});

// Driver: Mark as Arrived
router.post('/:id/arrived', auth, authorize('driver'), async (req, res) => {
  try {
    console.log('=== Driver Marking as Arrived ===');
    console.log('Booking ID:', req.params.id);
    console.log('Driver:', { id: req.user._id, role: req.user.role });

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      console.log('✗ Booking not found:', req.params.id);
      return res.status(404).json({ message: 'Booking not found' });
    }

    console.log('Booking found:', {
      bookingId: booking.bookingId,
      bookingDriver: booking.driver.toString(),
      requestUser: req.user._id.toString()
    });

    if (booking.driver.toString() !== req.user._id.toString()) {
      console.log('✗ Unauthorized: Driver mismatch');
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // Generate OTP for verification
    const otp = generateOTP();
    console.log('🔐 OTP GENERATED');
    console.log('OTP:', otp);
    console.log('OTP Expiry: 10 minutes from now');

    booking.status = 'arrived';
    booking.recall.arrivedAt = new Date();
    booking.verification.otp = otp;
    booking.verification.otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await booking.save();

    console.log('Booking status updated to arrived');
    console.log('OTP expiry set to:', booking.verification.otpExpiry);

    // Notify customer via socket
    const io = req.app.get('io');
    io.to(`customer-${booking.customer.phone}`).emit('car-arrived', {
      bookingId: booking.bookingId,
      otp
    });
    console.log('Arrival notification sent to customer via socket');

    // Send arrival notifications (idempotent — only if not already sent)
    const claimedArrival = await Booking.findOneAndUpdate(
      { _id: booking._id, 'notificationsSent.arrivalNotification': false },
      { $set: { 'notificationsSent.arrivalNotification': true } },
      { new: false }
    );
    if (claimedArrival) {
      // Send Email with OTP (if email available)
      if (booking.customer.email) {
        console.log(`\n📧 SENDING ARRIVAL NOTIFICATION EMAIL WITH OTP`);
        try {
          await emailService.sendArrivalNotification(
            booking.customer.email,
            booking.customer.name,
            booking.bookingId,
            otp
          );
          console.log('✓ Arrival notification email with OTP sent successfully to:', booking.customer.email);
        } catch (emailError) {
          console.error('✗ Failed to send arrival email to:', booking.customer.email, emailError.message);
        }
      }

      console.log(`\n📱 SENDING ARRIVAL NOTIFICATION SMS WITH OTP`);
      try {
        await smsService.sendArrivalNotification(
          booking.customer.phone, booking.bookingId, otp
        );
        console.log('✓ Arrival SMS sent to:', booking.customer.phone);
      } catch (smsError) {
        console.error('✗ Arrival SMS failed:', smsError.message);
      }
      try {
        await whatsappService.sendArrivalNotification(
          booking.customer.phone, booking.bookingId, otp
        );
        console.log('✓ Arrival WhatsApp sent to:', booking.customer.phone);
      } catch (waError) {
        console.error('✗ Arrival WhatsApp failed:', waError.message);
      }
    } else {
      console.log('⚠ Arrival notification already sent — skipping duplicate.');
    }

    console.log('=== Driver Arrival Complete ===\n');

    res.json({
      message: 'Arrival confirmed. OTP sent to customer.',
      otp, // In production, don't send OTP in response
      booking
    });
  } catch (error) {
    console.error('Mark arrived error:', error);
    res.status(500).json({ message: 'Failed to mark as arrived' });
  }
});

// Driver: Verify OTP and Complete (OTP OR customer phone number as fallback)
router.post('/:id/verify-complete', auth, authorize('driver'),
  async (req, res) => {
    try {
      const { otp, customerPhone } = req.body;

      // Must provide either OTP or customer phone
      if (!otp && !customerPhone) {
        return res.status(400).json({ message: 'Please provide OTP or customer phone number' });
      }

      console.log('=== Verifying and Completing Booking ===');
      console.log('Booking ID:', req.params.id);
      console.log('Method:', otp ? 'OTP' : 'Customer Phone');

      const booking = await Booking.findById(req.params.id);

      if (!booking) {
        console.log('✗ Booking not found:', req.params.id);
        return res.status(404).json({ message: 'Booking not found' });
      }

      if (booking.driver.toString() !== req.user._id.toString()) {
        console.log('✗ Unauthorized: Driver mismatch');
        return res.status(403).json({ message: 'Unauthorized' });
      }

      // ── Method 1: OTP verification ──
      if (otp) {
        if (otp.length !== 6) {
          return res.status(400).json({ message: 'OTP must be 6 digits' });
        }
        console.log('Verifying OTP...');
        if (booking.verification.otp !== otp) {
          console.log('✗ Invalid OTP provided');
          return res.status(401).json({ message: 'Invalid OTP' });
        }
        if (new Date() > booking.verification.otpExpiry) {
          console.log('✗ OTP has expired');
          return res.status(401).json({ message: 'OTP expired. Use customer phone number to complete instead.' });
        }
        console.log('✓ OTP verified successfully');
      }

      // ── Method 2: Customer phone verification ──
      if (customerPhone && !otp) {
        const clean = customerPhone.replace(/\D/g, '').slice(-10);
        const bookingPhone = booking.customer.phone.replace(/\D/g, '').slice(-10);
        console.log('Verifying customer phone:', clean, 'vs', bookingPhone);
        if (clean !== bookingPhone) {
          console.log('✗ Phone number mismatch');
          return res.status(401).json({ message: 'Phone number does not match customer record' });
        }
        console.log('✓ Customer phone verified successfully');
      }

      // Complete booking
      booking.status = 'completed';
      booking.verification.verified = true;
      booking.parking.actualEndTime = new Date();
      await booking.save();

      console.log('✓ Booking completed:', {
        bookingId: booking.bookingId,
        completedAt: booking.parking.actualEndTime
      });

      // Notify customer via socket
      const io = req.app.get('io');
      io.to(`customer-${booking.customer.phone}`).emit('booking-completed', {
        bookingId: booking.bookingId
      });
      console.log('Completion notification sent to customer via socket');

      // Send thank you WhatsApp message (idempotent — only if not already sent)
      const claimedThankYou = await Booking.findOneAndUpdate(
        { _id: booking._id, 'notificationsSent.thankYou': false },
        { $set: { 'notificationsSent.thankYou': true } },
        { new: false }
      );
      if (claimedThankYou) {
        try {
          await whatsappService.sendThankYou(
            booking.customer.phone,
            booking.customer.name,
            booking.bookingId
          );
          console.log('✓ Thank you WhatsApp sent to:', booking.customer.phone);
        } catch (waErr) {
          console.error('✗ Thank you WhatsApp failed:', waErr.message);
        }
      } else {
        console.log('⚠ Thank you notification already sent — skipping duplicate.');
      }

      console.log('=== Booking Completion Process Finished ===\n');

      res.json({
        message: 'Booking completed successfully',
        booking
      });
    } catch (error) {
      console.error('Complete booking error:', error);
      res.status(500).json({ message: 'Failed to complete booking' });
    }
  }
);

// Get Booking Statistics (Supervisor)
router.get('/stats/overview', auth, authorize('supervisor'), async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find all drivers assigned to this supervisor
    const assignedDrivers = await User.find({
      role: 'driver',
      supervisor: req.user._id
    }).select('_id');

    const driverIds = assignedDrivers.map(d => d._id);

    const stats = await Booking.aggregate([
      {
        $match: {
          driver: { $in: driverIds }
        }
      },
      {
        $facet: {
          today: [
            { $match: { createdAt: { $gte: today } } },
            { $count: 'count' }
          ],
          active: [
            { $match: { status: { $nin: ['completed', 'cancelled'] } } },
            { $count: 'count' }
          ],
          completed: [
            { $match: { status: 'completed' } },
            { $count: 'count' }
          ],
          revenue: [
            { $match: { status: 'completed', 'payment.amount': { $exists: true }, 'payment.method': { $nin: ['foc', 'staff'] } } },
            { $group: { _id: null, total: { $sum: '$payment.amount' } } }
          ]
        }
      }
    ]);

    res.json({
      todayBookings: stats[0].today[0]?.count || 0,
      activeBookings: stats[0].active[0]?.count || 0,
      completedBookings: stats[0].completed[0]?.count || 0,
      totalRevenue: stats[0].revenue[0]?.total || 0
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Failed to fetch statistics' });
  }
});

// Get Daywise Revenue (Supervisor)
router.get('/stats/daywise-revenue', auth, authorize('supervisor'), async (req, res) => {
  try {
    const { date } = req.query;
    const startDate = date ? new Date(date) : new Date();
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);

    // Find all drivers assigned to this supervisor
    const assignedDrivers = await User.find({
      role: 'driver',
      supervisor: req.user._id
    }).select('_id');

    const driverIds = assignedDrivers.map(d => d._id);

    const revenue = await Booking.aggregate([
      {
        $match: {
          driver: { $in: driverIds },
          createdAt: { $gte: startDate, $lt: endDate },
          status: 'completed',
          'payment.amount': { $exists: true, $gt: 0 }
        }
      },
      {
        $group: {
          _id: '$payment.method',
          total: { $sum: '$payment.amount' }
        }
      }
    ]);

    const result = {
      cash: 0,
      upi: 0,
      razorpay: 0,
      staff: 0,
      foc: 0,
      total: 0
    };

    // Only add real payment methods to the total; foc/staff are excluded from revenue
    const revenueMethodsForTotal = ['cash', 'qr', 'upi', 'card', 'razorpay'];

    revenue.forEach(item => {
      const method = item._id || 'cash';
      if (result.hasOwnProperty(method)) {
        result[method] = item.total;
      }
      if (revenueMethodsForTotal.includes(method)) {
        result.total += item.total;
      }
    });

    res.json(result);
  } catch (error) {
    console.error('Get daywise revenue error:', error);
    res.status(500).json({ message: 'Failed to fetch daywise revenue' });
  }
});

module.exports = router;
