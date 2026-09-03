import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { ArrowLeft, LogIn } from 'lucide-react';
import api from '../services/api';
import './CustomerLogin.css';

const CustomerLogin = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [step, setStep] = useState(1); // 1: phone, 2: otp
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequestOTP = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post('/auth/customer/request-otp', { phone });
      toast.success('OTP sent to your phone!');
      setStep(2);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await login({ phone, otp, name }, 'customer');
      
      if (result.success) {
        toast.success('Login successful!');
        navigate('/customer/dashboard');
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="customer-login-page">
      <button className="back-btn" onClick={() => navigate('/login')}>
        <ArrowLeft size={20} />
        Back
      </button>

      <div className="customer-login-container">
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          className="login-header"
        >
        </motion.div>

        {step === 1 ? (
          <motion.form
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            onSubmit={handleRequestOTP}
            className="login-form"
          >
            <div className="form-group">
              <label htmlFor="phone">Phone Number</label>
              <div className="input-wrapper">
                <input
                  type="tel"
                  id="phone"
                  placeholder="Enter your phone number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  pattern="[0-9]{10}"
                  maxLength="10"
                />
              </div>
              <small>We'll send you a verification code</small>
            </div>

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? 'Sending...' : 'Send OTP'}
            </button>
          </motion.form>
        ) : (
          <motion.form
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            onSubmit={handleVerifyOTP}
            className="login-form"
          >
            <div className="form-group">
              <label htmlFor="otp">Enter OTP</label>
              <div className="input-wrapper">
                <LogIn size={20} className="input-icon" />
                <input
                  type="text"
                  id="otp"
                  placeholder="6-digit code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                  pattern="[0-9]{6}"
                  maxLength="6"
                />
              </div>
              <small>OTP sent to {phone}</small>
            </div>

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? 'Verifying...' : 'Verify & Login'}
            </button>

            <button
              type="button"
              className="resend-btn"
              onClick={() => setStep(1)}
            >
              Change Phone Number
            </button>
          </motion.form>
        )}
      </div>
    </div>
  );
};

export default CustomerLogin;
