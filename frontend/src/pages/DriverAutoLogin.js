import React, { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const DriverAutoLogin = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, user } = useAuth();
  const [searchParams] = useSearchParams();
  const attempted = useRef(false);

  useEffect(() => {
    // If already logged in as driver, go straight to create booking
    if (isAuthenticated && user?.role === 'driver') {
      navigate('/driver/create-booking', { replace: true });
      return;
    }

    if (attempted.current) return;
    attempted.current = true;

    const phone = searchParams.get('phone');
    const password = searchParams.get('password');

    if (!phone || !password) {
      toast.error('Missing credentials in URL');
      navigate('/login', { replace: true });
      return;
    }

    const doLogin = async () => {
      const result = await login({ phone, password, role: 'driver' }, 'driver');
      if (result.success && result.user.role === 'driver') {
        toast.success(`Welcome, ${result.user.name}!`);
        navigate('/driver/create-booking', { replace: true });
      } else {
        toast.error(result.message || 'Auto-login failed');
        navigate('/login', { replace: true });
      }
    };

    doLogin();
  }, [isAuthenticated, user, login, navigate, searchParams]);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      background: '#f5f5f5',
      flexDirection: 'column',
      gap: '16px'
    }}>
      <div style={{
        width: '40px', height: '40px',
        border: '4px solid #FF6B35',
        borderTopColor: 'transparent',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite'
      }} />
      <p style={{ color: '#555', fontFamily: 'sans-serif' }}>Logging in...</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default DriverAutoLogin;
