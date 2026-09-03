const mongoose = require('mongoose');
const User = require('./models/User');
const Venue = require('./models/Venue');
require('dotenv').config();

const seedData = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      console.error('❌ Error: MONGODB_URI is not set in .env file');
      process.exit(1);
    }

    if (process.env.MONGODB_URI.includes('YOUR_PASSWORD') || process.env.MONGODB_URI.includes('<db_password>')) {
      console.error('❌ Error: Please replace the password placeholder in backend/.env');
      process.exit(1);
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to MongoDB —', mongoose.connection.name);
    console.log('');

    // ─────────────────────────────────────────────
    // ADMIN
    // ─────────────────────────────────────────────
    const adminExists = await User.findOne({ phone: '7777777777' });
    if (!adminExists) {
      await new User({ name: 'Admin', phone: '7777777777', password: 'Admin123', role: 'admin' }).save();
      console.log('✓ Created admin: Admin (7777777777)');
    } else {
      console.log('- Admin already exists: Admin (7777777777)');
    }

    // ─────────────────────────────────────────────
    // CAFFE QUATTRO — MANAGER
    // ─────────────────────────────────────────────
    let managerId;
    const manager = await User.findOne({ phone: '7700000001' });
    if (!manager) {
      const mg = await new User({
        name: 'Caffe Quattro Manager',
        phone: '7700000001',
        password: 'Manager123',
        role: 'manager'
      }).save();
      managerId = mg._id;
      console.log('✓ Created Manager (7700000001)');
    } else {
      managerId = manager._id;
      console.log('- Manager already exists (7700000001)');
    }

    // ─────────────────────────────────────────────
    // CAFFE QUATTRO — ANDHERI SUPERVISOR
    // ─────────────────────────────────────────────
    let supervisorId;
    const supervisor = await User.findOne({ phone: '8800000001' });
    if (!supervisor) {
      const sv = await new User({
        name: 'Andheri Supervisor',
        phone: '8800000001',
        password: 'Super123',
        role: 'supervisor',
        manager: managerId
      }).save();
      supervisorId = sv._id;
      console.log('✓ Created Andheri Supervisor (8800000001)');
    } else {
      supervisorId = supervisor._id;
      console.log('- Andheri Supervisor already exists (8800000001)');
    }

    const driver1 = await User.findOne({ phone: '9900000001' });
    if (!driver1) {
      await new User({
        name: 'Andheri Driver 1',
        phone: '9900000001',
        password: 'Driver123',
        role: 'driver',
        supervisor: supervisorId
      }).save();
      console.log('✓ Created Andheri Driver 1 (9900000001) → assigned to Andheri Supervisor');
    } else {
      console.log('- Andheri Driver 1 already exists (9900000001)');
    }

    const driver2 = await User.findOne({ phone: '9900000002' });
    if (!driver2) {
      await new User({
        name: 'Andheri Driver 2',
        phone: '9900000002',
        password: 'Driver123',
        role: 'driver',
        supervisor: supervisorId
      }).save();
      console.log('✓ Created Andheri Driver 2 (9900000002) → assigned to Andheri Supervisor');
    } else {
      console.log('- Andheri Driver 2 already exists (9900000002)');
    }

    // ─────────────────────────────────────────────
    // VENUES
    // ─────────────────────────────────────────────
    const venues = [
      {
        name: 'Caffe Quattro - Andheri',
        requiresUpfrontPayment: false,
        supervisor: supervisorId,
        isActive: true,
        parkingSpots: ['Caffe Quattro - Andheri']
      }
    ];

    for (const venueData of venues) {
      const existing = await Venue.findOne({ name: venueData.name });
      if (!existing) {
        await new Venue(venueData).save();
        console.log(`✓ Created venue: ${venueData.name} (${venueData.parkingSpots.length} spots)`);
      } else {
        if (!existing.parkingSpots || existing.parkingSpots.length === 0) {
          existing.parkingSpots = venueData.parkingSpots;
          await existing.save();
          console.log(`✓ Updated venue: ${venueData.name}`);
        } else {
          console.log(`- Venue already exists: ${venueData.name}`);
        }
      }
    }

    // ─────────────────────────────────────────────
    // SUMMARY
    // ─────────────────────────────────────────────
    console.log('\n✓ Seed completed successfully!\n');
    console.log('┌─────────────────────────────────────────────────────────────┐');
    console.log('│               CAFFE QUATTRO — LOGIN CREDENTIALS             │');
    console.log('├─────────────────────────────────────────────────────────────┤');
    console.log('│  ADMIN                                                      │');
    console.log('│    Phone: 7777777777    Password: Admin123                  │');
    console.log('├─────────────────────────────────────────────────────────────┤');
    console.log('│  MANAGER                                                    │');
    console.log('│    Phone: 7700000001    Password: Manager123                │');
    console.log('├─────────────────────────────────────────────────────────────┤');
    console.log('│  ANDHERI LOCATION                                           │');
    console.log('│    Supervisor  Phone: 8800000001  Password: Super123        │');
    console.log('│    Driver 1    Phone: 9900000001  Password: Driver123       │');
    console.log('│    Driver 2    Phone: 9900000002  Password: Driver123       │');
    console.log('│    QR Link 1: /book/9900000001                              │');
    console.log('│    QR Link 2: /book/9900000002                              │');
    console.log('├─────────────────────────────────────────────────────────────┤');
    console.log('│  VENUE                                                      │');
    console.log('│    Caffe Quattro - Andheri                                  │');
    console.log('└─────────────────────────────────────────────────────────────┘');
    console.log('\n📍 Venue: Caffe Quattro - Andheri');
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Seed error:', error.message);

    if (error.message.includes('authentication failed') || error.message.includes('bad auth')) {
      console.error('🔐 MongoDB Authentication Failed — check your password in backend/.env');
    } else if (error.message.includes('IP')) {
      console.error('🌐 IP not whitelisted — add your IP in MongoDB Atlas → Network Access');
    }

    process.exit(1);
  }
};

seedData();
