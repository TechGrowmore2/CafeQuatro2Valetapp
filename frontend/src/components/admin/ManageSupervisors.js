import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Shield, Plus, Edit, Trash2, X, Check } from 'lucide-react';
import api from '../../services/api';
import './ManageUsers.css';

const ManageSupervisors = () => {
  const [supervisors, setSupervisors] = useState([]);
  const [managers, setManagers] = useState([]);
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    password: '',
    managerId: '',
    venueId: '',
    isActive: true
  });

  useEffect(() => {
    fetchSupervisors();
  }, []);

  const fetchSupervisors = async () => {
    try {
      const [supRes, manRes, venRes] = await Promise.all([
        api.get('/admin/supervisors'),
        api.get('/admin/managers'),
        api.get('/admin/venues')
      ]);
      setSupervisors(supRes.data.supervisors);
      setManagers(manRes.data.managers || []);
      setVenues(venRes.data.venues || []);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/admin/supervisors/${editingId}`, formData);
        toast.success('Supervisor updated successfully');
      } else {
        await api.post('/admin/supervisors', formData);
        toast.success('Supervisor created successfully');
      }
      resetForm();
      fetchSupervisors();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleEdit = (supervisor) => {
    setEditingId(supervisor._id);
    setFormData({
      name: supervisor.name,
      phone: supervisor.phone,
      password: '',
      managerId: supervisor.manager?._id || supervisor.manager || '',
      venueId: supervisor.venue?._id || supervisor.venue || '',
      isActive: supervisor.isActive
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this supervisor?')) return;
    
    try {
      await api.delete(`/admin/supervisors/${id}`);
      toast.success('Supervisor deleted successfully');
      fetchSupervisors();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete supervisor');
    }
  };

  const resetForm = () => {
    setFormData({ name: '', phone: '', password: '', managerId: '', venueId: '', isActive: true });
    setEditingId(null);
    setShowForm(false);
  };

  if (loading) {
    return <div className="loading">Loading supervisors...</div>;
  }

  return (
    <div className="manage-users-container">
      <div className="page-header">
        <h2>Manage Supervisors</h2>
        <button className="add-btn" onClick={() => setShowForm(true)}>
          <Plus size={20} />
          Add Supervisor
        </button>
      </div>

      {showForm && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="form-container"
        >
          <div className="form-header">
            <h3>{editingId ? 'Edit Supervisor' : 'Add New Supervisor'}</h3>
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
                <label>Assign Manager</label>
                <select
                  value={formData.managerId}
                  onChange={(e) => setFormData({...formData, managerId: e.target.value})}
                >
                  <option value="">None</option>
                  {managers.map(m => (
                    <option key={m._id} value={m._id}>{m.name}</option>
                  ))}
                </select>
              </div>
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
                <label className="checkbox-label">
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
                {editingId ? 'Update' : 'Create'} Supervisor
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
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {supervisors.map((supervisor) => (
              <tr key={supervisor._id}>
                <td>
                  <div className="user-cell">
                    <Shield size={18} color="#667eea" />
                    <span>{supervisor.name}</span>
                  </div>
                </td>
                <td>{supervisor.phone}</td>
                <td>
                  <span className={`status-badge ${supervisor.isActive ? 'active' : 'inactive'}`}>
                    {supervisor.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>{new Date(supervisor.createdAt).toLocaleDateString()}</td>
                <td>
                  <div className="action-buttons">
                    <button
                      className="icon-btn edit"
                      onClick={() => handleEdit(supervisor)}
                      title="Edit"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      className="icon-btn delete"
                      onClick={() => handleDelete(supervisor._id)}
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
        {supervisors.length === 0 && (
          <div className="empty-state">
            <Shield size={64} color="#CCC" />
            <p>No supervisors found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageSupervisors;
