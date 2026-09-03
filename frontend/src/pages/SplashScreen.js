import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import logoVideo from '../logo.mp4';
import logo from '../logo.png';
import './SplashScreen.css';

const SplashScreen = () => {
  const navigate = useNavigate();
  const [videoFailed, setVideoFailed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/login');
    }, 3200);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="splash-screen">
      <motion.div
        initial={{ scale: 0.7, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.34, 1.56, 0.64, 1] }}
        className="splash-content"
      >
        <div className="logo-container">
          {videoFailed ? (
            <img
              src={logo}
              alt="GrowMore Logo"
              style={{ width: '100%', maxWidth: '280px', height: 'auto', borderRadius: '12px', display: 'block' }}
            />
          ) : (
            <video
              src={logoVideo}
              autoPlay
              muted
              playsInline
              webkit-playsinline="true"
              onError={() => setVideoFailed(true)}
              style={{ width: '100%', maxWidth: '380px', height: 'auto', borderRadius: '12px', display: 'block' }}
            />
          )}
        </div>

        <motion.p
          className="splash-tagline"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 0.8, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          Premium Valet Parking
        </motion.p>

        <motion.div
          className="splash-dots"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <div className="splash-dot" />
          <div className="splash-dot" />
          <div className="splash-dot" />
        </motion.div>
      </motion.div>
    </div>
  );
};

export default SplashScreen;
