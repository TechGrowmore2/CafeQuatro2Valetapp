import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Car, Clock, Phone, MapPin, AlertCircle, Pencil, X, Check, User, Copy } from 'lucide-react';
import api from '../services/api';
import './MyBookings.css';

const valuableOptions = ['Laptop', 'Phone', 'Wallet', 'Gift', 'Snacks', 'Charger', 'HeadPhone'];

/* ============================================================
   HELPERS FOR RECENT DRIVER NAMES
   ============================================================ */
const getDriverSuggestions = () => {
  const loggedInUser = JSON.parse(localStorage.getItem('user') || '{}');
  const loggedInName = loggedInUser.name || '';
  
  const suggestions = loggedInName ? [loggedInName] : [];
  const seeds = ['Andheri Driver 1', 'Andheri Driver 2', 'Andheri Supervisor'];
  
  try {
    const recents = JSON.parse(localStorage.getItem('recent_drivers') || '[]');
    recents.forEach(name => {
      if (!suggestions.includes(name)) {
        suggestions.push(name);
      }
    });
  } catch (e) {}

  seeds.forEach(name => {
    if (!suggestions.includes(name)) {
      suggestions.push(name);
    }
  });

  return suggestions;
};

const saveRecentDriver = (name) => {
  if (!name || name.trim() === '') return;
  try {
    const recents = JSON.parse(localStorage.getItem('recent_drivers') || '[]');
    if (!recents.includes(name.trim())) {
      const updated = [name.trim(), ...recents].slice(0, 10);
      localStorage.setItem('recent_drivers', JSON.stringify(updated));
    }
  } catch (e) {}
};

/* ============================================================
   EDIT MODAL
   ============================================================ */
const EditBookingModal = ({ booking, onClose, onSaved }) => {
  const isCashBooking = booking.payment?.method === 'cash';

  const [form, setForm] = useState({
    customerName:  booking.customer?.name  || '',
    vehicleNumber: booking.vehicle?.number || '',
    notes:         booking.notes           || '',
    hasValuables:  booking.vehicle?.hasValuables || false,
    valuables:     booking.vehicle?.valuables    || [],
    driverName:    booking.vehicle?.driverName   || '',
    complementary: false,
    cashPaymentStatus: booking.paymentStatus || 'unpaid', // 'paid' | 'unpaid'
  });
  const [newImages, setNewImages]   = useState([]);
  const [saving,   setSaving]       = useState(false);

  const existingImages = booking.vehicle?.images || [];

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const toggleValuables = () => {
    const nextVal = !form.hasValuables;
    setForm({ 
      ...form, 
      hasValuables: nextVal, 
      valuables: nextVal ? form.valuables : [],
    });
  };

  const toggleItem = (v) => {
    const updated = form.valuables.includes(v)
      ? form.valuables.filter(x => x !== v)
      : [...form.valuables, v];
    setForm({ ...form, valuables: updated });
  };

  const handleImageAdd = (e) => {
    const files = Array.from(e.target.files);
    const total = existingImages.length + newImages.length + files.length;
    if (total > 4) { toast.error('Max 4 images total'); return; }
    setNewImages(prev => [...prev, ...files]);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = new FormData();
      data.append('customerName',  form.customerName.trim());
      data.append('vehicleNumber', form.vehicleNumber.trim().toUpperCase());
      data.append('notes',         form.notes);
      data.append('hasValuables',  form.hasValuables);
      data.append('valuables',     JSON.stringify(form.valuables));
      data.append('driverName',    form.driverName.trim());
      if (form.complementary) data.append('complementary', 'true');
      // For cash bookings, save the payment received/remaining status
      if (isCashBooking && !form.complementary) {
        data.append('paymentStatus', form.cashPaymentStatus);
      }
      newImages.forEach(f => data.append('carImages', f));

      const res = await api.put(`/bookings/${booking._id}`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      saveRecentDriver(form.driverName.trim());
      toast.success('Booking updated!');
      onSaved(res.data.booking);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="edit-modal-overlay" onClick={onClose}>
      <motion.div
        className="edit-modal"
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 20 }}
        transition={{ duration: 0.2 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="edit-modal-header">
          <div>
            <h3>Edit Booking</h3>
            <span className="edit-booking-id">{booking.bookingId}</span>
          </div>
          <button className="edit-close-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="edit-modal-body">

          {/* Customer Info */}
          <div className="edit-section">
            <div className="edit-section-title">Customer</div>
            <div className="edit-field">
              <label>Customer Name</label>
              <input
                type="text"
                name="customerName"
                value={form.customerName}
                onChange={handleChange}
                placeholder="Customer full name"
              />
            </div>
          </div>

          {/* Vehicle Info */}
          <div className="edit-section">
            <div className="edit-section-title">Vehicle</div>
            <div className="edit-field">
              <label>Vehicle Number</label>
              <input
                type="text"
                name="vehicleNumber"
                value={form.vehicleNumber}
                onChange={handleChange}
                placeholder="MH12AB1234 or 1234"
                style={{ textTransform: 'uppercase' }}
              />
            </div>
          </div>

          {/* Vehicle Security */}
          <div className="edit-section">
            <div className="edit-section-title">Vehicle Security</div>

            <div className="edit-toggle-row">
              <span>Valuables in car?</span>
              <label className="cbf-toggle">
                <input type="checkbox" checked={form.hasValuables} onChange={toggleValuables} />
                <span className="cbf-toggle-slider" />
              </label>
            </div>

            {form.hasValuables && (
              <div className="edit-chips-wrap">
                <p className="edit-chips-label">Select items:</p>
                <div className="edit-chips">
                  {valuableOptions.map(v => (
                    <button
                      key={v}
                      type="button"
                      className={`edit-chip ${form.valuables.includes(v) ? 'selected' : ''}`}
                      onClick={() => toggleItem(v)}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Driver who collected — always visible */}
            <div className="edit-field" style={{ marginTop: '12px' }}>
              <label>Driver Name (Who collected the car)</label>
              <input
                type="text"
                name="driverName"
                value={form.driverName}
                onChange={handleChange}
                placeholder="Enter driver name"
                list="driver-names-list"
                autoComplete="off"
              />
              <datalist id="driver-names-list">
                {getDriverSuggestions().map(name => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </div>

            {/* Complementary toggle — only for cash bookings */}
            {isCashBooking && (
              <div className="edit-toggle-row" style={{ marginTop: '12px', background: form.complementary ? '#F0FDF4' : '#FFFBEB', border: `1.5px solid ${form.complementary ? '#86EFAC' : '#FDE68A'}`, borderRadius: '10px', padding: '10px 14px' }}>
                <div>
                  <span style={{ fontWeight: 700, color: form.complementary ? '#15803D' : '#92400E' }}>
                    {form.complementary ? '🎁 Marked as Complementary' : '🎁 Mark as Complementary?'}
                  </span>
                  <p style={{ fontSize: '11.5px', color: '#6B7280', margin: '2px 0 0' }}>
                    Customer will not be charged for this booking.
                  </p>
                </div>
                <label className="cbf-toggle">
                  <input
                    type="checkbox"
                    checked={form.complementary}
                    onChange={() => setForm({ ...form, complementary: !form.complementary })}
                  />
                  <span className="cbf-toggle-slider" />
                </label>
              </div>
            )}

            {/* Images */}
            <div className="edit-images">
              <p className="edit-img-label">Car Images ({existingImages.length + newImages.length}/4)</p>

              {/* Existing images */}
              {existingImages.length > 0 && (
                <div className="edit-preview-grid">
                  {existingImages.map((url, i) => (
                    <div key={i} className="edit-preview">
                      <img src={url} alt={`car-${i}`} />
                      <span className="edit-preview-badge">Saved</span>
                    </div>
                  ))}
                </div>
              )}

              {/* New images */}
              {newImages.length > 0 && (
                <div className="edit-preview-grid" style={{ marginTop: 8 }}>
                  {newImages.map((f, i) => (
                    <div key={i} className="edit-preview new">
                      <img src={URL.createObjectURL(f)} alt={`new-${i}`} />
                      <button
                        type="button"
                        className="edit-rm-img"
                        onClick={() => setNewImages(prev => prev.filter((_, idx) => idx !== i))}
                      >×</button>
                    </div>
                  ))}
                </div>
              )}

              {existingImages.length + newImages.length < 4 && (
                <div className="edit-img-add-row">
                  {/* Browse */}
                  <input type="file" id="editBrowse" accept="image/*" multiple onChange={handleImageAdd} style={{ display: 'none' }} />
                  <label htmlFor="editBrowse" className="edit-img-btn">
                    <Car size={16} /> Add Photos
                  </label>

                  {/* Camera */}
                  <input type="file" id="editCamera" accept="image/*" capture="environment" onChange={handleImageAdd} style={{ display: 'none' }} />
                  <label htmlFor="editCamera" className="edit-img-btn camera">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                      <circle cx="12" cy="13" r="4"/>
                    </svg>
                    Camera
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="edit-section">
            <div className="edit-section-title">Notes</div>
            <div className="edit-field">
              <textarea
                name="notes"
                value={form.notes}
                onChange={handleChange}
                rows="3"
                placeholder="Special instructions..."
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="edit-modal-footer">
          <button className="edit-cancel-btn" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="edit-save-btn" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : <><Check size={16} /> Update Booking</>}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

/* ============================================================
   MY BOOKINGS (main component)
   ============================================================ */
const MyBookings = () => {
  const [bookings,          setBookings]          = useState([]);
  const [completedBookings, setCompletedBookings] = useState([]);
  const [loading,           setLoading]           = useState(true);
  const [selectedBooking,   setSelectedBooking]   = useState(null);
  const [estimatedTime,     setEstimatedTime]     = useState('');
  const [otp,               setOtp]               = useState('');
  const [verifyMode,        setVerifyMode]        = useState('phone');   // 'phone' | 'otp'
  const [customerPhoneInput,setCustomerPhoneInput]= useState('');
  const [paymentMethod,     setPaymentMethod]     = useState('cash');
  const [activeTab,         setActiveTab]         = useState('recalled');
  const [editingBooking,    setEditingBooking]    = useState(null);  // booking being edited
  const [arrivalTimes,      setArrivalTimes]      = useState({});
  const [dateFilter,        setDateFilter]        = useState('today'); // 'today' | '7days' | 'month' | 'all'

  const getDateParams = () => {
    const now = new Date();
    if (dateFilter === 'today') {
      const from = new Date(now);
      from.setHours(0, 0, 0, 0);
      return `&from=${from.toISOString()}`;
    }
    if (dateFilter === '7days') {
      const from = new Date(now);
      from.setDate(from.getDate() - 7);
      from.setHours(0, 0, 0, 0);
      return `&from=${from.toISOString()}`;
    }
    if (dateFilter === 'month') {
      const from = new Date(now);
      from.setDate(from.getDate() - 30);
      from.setHours(0, 0, 0, 0);
      return `&from=${from.toISOString()}`;
    }
    return ''; // 'all'
  };

  useEffect(() => {
    fetchBookings();
    fetchCompletedBookings();
  }, [dateFilter]);

  const [processingId,      setProcessingId]      = useState(null);

  const fetchBookings = async () => {
    try {
      const res = await api.get(`/bookings/my-bookings?${getDateParams()}`);
      setBookings(res.data.bookings);
    } catch {
      toast.error('Failed to fetch bookings');
    } finally {
      setLoading(false);
    }
  };

  const fetchCompletedBookings = async () => {
    try {
      const res = await api.get(`/bookings/my-bookings?status=completed${getDateParams()}`);
      setCompletedBookings(res.data.bookings);
    } catch { console.error('Failed to fetch completed bookings'); }
  };

  // Called when edit modal saves successfully
  const handleBookingSaved = (updatedBooking) => {
    setBookings(prev =>
      prev.map(b => b._id === updatedBooking._id ? updatedBooking : b)
    );
  };

  // Toggle cash payment status directly on the card
  const handleTogglePaymentStatus = async (booking) => {
    const newStatus = booking.paymentStatus === 'paid' ? 'unpaid' : 'paid';
    // Optimistic update
    setBookings(prev =>
      prev.map(b => b._id === booking._id ? { ...b, paymentStatus: newStatus } : b)
    );
    try {
      const data = new FormData();
      data.append('paymentStatus', newStatus);
      const res = await api.put(`/bookings/${booking._id}`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success(newStatus === 'paid' ? '✅ Payment marked as received!' : '⏳ Payment marked as remaining');
      // Sync with server response
      if (res.data?.booking) {
        setBookings(prev =>
          prev.map(b => b._id === res.data.booking._id ? res.data.booking : b)
        );
      }
    } catch (err) {
      // Revert on failure
      setBookings(prev =>
        prev.map(b => b._id === booking._id ? { ...b, paymentStatus: booking.paymentStatus } : b)
      );
      toast.error('Failed to update payment status');
    }
  };

  // Set arrival time
  const handleEstimateArrival = async (bookingId, mins) => {
    if (processingId) return;
    setProcessingId(bookingId);
    try {
      const minutesToUse = mins !== undefined ? parseInt(mins) : 10;
      await api.post(`/bookings/${bookingId}/estimate-arrival`, { estimatedMinutes: minutesToUse });
      toast.success(`Car recalled! Customer notified — arriving in ${minutesToUse} min.`);
      setSelectedBooking(null);
      fetchBookings();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to recall car'); }
    finally { setProcessingId(null); }
  };

  const handleMarkArrived = async (bookingId) => {
    if (processingId) return;
    setProcessingId(bookingId);
    try {
      await api.post(`/bookings/${bookingId}/arrived`);
      toast.success('Car marked as arrived! OTP sent to customer.');
      fetchBookings();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to mark as arrived'); }
    finally { setProcessingId(null); }
  };

  const handleRecallCar = async (bookingId) => {
    if (processingId) return;
    setProcessingId(bookingId);
    try {
      await api.post(`/bookings/${bookingId}/driver-recall`);
      toast.success('Car recall initiated! Set arrival time.');
      fetchBookings();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to recall car'); }
    finally { setProcessingId(null); }
  };

  const handleCompleteBooking = async (bookingId) => {
    if (verifyMode === 'otp') {
      if (!otp || otp.length !== 6) { toast.error('Please enter valid 6-digit OTP'); return; }
    } else {
      if (!customerPhoneInput || customerPhoneInput.replace(/\D/g, '').length < 10) {
        toast.error('Please enter a valid 10-digit phone number'); return;
      }
    }
    if (processingId) return;
    setProcessingId(bookingId);
    try {
      const payload = verifyMode === 'otp'
        ? { otp }
        : { customerPhone: customerPhoneInput };
      await api.post(`/bookings/${bookingId}/verify-complete`, payload);
      toast.success('Booking completed successfully!');
      setOtp(''); setCustomerPhoneInput(''); setSelectedBooking(null);
      fetchBookings(); fetchCompletedBookings();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to complete booking'); }
    finally { setProcessingId(null); }
  };

  const getStatusColor = (status) => ({
    'parked':           '#10B981',
    'recall-requested': '#F59E0B',
    'in-transit':       '#3B82F6',
    'arrived':          '#8B5CF6',
    'completed':        '#6B7280'
  }[status] || '#666');

  if (loading) return <div className="loading">Loading bookings...</div>;

  return (
    <>
      {/* Edit Modal */}
      <AnimatePresence>
        {editingBooking && (
          <EditBookingModal
            booking={editingBooking}
            onClose={() => setEditingBooking(null)}
            onSaved={handleBookingSaved}
          />
        )}
      </AnimatePresence>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="my-bookings-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <h2 style={{ margin: 0 }}>My Bookings</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#6B7280' }}>Date:</span>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '2px solid #E5E7EB',
                background: 'white',
                fontSize: '13px',
                fontWeight: '700',
                color: '#374151',
                outline: 'none',
                cursor: 'pointer',
                fontFamily: 'Inter, sans-serif'
              }}
            >
              <option value="today">Today</option>
              <option value="7days">Last 7 Days</option>
              <option value="month">Last Month</option>
              <option value="all">All Time</option>
            </select>
          </div>
        </div>

        {/* Tabs */}
        <div className="bookings-tabs">
          <button className={`tab-btn ${activeTab === 'recalled'  ? 'active' : ''}`} onClick={() => setActiveTab('recalled')}>
            🚗 Recalled ({bookings.filter(b => ['recall-requested','in-transit','arrived'].includes(b.status)).length})
          </button>
          <button className={`tab-btn ${activeTab === 'active'    ? 'active' : ''}`} onClick={() => setActiveTab('active')}>
            Active ({bookings.filter(b => b.status === 'parked').length})
          </button>
          <button className={`tab-btn ${activeTab === 'completed' ? 'active' : ''}`} onClick={() => setActiveTab('completed')}>
            Completed ({completedBookings.length})
          </button>
        </div>

        {/* Recalled Bookings Tab */}
        {activeTab === 'recalled' && (
          <>
            {bookings.filter(b => ['recall-requested','in-transit','arrived'].includes(b.status)).length === 0 ? (
              <div className="empty-state">
                <Car size={80} color="#CCC" />
                <h3>No recalled bookings</h3>
                <p>Bookings with active recall requests will appear here</p>
              </div>
            ) : (
              <div className="bookings-grid">
                {bookings
                  .filter(b => ['recall-requested','in-transit','arrived'].includes(b.status))
                  .sort((a, b) => {
                    const p = { 'recall-requested': 0, 'in-transit': 1, 'arrived': 2 };
                    return (p[a.status] || 99) - (p[b.status] || 99);
                  })
                  .map((booking, index) => {
                    const isRazorpay = booking.payment?.method === 'razorpay';
                    const isCash = booking.payment?.method === 'cash';
                    return (
                      <motion.div
                        key={booking._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="booking-card recalled"
                      >
                        <div className="booking-header">
                          <div>
                            <h3>{booking.bookingId}</h3>
                            <p className="booking-time">{new Date(booking.createdAt).toLocaleString()}</p>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                            {isRazorpay && (
                              <span style={{
                                fontSize: '10.5px', fontWeight: 800, padding: '3px 8px',
                                borderRadius: '6px', background: '#EEF2FF', color: '#4F46E5',
                                border: '1.5px solid #C7D2FE', letterSpacing: '0.3px'
                              }}>Razorpay</span>
                            )}
                            <span className="status-badge" style={{ background: getStatusColor(booking.status) }}>
                              {booking.status.replace('-', ' ').toUpperCase()}
                            </span>
                            <button
                              className="edit-booking-btn"
                              title="Edit booking"
                              onClick={() => setEditingBooking(booking)}
                            >
                              <Pencil size={15} />
                            </button>
                          </div>
                        </div>

                        <div className="booking-details">
                          <div className="detail-row">
                            <Car size={18} color="#FF6B35" />
                            <div>
                              <strong>{booking.vehicle?.number}</strong>
                              <span className="detail-meta">
                                {booking.vehicle?.type?.toUpperCase() || ''}
                                {booking.vehicle?.model && ` - ${booking.vehicle.model}`}
                              </span>
                            </div>
                          </div>

                          <div className="detail-row">
                            <Phone size={18} color="#FF6B35" />
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div>
                                <strong>{booking.customer?.name}</strong>
                                <span className="detail-meta">{booking.customer?.phone}</span>
                              </div>
                              <button
                                title="Copy phone number"
                                onClick={() => { navigator.clipboard.writeText(booking.customer?.phone || ''); toast.success('Phone copied!'); }}
                                style={{ background: 'none', border: '1px solid #E5E7EB', borderRadius: '6px', padding: '3px 6px', cursor: 'pointer', color: '#6B7280', display: 'flex', alignItems: 'center', flexShrink: 0 }}
                              >
                                <Copy size={13} />
                              </button>
                            </div>
                          </div>

                          {/* Payment status pill — tap to toggle */}
                          {!isRazorpay && (
                            booking.paymentStatus === 'paid' ? (
                              <button
                                onClick={() => handleTogglePaymentStatus(booking)}
                                title="Tap to mark as Payment Remaining"
                                style={{ marginTop: '6px', display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 10px', borderRadius: '20px', background: '#D1FAE5', border: '1.5px solid #6EE7B7', fontSize: '12px', fontWeight: 700, color: '#065F46', cursor: 'pointer' }}
                              >
                                <Check size={13} color="#059669" /> Payment Received
                              </button>
                            ) : (
                              <button
                                onClick={() => handleTogglePaymentStatus(booking)}
                                title="Tap to mark as Payment Received"
                                style={{ marginTop: '6px', display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 10px', borderRadius: '20px', background: '#FEF3C7', border: '1.5px solid #FCD34D', fontSize: '12px', fontWeight: 700, color: '#92400E', cursor: 'pointer' }}
                              >
                                <AlertCircle size={13} color="#D97706" /> Payment Remaining
                              </button>
                            )
                          )}

                          {booking.location?.venue && (
                            <div className="detail-row">
                              <MapPin size={18} color="#FF6B35" />
                              <span>{booking.location.venue}</span>
                            </div>
                          )}

                          {booking.vehicle?.hasValuables && booking.vehicle?.valuables?.length > 0 && (
                            <div className="detail-row security-row">
                              <AlertCircle size={16} color="#F59E0B" />
                              <span className="valuables-tag">Valuables: {booking.vehicle.valuables.join(', ')}</span>
                            </div>
                          )}

                          {booking.vehicle?.driverName && (
                            <div className="detail-row" style={{ marginTop: '4px' }}>
                              <User size={18} color="#FF6B35" />
                              <div style={{ fontSize: '13px', color: '#10B981', fontWeight: 600 }}>Handled by: {booking.vehicle.driverName}</div>
                            </div>
                          )}
                        </div>

                        {/* Recall requested */}
                        {booking.status === 'recall-requested' && (
                          <div className="action-section" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <AlertCircle size={20} color="#F59E0B" />
                              <p className="action-title" style={{ margin: 0 }}>Customer requested recall!</p>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                              <input
                                type="number" min="1" max="120"
                                value={arrivalTimes[booking._id] !== undefined ? arrivalTimes[booking._id] : 10}
                                onChange={(e) => setArrivalTimes({ ...arrivalTimes, [booking._id]: e.target.value })}
                                style={{ width: '80px', padding: '10px', borderRadius: '8px', border: '2px solid #DDD8CC', fontSize: '14px', fontWeight: 'bold', textAlign: 'center' }}
                              />
                              <button
                                className="action-btn primary" style={{ flex: 1, margin: 0 }}
                                onClick={() => handleEstimateArrival(booking._id, arrivalTimes[booking._id] !== undefined ? arrivalTimes[booking._id] : 10)}
                                disabled={processingId === booking._id}
                              >
                                {processingId === booking._id ? 'Processing...' : 'Set Arrival Time'}
                              </button>
                            </div>
                          </div>
                        )}

                        {/* In transit */}
                        {booking.status === 'in-transit' && (
                          <div className="action-section">
                            <p className="action-title">🕐 ETA: {booking.recall?.estimatedArrival ?? 10} minutes</p>
                            <button className="action-btn primary" onClick={() => handleMarkArrived(booking._id)} disabled={processingId === booking._id}>
                              {processingId === booking._id ? 'Processing...' : 'Mark as Arrived'}
                            </button>
                          </div>
                        )}

                        {/* Arrived */}
                        {booking.status === 'arrived' && (
                          <div className="action-section">
                            <p className="action-title">Car arrived. Verify customer identity.</p>
                            {selectedBooking === booking._id ? (
                              <div className="action-form">
                                <div style={{ display: 'flex', borderRadius: '8px', overflow: 'hidden', border: '1.5px solid #E5E7EB', marginBottom: '10px' }}>
                                  <button type="button" onClick={() => { setVerifyMode('phone'); setOtp(''); }} style={{ flex: 1, padding: '8px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '12.5px', background: verifyMode === 'phone' ? '#FF6B35' : '#F9FAFB', color: verifyMode === 'phone' ? '#fff' : '#6B7280', transition: 'all 0.15s' }}>📱 Use Phone No.</button>
                                  <button type="button" onClick={() => { setVerifyMode('otp'); setCustomerPhoneInput(''); }} style={{ flex: 1, padding: '8px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '12.5px', background: verifyMode === 'otp' ? '#FF6B35' : '#F9FAFB', color: verifyMode === 'otp' ? '#fff' : '#6B7280', transition: 'all 0.15s' }}>🔢 Enter OTP</button>
                                </div>
                                {verifyMode === 'phone' ? (
                                  <>
                                    <input type="tel" inputMode="numeric" placeholder="Enter customer's registered mobile number" value={customerPhoneInput} onChange={(e) => setCustomerPhoneInput(e.target.value)} maxLength="10" />
                                    <p style={{ fontSize: '11.5px', color: '#6B7280', margin: '5px 0 0', lineHeight: 1.4 }}>⚠️ Use only if customer is unable to provide OTP (e.g., phone switched off).</p>
                                  </>
                                ) : (
                                  <input type="text" inputMode="numeric" placeholder="Enter 6-digit OTP from customer" value={otp} onChange={(e) => setOtp(e.target.value)} maxLength="6" />
                                )}
                                <div className="action-buttons" style={{ marginTop: '8px' }}>
                                  <button className="action-btn primary" onClick={() => handleCompleteBooking(booking._id)}>Complete Booking</button>
                                  <button className="action-btn secondary" onClick={() => { setSelectedBooking(null); setOtp(''); setCustomerPhoneInput(''); setVerifyMode('phone'); }}>Cancel</button>
                                </div>
                              </div>
                            ) : (
                              <button className="action-btn primary" onClick={() => setSelectedBooking(booking._id)}>Complete Booking</button>
                            )}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
              </div>
            )}
          </>
        )}

        {/* Active Bookings */}
        {activeTab === 'active' && (
          <>
            {bookings.filter(b => b.status === 'parked').length === 0 ? (
              <div className="empty-state">
                <Car size={80} color="#CCC" />
                <h3>No active bookings</h3>
                <p>Create a new booking to get started</p>
              </div>
            ) : (
              <div className="bookings-grid">
                {bookings
                  .filter(b => b.status === 'parked')
                  .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                  .map((booking, index) => {
                    const isRecalled = ['recall-requested', 'in-transit', 'arrived'].includes(booking.status);
                    const isRazorpay = booking.payment?.method === 'razorpay';
                    const isCash = booking.payment?.method === 'cash';
                    return (
                      <motion.div
                        key={booking._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`booking-card ${isRecalled ? 'recalled' : ''}`}
                      >
                        <div className="booking-header">
                          <div>
                            <h3>{booking.bookingId}</h3>
                            <p className="booking-time">{new Date(booking.createdAt).toLocaleString()}</p>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                            {isRazorpay && (
                              <span style={{
                                fontSize: '10.5px', fontWeight: 800, padding: '3px 8px',
                                borderRadius: '6px', background: '#EEF2FF', color: '#4F46E5',
                                border: '1.5px solid #C7D2FE', letterSpacing: '0.3px'
                              }}>Razorpay</span>
                            )}
                            <span className="status-badge" style={{ background: getStatusColor(booking.status) }}>
                              {booking.status.replace('-', ' ').toUpperCase()}
                            </span>
                            {/* Edit button */}
                            <button
                              className="edit-booking-btn"
                              title="Edit booking"
                              onClick={() => setEditingBooking(booking)}
                            >
                              <Pencil size={15} />
                            </button>
                          </div>
                        </div>

                        <div className="booking-details">
                          <div className="detail-row">
                            <Car size={18} color="#FF6B35" />
                            <div>
                              <strong>{booking.vehicle?.number}</strong>
                              <span className="detail-meta">
                                {booking.vehicle?.type?.toUpperCase() || ''}
                                {booking.vehicle?.model && ` - ${booking.vehicle.model}`}
                              </span>
                            </div>
                          </div>

                          <div className="detail-row">
                              <Phone size={18} color="#FF6B35" />
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div>
                                  <strong>{booking.customer?.name}</strong>
                                  <span className="detail-meta">{booking.customer?.phone}</span>
                                </div>
                                <button
                                  title="Copy phone number"
                                  onClick={() => {
                                    navigator.clipboard.writeText(booking.customer?.phone || '');
                                    toast.success('Phone copied!');
                                  }}
                                  style={{
                                    background: 'none', border: '1px solid #E5E7EB',
                                    borderRadius: '6px', padding: '3px 6px',
                                    cursor: 'pointer', color: '#6B7280',
                                    display: 'flex', alignItems: 'center',
                                    flexShrink: 0
                                  }}
                                >
                                  <Copy size={13} />
                                </button>
                              </div>
                            </div>

                          {/* Payment status pill — tap to toggle */}
                          {!isRazorpay && (
                            booking.paymentStatus === 'paid' ? (
                              <button
                                onClick={() => handleTogglePaymentStatus(booking)}
                                title="Tap to mark as Payment Remaining"
                                style={{ marginTop: '6px', display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 10px', borderRadius: '20px', background: '#D1FAE5', border: '1.5px solid #6EE7B7', fontSize: '12px', fontWeight: 700, color: '#065F46', cursor: 'pointer' }}
                              >
                                <Check size={13} color="#059669" /> Payment Received
                              </button>
                            ) : (
                              <button
                                onClick={() => handleTogglePaymentStatus(booking)}
                                title="Tap to mark as Payment Received"
                                style={{ marginTop: '6px', display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 10px', borderRadius: '20px', background: '#FEF3C7', border: '1.5px solid #FCD34D', fontSize: '12px', fontWeight: 700, color: '#92400E', cursor: 'pointer' }}
                              >
                                <AlertCircle size={13} color="#D97706" /> Payment Remaining
                              </button>
                            )
                          )}

                          {booking.location?.venue && (
                            <div className="detail-row">
                              <MapPin size={18} color="#FF6B35" />
                              <span>{booking.location.venue}</span>
                            </div>
                          )}

                          {/* Security indicators */}
                          {booking.vehicle?.hasValuables && booking.vehicle?.valuables?.length > 0 && (
                            <div className="detail-row security-row">
                              <AlertCircle size={16} color="#F59E0B" />
                              <span className="valuables-tag">
                                Valuables: {booking.vehicle.valuables.join(', ')}
                              </span>
                            </div>
                          )}

                          {booking.vehicle?.driverName && (
                            <div className="detail-row" style={{ marginTop: '4px' }}>
                              <User size={18} color="#FF6B35" />
                              <div style={{ fontSize: '13px', color: '#10B981', fontWeight: 600 }}>
                                Handled by: {booking.vehicle.driverName}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Parked action */}
                        {booking.status === 'parked' && (
                          <div className="action-section">
                            <button className="action-btn primary" onClick={() => handleRecallCar(booking._id)}>
                              🚗 Recall Car
                            </button>
                          </div>
                        )}

                         {/* Recall requested — show input field prefilled with 10, and button to Set Arrival Time */}
                         {booking.status === 'recall-requested' && (
                           <div className="action-section" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '10px' }}>
                             <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                               <AlertCircle size={20} color="#F59E0B" />
                               <p className="action-title" style={{ margin: 0 }}>Customer requested recall!</p>
                             </div>
                             <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                               <input
                                 type="number"
                                 min="1"
                                 max="120"
                                 value={arrivalTimes[booking._id] !== undefined ? arrivalTimes[booking._id] : 10}
                                 onChange={(e) => setArrivalTimes({ ...arrivalTimes, [booking._id]: e.target.value })}
                                 style={{
                                   width: '80px',
                                   padding: '10px',
                                   borderRadius: '8px',
                                   border: '2px solid #DDD8CC',
                                   fontSize: '14px',
                                   fontWeight: 'bold',
                                   textAlign: 'center'
                                 }}
                               />
                               <button
                                 className="action-btn primary"
                                 style={{ flex: 1, margin: 0 }}
                                 onClick={() => handleEstimateArrival(booking._id, arrivalTimes[booking._id] !== undefined ? arrivalTimes[booking._id] : 10)}
                                 disabled={processingId === booking._id}
                               >
                                 {processingId === booking._id ? 'Processing...' : 'Set Arrival Time'}
                               </button>
                             </div>
                           </div>
                         )}

                        {/* In transit */}
                        {booking.status === 'in-transit' && (
                          <div className="action-section">
                            <p className="action-title">🕐 ETA: {booking.recall?.estimatedArrival ?? 10} minutes</p>
                            <button
                              className="action-btn primary"
                              onClick={() => handleMarkArrived(booking._id)}
                              disabled={processingId === booking._id}
                            >
                              {processingId === booking._id ? 'Processing...' : 'Mark as Arrived'}
                            </button>
                          </div>
                        )}

                        {/* Arrived */}
                        {booking.status === 'arrived' && (
                          <div className="action-section">
                            <p className="action-title">Car arrived. Verify customer identity.</p>
                            {selectedBooking === booking._id ? (
                              <div className="action-form">
                                {/* Mode toggle */}
                                <div style={{ display: 'flex', borderRadius: '8px', overflow: 'hidden', border: '1.5px solid #E5E7EB', marginBottom: '10px' }}>
                                  <button
                                    type="button"
                                    onClick={() => { setVerifyMode('phone'); setOtp(''); }}
                                    style={{
                                      flex: 1, padding: '8px', border: 'none', cursor: 'pointer',
                                      fontWeight: 700, fontSize: '12.5px',
                                      background: verifyMode === 'phone' ? '#FF6B35' : '#F9FAFB',
                                      color:      verifyMode === 'phone' ? '#fff' : '#6B7280',
                                      transition: 'all 0.15s'
                                    }}
                                  >
                                    📱 Use Phone No.
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => { setVerifyMode('otp'); setCustomerPhoneInput(''); }}
                                    style={{
                                      flex: 1, padding: '8px', border: 'none', cursor: 'pointer',
                                      fontWeight: 700, fontSize: '12.5px',
                                      background: verifyMode === 'otp' ? '#FF6B35' : '#F9FAFB',
                                      color:      verifyMode === 'otp' ? '#fff' : '#6B7280',
                                      transition: 'all 0.15s'
                                    }}
                                  >
                                    🔢 Enter OTP
                                  </button>
                                </div>

                                {verifyMode === 'phone' ? (
                                  <>
                                    <input
                                      type="tel"
                                      inputMode="numeric"
                                      placeholder="Enter customer's registered mobile number"
                                      value={customerPhoneInput}
                                      onChange={(e) => setCustomerPhoneInput(e.target.value)}
                                      maxLength="10"
                                    />
                                    <p style={{ fontSize: '11.5px', color: '#6B7280', margin: '5px 0 0', lineHeight: 1.4 }}>
                                      ⚠️ Use only if customer is unable to provide OTP (e.g., phone switched off).
                                    </p>
                                  </>
                                ) : (
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="Enter 6-digit OTP from customer"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                    maxLength="6"
                                  />
                                )}

                                <div className="action-buttons" style={{ marginTop: '8px' }}>
                                  <button className="action-btn primary" onClick={() => handleCompleteBooking(booking._id)}>Complete Booking</button>
                                  <button className="action-btn secondary" onClick={() => { setSelectedBooking(null); setOtp(''); setCustomerPhoneInput(''); setVerifyMode('phone'); }}>Cancel</button>
                                </div>
                              </div>
                            ) : (
                              <button className="action-btn primary" onClick={() => setSelectedBooking(booking._id)}>Complete Booking</button>
                            )}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
              </div>
            )}
          </>
        )}

        {/* Completed Bookings */}
        {activeTab === 'completed' && (
          <>
            {completedBookings.length === 0 ? (
              <div className="empty-state">
                <Car size={80} color="#CCC" />
                <h3>No completed bookings</h3>
                <p>Completed bookings will appear here</p>
              </div>
            ) : (
              <div className="bookings-grid">
                {completedBookings.map((booking) => (
                  <motion.div
                    key={booking._id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="booking-card completed"
                  >
                    <div className="booking-header">
                      <h3>{booking.bookingId}</h3>
                      <span className="status-badge" style={{ backgroundColor: '#6B7280' }}>COMPLETED</span>
                    </div>
                    <div className="booking-info">
                      <div className="info-row"><Car size={18} /><span>{booking.vehicle?.number} - {booking.vehicle?.type}</span></div>
                      <div className="info-row"><Phone size={18} /><span>{booking.customer?.name} - {booking.customer?.phone}</span></div>
                      {booking.location?.venue && (
                        <div className="info-row"><MapPin size={18} /><span>{booking.location.venue}</span></div>
                      )}
                      <div className="info-row">
                        <Clock size={18} />
                        <span>Completed: {new Date(booking.updatedAt).toLocaleString()}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}
      </motion.div>
    </>
  );
};

export default MyBookings;
