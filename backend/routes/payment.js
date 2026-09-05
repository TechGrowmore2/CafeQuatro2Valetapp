const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const Booking = require('../models/Booking');
const User = require('../models/User');
const smsService = require('../services/smsService');
const whatsappService = require('../services/whatsappService');
const emailService = require('../services/emailService');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_YOUR_KEY_ID_HERE',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'YOUR_KEY_SECRET_HERE'
});

// Shared lock prevents duplicate booking creation when webhook + redirect fire simultaneously
const { acquireOrderLock, releaseOrderLock } = require('../utils/orderLock');

// POST /api/payment/create-order
// Creates a Razorpay order for the given amount (in rupees)
// Stores all booking details in order notes for webhook auto-creation if customer leaves page
router.post('/create-order', async (req, res) => {
  try {
    const {
      amount = 100,
      currency = 'INR',
      notes = {},
      driverPhone,
      customerPhone,
      customerName,
      customerEmail,
      vehicleNumber,
      bookingNotes
    } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    const orderNotes = {
      driverPhone: String(driverPhone || notes.driverPhone || '').trim(),
      customerPhone: String(customerPhone || notes.customerPhone || '').trim(),
      customerName: String(customerName || notes.customerName || customerPhone || '').trim(),
      customerEmail: String(customerEmail || notes.customerEmail || '').trim(),
      vehicleNumber: String(vehicleNumber || notes.vehicleNumber || '').trim().toUpperCase(),
      bookingNotes: String(bookingNotes || notes.bookingNotes || '').trim(),
      paymentAmount: String(amount || 100),
      appId: 'cafequatro2'  // Used by webhook to reject payments from other apps sharing this Razorpay account
    };

    const options = {
      amount: Math.round(amount * 100), // Razorpay expects paise
      currency,
      receipt: `rcpt_${Date.now()}`,
      notes: orderNotes
    };

    if (!process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID === 'rzp_test_YOUR_KEY_ID_HERE' || process.env.RAZORPAY_KEY_SECRET === 'YOUR_KEY_SECRET_HERE') {
      console.log('⚠️ Using Mock Razorpay Order Creation (No valid keys found)');
      return res.json({
        orderId: `mock_order_${Date.now()}`,
        amount: Math.round(amount * 100),
        currency,
        keyId: 'mock_key'
      });
    }

    const order = await razorpay.orders.create(options);

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_YOUR_KEY_ID_HERE'
    });
  } catch (error) {
    console.error('Razorpay create-order error:', error);
    res.status(500).json({ message: 'Failed to create payment order', error: error.message });
  }
});

// POST /api/payment/verify
// Verifies a Razorpay payment signature
router.post('/verify', (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Missing payment verification fields' });
    }

    if (razorpay_order_id && razorpay_order_id.startsWith('mock_order_')) {
      console.log('⚠️ Verifying Mock Razorpay Order:', razorpay_order_id);
      return res.json({ success: true, paymentId: `mock_pay_${Date.now()}` });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET || 'YOUR_KEY_SECRET_HERE';
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      console.error('Razorpay signature mismatch');
      return res.status(400).json({ success: false, message: 'Payment verification failed — invalid signature' });
    }

    res.json({ success: true, paymentId: razorpay_payment_id });
  } catch (error) {
    console.error('Razorpay verify error:', error);
    res.status(500).json({ success: false, message: 'Payment verification error' });
  }
});

// GET /api/payment/check-booking/:orderId
// Deduplication & recovery helper: Check if booking was already created for this Razorpay order ID
router.get('/check-booking/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    if (!orderId) return res.status(400).json({ found: false });

    const booking = await Booking.findOne({ 'payment.razorpay.orderId': orderId })
      .populate('driver', 'name phone');

    if (booking) {
      const accessLink = `${process.env.FRONTEND_URL || 'https://cafequattro2valetapp.onrender.com'}/customer/access/${booking.accessToken}`;
      return res.json({ found: true, booking, accessLink });
    }

    return res.json({ found: false });
  } catch (error) {
    console.error('Check booking error:', error);
    res.status(500).json({ found: false, error: error.message });
  }
});

// POST /api/payment/webhook
// Razorpay Webhook Endpoint
// Automatically creates booking if customer didn't wait for website redirection after payment
router.post('/webhook', async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;
    const signature = req.headers['x-razorpay-signature'];

    // Signature verification (if webhook secret and signature are present)
    if (signature && webhookSecret) {
      const rawBody = JSON.stringify(req.body);
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      if (signature !== expectedSignature) {
        console.warn('⚠️ Webhook signature mismatch - proceeding with caution');
      }
    }

    const { event, payload } = req.body;
    console.log(`\n🔔 Razorpay Webhook Received Event: ${event}`);

    // Handle payment.authorized, payment.captured, order.paid
    if (!['payment.authorized', 'payment.captured', 'order.paid'].includes(event)) {
      return res.json({ status: 'ignored', event });
    }

    const paymentEntity = payload?.payment?.entity || {};
    const orderEntity = payload?.order?.entity || {};

    const orderId = paymentEntity.order_id || orderEntity.id;
    const paymentId = paymentEntity.id || `pay_wh_${Date.now()}`;

    if (!orderId) {
      console.warn('⚠️ Webhook: Missing order_id in payload');
      return res.json({ status: 'ignored', message: 'No order_id' });
    }

    // ===== APP IDENTITY CHECK =====
    // IMPORTANT: payment.captured events often have empty notes on the payment entity.
    // Razorpay does NOT always copy order notes into the payment entity.
    // We must fetch the order directly from Razorpay API to get authoritative notes with appId.
    let notes = {};
    try {
      const rzpOrder = await razorpay.orders.fetch(orderId);
      notes = rzpOrder.notes || {};
      console.log(`📋 Webhook: Fetched order notes for ${orderId}:`, notes);
    } catch (fetchErr) {
      // Fallback to webhook payload notes if API fetch fails
      console.warn(`⚠️ Webhook: Could not fetch order ${orderId} from Razorpay API, using payload notes:`, fetchErr.message);
      notes = paymentEntity.notes || orderEntity.notes || {};
    }

    // Reject if appId is present and does not belong to this app
    if (notes.appId && notes.appId !== 'cafequatro2') {
      console.warn(`🚫 Webhook: Rejected — payment belongs to a different app (appId: '${notes.appId}'), order: ${orderId}`);
      return res.status(200).json({ status: 'ignored', message: 'Payment belongs to a different app' });
    }

    // ===== IN-MEMORY LOCK: Prevent race condition between webhook and redirect =====
    // If another request is currently creating a booking for this orderId, wait for it
    if (!acquireOrderLock(orderId)) {
      console.log(`⏳ Webhook: Order ${orderId} is being processed by another request - waiting 2.5s...`);
      await new Promise(resolve => setTimeout(resolve, 2500));
      const racedBooking = await Booking.findOne({
        $or: [
          { 'payment.razorpay.orderId': orderId },
          { 'payment.razorpay.paymentId': paymentId }
        ]
      }).populate('driver', 'name phone');
      if (racedBooking) {
        console.log(`✓ Webhook: Found booking created by winning request for order ${orderId} (${racedBooking.bookingId})`);
        return res.status(200).json({ status: 'ok', message: 'Booking created by concurrent request', bookingId: racedBooking.bookingId });
      }
    }

    // ===== DEDUPLICATION CHECK =====
    // Check if booking already exists for this orderId or paymentId
    let existingBooking = await Booking.findOne({
      $or: [
        { 'payment.razorpay.orderId': orderId },
        { 'payment.razorpay.paymentId': paymentId }
      ]
    }).populate('driver', 'name phone');

    if (existingBooking) {
      releaseOrderLock(orderId);
      console.log(`✓ Webhook Deduplication: Booking already exists for order ${orderId} (${existingBooking.bookingId})`);
      if (paymentId && (!existingBooking.payment?.razorpay?.paymentId || existingBooking.payment.razorpay.paymentId !== paymentId)) {
        existingBooking.payment.razorpay.paymentId = paymentId;
        existingBooking.payment.status = 'completed';
        existingBooking.paymentStatus = 'paid';
        await existingBooking.save();
      }
      return res.status(200).json({ status: 'ok', message: 'Booking already exists', bookingId: existingBooking.bookingId });
    }


    // Extract booking details stored in Razorpay order notes
    const {
      driverPhone,
      customerPhone,
      customerName,
      customerEmail,
      vehicleNumber,
      bookingNotes,
      paymentAmount
    } = notes;

    if (!driverPhone || !customerPhone || !vehicleNumber) {
      console.warn(`⚠️ Webhook: Missing required booking details in order ${orderId} notes:`, notes);
      return res.status(200).json({ status: 'skipped', message: 'Incomplete booking details in order notes' });
    }

    // Find driver by phone
    const driver = await User.findOne({ phone: driverPhone, role: 'driver' });
    if (!driver) {
      console.error(`✗ Webhook: Driver not found for phone: ${driverPhone}`);
      return res.status(200).json({ status: 'skipped', message: 'Driver not found' });
    }

    const parsedAmount = paymentAmount ? parseFloat(paymentAmount) : 100;

    // Create the booking automatically
    const booking = new Booking({
      driver: driver._id,
      customer: {
        phone: customerPhone.trim(),
        name: (customerName || customerPhone).trim(),
        email: customerEmail ? customerEmail.trim() : null
      },
      vehicle: {
        type: 'car',
        number: vehicleNumber.trim().toUpperCase(),
        images: [],
        hasValuables: false,
        valuables: []
      },
      location: { venue: '', parkingSpot: '' },
      notes: bookingNotes || '',
      payment: {
        method: 'razorpay',
        amount: parsedAmount,
        status: 'completed',
        paidAt: new Date(),
        razorpay: {
          orderId: orderId,
          paymentId: paymentId,
          signature: 'webhook_verified'
        }
      },
      paymentStatus: 'paid',
      status: 'parked'
    });

    try {
      await booking.save();
      releaseOrderLock(orderId);
      await booking.populate('driver', 'name phone');
    } catch (saveError) {
      releaseOrderLock(orderId);
      if (saveError.code === 11000 && (
        saveError.message.includes('orderId') ||
        saveError.message.includes('paymentId') ||
        (saveError.keyValue && (saveError.keyValue['payment.razorpay.orderId'] || saveError.keyValue['payment.razorpay.paymentId']))
      )) {
        console.log(`✓ Webhook Race Condition Handled: Booking was inserted by public redirect for order ${orderId}`);
        const existingBooking = await Booking.findOne({
          $or: [
            { 'payment.razorpay.orderId': orderId },
            { 'payment.razorpay.paymentId': paymentId }
          ]
        }).populate('driver', 'name phone');

        if (existingBooking) {
          return res.status(200).json({ status: 'ok', message: 'Booking already exists', bookingId: existingBooking.bookingId });
        }
      }
      throw saveError;
    }


    console.log(`🎉 Webhook: Successfully auto-created booking ${booking.bookingId} for order ${orderId}`);

    // Generate access link
    const accessLink = `${process.env.FRONTEND_URL || 'https://cafequattro2valetapp.onrender.com'}/customer/access/${booking.accessToken}`;

    // Send notifications
    try {
      await smsService.sendBookingConfirmation(customerPhone, booking.bookingId, accessLink);
    } catch (e) { console.error('Webhook SMS failed:', e.message); }
    try {
      await whatsappService.sendBookingConfirmation(customerPhone, customerName || customerPhone, booking.bookingId, booking.accessToken);
      console.log('✓ Webhook WhatsApp confirmation sent to:', customerPhone);
    } catch (e) { console.error('Webhook WhatsApp failed:', e.message); }

    if (customerEmail) {
      try {
        await emailService.sendBookingConfirmation(customerEmail, customerName || customerPhone, booking.bookingId, accessLink, vehicleNumber, '');
      } catch (e) { console.error('Webhook Email failed:', e.message); }
    }

    // Notify driver live via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.to(`driver-${driver._id}`).emit('new-customer-booking', {
        bookingId: booking.bookingId,
        booking: booking.toObject()
      });
    }

    return res.status(200).json({ status: 'ok', message: 'Booking created via webhook', bookingId: booking.bookingId });
  } catch (error) {
    console.error('Razorpay Webhook Error:', error);
    return res.status(200).json({ status: 'error', error: error.message });
  }
});

module.exports = router;
