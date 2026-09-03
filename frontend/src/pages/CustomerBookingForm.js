import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import { useParams } from 'react-router-dom';
import { Car, CheckCircle, CreditCard, ShieldCheck, AlertCircle, RefreshCw, IndianRupee, Phone } from 'lucide-react';
import axios from 'axios';
import growmoreLogo from '../growmore-logo.png';

import './CustomerBookingForm.css';

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

const CustomerBookingForm = () => {
  const { driverPhone } = useParams();

  const [formData, setFormData] = useState({
    customerPhone: '',
    vehicleNumber: '',
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [createdBookingId, setCreatedBookingId] = useState('');
  const [paymentIdDisplay, setPaymentIdDisplay] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverNotFound, setDriverNotFound] = useState(false);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [disclaimerChecked, setDisclaimerChecked] = useState(false);

  const [paymentAmount, setPaymentAmount] = useState(100);
  const [paymentMethod, setPaymentMethod] = useState('razorpay'); // razorpay | cash
  const [btnState, setBtnState] = useState('idle'); // idle | paying | booking | failed
  const [venueName, setVenueName] = useState('');
  const [venueLoading, setVenueLoading] = useState(true);

  // Fetch driver name + venue parking fee & check pending booking
  useEffect(() => {
    if (!driverPhone) { setDriverNotFound(true); return; }
    const verify = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/auth/driver-info/${driverPhone}`);
        setDriverName(res.data.name || 'Your Valet Driver');
        if (res.data.parkingFee !== undefined) setPaymentAmount(res.data.parkingFee);
        if (res.data.venueName) setVenueName(res.data.venueName);
      } catch {
        setDriverName('Your Valet Driver');
      } finally {
        setVenueLoading(false);
      }
    };
    verify();

    // Deduplication / Recovery check if customer paid but refreshed or reopened page
    const pendingOrderId = sessionStorage.getItem('pending_booking_order_id');
    if (pendingOrderId) {
      axios.get(`${API_URL}/api/payment/check-booking/${pendingOrderId}`)
        .then(res => {
          if (res.data.found && res.data.booking) {
            console.log('✓ Pending booking recovered:', res.data.booking.bookingId);
            setCreatedBookingId(res.data.booking.bookingId);
            if (res.data.booking.payment?.razorpay?.paymentId) {
              setPaymentIdDisplay(res.data.booking.payment.razorpay.paymentId);
            }
            setSubmitted(true);
            sessionStorage.removeItem('pending_booking_order_id');
            toast.success('Your booking is confirmed!');
          }
        })
        .catch(err => console.log('Check pending booking error:', err));
    }
  }, [driverPhone]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  /* ─── Validate fields ───────────────────────────────────── */
  const validate = () => {
    if (!/^[0-9]{10}$/.test(formData.customerPhone.trim())) {
      toast.error('Please enter a valid 10-digit mobile number'); return false;
    }
    if (formData.vehicleNumber.trim().length < 4) {
      toast.error('Vehicle number must be at least 4 characters'); return false;
    }
    return true;
  };

  /* ─── Create booking after payment ─────────────────────── */
  const createBooking = async (paymentData) => {
    setBtnState('booking');
    try {
      const data = new FormData();
      data.append('driverPhone', driverPhone);
      data.append('customerName', formData.customerPhone.trim());
      data.append('customerPhone', formData.customerPhone.trim());
      data.append('vehicleNumber', formData.vehicleNumber.trim().toUpperCase());
      data.append('notes', '');
      data.append('hasValuables', false);
      data.append('valuables', JSON.stringify([]));
      data.append('paymentMethod', paymentMethod);
      if (paymentData) {
        data.append('razorpayOrderId', paymentData.orderId);
        data.append('razorpayPaymentId', paymentData.paymentId);
        data.append('razorpaySignature', paymentData.signature);
      }
      data.append('paymentAmount', paymentAmount);

      const res = await axios.post(`${API_URL}/api/bookings/public`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setCreatedBookingId(res.data.booking.bookingId);
      if (paymentData) setPaymentIdDisplay(paymentData.paymentId);
      setSubmitted(true);
      sessionStorage.removeItem('pending_booking_order_id');
      toast.success('Booking created!');
    } catch (err) {
      setBtnState('failed');
      toast.error(err.response?.data?.message || 'Failed to create booking. Please try again.');
    }
  };

  /* ─── Single unified action button handler ──────────────── */
  const handlePayAndBook = useCallback(async () => {
    if (!validate()) return;
    if (btnState === 'paying' || btnState === 'booking' || loading) return;

    // ── CASH: create booking directly ──
    if (paymentMethod === 'cash') {
      setBtnState('booking');
      setLoading(true);
      await createBooking(null);
      setLoading(false);
      return;
    }

    // ── ONLINE: Razorpay → then auto-book ──
    setBtnState('paying');

    const sdkLoaded = await loadRazorpaySDK();
    if (!sdkLoaded) {
      toast.error('Failed to load payment gateway. Check your internet connection.');
      setBtnState('failed');
      return;
    }

    try {
      const { data } = await axios.post(`${API_URL}/api/payment/create-order`, {
        amount: paymentAmount,
        driverPhone,
        customerPhone: formData.customerPhone,
        customerName: formData.customerPhone,
        vehicleNumber: formData.vehicleNumber,
        notes: {
          driverPhone,
          customerPhone: formData.customerPhone,
          customerName: formData.customerPhone,
          vehicleNumber: formData.vehicleNumber
        }
      });

      if (data.orderId) {
        sessionStorage.setItem('pending_booking_order_id', data.orderId);
      }

      // ── Mock mode ──
      if (data.orderId && data.orderId.startsWith('mock_order_')) {
        toast.loading('Processing Test Payment (Mock Mode)...', { duration: 1500 });
        setTimeout(async () => {
          try {
            const verify = await axios.post(`${API_URL}/api/payment/verify`, {
              razorpay_order_id: data.orderId,
              razorpay_payment_id: `pay_mock_${Date.now()}`,
              razorpay_signature: 'mock_signature'
            });
            if (verify.data.success) {
              await createBooking({
                orderId: data.orderId,
                paymentId: verify.data.paymentId,
                signature: 'mock_signature'
              });
            } else {
              setBtnState('failed');
              toast.error('Test Payment Verification Failed.');
            }
          } catch {
            setBtnState('failed');
            toast.error('Test Payment Verification Error.');
          }
        }, 1500);
        return;
      }

      // ── Real Razorpay ──
      const options = {
        key: RAZORPAY_KEY,
        amount: data.amount,
        currency: data.currency,
        name: 'Cafe Quattro Babulnath',
        description: 'Valet Parking Payment',
        order_id: data.orderId,
        prefill: {
          name: formData.customerName,
          contact: formData.customerPhone,
        },
        theme: { color: '#00A859' },
        handler: async (response) => {
          try {
            const verify = await axios.post(`${API_URL}/api/payment/verify`, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });
            if (verify.data.success) {
              // Payment done → auto-create booking immediately
              await createBooking({
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature
              });
            } else {
              setBtnState('failed');
              toast.error('Payment verification failed. Please retry.');
            }
          } catch {
            setBtnState('failed');
            toast.error('Payment verification error. Please retry.');
          }
        },
        modal: {
          ondismiss: () => {
            setBtnState('failed');
            toast.error('Payment cancelled. Tap the button again to retry.');
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', () => {
        setBtnState('failed');
        toast.error('Payment failed. Please retry.');
      });
      rzp.open();
    } catch (err) {
      setBtnState('failed');
      toast.error(err.response?.data?.message || 'Failed to initiate payment. Please try again.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData, paymentAmount, paymentMethod, btnState, driverPhone]);

  const handleRetry = () => setBtnState('idle');

  /* ─── Button label & style helpers ─────────────────────── */
  const getBtnLabel = () => {
    if (btnState === 'paying') return <><div className="cbf-spinner-ring" style={{ width: 18, height: 18, borderWidth: 2 }} /> Opening Payment Gateway…</>;
    if (btnState === 'booking') return <><div className="cbf-spinner-ring" style={{ width: 18, height: 18, borderWidth: 2 }} /> Creating Your Booking…</>;
    if (paymentMethod === 'razorpay') return <><CreditCard size={20} /> Pay ₹{paymentAmount} &amp; Create Booking</>;
    return <>🚗 Create Booking</>;
  };

  const isBtnBusy = btnState === 'paying' || btnState === 'booking' || loading;

  /* ─── Screens ───────────────────────────────────────────── */
  if (driverNotFound) {
    return (
      <div className="cbf-page">
        <div className="cbf-error-state">
          <h2>Invalid QR Code</h2>
          <p>This QR code is not associated with a valid driver. Please contact your valet service.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="cbf-page">
        <Toaster position="top-center" />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="cbf-success-card"
        >
          <div className="cbf-success-icon">
            <CheckCircle size={64} color="#10B981" />
          </div>
          <div style={{ textAlign: 'center', marginBottom: '12px' }}>
            <img src={growmoreLogo} alt="Growmore Parking Solutions" style={{ width: '140px', height: 'auto', objectFit: 'contain' }} />
          </div>
          <h2>Booking Confirmed! 🎉</h2>
          <p>Your vehicle has been registered for valet parking at Cafe Quattro Babulnath.</p>
          <div className="cbf-booking-id-box">
            <span>Booking ID</span>
            <strong>{createdBookingId}</strong>
          </div>
          {paymentMethod === 'razorpay' ? (
            <div className="cbf-payment-success-badge">
              <ShieldCheck size={16} color="#10B981" />
              <span>Payment of ₹{paymentAmount} confirmed • {paymentIdDisplay}</span>
            </div>
          ) : (
            <div className="cbf-payment-success-badge" style={{ backgroundColor: '#FEF3C7', borderColor: '#FDE68A', color: '#92400E' }}>
              <AlertCircle size={16} color="#92400E" />
              <span>Pay ₹{paymentAmount} in cash to the driver upon collection.</span>
            </div>
          )}
          <p className="cbf-track-hint">
            You will receive an whatsapp message with a tracking link to monitor your car status in real time.
          </p>
        </motion.div>
      </div>
    );
  }

  /* ─── Main Form ─────────────────────────────────────────── */
  return (
    <div className="cbf-page">
      <Toaster position="top-center" />

      {/* ─── Disclaimer Popup ───────────────────────────── */}
      <AnimatePresence>
        {!disclaimerAccepted && (
          <motion.div
            key="disclaimer-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 1000,
              background: 'rgba(38, 41, 56, 0.7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '24px 16px',
            }}
          >
            <motion.div
              initial={{ scale: 0.88, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.88, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 340, damping: 26 }}
              style={{
                background: '#FFFFFF',
                borderRadius: '20px',
                padding: '32px 28px 28px',
                maxWidth: '420px',
                width: '100%',
                boxShadow: '0 20px 60px rgba(38, 41, 56, 0.25)',
                border: '2px solid rgba(0, 168, 89, 0.2)',
              }}
            >
              {/* Logo */}
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <img src={growmoreLogo} alt="Growmore Parking Solutions" style={{ width: '140px', height: 'auto', objectFit: 'contain', marginBottom: '12px' }} />
                <h2 style={{
                  fontFamily: "'Lora', serif",
                  fontSize: '20px', fontWeight: 700,
                  color: '#262938', margin: '0 0 4px',
                }}>Welcome to Cafe Quattro Babulnath</h2>
                <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>Please read before proceeding</p>
              </div>

              {/* Message */}
              <div style={{
                background: '#F0FDF4',
                border: '1.5px solid rgba(0, 168, 89, 0.25)',
                borderRadius: '14px',
                padding: '18px 20px',
                marginBottom: '22px',
                lineHeight: '1.75',
                fontSize: '14px',
                color: '#334155',
                fontFamily: "'Lato', sans-serif",
              }}>
                <p style={{ margin: '0 0 10px', fontWeight: 700, color: '#00A859' }}>Thank you for visiting Cafe Quattro Babulnath.</p>
                <p style={{ margin: '0 0 8px' }}>Valet services are provided for your convenience. While every care is taken, <strong>Cafe Quattro Babulnath cannot be responsible for theft or damage to the vehicle.</strong></p>
                <p style={{ margin: '0 0 8px' }}>Please ensure <strong>valuable items are safe with you</strong>, outside the car.</p>
                <p style={{ margin: '0 0 8px' }}>Please allow us <strong>15 mins</strong> to bring the vehicle back to you.</p>
                <p style={{ margin: 0, fontWeight: 700, color: '#00A859' }}>Hope you enjoy your meal! 🍽️</p>
              </div>

              {/* CTA Button */}
              <button
                onClick={() => {
                  setDisclaimerAccepted(true);
                }}
                style={{
                  width: '100%', padding: '14px',
                  background: 'linear-gradient(135deg, #00A859, #008F4C)',
                  color: 'white', border: 'none',
                  borderRadius: '12px', fontSize: '16px',
                  fontWeight: 700, fontFamily: "'Lato', sans-serif",
                  cursor: 'pointer',
                  transition: 'all 0.25s',
                  boxShadow: '0 4px 18px rgba(0, 168, 89, 0.35)',
                }}
              >
                Got it, Proceed to Booking →
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="cbf-wrapper"
      >
        {/* Header */}
        <div className="cbf-header">
          <div style={{ textAlign: 'center', marginBottom: '12px' }}>
            <img src={growmoreLogo} alt="Growmore Parking Solutions" style={{ width: '130px', height: 'auto', objectFit: 'contain' }} />
          </div>
          <h1>Valet Service for Cafe Quattro Babulnath</h1>
          <p>Book your valet parking in seconds</p>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); handlePayAndBook(); }} className="cbf-form">

          {/* ① Mobile Number — FIRST */}
          <div className="cbf-section">
            <div className="cbf-section-title">
              <Phone size={18} /> Mobile Number
            </div>
            <div className="cbf-field">
              <input
                type="tel"
                name="customerPhone"
                value={formData.customerPhone}
                onChange={handleChange}
                placeholder="10-digit mobile number"
                pattern="[0-9]{10}"
                maxLength="10"
                inputMode="numeric"
                required
              />
            </div>
          </div>

          {/* ② Vehicle Number */}
          <div className="cbf-section">
            <div className="cbf-section-title">
              <Car size={18} /> Vehicle Number
            </div>
            <div className="cbf-field">
              <input
                type="text"
                name="vehicleNumber"
                value={formData.vehicleNumber}
                onChange={handleChange}
                placeholder="MH12AB1234 or last 4 digits"
                minLength="4"
                required
                style={{ textTransform: 'uppercase' }}
              />
            </div>
          </div>

          {/* ④ Payment */}
          <div className="cbf-section cbf-payment-section">
            <div className="cbf-section-title">
              <CreditCard size={18} /> Payment
            </div>

            {/* Venue Fee */}
            <div className="cbf-venue-fee-row">
              <div className="cbf-venue-fee-info">
                <span className="cbf-venue-fee-label">
                  Parking charge
                </span>
                {venueLoading ? (
                  <span className="cbf-fee-loading">Loading fee…</span>
                ) : (
                  <span className="cbf-venue-fee-amount">₹{paymentAmount}</span>
                )}
              </div>
              <div className="cbf-fee-badge">Admin set</div>
            </div>

            {/* Payment Method Toggle */}
            <div className="cbf-field" style={{ marginTop: '16px', marginBottom: '16px' }}>
              <label>Select Payment Option</label>
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button
                  type="button"
                  style={{
                    flex: 1, padding: '12px', borderRadius: '10px',
                    border: paymentMethod === 'razorpay' ? '2.5px solid #00A859' : '2px solid #E2E8F0',
                    background: paymentMethod === 'razorpay' ? '#F0FDF4' : '#F8FAFC',
                    color: paymentMethod === 'razorpay' ? '#00A859' : '#475569',
                    fontWeight: '700', cursor: 'pointer', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', gap: '8px',
                    fontFamily: "'Lato', sans-serif", fontSize: '14px', transition: 'all 0.2s'
                  }}
                  onClick={() => { setPaymentMethod('razorpay'); setBtnState('idle'); }}
                >
                  <CreditCard size={18} /> Online
                </button>
                <button
                  type="button"
                  style={{
                    flex: 1, padding: '12px', borderRadius: '10px',
                    border: paymentMethod === 'cash' ? '2.5px solid #00A859' : '2px solid #E2E8F0',
                    background: paymentMethod === 'cash' ? '#F0FDF4' : '#F8FAFC',
                    color: paymentMethod === 'cash' ? '#00A859' : '#475569',
                    fontWeight: '700', cursor: 'pointer', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', gap: '8px',
                    fontFamily: "'Lato', sans-serif", fontSize: '14px', transition: 'all 0.2s'
                  }}
                  onClick={() => { setPaymentMethod('cash'); setBtnState('idle'); }}
                >
                  <IndianRupee size={18} /> Cash
                </button>
              </div>
            </div>

            {/* Cash info note */}
            {paymentMethod === 'cash' && (
              <div style={{
                background: '#FEF3C7', border: '1.5px solid #FDE68A', borderRadius: '12px',
                padding: '14px 16px', color: '#92400E', fontSize: '13.5px', lineHeight: '1.5',
                display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '4px'
              }}>
                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px', color: '#D97706' }} />
                <span>
                  You selected <strong>Cash Payment</strong>. Please pay <strong>₹{paymentAmount}</strong> in cash to the valet driver upon vehicle handover/collection.
                </span>
              </div>
            )}

            {paymentMethod === 'razorpay' && (
              <p className="cbf-payment-note">
                🔒 Secure payment powered by Razorpay. Your booking is confirmed automatically after payment.
              </p>
            )}

            {/* ── Failed retry banner ── */}
            <AnimatePresence>
              {btnState === 'failed' && (
                <motion.div
                  key="failed-banner"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="cbf-payment-failed-wrap"
                  style={{ marginTop: '10px' }}
                >
                  <div className="cbf-payment-status failed">
                    <AlertCircle size={20} color="#EF4444" />
                    <span className="cbf-ps-title">
                      {paymentMethod === 'razorpay' ? 'Payment Failed or Cancelled' : 'Booking Failed'}
                    </span>
                  </div>
                  <button type="button" className="cbf-retry-btn" onClick={handleRetry}>
                    <RefreshCw size={16} /> Try Again
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ─── SINGLE ACTION BUTTON ─────────────────────────── */}
          <motion.button
            type="submit"
            className="cbf-submit"
            disabled={isBtnBusy}
            whileHover={!isBtnBusy ? { scale: 1.02 } : {}}
            whileTap={!isBtnBusy ? { scale: 0.97 } : {}}
            style={{
              opacity: isBtnBusy ? 0.85 : 1,
              cursor: isBtnBusy ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px'
            }}
          >
            {getBtnLabel()}
          </motion.button>

        </form>

      </motion.div>
    </div>
  );
};

export default CustomerBookingForm;
