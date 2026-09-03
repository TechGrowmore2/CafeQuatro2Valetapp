import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Car, Plus, Edit, Trash2, X, Check, Shield } from 'lucide-react';
import api from '../../services/api';
import './ManageUsers.css';

const ManageDrivers = () => {
  const [drivers, setDrivers] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    password: '',
    supervisorId: '',
    venueId: '',
    isActive: true
  });

  useEffect(() => {
    fetchDrivers();
    fetchSupervisors();
    fetchVenues();
  }, []);

  const fetchDrivers = async () => {
    try {
      const response = await api.get('/admin/drivers');
      setDrivers(response.data.drivers);
    } catch (error) {
      toast.error('Failed to fetch drivers');
    } finally {
      setLoading(false);
    }
  };

  const fetchSupervisors = async () => {
    try {
      const response = await api.get('/admin/supervisors');
      setSupervisors(response.data.supervisors.filter(s => s.isActive));
    } catch (error) {
      console.error('Failed to fetch supervisors');
    }
  };

  const fetchVenues = async () => {
    try {
      const response = await api.get('/admin/venues');
      setVenues(response.data.venues || []);
    } catch (error) {
      console.error('Failed to fetch venues');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/admin/drivers/${editingId}`, formData);
        toast.success('Driver updated successfully');
      } else {
        await api.post('/admin/drivers', formData);
        toast.success('Driver created successfully');
      }
      resetForm();
      fetchDrivers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleEdit = (driver) => {
    setEditingId(driver._id);
    setFormData({
      name: driver.name,
      phone: driver.phone,
      password: '',
      supervisorId: driver.supervisor?._id || '',
      venueId: driver.venue?._id || driver.venue || '',
      isActive: driver.isActive
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this driver?')) return;
    
    try {
      await api.delete(`/admin/drivers/${id}`);
      toast.success('Driver deleted successfully');
      fetchDrivers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete driver');
    }
  };

  const resetForm = () => {
    setFormData({ name: '', phone: '', password: '', supervisorId: '', venueId: '', isActive: true });
    setEditingId(null);
    setShowForm(false);
  };

  if (loading) {
    return <div className="loading">Loading drivers...</div>;
  }

  return (
    <div className="manage-users-container">
      <div className="page-header">
        <h2>Manage Drivers</h2>
        <button className="add-btn" onClick={() => setShowForm(true)}>
          <Plus size={20} />
          Add Driver
        </button>
      </div>

      {showForm && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="form-container"
        >
          <div className="form-header">
            <h3>{editingId ? 'Edit Driver' : 'Add New Driver'}</h3>
            <button className="close-btn" onClick={resetForm}>
              <X size={20} />
            </button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Phone *</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  pattern="[0-9]{10}"
                  maxLength="10"
                  required
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Password {editingId ? '(Leave blank to keep current)' : '*'}</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  required={!editingId}
                  minLength="6"
                />
              </div>
              <div className="form-group">
                <label>Assign Supervisor *</label>
                <select
                  value={formData.supervisorId}
                  onChange={(e) => setFormData({...formData, supervisorId: e.target.value})}
                  required
                >
                  <option value="">Select Supervisor</option>
                  {supervisors.map(sup => (
                    <option key={sup._id} value={sup._id}>
                      {sup.name} ({sup.phone})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Assign Venue</label>
                <select
                  value={formData.venueId}
                  onChange={(e) => setFormData({...formData, venueId: e.target.value})}
                >
                  <option value="">None</option>
                  {venues.map(v => (
                    <option key={v._id} value={v._id}>{v.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="checkbox-label" style={{ marginTop: '30px' }}>
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                  />
                  <span>Active</span>
                </label>
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="submit-btn">
                <Check size={18} />
                {editingId ? 'Update' : 'Create'} Driver
              </button>
              <button type="button" className="cancel-btn" onClick={resetForm}>
                Cancel
              </button>
            </div>
          </form>
        </motion.div>
      )}

      <div className="users-table">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Supervisor</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {drivers.map((driver) => (
              <tr key={driver._id}>
                <td>
                  <div className="user-cell">
                    <Car size={18} color="#f5576c" />
                    <span>{driver.name}</span>
                  </div>
                </td>
                <td>{driver.phone}</td>
                <td>
                  {driver.supervisor ? (
                    <div className="supervisor-cell">
                      <Shield size={14} color="#667eea" />
                      <span>{driver.supervisor.name}</span>
                    </div>
                  ) : (
                    <span style={{color: '#999'}}>Not assigned</span>
                  )}
                </td>
                <td>
                  <span className={`status-badge ${driver.isActive ? 'active' : 'inactive'}`}>
                    {driver.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>{new Date(driver.createdAt).toLocaleDateString()}</td>
                <td>
                  <div className="action-buttons">
                    <button
                      className="icon-btn edit"
                      onClick={() => handleEdit(driver)}
                      title="Edit"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      className="icon-btn delete"
                      onClick={() => handleDelete(driver._id)}
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {drivers.length === 0 && (
          <div className="empty-state">
            <Car size={64} color="#CCC" />
            <p>No drivers found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageDrivers;
