import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { LogIn, User, Shield, Eye, EyeOff } from 'lucide-react';
import './LoginPage.css';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, logout } = useAuth();
  const [formData, setFormData] = useState({ phone: '', password: '', role: 'driver' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await login(formData, formData.role);
      if (result.success) {
        if (result.user.role === 'admin') {
          toast.error('Admin login is not allowed here. Please use the admin portal.');
          logout();
          setLoading(false);
          return;
        }
        toast.success(`Welcome back, ${result.user.name}!`);
        if (result.user.role === 'driver') {
          navigate('/driver/create-booking');
        } else if (result.user.role === 'supervisor') {
          navigate('/supervisor/dashboard');
        } else if (result.user.role === 'manager') {
          navigate('/manager/dashboard');
        }
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-orb-top" />

      <div className="login-container">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="login-header"
        >
          <div className="logo-small">
            <img src={require('../logo.png')} alt="Growmore Parking Solutions" style={{ width: '220px', height: 'auto', objectFit: 'contain' }} />
          </div>
          <p>Cafe Quattro Babulnath — Valet Parking</p>
        </motion.div>

        <motion.form
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          onSubmit={handleSubmit}
          className="login-form"
        >
          {/* Role Selector */}
          <div className="form-group">
            <label>Login As</label>
            <div className="role-selector">
              <button
                type="button"
                className={`role-btn ${formData.role === 'driver' ? 'active' : ''}`}
                onClick={() => setFormData({ ...formData, role: 'driver' })}
              >
                <User size={18} />
                Driver
              </button>
              <button
                type="button"
                className={`role-btn ${formData.role === 'supervisor' ? 'active' : ''}`}
                onClick={() => setFormData({ ...formData, role: 'supervisor' })}
              >
                <Shield size={18} />
                Supervisor
              </button>
            </div>
          </div>

          {/* Phone */}
          <div className="form-group">
            <label htmlFor="phone">Phone Number</label>
            <div className="input-wrapper">
              <input
                type="tel"
                id="phone"
                name="phone"
                placeholder="Enter 10-digit phone number"
                value={formData.phone}
                onChange={handleChange}
                required
                pattern="[0-9]{10}"
                maxLength="10"
              />
            </div>
          </div>

          {/* Password */}
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                required
              />
              <button
                type="button"
                className="pw-toggle"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex="-1"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? (
              <>
                <div className="btn-spinner" />
                Logging in...
              </>
            ) : (
              <>
                <LogIn size={18} />
                Login
              </>
            )}
          </button>

          <div className="divider"><span>OR</span></div>

          <button
            type="button"
            className="customer-btn"
            onClick={() => navigate('/customer/login')}
          >
            Customer Login
          </button>


        </motion.form>
      </div>
    </div>
  );
};

export default LoginPage;
