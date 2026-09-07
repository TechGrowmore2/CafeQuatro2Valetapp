const mongoose = require('mongoose');

const venueSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  requiresUpfrontPayment: {
    type: Boolean,
    default: false
  },
  supervisor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() {
      return this.requiresUpfrontPayment;
    }
  },
  parkingSpots: [{
    type: String,
    trim: true
  }],
  parkingFee: {
    type: Number,
    default: 100,
    min: 0
  },
  // ── Tiered Pricing ──────────────────────────────────────────
  // pricingMode: 'flat' uses parkingFee as-is.
  // 'tiered' uses pricingTiers for duration-based charges.
  // Booking form hides Razorpay for 'tiered' venues;
  // customer pays at trip-end via the customer portal.
  pricingMode: {
    type: String,
    enum: ['flat', 'tiered'],
    default: 'flat'
  },
  pricingTiers: [{
    maxHours: { type: Number, default: null }, // null = "beyond previous tier"
    charge: { type: Number, required: true },
    label: { type: String, trim: true }        // e.g. "0–2 hrs", "2+ hrs"
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Venue', venueSchema);

