import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Briefcase, Plus, Edit, Trash2, X, Check } from 'lucide-react';
import api from '../../services/api';
import './ManageUsers.css';

const ManageManagers = () => {
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    password: '',
    isActive: true
  });

  useEffect(() => {
    fetchManagers();
  }, []);

  const fetchManagers = async () => {
    try {
      const response = await api.get('/admin/managers');
      setManagers(response.data.managers);
    } catch (error) {
      toast.error('Failed to fetch managers');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/admin/managers/${editingId}`, formData);
        toast.success('Manager updated successfully');
      } else {
        await api.post('/admin/managers', formData);
        toast.success('Manager created successfully');
      }
      resetForm();
      fetchManagers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleEdit = (manager) => {
    setEditingId(manager._id);
    setFormData({
      name: manager.name,
      phone: manager.phone,
      password: '',
      isActive: manager.isActive
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this manager?')) return;
    
    try {
      await api.delete(`/admin/managers/${id}`);
      toast.success('Manager deleted successfully');
      fetchManagers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete manager');
    }
  };

  const resetForm = () => {
    setFormData({ name: '', phone: '', password: '', isActive: true });
    setEditingId(null);
    setShowForm(false);
  };

  if (loading) {
    return <div className="loading">Loading managers...</div>;
  }

  return (
    <div className="manage-users-container">
      <div className="page-header">
        <h2>Manage Managers</h2>
        <button className="add-btn" onClick={() => setShowForm(true)}>
          <Plus size={20} />
          Add Manager
        </button>
      </div>

      {showForm && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="form-container"
        >
          <div className="form-header">
            <h3>{editingId ? 'Edit Manager' : 'Add New Manager'}</h3>
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
                {editingId ? 'Update' : 'Create'} Manager
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
            {managers.map((manager) => (
              <tr key={manager._id}>
                <td>
                  <div className="user-cell">
                    <Briefcase size={18} color="#667eea" />
                    <span>{manager.name}</span>
                  </div>
                </td>
                <td>{manager.phone}</td>
                <td>
                  <span className={`status-badge ${manager.isActive ? 'active' : 'inactive'}`}>
                    {manager.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>{new Date(manager.createdAt).toLocaleDateString()}</td>
                <td>
                  <div className="action-buttons">
                    <button
                      className="icon-btn edit"
                      onClick={() => handleEdit(manager)}
                      title="Edit"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      className="icon-btn delete"
                      onClick={() => handleDelete(manager._id)}
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
        {managers.length === 0 && (
          <div className="empty-state">
            <Briefcase size={64} color="#CCC" />
            <p>No managers found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageManagers;
