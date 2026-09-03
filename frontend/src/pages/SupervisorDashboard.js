import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import toast from 'react-hot-toast';
import {
  LogOut, Activity, Car, Clock, TrendingUp, Download,
  CreditCard, CheckCircle, XCircle, BarChart2, Calendar, Search
} from 'lucide-react';
import api from '../services/api';
import logo from '../logo.png';
import './SupervisorDashboard.css';

/* ─── Mini Bar Chart (pure SVG) ──────────────────────────── */
const MiniBarChart = ({ data, height = 100, color = '#8B5CF6' }) => {
  const [tooltip, setTooltip] = useState(null);
  if (!data || data.length === 0) return <div className="svtx-no-data">No data for this period</div>;
  const max = Math.max(...data.map(d => d.amount), 1);
  const barW = Math.max(6, Math.floor(460 / data.length) - 4);
  const totalWidth = data.length * (barW + 4);

  return (
    <div style={{ overflowX: 'auto', paddingBottom: 4, position: 'relative' }}>
      {tooltip && (
        <div style={{
          position: 'absolute', top: 0, left: Math.min(tooltip.x, totalWidth - 140),
          background: 'rgba(26,26,46,0.95)', color: '#fff', borderRadius: 8,
          padding: '6px 12px', fontSize: 12, fontWeight: 600, zIndex: 10,
          pointerEvents: 'none', whiteSpace: 'nowrap', backdropFilter: 'blur(4px)',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          ₹{tooltip.amount.toLocaleString('en-IN')} • {tooltip.count} txn{tooltip.count !== 1 ? 's' : ''}<br />
          <span style={{ fontWeight: 400, opacity: 0.8, fontSize: 11 }}>{tooltip.label}</span>
        </div>
      )}
      <svg width={totalWidth} height={height + 24} style={{ display: 'block' }}>
        {data.map((d, i) => {
          const bH = Math.max(d.amount > 0 ? 4 : 1, Math.round((d.amount / max) * height));
          const x = i * (barW + 4);
          const y = height - bH;
          const isLast = i === data.length - 1;
          const barColor = d.amount > 0 ? (isLast ? '#FF6B35' : color) : '#E5E7EB';
          return (
            <g key={i}
              onMouseEnter={() => setTooltip({ x: x + barW / 2, amount: d.amount, count: d.count, label: d.label })}
              onMouseLeave={() => setTooltip(null)}
              style={{ cursor: d.amount > 0 ? 'pointer' : 'default' }}
            >
              <rect x={x} y={y} width={barW} height={bH} rx={3} fill={barColor} opacity={isLast ? 1 : 0.82} />
              {(i % Math.ceil(data.length / 10) === 0 || isLast) && (
                <text x={x + barW / 2} y={height + 18} textAnchor="middle" fontSize="8" fill="#9CA3AF">
                  {d.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};

/* ─── Quick-select presets for custom date picker ─── */
const DATE_PRESETS = [
  { label: 'Today', getDates: () => { const d = new Date(); return { from: d.toISOString().split('T')[0], to: d.toISOString().split('T')[0] }; } },
  { label: 'Yesterday', getDates: () => { const d = new Date(); d.setDate(d.getDate() - 1); return { from: d.toISOString().split('T')[0], to: d.toISOString().split('T')[0] }; } },
  { label: 'Last 7 Days', getDates: () => { const to = new Date(); const from = new Date(); from.setDate(from.getDate() - 6); return { from: from.toISOString().split('T')[0], to: to.toISOString().split('T')[0] }; } },
  { label: 'Last 30 Days', getDates: () => { const to = new Date(); const from = new Date(); from.setDate(from.getDate() - 29); return { from: from.toISOString().split('T')[0], to: to.toISOString().split('T')[0] }; } },
  { label: 'This Month', getDates: () => { const now = new Date(); const from = new Date(now.getFullYear(), now.getMonth(), 1); return { from: from.toISOString().split('T')[0], to: now.toISOString().split('T')[0] }; } },
];

const SupervisorDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { socket, on, off } = useSocket();
  const [stats,    setStats]    = useState({});
  const [bookings, setBookings] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState('active');
  const [dateFilter, setDateFilter] = useState('today');
  const [activeTab, setActiveTab] = useState('bookings');

  // Transaction state
  const [txnData, setTxnData]   = useState(null);
  const [txnLoading, setTxnLoading] = useState(false);
  const [txnChartView, setTxnChartView] = useState('daily');

  // Custom date range state
  const today = new Date().toISOString().split('T')[0];
  const [customFrom, setCustomFrom] = useState(today);
  const [customTo,   setCustomTo]   = useState(today);
  const [customData, setCustomData] = useState(null);
  const [customLoading, setCustomLoading] = useState(false);
  const [customChartView, setCustomChartView] = useState('hourly');
  const [activePreset, setActivePreset] = useState('Today');

  // Export panel state
  const [showExportPanel, setShowExportPanel] = useState(false);
  const [exportFrom, setExportFrom] = useState(today);
  const [exportTo,   setExportTo]   = useState(today);
  const [exportPreset, setExportPreset] = useState('Today');
  const [exportLoading, setExportLoading] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const response = await api.get('/bookings/stats/overview');
      setStats(response.data);
    } catch { console.error('Failed to fetch stats'); }
  }, []);

  const fetchBookings = useCallback(async () => {
    try {
      let fromDate = new Date();
      let toDate = new Date();
      fromDate.setHours(0, 0, 0, 0);
      toDate.setHours(23, 59, 59, 999);

      if (dateFilter === 'week') {
        fromDate.setDate(fromDate.getDate() - 7);
      } else if (dateFilter === 'month') {
        fromDate.setMonth(fromDate.getMonth() - 1);
      } else if (dateFilter === 'all') {
        fromDate = new Date(2020, 0, 1);
      }

      const params = filter === 'all'
        ? {}
        : { status: filter === 'active' ? 'parked,recall-requested,in-transit,arrived' : 'completed' };

      params.from = fromDate.toISOString();
      params.to   = toDate.toISOString();

      const response = await api.get('/bookings/all', { params });
      setBookings(response.data.bookings);
    } catch { toast.error('Failed to fetch bookings'); }
    finally { setLoading(false); }
  }, [filter, dateFilter]);

  const fetchTransactions = useCallback(async () => {
    setTxnLoading(true);
    try {
      const res = await api.get('/admin/revenue-stats');
      setTxnData(res.data);
    } catch { toast.error('Failed to load transaction data'); }
    finally { setTxnLoading(false); }
  }, []);

  const fetchCustomAnalytics = useCallback(async (from, to) => {
    if (!from || !to) return;
    setCustomLoading(true);
    try {
      const res = await api.get('/admin/revenue-stats/custom', { params: { from, to } });
      setCustomData(res.data);
      // Auto-select chart type based on range
      if (res.data.hourlyBreakdown) setCustomChartView('hourly');
      else setCustomChartView('daily');
    } catch { toast.error('Failed to load custom analytics'); }
    finally { setCustomLoading(false); }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchBookings();
  }, [filter, dateFilter, fetchStats, fetchBookings]);

  useEffect(() => {
    if (activeTab === 'transactions' && !txnData) {
      fetchTransactions();
    }
  }, [activeTab, txnData, fetchTransactions]);

  // Load custom analytics for "Today" on transactions tab first open
  useEffect(() => {
    if (activeTab === 'transactions') {
      fetchCustomAnalytics(customFrom, customTo);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    if (socket) {
      const handleNewBooking = () => {
        toast.success('New booking created!');
        fetchStats();
        fetchBookings();
      };
      on('new-booking', handleNewBooking);
      return () => { off('new-booking', handleNewBooking); };
    }
  }, [socket, on, off, fetchStats, fetchBookings]);

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const formatTime = (date) => {
    if (!date) return '—';
    return new Date(date).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const formatDuration = (booking) => {
    const start = booking.createdAt;
    const end   = booking.parking?.actualEndTime || booking.updatedAt;
    if (!start) return '—';
    if (booking.status !== 'completed') return 'Active';
    const ms = new Date(end) - new Date(start);
    if (ms <= 0) return '—';
    const totalMins = Math.floor(ms / 60000);
    const hrs  = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  // Payment method as clean text (no emoji) for CSV
  const getPaymentMethodText = (m) => ({
    razorpay: 'Razorpay', cash: 'Cash', upi: 'UPI',
    card: 'Card', qr: 'QR', staff: 'Staff', foc: 'FOC', pending: 'Pending'
  }[m] || m || 'Pending');

  const generateCSV = (data) => {
    const headers = [
      'Sr. No.', 'Booking ID', 'Customer Name', 'Customer Phone',
      'Vehicle Number', 'Driver Name', 'Status',
      'Booking Time', 'Recall Time', 'Complete Time',
      'Duration', 'Venue', 'Parking Spot', 'Payment Method'
    ];
    const rows = data.map((b, idx) => [
      idx + 1,
      b.bookingId || '', b.customer?.name || '', b.customer?.phone || '',
      b.vehicle?.number || '', b.driver?.name || 'N/A', b.status || '',
      formatTime(b.createdAt), formatTime(b.recall?.requestedAt),
      formatTime(b.parking?.actualEndTime), formatDuration(b),
      b.location?.venue || '', b.location?.parkingSpot || '',
      getPaymentMethodText(b.payment?.method)
    ]);
    return [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
  };

  const triggerDownload = (csvContent, from, to) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.setAttribute('href', URL.createObjectURL(blob));
    const fromLabel = from || new Date().toISOString().split('T')[0];
    const toLabel   = to   || fromLabel;
    const filename  = from === to
      ? `bookings-${fromLabel}.csv`
      : `bookings-${fromLabel}-to-${toLabel}.csv`;
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportDownload = async () => {
    if (!exportFrom || !exportTo) return toast.error('Please select both dates');
    if (new Date(exportFrom) > new Date(exportTo)) return toast.error('From date must be before To date');
    setExportLoading(true);
    try {
      // Build date range
      const fromDate = new Date(exportFrom); fromDate.setHours(0, 0, 0, 0);
      const toDate   = new Date(exportTo);   toDate.setHours(23, 59, 59, 999);
      // Fetch all bookings for the date range (no status filter for export)
      const res = await api.get('/bookings/all', {
        params: { from: fromDate.toISOString(), to: toDate.toISOString() }
      });
      const data = res.data.bookings || [];
      if (data.length === 0) {
        toast.error('No bookings found for this date range');
        setExportLoading(false);
        return;
      }
      const csv = generateCSV(data);
      triggerDownload(csv, exportFrom, exportTo);
      toast.success(`Downloaded ${data.length} bookings!`);
      setShowExportPanel(false);
    } catch { toast.error('Failed to export CSV'); }
    finally { setExportLoading(false); }
  };

  const handleExportPreset = (preset) => {
    setExportPreset(preset.label);
    const { from, to } = preset.getDates();
    setExportFrom(from);
    setExportTo(to);
  };

  const fmt = (n) => `₹${(n || 0).toLocaleString('en-IN')}`;

  const txnChartData = {
    daily: txnData?.dailyBreakdown || [],
    weekly: txnData?.weeklyBreakdown || [],
    monthly: txnData?.monthlyBreakdown || []
  }[txnChartView];

  const paymentMethodColors = {
    razorpay: '#6366F1', cash: '#10B981', upi: '#F59E0B',
    card: '#3B82F6', qr: '#8B5CF6', staff: '#EC4899', foc: '#14B8A6', pending: '#9CA3AF'
  };

  const getPaymentMethodLabel = (m) => ({
    razorpay: '💳 Razorpay', cash: '💵 Cash', upi: '📱 UPI',
    card: '🃏 Card', qr: '🔲 QR', staff: '👷 Staff', foc: '🎁 FOC', pending: '⏳ Pending'
  }[m] || m);

  const statCards = [
    { label: "Today's Bookings", value: stats.todayBookings  || 0, icon: TrendingUp, color: '#3B82F6' },
    { label: 'Active Bookings',  value: stats.activeBookings || 0, icon: Activity,   color: '#FF6B35' },
    { label: 'Completed',        value: stats.completedBookings || 0, icon: Car,     color: '#10B981' },
    { label: 'Total Bookings',   value: stats.totalBookings  || 0, icon: Clock,      color: '#8B5CF6' }
  ];

  const handlePreset = (preset) => {
    setActivePreset(preset.label);
    const { from, to } = preset.getDates();
    setCustomFrom(from);
    setCustomTo(to);
    fetchCustomAnalytics(from, to);
  };

  const handleCustomSearch = () => {
    if (!customFrom || !customTo) return toast.error('Please select both dates');
    if (new Date(customFrom) > new Date(customTo)) return toast.error('From date must be before To date');
    setActivePreset(null);
    fetchCustomAnalytics(customFrom, customTo);
  };

  // Determine which chart data to use for custom analytics
  const customChartData = customData
    ? (customChartView === 'hourly' && customData.hourlyBreakdown
        ? customData.hourlyBreakdown
        : customData.dailyBreakdown || [])
    : [];

  const diffDays = customData?.range?.days || 1;
  const hasHourly = customData?.hourlyBreakdown != null;
  const hasDaily  = customData?.dailyBreakdown  != null;

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-left">
          <img src={logo} alt="Logo" style={{ width: '42px', height: 'auto', objectFit: 'contain' }} />
          <div>
            <h2>Supervisor Dashboard</h2>
            <p>{user?.name}</p>
          </div>
        </div>
        <div className="header-right">
          {activeTab === 'bookings' && (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowExportPanel(p => !p)}
                className="export-btn"
                style={{ marginRight: '10px' }}
              >
                <Download size={18} /> Export CSV
              </button>

              {/* Export Options Panel */}
              <AnimatePresence>
                {showExportPanel && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.97 }}
                    transition={{ duration: 0.18 }}
                    className="export-panel"
                  >
                    <div className="export-panel-header">
                      <span>📊 Download Bookings</span>
                      <button onClick={() => setShowExportPanel(false)} className="export-panel-close">✕</button>
                    </div>

                    {/* Quick presets */}
                    <div className="export-panel-presets">
                      {DATE_PRESETS.map(p => (
                        <button
                          key={p.label}
                          className={`svtx-preset-btn ${exportPreset === p.label ? 'active' : ''}`}
                          style={{ fontSize: 11, padding: '4px 10px' }}
                          onClick={() => handleExportPreset(p)}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>

                    {/* Date inputs */}
                    <div className="export-panel-dates">
                      <div className="svtx-date-field">
                        <label>From</label>
                        <input
                          type="date"
                          value={exportFrom}
                          max={exportTo || today}
                          className="svtx-date-input"
                          onChange={e => { setExportFrom(e.target.value); setExportPreset(null); }}
                        />
                      </div>
                      <div className="svtx-date-field">
                        <label>To</label>
                        <input
                          type="date"
                          value={exportTo}
                          min={exportFrom}
                          max={today}
                          className="svtx-date-input"
                          onChange={e => { setExportTo(e.target.value); setExportPreset(null); }}
                        />
                      </div>
                    </div>

                    <div className="export-panel-info">
                      📋 Sr. No. · Booking ID · Customer · Vehicle · Driver · Status · Times · Duration · Venue · <strong>Payment Method</strong>
                    </div>

                    <button
                      className="svtx-search-btn"
                      style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}
                      onClick={handleExportDownload}
                      disabled={exportLoading}
                    >
                      <Download size={15} />
                      {exportLoading ? 'Fetching…' : 'Download CSV'}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
          {activeTab === 'transactions' && (
            <button onClick={fetchTransactions} className="export-btn" style={{ marginRight: '10px' }} disabled={txnLoading}>
              <BarChart2 size={18} /> {txnLoading ? 'Loading…' : 'Refresh'}
            </button>
          )}
          <button onClick={handleLogout} className="logout-btn">
            <LogOut size={20} /> Logout
          </button>
        </div>
      </header>

      <main className="supervisor-content">

        {/* Stats Cards */}
        <div className="stats-grid">
          {statCards.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="stat-card"
              style={{ borderTop: `3px solid ${stat.color}` }}
            >
              <div className="stat-icon" style={{ background: `${stat.color}18` }}>
                <stat.icon size={24} color={stat.color} />
              </div>
              <div style={{ flex: 1 }}>
                <p className="stat-label">{stat.label}</p>
                <h3 className="stat-value">{stat.value}</h3>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Tab Switcher */}
        <div className="sv-tab-row">
          <button
            className={`sv-tab ${activeTab === 'bookings' ? 'active' : ''}`}
            onClick={() => setActiveTab('bookings')}
          >
            <Car size={16} /> Bookings
          </button>
          <button
            className={`sv-tab ${activeTab === 'transactions' ? 'active' : ''}`}
            onClick={() => setActiveTab('transactions')}
          >
            <CreditCard size={16} /> Transactions
          </button>
        </div>

        <AnimatePresence mode="wait">
          {/* ══ BOOKINGS TAB ══ */}
          {activeTab === 'bookings' && (
            <motion.div
              key="bookings"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bookings-section"
            >
              <div className="section-header">
                <h3>All Bookings</h3>
                <div className="filter-buttons">
                  {['active', 'completed', 'all'].map(f => (
                    <button
                      key={f}
                      className={filter === f ? 'active' : ''}
                      onClick={() => setFilter(f)}
                    >
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="date-filters" style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                {['today','week','month','all'].map(df => (
                  <button
                    key={df}
                    className={`filter-btn ${dateFilter === df ? 'active' : ''}`}
                    onClick={() => setDateFilter(df)}
                  >
                    {df === 'today' ? 'Today' : df === 'week' ? 'This Week' : df === 'month' ? 'This Month' : 'All Time'}
                  </button>
                ))}
              </div>

              {loading ? (
                <div className="loading">Loading...</div>
              ) : (
                <div className="bookings-table">
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: 48 }}>Sr.</th>
                        <th>Booking ID</th>
                        <th>Customer</th>
                        <th>Vehicle</th>
                        <th>Driver</th>
                        <th>Status</th>
                        <th>Payment</th>
                        <th>Booking Time</th>
                        <th>Recall Time</th>
                        <th>Complete Time</th>
                        <th>Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.map((booking, idx) => {
                        const duration = formatDuration(booking);
                        const isActive = booking.status !== 'completed';
                        return (
                          <tr key={booking._id}>
                            <td style={{ color: '#9CA3AF', fontSize: 12, fontWeight: 700, textAlign: 'center' }}><strong>{idx + 1}</strong></td>
                            <td><strong>{booking.bookingId}</strong></td>
                            <td>
                              {booking.customer?.name || booking.customer?.phone}<br/>
                              <small>{booking.customer?.phone}</small>
                            </td>
                            <td>{booking.vehicle?.number}</td>
                            <td>{booking.driver?.name || 'N/A'}</td>
                            <td>
                              <span className={`status-badge status-${booking.status}`}>
                                {booking.status}
                              </span>
                            </td>
                            <td>
                              <span style={{
                                display: 'inline-block',
                                padding: '3px 9px',
                                borderRadius: 20,
                                fontSize: 11,
                                fontWeight: 600,
                                background: (paymentMethodColors[booking.payment?.method] || '#9CA3AF') + '20',
                                color: paymentMethodColors[booking.payment?.method] || '#6B7280'
                              }}>
                                {getPaymentMethodLabel(booking.payment?.method || 'pending')}
                                {booking.payment?.amount ? ` ₹${booking.payment.amount}` : ''}
                              </span>
                            </td>
                            <td><small>{formatTime(booking.createdAt)}</small></td>
                            <td><small>{formatTime(booking.recall?.requestedAt)}</small></td>
                            <td><small>{formatTime(booking.parking?.actualEndTime)}</small></td>
                            <td>
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                                background: isActive ? '#FFF5F2' : '#ECFDF5',
                                color: isActive ? '#FF6B35' : '#10B981',
                                border: `1px solid ${isActive ? '#FFD9CC' : '#A7F3D0'}`
                              }}>
                                <Clock size={11} />
                                {duration}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {bookings.length === 0 && (
                    <div className="empty-table">No bookings found</div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* ══ TRANSACTIONS TAB ══ */}
          {activeTab === 'transactions' && (
            <motion.div
              key="transactions"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="svtx-container"
            >
              {txnLoading ? (
                <div className="loading">Loading transaction data...</div>
              ) : (
                <>
                  {/* Revenue Cards */}
                  <div className="svtx-cards">
                    {[
                      { label: "Today", value: fmt(txnData?.today?.amount), count: txnData?.today?.count, icon: Calendar, color: '#FF6B35' },
                      { label: "This Week", value: fmt(txnData?.week?.amount), count: txnData?.week?.count, icon: TrendingUp, color: '#6366F1' },
                      { label: "This Month", value: fmt(txnData?.month?.amount), count: txnData?.month?.count, icon: BarChart2, color: '#10B981' },
                      { label: "All Time", value: fmt(txnData?.allTime?.amount), count: txnData?.allTime?.count, icon: Activity, color: '#F59E0B' },
                    ].map((c, i) => (
                      <motion.div
                        key={c.label}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.07 }}
                        className="svtx-card"
                        style={{ '--svtx-color': c.color, borderTop: `3px solid ${c.color}` }}
                      >
                        <div className="svtx-card-icon" style={{ background: c.color + '18' }}>
                          <c.icon size={20} color={c.color} />
                        </div>
                        <div>
                          <p className="svtx-card-label">{c.label}</p>
                          <h3 className="svtx-card-value">{c.value}</h3>
                          <span className="svtx-card-count">{c.count || 0} transactions</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Payment Status */}
                  <div className="svtx-status-row">
                    <div className="svtx-status-item success">
                      <CheckCircle size={24} color="#10B981" />
                      <div>
                        <span className="svtx-si-count">{txnData?.paymentStatus?.successful?.count || 0}</span>
                        <span className="svtx-si-label">Successful</span>
                        <span className="svtx-si-amt">{fmt(txnData?.paymentStatus?.successful?.total)}</span>
                      </div>
                    </div>
                    <div className="svtx-status-item failed">
                      <XCircle size={24} color="#EF4444" />
                      <div>
                        <span className="svtx-si-count">{txnData?.paymentStatus?.failed?.count || 0}</span>
                        <span className="svtx-si-label">Failed</span>
                        <span className="svtx-si-amt">{fmt(txnData?.paymentStatus?.failed?.total)}</span>
                      </div>
                    </div>
                    <div className="svtx-status-item pending">
                      <Clock size={24} color="#F59E0B" />
                      <div>
                        <span className="svtx-si-count">{txnData?.paymentStatus?.pending?.count || 0}</span>
                        <span className="svtx-si-label">Pending</span>
                        <span className="svtx-si-amt">{fmt(txnData?.paymentStatus?.pending?.total)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Bar Chart */}
                  <div className="svtx-chart-card">
                    <div className="svtx-chart-header">
                      <h3>Revenue Trend</h3>
                      <div className="svtx-chart-tabs">
                        {['daily','weekly','monthly'].map(v => (
                          <button
                            key={v}
                            className={`svtx-tab ${txnChartView === v ? 'active' : ''}`}
                            onClick={() => setTxnChartView(v)}
                          >
                            {v.charAt(0).toUpperCase() + v.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                    <MiniBarChart data={txnChartData} height={100} />
                  </div>

                  {/* Payment Method Breakdown */}
                  <div className="svtx-method-card">
                    <h3><CreditCard size={15} /> Payment Method Breakdown</h3>
                    <div className="svtx-method-list">
                      {Object.entries(txnData?.paymentBreakdown || {}).map(([method, val]) => (
                        <div key={method} className="svtx-method-item">
                          <div className="svtx-method-left">
                            <span className="svtx-method-dot" style={{ background: paymentMethodColors[method] || '#9CA3AF' }} />
                            <span>{getPaymentMethodLabel(method)}</span>
                          </div>
                          <div className="svtx-method-right">
                            <span className="svtx-method-amount">{fmt(val.amount)}</span>
                            <span className="svtx-method-count">{val.count} txns</span>
                          </div>
                        </div>
                      ))}
                      {Object.keys(txnData?.paymentBreakdown || {}).length === 0 && (
                        <div className="svtx-no-data">No payment data yet</div>
                      )}
                    </div>
                  </div>

                  {/* ══ CUSTOM DATE RANGE ANALYTICS ══ */}
                  <div className="svtx-custom-section">
                    <div className="svtx-custom-header">
                      <Calendar size={18} color="#FF6B35" />
                      <h3>Custom Date Analytics</h3>
                    </div>

                    {/* Quick-select presets */}
                    <div className="svtx-preset-row">
                      {DATE_PRESETS.map(p => (
                        <button
                          key={p.label}
                          className={`svtx-preset-btn ${activePreset === p.label ? 'active' : ''}`}
                          onClick={() => handlePreset(p)}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>

                    {/* Date pickers */}
                    <div className="svtx-date-picker-row">
                      <div className="svtx-date-field">
                        <label>From</label>
                        <input
                          type="date"
                          value={customFrom}
                          max={customTo || today}
                          onChange={e => { setCustomFrom(e.target.value); setActivePreset(null); }}
                          className="svtx-date-input"
                        />
                      </div>
                      <div className="svtx-date-field">
                        <label>To</label>
                        <input
                          type="date"
                          value={customTo}
                          min={customFrom}
                          max={today}
                          onChange={e => { setCustomTo(e.target.value); setActivePreset(null); }}
                          className="svtx-date-input"
                        />
                      </div>
                      <button
                        className="svtx-search-btn"
                        onClick={handleCustomSearch}
                        disabled={customLoading}
                      >
                        <Search size={16} />
                        {customLoading ? 'Loading…' : 'Analyse'}
                      </button>
                    </div>

                    {/* Custom analytics results */}
                    {customLoading && <div className="loading" style={{ padding: '30px 0' }}>Analysing…</div>}

                    {customData && !customLoading && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="svtx-custom-results"
                      >
                        {/* Range label */}
                        <div className="svtx-range-label">
                          <span>
                            {new Date(customData.range.from).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            {' — '}
                            {new Date(customData.range.to).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                          <span className="svtx-range-days">{customData.range.days} day{customData.range.days !== 1 ? 's' : ''}</span>
                        </div>

                        {/* Summary metric tiles */}
                        <div className="svtx-custom-metrics">
                          {[
                            { label: 'Revenue Collected', value: fmt(customData.summary.amount), sub: `${customData.summary.count} paid txns`, color: '#10B981' },
                            { label: 'Total Bookings', value: customData.summary.totalBookings, sub: 'in this period', color: '#6366F1' },
                            { label: 'Completed', value: customData.summary.completedBookings, sub: 'deliveries', color: '#FF6B35' },
                            { label: 'Active / Parked', value: customData.summary.activeBookings, sub: 'still parked', color: '#F59E0B' },
                          ].map(m => (
                            <div key={m.label} className="svtx-custom-metric" style={{ borderLeft: `3px solid ${m.color}` }}>
                              <span className="svtx-cm-value" style={{ color: m.color }}>{m.value}</span>
                              <span className="svtx-cm-label">{m.label}</span>
                              <span className="svtx-cm-sub">{m.sub}</span>
                            </div>
                          ))}
                        </div>

                        {/* Chart section */}
                        <div className="svtx-chart-card" style={{ marginTop: 0 }}>
                          <div className="svtx-chart-header">
                            <h3>
                              {hasHourly && customChartView === 'hourly'
                                ? `Hourly Revenue ${diffDays === 1 ? '' : `(${diffDays} days)`}`
                                : 'Daily Revenue'}
                            </h3>
                            <div className="svtx-chart-tabs">
                              {hasHourly && (
                                <button
                                  className={`svtx-tab ${customChartView === 'hourly' ? 'active' : ''}`}
                                  onClick={() => setCustomChartView('hourly')}
                                >
                                  Hourly
                                </button>
                              )}
                              {hasDaily && (
                                <button
                                  className={`svtx-tab ${customChartView === 'daily' ? 'active' : ''}`}
                                  onClick={() => setCustomChartView('daily')}
                                >
                                  Daily
                                </button>
                              )}
                            </div>
                          </div>
                          <MiniBarChart
                            data={customChartData}
                            height={110}
                            color="#6366F1"
                          />
                        </div>

                        {/* Payment method breakdown for custom range */}
                        {Object.keys(customData.paymentBreakdown || {}).length > 0 && (
                          <div className="svtx-method-card" style={{ marginTop: 16 }}>
                            <h3><CreditCard size={15} /> Payment Methods · Custom Range</h3>
                            <div className="svtx-method-list">
                              {Object.entries(customData.paymentBreakdown).map(([method, val]) => (
                                <div key={method} className="svtx-method-item">
                                  <div className="svtx-method-left">
                                    <span className="svtx-method-dot" style={{ background: paymentMethodColors[method] || '#9CA3AF' }} />
                                    <span>{getPaymentMethodLabel(method)}</span>
                                  </div>
                                  <div className="svtx-method-right">
                                    <span className="svtx-method-amount">{fmt(val.amount)}</span>
                                    <span className="svtx-method-count">{val.count} txns</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default SupervisorDashboard;
