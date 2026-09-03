const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    const User = require('./models/User');
    const Venue = require('./models/Venue');

    const managers = await User.find({ role: 'manager' });
    console.log("Managers:", managers.map(m => ({ _id: m._id, name: m.name })));

    const supervisors = await User.find({ role: 'supervisor' });
    console.log("Supervisors:");
    for (let s of supervisors) {
      console.log(` - ${s.name} | Manager ID: ${s.manager} | Venue ID: ${s.venue}`);
    }

    const venues = await Venue.find();
    console.log("Venues:");
    for (let v of venues) {
      console.log(` - ${v.name} | Supervisor ID: ${v.supervisor}`);
    }

    mongoose.disconnect();
  })
  .catch(console.error);
