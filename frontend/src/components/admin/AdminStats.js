import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Users, Car, FileText, TrendingUp, Activity,
  MapPin, ArrowUpRight, RefreshCw
} from 'lucide-react';
import api from '../../services/api';
import './AdminStats.css';

const StatCard = ({ icon: Icon, label, value, sub, color, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4 }}
    className="astat-card"
    style={{ '--accent': color }}
  >
    <div className="astat-icon-wrap" style={{ background: color + '18' }}>
      <Icon size={22} color={color} />
    </div>
    <div className="astat-body">
      <p className="astat-label">{label}</p>
      <h2 className="astat-value">{value}</h2>
      {sub && <span className="astat-sub">{sub}</span>}
    </div>
  </motion.div>
);

const AdminStats = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentBookings, setRecentBookings] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const [statsRes, bookingsRes] = await Promise.allSettled([
        api.get('/admin/stats'),
        api.get('/admin/all-bookings?limit=6&sort=newest')
      ]);
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
      if (bookingsRes.status === 'fulfilled') setRecentBookings(bookingsRes.value.data.bookings || []);
      if (statsRes.status === 'rejected') toast.error('Failed to fetch statistics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAll();
  };

  const completionRate = stats?.bookings?.total > 0
    ? ((stats.bookings.completed / stats.bookings.total) * 100).toFixed(1)
    : '0';

  const driverRatio = stats?.supervisors?.total > 0
    ? (stats.drivers.total / stats.supervisors.total).toFixed(1)
    : '0';

  const getStatusColor = (status) => ({
    'parked': '#10B981',
    'recall-requested': '#F59E0B',
    'in-transit': '#3B82F6',
    'arrived': '#8B5CF6',
    'completed': '#6B7280',
    'cancelled': '#EF4444'
  }[status] || '#9CA3AF');

  const getStatusLabel = (status) => ({
    'parked': 'Parked',
    'recall-requested': 'Recall Req.',
    'in-transit': 'In Transit',
    'arrived': 'Arrived',
    'completed': 'Completed',
    'cancelled': 'Cancelled'
  }[status] || status);

  if (loading) {
    return (
      <div className="astat-loading">
        {[1,2,3,4,5,6].map(i => (
          <div key={i} className="astat-skeleton loading-skeleton" style={{ height: '110px', borderRadius: '16px' }} />
        ))}
      </div>
    );
  }

  return (
    <div className="admin-stats-container">
      {/* Page Header */}
      <div className="astat-page-header">
        <div>
          <h2>Dashboard Overview</h2>
          <p>Real-time system statistics & monitoring</p>
        </div>
        <button className="refresh-btn" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw size={15} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Stats Grid */}
      <div className="astat-grid">
        <StatCard icon={Users}     label="Total Supervisors"  value={stats?.supervisors?.total || 0}  sub={`${stats?.supervisors?.active || 0} active`}  color="#8B5CF6" delay={0} />
        <StatCard icon={Car}       label="Total Drivers"      value={stats?.drivers?.total || 0}      sub={`${stats?.drivers?.active || 0} active`}      color="#3B82F6" delay={0.07} />
        <StatCard icon={FileText}  label="Total Bookings"     value={stats?.bookings?.total || 0}     sub={`${stats?.bookings?.completed || 0} completed`} color="#10B981" delay={0.14} />
        <StatCard icon={Activity}  label="Active Bookings"    value={stats?.bookings?.active || 0}    sub="In progress right now"                        color="#FF6B35" delay={0.21} />
        <StatCard icon={MapPin}    label="Venues"             value={stats?.venues?.total || 0}       sub={`${stats?.venues?.active || 0} active`}       color="#F59E0B" delay={0.28} />
        <StatCard icon={TrendingUp} label="Completion Rate"   value={`${completionRate}%`}            sub="Of all bookings"                              color="#06B6D4" delay={0.35} />
      </div>

      {/* Bottom Row */}
      <div className="astat-info-row">
        {/* System Health */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="astat-info-card"
        >
          <h3>⚙️ System Health</h3>
          <div className="health-items">
            <div className="health-item">
              <span>Driver : Supervisor Ratio</span>
              <strong>{driverRatio} : 1</strong>
            </div>
            <div className="health-item">
              <span>Booking Completion Rate</span>
              <strong style={{ color: '#10B981' }}>{completionRate}%</strong>
            </div>
            <div className="health-item">
              <span>Active Venues</span>
              <strong>{stats?.venues?.active || 0} / {stats?.venues?.total || 0}</strong>
            </div>
            <div className="health-item">
              <span>Active Drivers</span>
              <strong>{stats?.drivers?.active || 0} / {stats?.drivers?.total || 0}</strong>
            </div>
          </div>
        </motion.div>

        {/* Recent Bookings */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="astat-recent-card"
        >
          <h3>🕐 Recent Bookings</h3>
          {recentBookings.length === 0 ? (
            <div className="astat-empty">No recent bookings found</div>
          ) : (
            <div className="recent-list">
              {recentBookings.map((b) => (
                <div key={b._id} className="recent-item">
                  <div className="recent-left">
                    <span className="recent-id">{b.bookingId}</span>
                    <span className="recent-customer">{b.customer?.name || b.customer?.phone}</span>
                  </div>
                  <div className="recent-right">
                    <span
                      className="recent-status"
                      style={{ background: getStatusColor(b.status) + '20', color: getStatusColor(b.status) }}
                    >
                      {getStatusLabel(b.status)}
                    </span>
                    <span className="recent-time">
                      {new Date(b.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default AdminStats;
