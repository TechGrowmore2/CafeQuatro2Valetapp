import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Car, Phone, FileText, ArrowLeft } from 'lucide-react';
import api from '../services/api';
import './CreateBooking.css';

const CreateBooking = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    vehicleNumber: '',
    notes: '',
    hasValuables: false,
    valuables: [],
  });
  const [carImages, setCarImages] = useState([]);
  const [loading, setLoading] = useState(false);


  const valuableOptions = [
    'Laptop', 'Phone', 'Wallet', 'Gift', 'Snacks', 'Charger', 'HeadPhone'
  ];

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleValuablesToggle = () => {
    setFormData({
      ...formData,
      hasValuables: !formData.hasValuables,
      valuables: !formData.hasValuables ? formData.valuables : []
    });
  };

  const handleValuableSelect = (valuable) => {
    const updated = formData.valuables.includes(valuable)
      ? formData.valuables.filter(v => v !== valuable)
      : [...formData.valuables, valuable];
    
    setFormData({
      ...formData,
      valuables: updated
    });
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + carImages.length > 4) {
      toast.error('Maximum 4 images allowed');
      return;
    }
    setCarImages([...carImages, ...files]);
  };

  const removeImage = (index) => {
    setCarImages(carImages.filter((_, i) => i !== index));
  };

  // Vehicle number: accept full (e.g. MH12AB1234) or last 4 digits
  const validateVehicleNumber = (num) => {
    const trimmed = num.trim();
    // Allow 4-digit short form or full plate (4-13 chars)
    return trimmed.length >= 4;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.customerName.trim()) {
      toast.error('Customer name is required');
      return;
    }
    if (!formData.customerPhone.trim() || !/^[0-9]{10}$/.test(formData.customerPhone.trim())) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }
    if (!formData.vehicleNumber.trim() || !validateVehicleNumber(formData.vehicleNumber)) {
      toast.error('Vehicle number must be at least 4 characters');
      return;
    }

    setLoading(true);

    try {
      const submitData = new FormData();

      // Customer info
      submitData.append('customerName', formData.customerName.trim());
      submitData.append('customerPhone', formData.customerPhone.trim());
      if (formData.customerEmail.trim()) {
        submitData.append('customerEmail', formData.customerEmail.trim());
      }

      // Vehicle info — send a default vehicleType since backend may require it
      submitData.append('vehicleType', 'car');
      submitData.append('vehicleNumber', formData.vehicleNumber.trim().toUpperCase());

      // Security
      submitData.append('hasValuables', formData.hasValuables);
      submitData.append('valuables', JSON.stringify(formData.valuables));

      // Notes
      submitData.append('notes', formData.notes);

      // Append images
      carImages.forEach((file) => {
        submitData.append('carImages', file);
      });

      const response = await api.post('/bookings', submitData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      toast.success(`Booking created! ID: ${response.data.booking.bookingId}`);
      
      // Reset form
      setFormData({
        customerName: '',
        customerPhone: '',
        customerEmail: '',
        vehicleNumber: '',
        notes: '',
        hasValuables: false,
        valuables: [],
      });
      setCarImages([]);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create booking');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="create-booking-container"
    >
      <div className="booking-header-section">
        <button 
          type="button"
          className="back-to-home-btn"
          onClick={() => navigate('/driver/home')}
        >
          <ArrowLeft size={20} />
          Back to Home
        </button>
        <h2>Create New Booking</h2>
      </div>
      
      <form onSubmit={handleSubmit} className="booking-form">

        {/* Customer Information */}
        <div className="form-section">
          <h3><Phone size={20} /> Customer Information</h3>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="customerName">Customer Name *</label>
              <input
                type="text"
                id="customerName"
                name="customerName"
                value={formData.customerName}
                onChange={handleChange}
                required
                placeholder="Full name"
              />
            </div>
            <div className="form-group">
              <label htmlFor="customerPhone">Mobile Number *</label>
              <input
                type="tel"
                id="customerPhone"
                name="customerPhone"
                value={formData.customerPhone}
                onChange={handleChange}
                required
                pattern="[0-9]{10}"
                maxLength="10"
                placeholder="10-digit mobile number"
              />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="customerEmail">Email (Optional)</label>
            <input
              type="email"
              id="customerEmail"
              name="customerEmail"
              value={formData.customerEmail}
              onChange={handleChange}
              placeholder="customer@example.com"
            />
          </div>
        </div>

        {/* Vehicle Information */}
        <div className="form-section">
          <h3><Car size={20} /> Vehicle Information</h3>
          <div className="form-group">
            <label htmlFor="vehicleNumber">Vehicle Number * <span className="field-hint">(full plate or last 4 digits)</span></label>
            <input
              type="text"
              id="vehicleNumber"
              name="vehicleNumber"
              value={formData.vehicleNumber}
              onChange={handleChange}
              required
              minLength="4"
              placeholder="MH12AB1234 or 1234"
              style={{ textTransform: 'uppercase' }}
            />
          </div>
        </div>

        {/* Vehicle Security */}
        <div className="form-section">
          <h3><Car size={20} /> Vehicle Security <span className="section-optional">(Optional)</span></h3>
          
          {/* Valuables Section */}
          <div className="valuables-section">
            <div className="valuables-toggle">
              <label className="toggle-label">
                <span>Any valuables in the car?</span>
                <input
                  type="checkbox"
                  checked={formData.hasValuables}
                  onChange={handleValuablesToggle}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            {formData.hasValuables && (
              <div className="valuables-list">
                <p className="valuables-subtitle">Select valuables:</p>
                <div className="valuables-grid">
                  {valuableOptions.map(valuable => (
                    <button
                      key={valuable}
                      type="button"
                      className={`valuable-chip ${formData.valuables.includes(valuable) ? 'selected' : ''}`}
                      onClick={() => handleValuableSelect(valuable)}
                    >
                      {valuable}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Car Images Section */}
          <div className="car-images-section">
            <label className="image-upload-label">Upload Car Images (Max 4)</label>
            <p className="image-upload-hint">Capture front, back, and both sides for security</p>
            
            <div className="image-upload-buttons">
              {/* Browse Files */}
              <div className="image-upload-area">
                <input
                  type="file"
                  id="carImages"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  style={{ display: 'none' }}
                  disabled={carImages.length >= 4}
                />
                <label htmlFor="carImages" className={`upload-label ${carImages.length >= 4 ? 'disabled' : ''}`}>
                  <Car size={40} />
                  <span>Browse Images</span>
                </label>
              </div>

              {/* Camera Capture */}
              <div className="image-upload-area">
                <input
                  type="file"
                  id="cameraCapture"
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageChange}
                  style={{ display: 'none' }}
                  disabled={carImages.length >= 4}
                />
                <label htmlFor="cameraCapture" className={`upload-label camera-label ${carImages.length >= 4 ? 'disabled' : ''}`}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                  <span>Use Camera</span>
                </label>
              </div>
            </div>

            <div className="upload-count-display">{carImages.length}/4 images uploaded</div>

            {carImages.length > 0 && (
              <div className="image-preview-grid">
                {carImages.map((file, index) => (
                  <div key={index} className="image-preview">
                    <img src={URL.createObjectURL(file)} alt={`Car ${index + 1}`} />
                    <button
                      type="button"
                      className="remove-image-btn"
                      onClick={() => removeImage(index)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Notes Section */}
        <div className="form-section">
          <h3><FileText size={20} /> Notes (Optional)</h3>
          <div className="form-group">
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="4"
              placeholder="Any special instructions or additional information..."
            />
          </div>
        </div>

        <button type="submit" className="submit-btn" disabled={loading}>
          {loading ? 'Creating Booking...' : 'Create Booking'}
        </button>
      </form>
    </motion.div>
  );
};

export default CreateBooking;
