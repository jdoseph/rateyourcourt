import React, { useState } from 'react';
import AvatarColorPicker from './AvatarColorPicker';
import Toast from '../Toast/Toast';
import { updateAvatarColors } from '../../api';
import '../../App.css';

export default function Profile({ user, onUserUpdate }) {
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
    bio: user?.bio || ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });


  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setIsEditing(false);
      setToast({
        show: true,
        message: 'Basic Information was saved successfully.',
        type: 'success'
      });

    } catch (error) {
      setToast({
        show: true,
        message: 'Failed to update profile. Please try again.',
        type: 'danger'
      });
      
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      username: user?.username || '',
      email: user?.email || '',
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      phone: user?.phone || '',
      bio: user?.bio || ''
    });
    setIsEditing(false);
    setMessage(null);
  };

  const handleAvatarColorChange = async (colors) => {
    try {
      const result = await updateAvatarColors(colors);

      if (result.error) {
        setMessage({ type: 'error', text: result.error });
        return;
      }
      if (onUserUpdate && result.user) {
        onUserUpdate(result.user);
        setToast({
          show: true,
          message: 'Avatar color saved successfully!',
          type: 'success'
        });
      }
    } catch (error) {
      setToast({
        show: true,
        message: 'Failed to update avatar colors. Please try again.',
        type: 'danger'
      });
    }
  };

  return (
    <div>
      <h2 className="profile-section-title">Account Settings</h2>


      {message && (
        <div className={`alert-${message.type}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="settings-form">
        <div className="settings-section">
          <h3 className="settings-section-title">Avatar Customization</h3>

          <AvatarColorPicker
            user={user}
            onColorChange={handleAvatarColorChange}
          />
        </div>

        <div className="settings-section">
          <h3 className="settings-section-title">Basic Information</h3>

          <div className="settings-row">
            <div className="form-group">
              <label className="form-label">Username</label>
              <input
                type="text"
                name="username"
                className="form-input"
                value={formData.username}
                onChange={handleChange}
                disabled={!isEditing}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                name="email"
                className="form-input"
                value={formData.email}
                onChange={handleChange}
                disabled={!isEditing}
                required
              />
            </div>
          </div>

          <div className="settings-row">
            <div className="form-group">
              <label className="form-label">First Name</label>
              <input
                type="text"
                name="firstName"
                className="form-input"
                value={formData.firstName}
                onChange={handleChange}
                disabled={!isEditing}
                placeholder="Enter your first name"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Last Name</label>
              <input
                type="text"
                name="lastName"
                className="form-input"
                value={formData.lastName}
                onChange={handleChange}
                disabled={!isEditing}
                placeholder="Enter your last name"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <input
              type="tel"
              name="phone"
              className="form-input"
              value={formData.phone}
              onChange={handleChange}
              disabled={!isEditing}
              placeholder="Enter your phone number"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Bio</label>
            <textarea
              name="bio"
              className="form-input"
              value={formData.bio}
              onChange={handleChange}
              disabled={!isEditing}
              placeholder="Tell others about yourself"
              rows="4"
              style={{ resize: 'vertical', minHeight: '100px' }}
            />
          </div>
        </div>

        {isEditing ? (
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              type="submit"
              className="form-button"
              disabled={loading}
              style={{ width: 'auto', flex: 1 }}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="form-button"
              disabled={loading}
              style={{
                width: 'auto',
                flex: 1,
                background: '#6b7280',
                marginTop: '1rem'
              }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="form-button"
            style={{ width: 'auto' }}
          >
            Edit Profile
          </button>
        )}
      </form>

      <Toast
        show={toast.show}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast({ ...toast, show: false })}
      />
    </div>
  );
}