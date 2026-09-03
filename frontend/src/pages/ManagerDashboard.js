import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LogOut, Download, Filter, Calendar, MapPin, Car } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';
import logo from '../logo.png';
import './ManagerDashboard.css';

const ManagerDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [venues, setVenues] = useState([]);
  
  // Filters
  const [filterType, setFilterType] = useState('today'); // 'today', 'week', 'month', 'all'

  useEffect(() => {
    fetchData();
  }, [filterType]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Get date range based on filter
      let fromDate = new Date();
      let toDate = new Date();
      
      fromDate.setHours(0, 0, 0, 0);
      toDate.setHours(23, 59, 59, 999);

      if (filterType === 'week') {
        fromDate.setDate(fromDate.getDate() - 7);
      } else if (filterType === 'month') {
        fromDate.setMonth(fromDate.getMonth() - 1);
      } else if (filterType === 'all') {
        fromDate = new Date(2020, 0, 1); // some old date
      }

      // Fetch venues
      const venuesRes = await api.get('/admin/venues');
      const fetchedVenues = venuesRes.data.venues || [];
      setVenues(fetchedVenues);

      // Fetch bookings with date range
      // Re-using the /all-bookings endpoint which admin and manager both have access to
      const bookingsRes = await api.get('/admin/all-bookings', {
        params: {
          from: fromDate.toISOString(),
          to: toDate.toISOString(),
          limit: 1000 // Get a large chunk for export and display
        }
      });
      setBookings(bookingsRes.data.bookings || []);
      
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    toast.success('Logged out');
  };

  const exportToCSV = () => {
    if (bookings.length === 0) {
      toast.error('No bookings to export');
      return;
    }

    const headers = ['Booking ID', 'Venue/Supervisor', 'Customer Name', 'Phone', 'Driver', 'Status', 'Date', 'Amount'];
    const rows = bookings.map(b => {
      // Find venue/supervisor name (since booking has a driver, and driver has a supervisor)
      // Actually we just map the supervisor ID to a venue if possible
      const supervisorId = b.driver?.supervisor?._id || b.driver?.supervisor;
      const venue = venues.find(v => v.supervisor?._id === supervisorId);
      const venueName = venue ? venue.name : (b.driver?.supervisor?.name || 'Unknown Venue');

      return [
        b.bookingId,
        venueName,
        b.customer?.name || 'N/A',
        b.customer?.phone || 'N/A',
        b.driver?.name || 'N/A',
        b.status,
        new Date(b.createdAt).toLocaleDateString(),
        b.payment?.amount || 0
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(e => e.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `bonito_report_${filterType}_${new Date().toLocaleDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Group bookings by supervisor/venue
  const groupedBookings = {};
  
  venues.forEach(v => {
    const venueIdStr = v._id.toString();
    groupedBookings[venueIdStr] = {
      venueName: v.name,
      supervisorName: v.supervisor?.name || 'No Supervisor',
      supervisorId: v.supervisor?._id?.toString(),
      bookings: []
    };
  });

  // Also create a "Other" bucket for drivers without a venue matched
  groupedBookings['other'] = {
    venueName: 'Other / Unassigned',
    supervisorName: 'Various',
    bookings: []
  };

  bookings.forEach(b => {
    // 1. Check if driver has explicit venue
    let matchedVenueId = b.driver?.venue?._id || b.driver?.venue;
    if (matchedVenueId) matchedVenueId = matchedVenueId.toString();

    // 2. Fallback: check if driver's supervisor has explicit venue
    if (!matchedVenueId) {
      matchedVenueId = b.driver?.supervisor?.venue?._id || b.driver?.supervisor?.venue;
      if (matchedVenueId) matchedVenueId = matchedVenueId.toString();
    }

    // 3. Fallback: find venue where venue.supervisor matches driver.supervisor
    if (!matchedVenueId) {
      const supervisorId = b.driver?.supervisor?._id || b.driver?.supervisor;
      const sIdStr = supervisorId ? supervisorId.toString() : null;
      for (const v of venues) {
        const vSupId = v.supervisor?._id || v.supervisor;
        if (sIdStr && vSupId && (vSupId.toString() === sIdStr)) {
          matchedVenueId = v._id.toString();
          break;
        }
      }
    }

    if (matchedVenueId && groupedBookings[matchedVenueId]) {
      groupedBookings[matchedVenueId].bookings.push(b);
    } else {
      groupedBookings['other'].bookings.push(b);
    }
  });

  return (
    <div className="manager-dashboard">
      <header className="manager-header">
        <div className="header-left" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <img src={logo} alt="Logo" style={{ width: '42px', height: 'auto', objectFit: 'contain' }} />
          <div>
            <h1>Manager Dashboard</h1>
            <p>Welcome back, {user?.name}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="logout-btn">
          <LogOut size={18} /> Logout
        </button>
      </header>

      <div className="manager-controls">
        <div className="filters">
          <button className={`filter-btn ${filterType === 'today' ? 'active' : ''}`} onClick={() => setFilterType('today')}>
            <Calendar size={16} /> Today
          </button>
          <button className={`filter-btn ${filterType === 'week' ? 'active' : ''}`} onClick={() => setFilterType('week')}>
            <Calendar size={16} /> This Week
          </button>
          <button className={`filter-btn ${filterType === 'month' ? 'active' : ''}`} onClick={() => setFilterType('month')}>
            <Calendar size={16} /> This Month
          </button>
          <button className={`filter-btn ${filterType === 'all' ? 'active' : ''}`} onClick={() => setFilterType('all')}>
            <Filter size={16} /> All Time
          </button>
        </div>

        <button className="export-btn" onClick={exportToCSV}>
          <Download size={18} /> Export CSV
        </button>
      </div>

      {loading ? (
        <div className="manager-loading">Loading data...</div>
      ) : (
        <div className="venues-container">
          {Object.values(groupedBookings).map((group, idx) => {
            // Skip "Other" if empty
            if (group.venueName === 'Other / Unassigned' && group.bookings.length === 0) return null;

            return (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="venue-card"
              >
                <div className="venue-header">
                  <div>
                    <h2><MapPin size={20} /> {group.venueName}</h2>
                    <p className="supervisor-label">Supervisor: {group.supervisorName}</p>
                  </div>
                  <div className="venue-stats">
                    <div className="stat-badge">
                      <span>{group.bookings.length}</span>
                      <label>Total Rides</label>
                    </div>
                  </div>
                </div>

                <div className="venue-bookings">
                  {group.bookings.length > 0 ? (
                    <table>
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Customer</th>
                          <th>Driver</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.bookings.map(b => (
                          <tr key={b._id}>
                            <td>{b.bookingId}</td>
                            <td>
                              <div>{b.customer?.name}</div>
                              <div className="sub-text">{b.customer?.phone}</div>
                            </td>
                            <td>{b.driver?.name || 'N/A'}</td>
                            <td>
                              <span className={`status-badge ${b.status}`}>{b.status}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="no-data">No rides found for this period.</div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ManagerDashboard;
