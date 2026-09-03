import React, { useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import {
  BarChart3, Shield, Car, MapPin, LogOut,
  Radio, Users, FileText, TrendingUp, CreditCard
} from 'lucide-react';
import api from '../services/api';
import logo from '../logo.png';
import './AdminDashboard.css';

// Components
import ManageSupervisors from '../components/admin/ManageSupervisors';
import ManageDrivers from '../components/admin/ManageDrivers';
import ManageVenues from '../components/admin/ManageVenues';
import AdminStats from '../components/admin/AdminStats';
import AdminLiveRides from '../components/admin/AdminLiveRides';
import AdminCustomerRides from '../components/admin/AdminCustomerRides';
import AdminAllBookings from '../components/admin/AdminAllBookings';
import ManageManagers from '../components/admin/ManageManagers';
import AdminTransactions from '../components/admin/AdminTransactions';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('stats');

  const navItems = [
    {
      section: 'Overview',
      items: [
        { id: 'stats',      label: 'Dashboard',       icon: BarChart3,  path: '/admin/stats' },
      ]
    },
    {
      section: 'Live Monitoring',
      items: [
        { id: 'live',         label: 'Live Rides',       icon: Radio,        path: '/admin/live',          badge: 'LIVE', badgeClass: 'live-badge' },
        { id: 'customers',    label: 'Customer Rides',   icon: Users,        path: '/admin/customers' },
        { id: 'allbookings',  label: 'All Bookings',     icon: FileText,     path: '/admin/allbookings' },
        { id: 'transactions', label: 'Transactions',     icon: CreditCard,   path: '/admin/transactions' },
      ]
    },
    {
      section: 'Management',
      items: [
        { id: 'managers',   label: 'Managers',        icon: Shield,     path: '/admin/managers' },
        { id: 'supervisors',label: 'Supervisors',     icon: Shield,     path: '/admin/supervisors' },
        { id: 'drivers',    label: 'Drivers',         icon: Car,        path: '/admin/drivers' },
        { id: 'venues',     label: 'Venues',          icon: MapPin,     path: '/admin/venues' },
      ]
    }
  ];

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const handleNavClick = (item) => {
    setActiveTab(item.id);
    navigate(item.path);
  };

  const initials = user?.name ? user.name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase() : 'A';

  return (
    <div className="admin-dashboard">
      {/* Header */}
      <header className="admin-header">
        <div className="admin-header-left">
          <img src={logo} alt="Logo" style={{ width: '42px', height: 'auto', objectFit: 'contain' }} />
          <div className="admin-brand">
            <h1>GrowMore Admin</h1>
            <p>Control Panel</p>
          </div>
        </div>

        <div className="admin-header-right">
          <div className="admin-user-chip">
            <div className="admin-avatar">{initials}</div>
            <span>{user?.name || 'Admin'}</span>
          </div>
          <button onClick={handleLogout} className="admin-logout-btn">
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </header>

      <div className="admin-body">
        {/* Sidebar */}
        <nav className="admin-sidebar">
          {navItems.map(section => (
            <React.Fragment key={section.section}>
              <div className="sidebar-section-label">{section.section}</div>
              {section.items.map(item => (
                <button
                  key={item.id}
                  className={`sidebar-nav-item ${activeTab === item.id ? 'active' : ''}`}
                  onClick={() => handleNavClick(item)}
                >
                  <item.icon size={18} />
                  {item.label}
                  {item.badge && (
                    <span className={item.badgeClass || 'nav-badge'}>{item.badge}</span>
                  )}
                </button>
              ))}
            </React.Fragment>
          ))}
        </nav>

        {/* Main Content */}
        <main className="admin-main">
          <Routes>
            <Route path="stats"        element={<AdminStats />} />
            <Route path="live"         element={<AdminLiveRides />} />
            <Route path="customers"    element={<AdminCustomerRides />} />
            <Route path="allbookings"  element={<AdminAllBookings />} />
            <Route path="transactions" element={<AdminTransactions />} />
            <Route path="managers"     element={<ManageManagers />} />
            <Route path="supervisors"  element={<ManageSupervisors />} />
            <Route path="drivers"      element={<ManageDrivers />} />
            <Route path="venues"       element={<ManageVenues />} />
            <Route path="/"            element={<AdminStats />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
