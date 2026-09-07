import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import toast from 'react-hot-toast';
import { LogOut, Car, Clock, AlertCircle, CheckCircle, MapPin, CreditCard } from 'lucide-react';
import api from '../services/api';
import axios from 'axios';

import './CustomerDashboard.css';

const API_URL = process.env.REACT_APP_API_URL || '';
const RAZORPAY_KEY = process.env.REACT_APP_RAZORPAY_KEY_ID || 'rzp_test_YOUR_KEY_ID_HERE';

/* ─── Load Razorpay SDK once ─────────────────────────────── */
const loadRazorpaySDK = () =>
  new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

/* ─── Compute tiered parking charge ─────────────────────── */
const computeTieredCharge = (startTime, tiers) => {
  if (!tiers || tiers.length === 0) return 100;
  const elapsedMs = Date.now() - new Date(startTime).getTime();
  const elapsedHrs = elapsedMs / (1000 * 60 * 60);
  // Sort tiers by maxHours ascending, nulls (open-ended) last
  const sorted = [...tiers].sort((a, b) => {
    if (a.maxHours === null) return 1;
    if (b.maxHours === null) return -1;
    return a.maxHours - b.maxHours;
  });
  for (const tier of sorted) {
    if (tier.maxHours === null || elapsedHrs <= tier.maxHours) {
      return tier.charge;
    }
  }
  return sorted[sorted.length - 1]?.charge || 100;
};

const STEPS = [
  { key: 'parked',           label: 'Parked' },
  { key: 'recall-requested', label: 'Call for Car' },
  { key: 'in-transit',       label: 'En Route' },
  { key: 'arrived',          label: 'Arrived' },
  { key: 'completed',        label: 'Done' },
];

const getStepIndex = (status) => STEPS.findIndex(s => s.key === status);

const BookingStepper = ({ status }) => {
  const currentIdx = getStepIndex(status);
  return (
    <div className="booking-stepper">
      {STEPS.map((step, i) => {
        const done = i < currentIdx;
        const current = i === currentIdx;
        return (
          <div key={step.key} className={`step ${done ? 'done' : ''} ${current ? 'current' : ''}`}>
            <div className="step-dot">{done ? '✓' : i + 1}</div>
            <span className="step-label">{step.label}</span>
          </div>
        );
      })}
    </div>
  );
};

const CustomerDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { socket, on, off } = useSocket();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  // State for deferred payment OTP display
  const [portalOTP, setPortalOTP] = useState({}); // { [bookingId]: otp }
  const [payingBookingId, setPayingBookingId] = useState(null);

  useEffect(() => { fetchBookings(); }, []);

  useEffect(() => {
    if (socket) {
      const handleCarInTransit = (data) => {
        toast.success(`Your car is on the way! ETA: ${data.estimatedMinutes} minutes`);
        fetchBookings();
      };
      const handleCarArrived = (data) => {
        toast((t) => (
          <div>
            <strong>✅ Your car has arrived!</strong>
            <p>Verification OTP: <strong style={{fontSize: '20px', color: '#FF6B35', letterSpacing: '0.1em'}}>{data.otp}</strong></p>
          </div>
        ), { duration: 15000 });
        fetchBookings();
      };
      const handleBookingCompleted = () => {
        toast.success('Booking completed! Thank you for using GrowMore');
        fetchBookings();
      };
      on('car-in-transit', handleCarInTransit);
      on('car-arrived', handleCarArrived);
      on('booking-completed', handleBookingCompleted);
      return () => {
        off('car-in-transit', handleCarInTransit);
        off('car-arrived', handleCarArrived);
        off('booking-completed', handleBookingCompleted);
      };
    }
  }, [socket, on, off]);

  const fetchBookings = async () => {
    try {
      const response = await api.get('/bookings/customer-bookings');
      setBookings(response.data.bookings);
    } catch (error) {
      toast.error('Failed to fetch bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleRecallCar = async (bookingId) => {
    if (processing) return;
    setProcessing(true);
    try {
      await api.post(`/bookings/${bookingId}/recall`);
      toast.success('Car recall request sent!');
      fetchBookings();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to recall car');
    } finally {
      setProcessing(false);
    }
  };

  /* ─── Deferred payment handler for tiered-pricing venues ─── */
  const handlePortalPay = useCallback(async (booking) => {
    if (payingBookingId) return;
    setPayingBookingId(booking._id);

    const sdkLoaded = await loadRazorpaySDK();
    if (!sdkLoaded) {
      toast.error('Failed to load payment gateway. Check your internet connection.');
      setPayingBookingId(null);
      return;
    }

    // Determine amount based on tiers stored in booking or compute from elapsed time
    // We fetch tiers from the booking's venue via driver info if available
    let charge = booking.payment?.amount || 100;
    // If it's a pending booking, we need to compute the charge
    if (booking.paymentStatus === 'unpaid' && booking.payment?.method === 'pending') {
      // Use booking's pricingTiers if available (stored in booking notes or fetch fresh)
      // For now use a simple heuristic: re-fetch not needed, amount is computed client-side
      // from the startTime vs tiers. We'll try to get tiers via driver API if we have driver phone.
      const driverPhone = booking.driver?.phone;
      if (driverPhone) {
        try {
          const res = await axios.get(`${API_URL}/api/auth/driver-info/${driverPhone}`);
          if (res.data.pricingTiers && res.data.pricingTiers.length > 0) {
            charge = computeTieredCharge(
              booking.parking?.startTime || booking.createdAt,
              res.data.pricingTiers
            );
          }
        } catch (e) { console.error('Could not fetch driver tiers:', e.message); }
      }
    }

    // Create Razorpay order
    let orderData;
    try {
      const { data } = await axios.post(`${API_URL}/api/payment/create-order`, {
        amount: charge,
        // No booking details in notes — signals deferred payment to webhook
        notes: { appId: 'cafequatro2' }
      });
      orderData = data;
    } catch (err) {
      toast.error('Failed to initiate payment. Please try again.');
      setPayingBookingId(null);
      return;
    }

    const options = {
      key: RAZORPAY_KEY,
      amount: orderData.amount,
      currency: orderData.currency || 'INR',
      name: 'Cafe Quattro Babulnath',
      description: `Valet Parking — ${booking.bookingId}`,
      order_id: orderData.orderId,
      prefill: { contact: user?.phone || '' },
      theme: { color: '#00A859' },
      handler: async (response) => {
        try {
          // Verify + update booking + generate OTP
          const result = await axios.post(`${API_URL}/api/payment/booking-pay/${booking._id}`, {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            amount: charge
          });

          if (result.data.success) {
            setPortalOTP(prev => ({ ...prev, [booking._id]: result.data.otp }));
            toast.success('Payment successful! Show the OTP below to your valet driver.');
            fetchBookings();
          } else {
            toast.error('Payment recorded but OTP generation failed. Contact support.');
          }
        } catch (err) {
          toast.error(err.response?.data?.message || 'Payment verification failed.');
        } finally {
          setPayingBookingId(null);
        }
      },
      modal: {
        ondismiss: () => {
          toast.error('Payment cancelled.');
          setPayingBookingId(null);
        }
      }
    };

    const rzp = new window.Razorpay(options);
    rzp.on('payment.failed', () => {
      toast.error('Payment failed. Please retry.');
      setPayingBookingId(null);
    });
    rzp.open();
  }, [payingBookingId, user]);

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/customer/login');
  };

  const getStatusColor = (status) => ({
    'parked': '#10B981', 'recall-requested': '#F59E0B',
    'in-transit': '#3B82F6', 'arrived': '#8B5CF6', 'completed': '#6B7280'
  }[status] || '#666');

  const getStatusText = (status) => ({
    'parked': '🅿️ Parked Safely', 'recall-requested': '⏳ Recall Requested',
    'in-transit': '🚗 On The Way', 'arrived': '✅ Car Arrived', 'completed': '✓ Completed'
  }[status] || status);

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-left">
          <div>
            <h2>My Rides</h2>
            <p>{user?.name || user?.phone}</p>
          </div>
        </div>
        <div className="header-right">
          <button onClick={handleLogout} className="logout-btn">
            <LogOut size={17} /> Logout
          </button>
        </div>
      </header>

      <main className="customer-content">
        {loading ? (
          <div className="loading">Loading your rides...</div>
        ) : bookings.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="empty-state">
            <h3>No bookings yet</h3>
            <p>Your valet parking bookings will appear here</p>
          </motion.div>
        ) : (
          <div className="bookings-grid">
            {bookings.map((booking, index) => {
              const isPendingPayment = booking.paymentStatus === 'unpaid' && booking.payment?.method === 'pending';
              const isPayingThis = payingBookingId === booking._id;
              const portalOTPForThis = portalOTP[booking._id];

              return (
              <motion.div
                key={booking._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
                className="booking-card"
              >
                <div className="booking-header">
                  <div>
                    <h3>{booking.bookingId}</h3>
                    <p className="booking-time">
                      {new Date(booking.createdAt).toLocaleString('en-IN', {
                        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <span className="status-badge" style={{ background: getStatusColor(booking.status) }}>
                    {getStatusText(booking.status)}
                  </span>
                </div>

                {booking.status !== 'cancelled' && <BookingStepper status={booking.status} />}

                <div className="booking-details">
                  <div className="detail-row">
                    <Car size={16} />
                    <span><strong>{booking.vehicle.number}</strong> · {booking.vehicle.type.toUpperCase()}</span>
                  </div>
                  {booking.vehicle.model && (
                    <div className="detail-row">
                      <span className="detail-label">Model:</span>
                      <span>{booking.vehicle.model}</span>
                    </div>
                  )}
                  <div className="detail-row">
                    <Clock size={16} />
                    <span>Parked: {new Date(booking.parking?.startTime || booking.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  {booking.location?.venue && (
                    <div className="detail-row">
                      <MapPin size={16} />
                      <span>{booking.location.venue}{booking.location.parkingSpot && ` · Spot ${booking.location.parkingSpot}`}</span>
                    </div>
                  )}
                </div>

                {booking.status === 'in-transit' && booking.recall?.estimatedArrival && (
                  <div className="eta-banner">
                    <Clock size={20} />
                    <span>Your car will arrive in <strong>{booking.recall.estimatedArrival} minutes</strong></span>
                  </div>
                )}

                {/* OTP from driver arrival (existing flow) */}
                {booking.status === 'arrived' && booking.verification?.otp && !portalOTPForThis && (
                  <div className="otp-banner">
                    <AlertCircle size={22} color="#F59E0B" />
                    <div>
                      <span>Show this OTP to driver</span>
                      <strong>{booking.verification.otp}</strong>
                    </div>
                  </div>
                )}

                {/* OTP after portal payment (tiered pricing) */}
                {portalOTPForThis && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    style={{
                      background: 'linear-gradient(135deg, #00A859, #008F4C)',
                      borderRadius: '14px',
                      padding: '18px 20px',
                      margin: '12px 0',
                      textAlign: 'center',
                      color: 'white',
                      boxShadow: '0 6px 24px rgba(0, 168, 89, 0.3)'
                    }}
                  >
                    <p style={{ fontSize: '13px', margin: '0 0 6px', opacity: 0.9 }}>✅ Payment confirmed! Show this OTP to driver</p>
                    <p style={{ fontSize: '36px', fontWeight: 900, letterSpacing: '0.2em', margin: '0', fontFamily: 'monospace' }}>
                      {portalOTPForThis}
                    </p>
                    <p style={{ fontSize: '11px', margin: '6px 0 0', opacity: 0.8 }}>OTP also sent to your WhatsApp</p>
                  </motion.div>
                )}

                {/* Pay Parking Charges button — only for pending-payment tiered bookings */}
                {isPendingPayment && !portalOTPForThis && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      background: '#FEF3C7',
                      border: '1.5px solid #FDE68A',
                      borderRadius: '14px',
                      padding: '14px 16px',
                      margin: '12px 0 4px',
                    }}
                  >
                    <p style={{ fontSize: '13px', color: '#92400E', margin: '0 0 10px', fontWeight: 600 }}>
                      💳 Parking charges due. Pay securely via Razorpay to get your handover OTP.
                    </p>
                    <button
                      onClick={() => handlePortalPay(booking)}
                      disabled={isPayingThis}
                      style={{
                        width: '100%', padding: '13px',
                        background: isPayingThis ? '#9CA3AF' : 'linear-gradient(135deg, #00A859, #008F4C)',
                        color: 'white', border: 'none', borderRadius: '10px',
                        fontSize: '15px', fontWeight: 700, cursor: isPayingThis ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        fontFamily: "'Lato', sans-serif",
                        boxShadow: isPayingThis ? 'none' : '0 4px 14px rgba(0,168,89,0.35)',
                        transition: 'all 0.2s'
                      }}
                    >
                      <CreditCard size={18} />
                      {isPayingThis ? 'Opening payment…' : 'Pay Parking Charges'}
                    </button>
                  </motion.div>
                )}

                {booking.status === 'parked' && !isPendingPayment && (
                  <button className="recall-btn" onClick={() => handleRecallCar(booking._id)}>
                    🚗 Call for Car
                  </button>
                )}

                {/* Allow recall even for pending-payment bookings */}
                {booking.status === 'parked' && isPendingPayment && (
                  <button
                    className="recall-btn"
                    style={{ marginTop: '8px', background: 'linear-gradient(135deg, #64748B, #475569)' }}
                    onClick={() => handleRecallCar(booking._id)}
                  >
                    🚗 Call for Car (Pay first recommended)
                  </button>
                )}

                {booking.status === 'completed' && (
                  <div className="completed-banner">
                    <CheckCircle size={19} />
                    <span>Completed · ₹{booking.payment?.amount || 0} · {booking.payment?.method?.toUpperCase()}</span>
                  </div>
                )}
              </motion.div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default CustomerDashboard;