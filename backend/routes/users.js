const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');

// Get all drivers (Supervisor only)
router.get('/drivers', auth, authorize('supervisor'), async (req, res) => {
  try {
    const drivers = await User.find({ role: 'driver', isActive: true })
      .select('-password')
      .sort({ name: 1 });

    res.json({ drivers });
  } catch (error) {
    console.error('Get drivers error:', error);
    res.status(500).json({ message: 'Failed to fetch drivers' });
  }
});

// Create driver/supervisor (Supervisor only)
router.post('/create', auth, authorize('supervisor'),
  async (req, res) => {
    try {
      const { name, phone, password, role } = req.body;

      if (!['driver', 'supervisor'].includes(role)) {
        return res.status(400).json({ message: 'Invalid role' });
      }

      const existingUser = await User.findOne({ phone });
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
      }

      const user = new User({
        name,
        phone,
        password,
        role
      });

      await user.save();

      res.status(201).json({
        message: 'User created successfully',
        user: {
          id: user._id,
          name: user.name,
          phone: user.phone,
          role: user.role
        }
      });
    } catch (error) {
      console.error('Create user error:', error);
      res.status(500).json({ message: 'Failed to create user' });
    }
  }
);

module.exports = router;
