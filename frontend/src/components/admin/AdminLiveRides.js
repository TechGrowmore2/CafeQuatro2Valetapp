import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Radio, RefreshCw, Car, Clock, User, MapPin, Filter } from 'lucide-react';
import api from '../../services/api';
import { useSocket } from '../../context/SocketContext';

const STATUS_CONFIG = {
  'parked':           { label: 'Parked',         color: '#10B981', bg: '#D1FAE5' },
  'recall-requested': { label: 'Recall Req.',     color: '#F59E0B', bg: '#FEF3C7' },
  'in-transit':       { label: '🚗 In Transit',   color: '#3B82F6', bg: '#DBEAFE', pulse: true },
  'arrived':          { label: '✅ Arrived',       color: '#8B5CF6', bg: '#EDE9FE' },
};

const FILTERS = [
  { key: 'all',              label: 'All Active' },
  { key: 'parked',           label: 'Parked' },
  { key: 'recall-requested', label: 'Recall Req.' },
  { key: 'in-transit',       label: 'In Transit' },
  { key: 'arrived',          label: 'Arrived' },
];

const AdminLiveRides = () => {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const { on, off } = useSocket();

  const fetchRides = useCallback(async () => {
    try {
      const res = await api.get('/admin/live-rides');
      setRides(res.data.rides || []);
      setLastUpdated(new Date());
    } catch (error) {
      toast.error('Failed to fetch live rides');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRides();
    const interval = setInterval(fetchRides, 30000); // auto-refresh every 30s
    return () => clearInterval(interval);
  }, [fetchRides]);

  // Socket.IO real-time updates
  useEffect(() => {
    const handleNewBooking = () => fetchRides();
    const handleUpdate = () => fetchRides();
    on('new-booking', handleNewBooking);
    on('booking-updated', handleUpdate);
    return () => {
      off('new-booking', handleNewBooking);
      off('booking-updated', handleUpdate);
    };
  }, [on, off, fetchRides]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchRides();
  };

  const filtered = filter === 'all' ? rides : rides.filter(r => r.status === filter);

  const getElapsed = (date) => {
    const mins = Math.floor((Date.now() - new Date(date)) / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ${mins % 60}m ago`;
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="loading-skeleton" style={{ height: 60, borderRadius: 12 }} />
        {[1,2,3,4].map(i => <div key={i} className="loading-skeleton" style={{ height: 100, borderRadius: 12 }} />)}
      </div>
    );
  }

  return (
    <div className="live-rides-container">
      {/* Header */}
      <div className="live-header">
        <div>
          <h2 className="live-title">
            <span className="live-dot" style={{ marginRight: 8 }}>Live Rides</span>
          </h2>
          <p className="live-sub">
            {rides.length} active ride{rides.length !== 1 ? 's' : ''}
            {lastUpdated && ` · Updated ${lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`}
          </p>
        </div>
        <button className="refresh-btn" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw size={15} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="live-filters">
        {FILTERS.map(f => (
          <button
            key={f.key}
            className={`live-filter-btn ${filter === f.key ? 'active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
            {f.key === 'all'
              ? <span className="filter-count">{rides.length}</span>
              : <span className="filter-count">{rides.filter(r => r.status === f.key).length}</span>
            }
          </button>
        ))}
      </div>

      {/* Rides List */}
      {filtered.length === 0 ? (
        <div className="live-empty">
          <Car size={56} color="#D1D5DB" />
          <h3>No active rides</h3>
          <p>{filter === 'all' ? 'All rides completed or no bookings yet.' : `No rides with status "${filter}".`}</p>
        </div>
      ) : (
        <div className="live-grid">
          <AnimatePresence>
            {filtered.map((ride, i) => {
              const cfg = STATUS_CONFIG[ride.status] || { label: ride.status, color: '#6B7280', bg: '#F3F4F6' };
              return (
                <motion.div
                  key={ride._id}
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.04 }}
                  className="live-card"
                  style={{ '--s-color': cfg.color, '--s-bg': cfg.bg }}
                >
                  {/* Status Banner */}
                  <div className="live-card-status" style={{ background: cfg.bg, color: cfg.color }}>
                    {cfg.pulse && <span className="pulse-ring" style={{ '--color': cfg.color }} />}
                    <span>{cfg.label}</span>
                    <span className="live-card-time">{getElapsed(ride.createdAt)}</span>
                  </div>

                  <div className="live-card-body">
                    {/* Booking ID */}
                    <div className="live-card-id">{ride.bookingId}</div>

                    <div className="live-card-row">
                      <User size={14} />
                      <div>
                        <strong>{ride.customer?.name || ride.customer?.phone}</strong>
                        <span className="live-card-phone">{ride.customer?.phone}</span>
                      </div>
                    </div>

                    <div className="live-card-row">
                      <Car size={14} />
                      <span>{ride.vehicle?.number} · {ride.vehicle?.type?.toUpperCase()}</span>
                    </div>

                    {ride.location?.venue && (
                      <div className="live-card-row">
                        <MapPin size={14} />
                        <span>{ride.location.venue}
                          {ride.location.parkingSpot && ` · Spot ${ride.location.parkingSpot}`}
                        </span>
                      </div>
                    )}

                    <div className="live-card-row">
                      <Clock size={14} />
                      <span>Driver: {ride.driver?.name || 'N/A'}</span>
                    </div>

                    {ride.status === 'in-transit' && ride.recall?.estimatedArrival && (
                      <div className="live-eta">
                        🕐 ETA: <strong>{ride.recall.estimatedArrival} min</strong>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <style>{`
        .live-rides-container { display: flex; flex-direction: column; gap: 24px; }
        .live-header { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px; }
        .live-title { font-size: 24px; font-weight: 800; color: #1A1A2E; margin: 0 0 4px; letter-spacing: -0.5px; }
        .live-sub { font-size: 13px; color: #6B7280; margin: 0; }
        .live-filters { display: flex; gap: 8px; flex-wrap: wrap; }
        .live-filter-btn { display: flex; align-items: center; gap: 6px; padding: 8px 14px; border: 2px solid #E5E7EB; border-radius: 20px; background: white; font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 600; color: #6B7280; cursor: pointer; transition: all 0.2s ease; }
        .live-filter-btn:hover { border-color: #FF6B35; color: #FF6B35; }
        .live-filter-btn.active { border-color: #FF6B35; background: rgba(255,107,53,0.08); color: #FF6B35; }
        .filter-count { background: #F3F4F6; color: #374151; border-radius: 10px; padding: 1px 7px; font-size: 11px; }
        .live-filter-btn.active .filter-count { background: rgba(255,107,53,0.15); color: #FF6B35; }
        .live-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
        .live-card { background: white; border-radius: 16px; box-shadow: 0 2px 12px rgba(0,0,0,0.07); border: 1px solid rgba(0,0,0,0.05); overflow: hidden; border-left: 4px solid var(--s-color); transition: transform 0.2s, box-shadow 0.2s; }
        .live-card:hover { transform: translateY(-3px); box-shadow: 0 8px 28px rgba(0,0,0,0.10); }
        .live-card-status { display: flex; align-items: center; gap: 8px; padding: 8px 14px; font-size: 12px; font-weight: 700; letter-spacing: 0.04em; position: relative; }
        .live-card-time { margin-left: auto; font-size: 11px; font-weight: 500; opacity: 0.75; }
        .pulse-ring { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: var(--color); animation: pulse-ring 2s ease-out infinite; flex-shrink: 0; }
        .live-card-body { padding: 14px; display: flex; flex-direction: column; gap: 8px; }
        .live-card-id { font-size: 13px; font-weight: 800; color: #FF6B35; font-family: 'Courier New', monospace; }
        .live-card-row { display: flex; align-items: flex-start; gap: 8px; font-size: 13px; color: #374151; }
        .live-card-row svg { flex-shrink: 0; margin-top: 2px; color: #9CA3AF; }
        .live-card-phone { display: block; font-size: 11px; color: #9CA3AF; }
        .live-eta { background: rgba(59,130,246,0.08); color: #1E40AF; border-radius: 8px; padding: 7px 10px; font-size: 13px; }
        .live-empty { text-align: center; padding: 60px 20px; color: #9CA3AF; display: flex; flex-direction: column; align-items: center; gap: 12px; }
        .live-empty h3 { font-size: 18px; font-weight: 700; color: #374151; margin: 0; }
        .live-empty p { font-size: 14px; margin: 0; }
      `}</style>
    </div>
  );
};

export default AdminLiveRides;
