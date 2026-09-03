import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import toast from 'react-hot-toast';
import { Home, PlusCircle, List, LogOut, Bell, X, Car } from 'lucide-react';
import logo from '../logo.png';
import './DriverDashboard.css';

// Components
import CreateBooking from '../components/CreateBooking';
import MyBookings from '../components/MyBookings';
import DriverHome from '../components/DriverHome';
import Payment from '../components/Payment';

const DriverDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { socket, on, off } = useSocket();
  const [activeTab, setActiveTab] = useState('home');
  const [notifications, setNotifications] = useState([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);

  const playNotificationSound = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      
      const playNote = (freq, startTime, duration) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);
        gain.gain.setValueAtTime(0.3, ctx.currentTime + startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + startTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + startTime);
        osc.stop(ctx.currentTime + startTime + duration);
      };

      // Play a pleasant "ping-ping" notification sound
      playNote(880, 0, 0.15); // A5
      playNote(1108.73, 0.15, 0.3); // C#6
    } catch (e) {
      console.error('Audio play failed', e);
    }
  };

  useEffect(() => {
    if (socket) {
      const handleRecallRequest = (data) => {
        const notif = {
          id: Date.now(),
          type: 'recall',
          bookingId: data.bookingId,
          message: `Car recall requested — Booking: ${data.bookingId}`,
          time: new Date(),
          read: false,
          data
        };
        setNotifications(prev => [notif, ...prev]);
        
        // Play notification sound
        playNotificationSound();

        toast((t) => (
          <div>
            <strong>🚗 Car Recall Request!</strong>
            <p style={{ margin: '4px 0' }}>Booking: {data.bookingId}</p>
            <button
              onClick={() => { toast.dismiss(t.id); setActiveTab('bookings'); navigate('/driver/bookings'); }}
              style={{ marginTop: '8px', padding: '6px 12px', background: '#FF6B35', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >View Booking</button>
          </div>
        ), { duration: 10000 });
      };

      const handleNewCustomerBooking = (data) => {
        const notif = {
          id: Date.now() + 1,
          type: 'new-booking',
          bookingId: data.bookingId,
          message: `New self-booking from customer — Booking: ${data.bookingId}`,
          time: new Date(),
          read: false,
          data
        };
        setNotifications(prev => [notif, ...prev]);
        playNotificationSound();
        toast.success(`📋 New booking: ${data.bookingId}`, { duration: 6000 });
      };

      on('recall-request',       handleRecallRequest);
      on('new-customer-booking', handleNewCustomerBooking);

      return () => {
        off('recall-request',       handleRecallRequest);
        off('new-customer-booking', handleNewCustomerBooking);
      };
    }
  }, [socket, on, off, navigate]);

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleNotifClick = (notif) => {
    // Mark as read
    setNotifications(prev =>
      prev.map(n => n.id === notif.id ? { ...n, read: true } : n)
    );
    // Navigate to My Bookings
    setShowNotifPanel(false);
    setActiveTab('bookings');
    navigate('/driver/bookings');
  };

  const handleClearAll = () => {
    setNotifications([]);
    setShowNotifPanel(false);
  };

  const navItems = [
    { id: 'home',    label: 'Home',           icon: Home,       path: '/driver/home' },
    { id: 'create',  label: 'Create Booking', icon: PlusCircle, path: '/driver/create-booking' },
    { id: 'bookings',label: 'My Bookings',    icon: List,       path: '/driver/bookings' }
  ];

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-left">
          <img
            src={logo}
            alt="GrowMore Logo"
            style={{ width: '40px', height: 'auto', objectFit: 'contain' }}
          />
          <div>
            <h2>GrowMore Driver</h2>
            <p>{user?.name}</p>
          </div>
        </div>
        <div className="header-right">

          {/* Notification Bell */}
          <div style={{ position: 'relative' }}>
            <button
              className="notif-bell-btn"
              onClick={() => setShowNotifPanel(v => !v)}
              title="Notifications"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="notif-count-badge">{unreadCount}</span>
              )}
            </button>

            {/* Notification Panel */}
            <AnimatePresence>
              {showNotifPanel && (
                <motion.div
                  className="notif-panel"
                  initial={{ opacity: 0, y: -8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.96 }}
                  transition={{ duration: 0.18 }}
                >
                  <div className="notif-panel-header">
                    <span>Notifications</span>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {notifications.length > 0 && (
                        <button className="notif-clear-btn" onClick={handleClearAll}>
                          Clear all
                        </button>
                      )}
                      <button className="notif-close-btn" onClick={() => setShowNotifPanel(false)}>
                        <X size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="notif-list">
                    {notifications.length === 0 ? (
                      <div className="notif-empty">
                        <Bell size={32} color="#D1D5DB" />
                        <p>No notifications yet</p>
                      </div>
                    ) : (
                      notifications.map(notif => (
                        <button
                          key={notif.id}
                          className={`notif-item ${notif.read ? '' : 'unread'}`}
                          onClick={() => handleNotifClick(notif)}
                        >
                          <div className="notif-icon">
                            <Car size={18} color="#FF6B35" />
                          </div>
                          <div className="notif-body">
                            <p className="notif-msg">{notif.message}</p>
                            <span className="notif-time">
                              {new Date(notif.time).toLocaleTimeString('en-IN', {
                                hour: '2-digit', minute: '2-digit'
                              })}
                            </span>
                          </div>
                          {!notif.read && <span className="notif-dot" />}
                        </button>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button onClick={handleLogout} className="logout-btn">
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </header>

      <nav className="dashboard-nav">
        {navItems.map(item => (
          <button
            key={item.id}
            className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => {
              setActiveTab(item.id);
              navigate(item.path);
            }}
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <main className="dashboard-content">
        <Routes>
          <Route path="home"           element={<DriverHome />} />
          <Route path="create-booking" element={<CreateBooking />} />
          <Route path="payment"        element={<Payment />} />
          <Route path="bookings"       element={<MyBookings />} />
          <Route path="/"              element={<CreateBooking />} />
        </Routes>
      </main>
    </div>
  );
};

export default DriverDashboard;
