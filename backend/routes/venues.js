const express = require('express');
const router = express.Router();
const Venue = require('../models/Venue');

// Get active venues (public endpoint for drivers to see in dropdown)
router.get('/active', async (req, res) => {
  try {
    const venues = await Venue.find({ isActive: true })
      .select('name requiresUpfrontPayment parkingSpots')
      .sort({ name: 1 });
    res.json({ venues });
  } catch (error) {
    console.error('Get active venues error:', error);
    res.status(500).json({ message: 'Failed to fetch venues' });
  }
});

// Check if venue requires upfront payment (public endpoint)
router.get('/check-payment/:venueName', async (req, res) => {
  try {
    const venue = await Venue.findOne({ 
      name: new RegExp(`^${req.params.venueName}$`, 'i'),
      isActive: true 
    });
    
    if (venue) {
      res.json({ 
        requiresUpfrontPayment: venue.requiresUpfrontPayment 
      });
    } else {
      res.json({ requiresUpfrontPayment: false });
    }
  } catch (error) {
    console.error('Check venue payment error:', error);
    res.status(500).json({ message: 'Failed to check venue' });
  }
});

module.exports = router;
