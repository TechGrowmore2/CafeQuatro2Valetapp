const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  bookingId: {
    type: String,
    unique: true,
    default: function() {
      return `VLT${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    }
  },
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  customer: {
    phone: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: false  // Optional for now, can make required later
    }
  },
  vehicle: {
    type: {
      type: String,
      required: true,
      enum: ['car', 'bike', 'suv']
    },
    number: {
      type: String,
      required: true,
      uppercase: true
    },
    model: String,
    color: String,
    images: [{
      type: String  // Store image URLs/paths
    }],
    hasValuables: {
      type: Boolean,
      default: false
    },
    valuables: [{
      type: String
    }],
    driverName: {
      type: String,
      required: false
    }
  },
  parking: {
    startTime: {
      type: Date,
      required: true,
      default: Date.now
    },
    actualEndTime: Date
  },
  status: {
    type: String,
    enum: ['parked', 'recall-requested', 'in-transit', 'arrived', 'completed', 'cancelled'],
    default: 'parked'
  },
  recall: {
    requestedAt: Date,
    estimatedArrival: Number, // in minutes
    arrivedAt: Date
  },
  verification: {
    otp: String,
    otpExpiry: Date,
    verified: {
      type: Boolean,
      default: false
    }
  },
  accessToken: {
    type: String,
    unique: true,
    default: function() {
      return require('crypto').randomBytes(32).toString('hex');
    }
  },
  accessTokenCreatedAt: {
    type: Date,
    default: Date.now
  },
  payment: {
    method: {
      type: String,
      enum: ['cash', 'qr', 'upi', 'card', 'staff', 'foc', 'pending', 'razorpay'],
      default: 'pending'
    },
    amount: Number,
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending'
    },
    paidAt: Date,
    razorpay: {
      orderId: { type: String, unique: true, sparse: true },
      paymentId: { type: String, unique: true, sparse: true },
      signature: String
    }
  },
  paymentStatus: {
    type: String,
    enum: ['unpaid', 'paid'],
    default: 'unpaid'
  },
  location: {
    parkingSpot: String,
    venue: String
  },
  notes: String,
  // Tracks which notifications have already been sent — prevents duplicates on double-tap
  notificationsSent: {
    bookingConfirmation: { type: Boolean, default: false },
    recallNotification:  { type: Boolean, default: false },
    arrivalNotification: { type: Boolean, default: false },
    thankYou:            { type: Boolean, default: false }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamp and sync payment fields before saving
bookingSchema.pre('save', function(next) {
  this.updatedAt = Date.now();

  // Sync paymentStatus ('paid'/'unpaid') and payment.status ('completed'/'pending'/'failed')
  if (this.paymentStatus === 'paid') {
    this.payment.status = 'completed';
    if (!this.payment.paidAt) {
      this.payment.paidAt = new Date();
    }
  } else if (this.paymentStatus === 'unpaid') {
    this.payment.status = 'pending';
  } else if (this.payment && this.payment.status === 'completed') {
    this.paymentStatus = 'paid';
    if (!this.payment.paidAt) {
      this.payment.paidAt = new Date();
    }
  } else if (this.payment && (this.payment.status === 'pending' || this.payment.status === 'failed')) {
    this.paymentStatus = 'unpaid';
  }

  next();
});

module.exports = mongoose.model('Booking', bookingSchema);
