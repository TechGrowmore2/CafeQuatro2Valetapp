import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Search, User, Car, Clock, CheckCircle, Phone, TrendingUp, XCircle } from 'lucide-react';
import api from '../../services/api';

const STATUS_MAP = {
  'parked':           { label: 'Parked',      color: '#10B981', bg: '#D1FAE5' },
  'recall-requested': { label: 'Recall Req.', color: '#F59E0B', bg: '#FEF3C7' },
  'in-transit':       { label: 'In Transit',  color: '#3B82F6', bg: '#DBEAFE' },
  'arrived':          { label: 'Arrived',     color: '#8B5CF6', bg: '#EDE9FE' },
  'completed':        { label: 'Completed',   color: '#6B7280', bg: '#F3F4F6' },
  'cancelled':        { label: 'Cancelled',   color: '#EF4444', bg: '#FEE2E2' },
};

const AdminCustomerRides = () => {
  const [phone, setPhone] = useState('');
  const [searchDone, setSearchDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!phone.trim()) return;
    setLoading(true);
    setSearchDone(false);
    try {
      const res = await api.get(`/admin/customer-rides?phone=${encodeURIComponent(phone.trim())}`);
      setResult(res.data);
      setSearchDone(true);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setPhone('');
    setResult(null);
    setSearchDone(false);
  };

  const formatDate = (d) => d ? new Date(d).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  }) : 'N/A';

  const activeRides = result?.bookings?.filter(b => !['completed','cancelled'].includes(b.status))?.length || 0;

  return (
    <div className="customer-rides-container">
      {/* Header */}
      <div className="cr-header">
        <h2>🔍 Customer Ride History</h2>
        <p>Search any customer by phone number to view all their rides</p>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="cr-search-form">
        <div className="cr-search-input-wrap">
          <Phone size={18} className="cr-search-icon" />
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="Enter customer phone number (e.g. 9876543210)"
            maxLength={10}
            pattern="[0-9]{10}"
            className="cr-search-input"
          />
          {phone && (
            <button type="button" className="cr-clear-btn" onClick={handleClear}>
              <XCircle size={18} />
            </button>
          )}
        </div>
        <button type="submit" className="cr-search-btn" disabled={loading || !phone.trim()}>
          {loading ? <div className="btn-spinner" /> : <Search size={18} />}
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {/* Results */}
      <AnimatePresence mode="wait">
        {searchDone && result && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="cr-results"
          >
            {/* Customer Summary */}
            <div className="cr-summary-card">
              <div className="cr-customer-info">
                <div className="cr-avatar">
                  {(result.customerName || phone).charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3>{result.customerName || 'Unknown Customer'}</h3>
                  <p>{phone}</p>
                </div>
              </div>
              <div className="cr-stats">
                <div className="cr-stat">
                  <span>Total Rides</span>
                  <strong>{result.bookings?.length || 0}</strong>
                </div>
                <div className="cr-stat">
                  <span>Active Now</span>
                  <strong style={{ color: '#FF6B35' }}>{activeRides}</strong>
                </div>
                <div className="cr-stat">
                  <span>Completed</span>
                  <strong style={{ color: '#10B981' }}>
                    {result.bookings?.filter(b => b.status === 'completed').length || 0}
                  </strong>
                </div>
              </div>
            </div>

            {/* Bookings Timeline */}
            {result.bookings?.length === 0 ? (
              <div className="cr-empty">
                <Car size={48} color="#D1D5DB" />
                <p>No bookings found for this customer</p>
              </div>
            ) : (
              <div className="cr-timeline">
                <h4>Booking History ({result.bookings.length} rides)</h4>
                {result.bookings.map((b, i) => {
                  const cfg = STATUS_MAP[b.status] || { label: b.status, color: '#6B7280', bg: '#F3F4F6' };
                  return (
                    <motion.div
                      key={b._id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="cr-booking-item"
                    >
                      <div className="cr-timeline-dot" style={{ background: cfg.color }} />
                      <div className="cr-booking-card" style={{ borderLeft: `3px solid ${cfg.color}` }}>
                        <div className="cr-booking-top">
                          <span className="cr-booking-id">{b.bookingId}</span>
                          <span className="cr-booking-status" style={{ background: cfg.bg, color: cfg.color }}>
                            {cfg.label}
                          </span>
                        </div>
                        <div className="cr-booking-details">
                          <div className="cr-detail">
                            <Car size={13} /> {b.vehicle?.number} · {b.vehicle?.type?.toUpperCase()}
                            {b.vehicle?.model && ` · ${b.vehicle.model}`}
                          </div>
                          {b.location?.venue && (
                            <div className="cr-detail">📍 {b.location.venue}{b.location.parkingSpot && ` · Spot ${b.location.parkingSpot}`}</div>
                          )}
                          <div className="cr-detail">
                            <Clock size={13} /> {formatDate(b.createdAt)}
                          </div>
                          <div className="cr-detail">
                            👤 Driver: {b.driver?.name || 'N/A'}
                          </div>
                          {b.status === 'completed' && b.parking?.actualEndTime && (
                            <div className="cr-detail">
                              ✅ Done: {formatDate(b.parking.actualEndTime)}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .customer-rides-container { display: flex; flex-direction: column; gap: 24px; }
        .cr-header h2 { font-size: 24px; font-weight: 800; color: #1A1A2E; margin: 0 0 4px; letter-spacing: -0.5px; }
        .cr-header p { font-size: 14px; color: #6B7280; margin: 0; }
        .cr-search-form { display: flex; gap: 12px; }
        .cr-search-input-wrap { flex: 1; position: relative; display: flex; align-items: center; }
        .cr-search-icon { position: absolute; left: 16px; color: #9CA3AF; pointer-events: none; }
        .cr-search-input { width: 100%; padding: 14px 44px; border: 2px solid #E5E7EB; border-radius: 12px; font-family: 'Inter',sans-serif; font-size: 15px; color: #1F2937; outline: none; transition: border-color 0.2s; }
        .cr-search-input:focus { border-color: #FF6B35; box-shadow: 0 0 0 3px rgba(255,107,53,0.12); }
        .cr-clear-btn { position: absolute; right: 14px; background: none; border: none; color: #9CA3AF; cursor: pointer; display: flex; }
        .cr-clear-btn:hover { color: #EF4444; }
        .cr-search-btn { display: flex; align-items: center; gap: 8px; padding: 14px 24px; background: linear-gradient(135deg, #FF6B35, #FF8C5A); color: white; border: none; border-radius: 12px; font-family: 'Inter',sans-serif; font-size: 15px; font-weight: 700; cursor: pointer; white-space: nowrap; box-shadow: 0 6px 20px rgba(255,107,53,0.3); transition: all 0.2s; }
        .cr-search-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(255,107,53,0.4); }
        .cr-search-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .cr-summary-card { background: white; border-radius: 16px; padding: 24px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px; border: 1px solid rgba(255,107,53,0.15); }
        .cr-customer-info { display: flex; align-items: center; gap: 14px; }
        .cr-avatar { width: 52px; height: 52px; border-radius: 14px; background: linear-gradient(135deg, #FF6B35, #FF8C5A); color: white; font-size: 22px; font-weight: 800; display: flex; align-items: center; justify-content: center; }
        .cr-customer-info h3 { font-size: 18px; font-weight: 800; color: #1A1A2E; margin: 0 0 3px; }
        .cr-customer-info p { font-size: 13px; color: #9CA3AF; margin: 0; }
        .cr-stats { display: flex; gap: 24px; flex-wrap: wrap; }
        .cr-stat { text-align: center; }
        .cr-stat span { display: block; font-size: 11px; color: #9CA3AF; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
        .cr-stat strong { font-size: 22px; font-weight: 800; color: #1A1A2E; }
        .cr-timeline { display: flex; flex-direction: column; gap: 0; }
        .cr-timeline h4 { font-size: 15px; font-weight: 700; color: #1A1A2E; margin: 0 0 16px; }
        .cr-booking-item { display: flex; gap: 14px; position: relative; padding-bottom: 16px; }
        .cr-booking-item:not(:last-child)::after { content: ''; position: absolute; left: 6px; top: 18px; bottom: 0; width: 2px; background: #E5E7EB; }
        .cr-timeline-dot { width: 14px; height: 14px; border-radius: 50%; flex-shrink: 0; margin-top: 12px; }
        .cr-booking-card { flex: 1; background: white; border-radius: 12px; padding: 14px 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); border: 1px solid rgba(0,0,0,0.05); }
        .cr-booking-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .cr-booking-id { font-size: 13px; font-weight: 800; color: #FF6B35; font-family: 'Courier New', monospace; }
        .cr-booking-status { font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px; letter-spacing: 0.04em; }
        .cr-booking-details { display: flex; flex-direction: column; gap: 5px; }
        .cr-detail { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #6B7280; }
        .cr-detail svg { color: #9CA3AF; flex-shrink: 0; }
        .cr-empty { text-align: center; padding: 40px; color: #9CA3AF; display: flex; flex-direction: column; align-items: center; gap: 12px; }
        .cr-empty p { font-size: 14px; }
        .cr-results { display: flex; flex-direction: column; gap: 20px; }
      `}</style>
    </div>
  );
};

export default AdminCustomerRides;
