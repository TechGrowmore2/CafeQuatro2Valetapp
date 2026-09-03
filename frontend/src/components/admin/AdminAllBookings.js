import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { FileText, RefreshCw, Download, Search, Filter, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import api from '../../services/api';

const STATUS_STYLES = {
  'parked':           { color: '#10B981', bg: '#D1FAE5' },
  'recall-requested': { color: '#F59E0B', bg: '#FEF3C7' },
  'in-transit':       { color: '#3B82F6', bg: '#DBEAFE' },
  'arrived':          { color: '#8B5CF6', bg: '#EDE9FE' },
  'completed':        { color: '#6B7280', bg: '#F3F4F6' },
  'cancelled':        { color: '#EF4444', bg: '#FEE2E2' },
};

const PAY_METHOD_STYLES = {
  cash:     { color: '#065F46', bg: '#D1FAE5' },
  razorpay: { color: '#4F46E5', bg: '#EEF2FF' },
  upi:      { color: '#7C3AED', bg: '#EDE9FE' },
  card:     { color: '#1D4ED8', bg: '#DBEAFE' },
  foc:      { color: '#9D174D', bg: '#FCE7F3' },
  staff:    { color: '#92400E', bg: '#FEF3C7' },
  qr:       { color: '#065F46', bg: '#ECFDF5' },
  pending:  { color: '#6B7280', bg: '#F3F4F6' },
};

const PAGE_SIZE = 15;

const PAYMENT_METHODS = ['cash', 'upi', 'card', 'razorpay', 'qr', 'staff', 'foc'];

const AdminAllBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [savingId, setSavingId] = useState(null); // booking _id being saved

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const fetchBookings = useCallback(async (p = page) => {
    try {
      const params = new URLSearchParams();
      params.append('page', p);
      params.append('limit', PAGE_SIZE);
      if (statusFilter) params.append('status', statusFilter);
      if (searchQ)      params.append('search', searchQ);
      if (dateFrom)     params.append('from', dateFrom);
      if (dateTo)       params.append('to', dateTo);

      const res = await api.get(`/admin/all-bookings?${params.toString()}`);
      setBookings(res.data.bookings || []);
      setTotal(res.data.total || 0);
    } catch (error) {
      toast.error('Failed to fetch bookings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, statusFilter, searchQ, dateFrom, dateTo]);

  useEffect(() => {
    fetchBookings(page);
  }, [page, statusFilter, searchQ, dateFrom, dateTo]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchBookings(page);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchQ(searchInput);
    setPage(1);
  };

  const handleFilterChange = (key, val) => {
    if (key === 'status') setStatusFilter(val);
    if (key === 'from') setDateFrom(val);
    if (key === 'to') setDateTo(val);
    setPage(1);
  };

  const clearFilters = () => {
    setStatusFilter('');
    setSearchInput('');
    setSearchQ('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  // ── Inline payment update ──────────────────────────────────
  const handlePaymentUpdate = async (bookingId, field, value) => {
    setSavingId(bookingId);
    // Optimistic update
    setBookings(prev => prev.map(b => {
      if (b._id !== bookingId) return b;
      if (field === 'paymentMethod') return { ...b, payment: { ...b.payment, method: value } };
      if (field === 'paymentStatus') return { ...b, paymentStatus: value };
      return b;
    }));
    try {
      const payload = {};
      if (field === 'paymentMethod') payload.paymentMethod = value;
      if (field === 'paymentStatus') payload.paymentStatus = value;
      const res = await api.patch(`/admin/bookings/${bookingId}/payment`, payload);
      // Sync with server response
      if (res.data?.booking) {
        setBookings(prev => prev.map(b => b._id === bookingId ? res.data.booking : b));
      }
      toast.success('Payment updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update payment');
      fetchBookings(page); // revert
    } finally {
      setSavingId(null);
    }
  };

  const exportCSV = () => {
    const headers = ['Booking ID','Customer','Phone','Vehicle','Driver','Status','Pay Method','Pay Status','Venue','Created At'];
    const rows = bookings.map(b => [
      b.bookingId,
      b.customer?.name || '',
      b.customer?.phone || '',
      `${b.vehicle?.number}`,
      b.driver?.name || '',
      b.status,
      b.payment?.method || '',
      b.paymentStatus || '',
      b.location?.venue || '',
      new Date(b.createdAt).toLocaleString(),
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `admin-bookings-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    toast.success('CSV exported!');
  };

  const handleDeleteBooking = async (id) => {
    if (!window.confirm('Delete this booking? This action cannot be undone.')) return;
    try {
      await api.delete(`/admin/bookings/${id}`);
      toast.success('Booking deleted');
      fetchBookings(page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
  }) : '—';

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const hasActiveFilters = statusFilter || searchQ || dateFrom || dateTo;

  // Shared select style
  const selectStyle = (bg, color) => ({
    fontSize: 11, fontWeight: 700, padding: '3px 6px', borderRadius: 6,
    border: `1.5px solid ${color}44`, background: bg, color, cursor: 'pointer',
    fontFamily: 'Inter,sans-serif', outline: 'none', appearance: 'auto'
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: '#1A1A2E', margin: '0 0 4px', letterSpacing: '-0.5px' }}>All Bookings</h2>
          <p style={{ fontSize: 14, color: '#6B7280', margin: 0 }}>
            {total} total booking{total !== 1 ? 's' : ''} across all venues &amp; drivers
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="refresh-btn" onClick={() => setShowFilters(!showFilters)}>
            <Filter size={15} />
            Filters {hasActiveFilters && '•'}
          </button>
          <button className="refresh-btn" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw size={15} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />
            Refresh
          </button>
          <button className="refresh-btn" onClick={exportCSV} style={{ color: '#10B981', borderColor: '#A7F3D0' }}>
            <Download size={15} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Search + Filters */}
      <div style={{ background: 'white', borderRadius: 16, padding: '16px 20px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
            <input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Search by booking ID, customer name or phone..."
              style={{ width: '100%', padding: '11px 16px 11px 40px', border: '2px solid #E5E7EB', borderRadius: 10, fontFamily: 'Inter,sans-serif', fontSize: 14, outline: 'none' }}
              onFocus={e => e.target.style.borderColor = '#FF6B35'}
              onBlur={e => e.target.style.borderColor = '#E5E7EB'}
            />
          </div>
          <button type="submit" className="refresh-btn" style={{ color: '#FF6B35', borderColor: 'rgba(255,107,53,0.3)', whiteSpace: 'nowrap' }}>
            <Search size={14} /> Search
          </button>
          {hasActiveFilters && (
            <button type="button" onClick={clearFilters} className="refresh-btn" style={{ color: '#EF4444', borderColor: '#FECACA' }}>
              Clear All
            </button>
          )}
        </form>

        {showFilters && (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', paddingTop: 8, borderTop: '1px solid #F3F4F6' }}>
            <select
              value={statusFilter}
              onChange={e => handleFilterChange('status', e.target.value)}
              style={{ padding: '9px 12px', border: '2px solid #E5E7EB', borderRadius: 10, fontFamily: 'Inter,sans-serif', fontSize: 13, color: '#374151', outline: 'none', cursor: 'pointer' }}
            >
              <option value="">All Statuses</option>
              <option value="parked">Parked</option>
              <option value="recall-requested">Recall Requested</option>
              <option value="in-transit">In Transit</option>
              <option value="arrived">Arrived</option>
              <option value="completed">Completed</option>
            </select>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ fontSize: 13, color: '#6B7280', fontWeight: 600 }}>From:</label>
              <input type="date" value={dateFrom} onChange={e => handleFilterChange('from', e.target.value)}
                style={{ padding: '9px 12px', border: '2px solid #E5E7EB', borderRadius: 10, fontFamily: 'Inter,sans-serif', fontSize: 13, outline: 'none' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ fontSize: 13, color: '#6B7280', fontWeight: 600 }}>To:</label>
              <input type="date" value={dateTo} onChange={e => handleFilterChange('to', e.target.value)}
                style={{ padding: '9px 12px', border: '2px solid #E5E7EB', borderRadius: 10, fontFamily: 'Inter,sans-serif', fontSize: 13, outline: 'none' }} />
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div style={{ background: 'white', borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF' }}>Loading bookings...</div>
        ) : bookings.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#9CA3AF', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <FileText size={48} color="#D1D5DB" />
            <p style={{ margin: 0, fontSize: 14 }}>No bookings found{hasActiveFilters ? ' matching your filters' : ''}.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F9FAFB', borderBottom: '2px solid #F3F4F6' }}>
                  {['Booking ID','Customer','Vehicle','Driver','Venue','Status','Pay Method','Pay Status','Time','Action'].map(h => (
                    <th key={h} style={{ padding: '13px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => {
                  const ss  = STATUS_STYLES[b.status] || { color: '#6B7280', bg: '#F3F4F6' };
                  const pms = PAY_METHOD_STYLES[b.payment?.method] || PAY_METHOD_STYLES.pending;
                  const isPaid = b.paymentStatus === 'paid';
                  const isSaving = savingId === b._id;
                  const isRazorpay = b.payment?.method === 'razorpay';

                  return (
                    <tr key={b._id} style={{ borderBottom: '1px solid #F9FAFB', transition: 'background 0.15s', opacity: isSaving ? 0.6 : 1 }}
                      onMouseEnter={e => e.currentTarget.style.background = '#FFF8F5'}
                      onMouseLeave={e => e.currentTarget.style.background = 'white'}
                    >
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color: '#FF6B35', fontFamily: 'Courier New,monospace' }}>{b.bookingId}</span>
                      </td>
                      <td style={{ padding: '12px 14px', minWidth: 130 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#1F2937' }}>{b.customer?.name || '—'}</div>
                        <div style={{ fontSize: 11, color: '#9CA3AF' }}>{b.customer?.phone}</div>
                      </td>
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap', fontSize: 13 }}>
                        <div style={{ fontWeight: 600, color: '#374151' }}>{b.vehicle?.number}</div>
                        <div style={{ fontSize: 11, color: '#9CA3AF', textTransform: 'uppercase' }}>{b.vehicle?.type}</div>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 13, color: '#374151' }}>{b.driver?.name || '—'}</td>
                      <td style={{ padding: '12px 14px', fontSize: 12, color: '#6B7280' }}>
                        {b.location?.venue || '—'}
                        {b.location?.parkingSpot && <div style={{ fontSize: 11, color: '#9CA3AF' }}>Spot: {b.location.parkingSpot}</div>}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ background: ss.bg, color: ss.color, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
                          {b.status?.replace('-', ' ')}
                        </span>
                      </td>

                      {/* ── Payment Method dropdown (admin can change) ── */}
                      <td style={{ padding: '10px 14px' }}>
                        {isRazorpay ? (
                          <span style={{ ...selectStyle(pms.bg, pms.color), cursor: 'default', display: 'inline-block' }}>Razorpay 🔒</span>
                        ) : (
                          <select
                            value={b.payment?.method || 'cash'}
                            disabled={isSaving}
                            onChange={e => handlePaymentUpdate(b._id, 'paymentMethod', e.target.value)}
                            style={selectStyle(pms.bg, pms.color)}
                            title="Change payment method"
                          >
                            {PAYMENT_METHODS.map(m => (
                              <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
                            ))}
                          </select>
                        )}
                      </td>

                      {/* ── Payment Status toggle (admin can click) ── */}
                      <td style={{ padding: '10px 14px' }}>
                        {isRazorpay ? (
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: '#D1FAE5', color: '#065F46' }}>Paid 🔒</span>
                        ) : (
                          <button
                            disabled={isSaving}
                            onClick={() => handlePaymentUpdate(b._id, 'paymentStatus', isPaid ? 'unpaid' : 'paid')}
                            title={isPaid ? 'Click to mark as Remaining' : 'Click to mark as Received'}
                            style={{
                              fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, border: 'none', cursor: isSaving ? 'not-allowed' : 'pointer',
                              background: isPaid ? '#D1FAE5' : '#FEF3C7',
                              color:      isPaid ? '#065F46' : '#92400E',
                              whiteSpace: 'nowrap', transition: 'all 0.15s'
                            }}
                          >
                            {isPaid ? '✓ Received' : '⏳ Remaining'}
                          </button>
                        )}
                      </td>

                      <td style={{ padding: '12px 14px', fontSize: 11, color: '#9CA3AF', whiteSpace: 'nowrap' }}>
                        {formatDate(b.createdAt)}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <button
                          onClick={() => handleDeleteBooking(b._id)}
                          style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: '4px', borderRadius: 6, display: 'flex', transition: 'color 0.15s' }}
                          onMouseEnter={e => e.currentTarget.style.color = '#EF4444'}
                          onMouseLeave={e => e.currentTarget.style.color = '#9CA3AF'}
                          title="Delete booking"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderTop: '1px solid #F3F4F6', flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontSize: 13, color: '#6B7280' }}>
              Page {page} of {totalPages} · {total} bookings
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 16px', border: '2px solid #E5E7EB', borderRadius: 10, background: 'white', fontFamily: 'Inter,sans-serif', fontSize: 13, fontWeight: 600, cursor: page === 1 ? 'not-allowed' : 'pointer', color: page === 1 ? '#D1D5DB' : '#374151', transition: 'all 0.2s' }}
              >
                <ChevronLeft size={14} /> Prev
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 16px', border: '2px solid #E5E7EB', borderRadius: 10, background: 'white', fontFamily: 'Inter,sans-serif', fontSize: 13, fontWeight: 600, cursor: page === totalPages ? 'not-allowed' : 'pointer', color: page === totalPages ? '#D1D5DB' : '#374151', transition: 'all 0.2s' }}
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAllBookings;
