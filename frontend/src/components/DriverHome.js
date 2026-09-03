import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PlusCircle, List, Car, QrCode, Copy, Check, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import './DriverHome.css';

const APP_URL = process.env.REACT_APP_FRONTEND_URL || window.location.origin;

const DriverHome = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  const driverPhone = user?.phone || '';
  const bookingLink = driverPhone ? `${APP_URL}/book/${driverPhone}` : '';

  const qrSrc = bookingLink
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(bookingLink)}&color=FF6B35&bgcolor=FFFFFF&margin=10`
    : '';

  const handleCopy = () => {
    if (!bookingLink) return;
    navigator.clipboard.writeText(bookingLink).then(() => {
      setCopied(true);
      toast.success('Link copied!');
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const quickActions = [
    {
      title: 'Create Booking',
      description: 'Add a new valet parking booking',
      icon: PlusCircle,
      color: '#FF6B35',
      action: () => navigate('/driver/create-booking')
    },
    {
      title: 'My Bookings',
      description: 'View and manage your bookings',
      icon: List,
      color: '#3B82F6',
      action: () => navigate('/driver/bookings')
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="driver-home-container"
    >
      <div className="welcome-section">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="welcome-icon"
        >
          <Car size={80} color="#FF6B35" />
        </motion.div>
        <h1>Welcome to GrowMore</h1>
        <p>Manage your valet parking operations efficiently</p>
      </div>

      <div className="quick-actions-grid">
        {quickActions.map((action, index) => (
          <motion.div
            key={action.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + index * 0.1 }}
            className="action-card"
            onClick={action.action}
          >
            <div className="action-icon" style={{ background: `${action.color}20` }}>
              <action.icon size={32} color={action.color} />
            </div>
            <h3>{action.title}</h3>
            <p>{action.description}</p>
          </motion.div>
        ))}
      </div>

      {/* QR Code Card */}
      {driverPhone && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="qr-section"
        >
          <div className="qr-section-header">
            <QrCode size={22} color="#FF6B35" />
            <div>
              <h3>Your Customer Booking QR</h3>
              <p>Customers scan this to self-book their valet parking under your profile</p>
            </div>
          </div>

          <div className="qr-body">
            <div className="qr-image-wrap">
              <img
                src={qrSrc}
                alt="Driver QR Code"
                className="qr-image"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </div>

            <div className="qr-link-section">
              <p className="qr-link-label">Booking Link</p>
              <div className="qr-link-row">
                <span className="qr-link-text">{bookingLink}</span>
                <button className="qr-copy-btn" onClick={handleCopy}>
                  {copied ? <Check size={16} color="#10B981" /> : <Copy size={16} />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <a
                href={bookingLink}
                target="_blank"
                rel="noreferrer"
                className="qr-open-link"
              >
                <ExternalLink size={14} /> Preview Link
              </a>
            </div>
          </div>

          <p className="qr-tip">
            💡 Print this QR on your ID card. Customers scan → fill their details → booking appears in <strong>My Bookings</strong>.
          </p>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="tips-section"
      >
        <h3>💡 Quick Tips</h3>
        <ul>
          <li>Always verify vehicle details before parking</li>
          <li>Note the parking spot for quick retrieval</li>
          <li>Respond promptly to recall requests</li>
          <li>Verify OTP before completing the booking</li>
          <li>Edit bookings to add vehicle security details</li>
        </ul>
      </motion.div>
    </motion.div>
  );
};

export default DriverHome;
