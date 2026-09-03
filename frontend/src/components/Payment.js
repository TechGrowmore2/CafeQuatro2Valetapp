import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { CreditCard, Smartphone, DollarSign, CheckCircle, ArrowLeft } from 'lucide-react';
import api from '../services/api';
import './Payment.css';

const Payment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { booking } = location.state || {};
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [processing, setProcessing] = useState(false);
  const [amount, setAmount] = useState('');

  useEffect(() => {
    if (!booking) {
      toast.error('No booking found');
      navigate('/driver/home');
    }
  }, [booking, navigate]);

  const handlePayment = async () => {
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setProcessing(true);
    try {
      await api.put(`/bookings/${booking._id}`, {
        payment: {
          method: paymentMethod,
          amount: parseFloat(amount),
          status: 'completed',
          paidAt: new Date()
        },
        paymentStatus: 'paid'
      });

      toast.success('Payment recorded successfully!');
      navigate('/driver/bookings');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to record payment');
    } finally {
      setProcessing(false);
    }
  };

  if (!booking) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="payment-container"
    >
      <div className="payment-header">
        <button 
          className="back-btn"
          onClick={() => navigate('/driver/create-booking')}
        >
          <ArrowLeft size={20} />
          Back
        </button>
        <h2>Payment Required</h2>
      </div>

      <div className="payment-content">
        <div className="booking-summary">
          <h3>Booking Details</h3>
          <div className="summary-item">
            <span className="label">Booking ID:</span>
            <span className="value">{booking.bookingId}</span>
          </div>
          <div className="summary-item">
            <span className="label">Customer:</span>
            <span className="value">{booking.customerName}</span>
          </div>
          <div className="summary-item">
            <span className="label">Phone:</span>
            <span className="value">{booking.customerPhone}</span>
          </div>
          <div className="summary-item">
            <span className="label">Vehicle:</span>
            <span className="value">{booking.vehicleNumber}</span>
          </div>
          <div className="summary-item">
            <span className="label">Venue:</span>
            <span className="value highlight">{booking.venue}</span>
          </div>
        </div>

        <div className="payment-section">
          <h3><DollarSign size={20} /> Payment Details</h3>
          
          <div className="amount-input-group">
            <label htmlFor="amount">Amount *</label>
            <div className="amount-input-wrapper">
              <span className="currency">₹</span>
              <input
                type="number"
                id="amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                min="1"
                step="0.01"
                required
              />
            </div>
          </div>

          <div className="payment-methods">
            <label>Payment Method *</label>
            <div className="payment-options">
              <button
                type="button"
                className={`payment-option ${paymentMethod === 'cash' ? 'active' : ''}`}
                onClick={() => setPaymentMethod('cash')}
              >
                <DollarSign size={24} />
                <span>Cash</span>
              </button>
              <button
                type="button"
                className={`payment-option ${paymentMethod === 'upi' ? 'active' : ''}`}
                onClick={() => setPaymentMethod('upi')}
              >
                <Smartphone size={24} />
                <span>UPI</span>
              </button>
              <button
                type="button"
                className={`payment-option ${paymentMethod === 'card' ? 'active' : ''}`}
                onClick={() => setPaymentMethod('card')}
              >
                <CreditCard size={24} />
                <span>Card</span>
              </button>
            </div>
          </div>

          <button
            className="confirm-payment-btn"
            onClick={handlePayment}
            disabled={processing || !amount}
          >
            {processing ? (
              'Processing...'
            ) : (
              <>
                <CheckCircle size={20} />
                Confirm Payment & Complete Booking
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default Payment;
