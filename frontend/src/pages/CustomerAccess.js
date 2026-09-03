import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import api from '../services/api';
import growmoreLogo from '../growmore-logo.png';
import './CustomerLogin.css';

const CustomerAccess = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const handleAutoLogin = async () => {
      try {
        const response = await api.get(`/auth/customer/access/${token}`);
        const { token: authToken, user } = response.data;
        localStorage.setItem('token', authToken);
        localStorage.setItem('user', JSON.stringify(user));
        if (setUser) setUser(user);
        toast.success('Welcome back!');
        setTimeout(() => { navigate('/customer/dashboard'); }, 500);
      } catch (err) {
        console.error('Auto-login error:', err);
        const status = err.response?.status;
        const msg = err.response?.data?.message || 'Invalid or expired link';
        setError(msg);
        if (status === 401) {
          // Expired link — don't auto-redirect, let user tap login
          setIsExpired(true);
        } else {
          toast.error('Failed to access booking. Please try the customer login.');
          setTimeout(() => { navigate('/customer/login'); }, 3000);
        }
      } finally {
        setLoading(false);
      }
    };
    handleAutoLogin();
  }, [token, navigate, setUser]);

  return (
    <div className="login-page" style={{ background: '#F0FDF4' }}>
      <div className="login-container">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="login-header"
          style={{ textAlign: 'center', padding: '32px 24px' }}
        >
          <img src={growmoreLogo} alt="Growmore Parking Solutions" style={{ width: '140px', height: 'auto', objectFit: 'contain', marginBottom: '12px', display: 'block', margin: '0 auto 12px' }} />
          <h2 style={{ fontFamily: "'Lora', serif", color: '#262938', marginBottom: '8px' }}>Cafe Quattro Babulnath Valet</h2>

          {loading && (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                style={{ margin: '24px auto', width: 40, height: 40, borderRadius: '50%',
                         border: '3px solid #DCFCE7', borderTopColor: '#00A859' }}
              />
              <p style={{ color: '#64748B', fontSize: '14px' }}>Accessing your booking…</p>
            </>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                marginTop: '20px',
                padding: '20px',
                background: isExpired ? '#FEF3C7' : '#FEE2E2',
                borderRadius: '14px',
                border: `1.5px solid ${isExpired ? '#FDE68A' : '#FECACA'}`,
                color: isExpired ? '#92400E' : '#DC2626'
              }}
            >
              <p style={{ fontWeight: 700, fontSize: '15px', marginBottom: '8px' }}>
                {isExpired ? '⏰ Link Expired' : '❌ Access Failed'}
              </p>
              <p style={{ fontSize: '13px', lineHeight: '1.5' }}>{error}</p>
              {isExpired ? (
                <button
                  onClick={() => navigate('/customer/login')}
                  style={{
                    marginTop: '16px', padding: '11px 24px',
                    background: 'linear-gradient(135deg, #00A859, #008F4C)',
                    color: 'white', border: 'none', borderRadius: '10px',
                    fontSize: '14px', fontWeight: 700, fontFamily: "'Lato', sans-serif",
                    cursor: 'pointer', width: '100%',
                    boxShadow: '0 4px 14px rgba(0, 168, 89, 0.35)'
                  }}
                >
                  Go to Login →
                </button>
              ) : (
                <p style={{ fontSize: '12px', marginTop: '10px', color: '#9CA3AF' }}>Redirecting to login…</p>
              )}
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default CustomerAccess;
