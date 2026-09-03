const axios = require('axios');
require('dotenv').config();

async function test() {
  const mongoose = require('mongoose');
  await mongoose.connect(process.env.MONGODB_URI);
  const User = require('./models/User');
  
  // Find a manager
  const manager = await User.findOne({ role: 'manager' });
  const admin = await User.findOne({ role: 'admin' });
  console.log('Manager ID:', manager ? manager._id : 'None');

  const jwt = require('jsonwebtoken');
  const token = jwt.sign({ id: manager ? manager._id : admin._id, role: manager ? 'manager' : 'admin' }, process.env.JWT_SECRET || 'fallback_secret');
  
  try {
    const venuesRes = await axios.get('http://localhost:5000/api/admin/venues', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("Venues fetched:", JSON.stringify(venuesRes.data.venues, null, 2));

    const bookingsRes = await axios.get('http://localhost:5000/api/admin/all-bookings', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("Bookings fetched:", JSON.stringify(bookingsRes.data.bookings, null, 2));
  } catch (err) {
    console.error(err.response ? err.response.data : err.message);
  }
  
  mongoose.disconnect();
}
test();
