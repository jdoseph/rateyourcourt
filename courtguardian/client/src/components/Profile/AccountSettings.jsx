import React, { useState, useEffect } from 'react';
import { updatePassword, updateNotificationSettings, updatePrivacySettings, deleteAccount } from '../../api';
import ConfirmationModal from './ConfirmationModal';
import Toast from '../Toast/Toast';
import '../../App.css';

export default function AccountSettings({ user, onUserUpdate }) {
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: user?.notification_settings?.emailNotifications ?? true,
    pushNotifications: user?.notification_settings?.pushNotifications ?? false,
    reviewReminders: user?.notification_settings?.reviewReminders ?? true,
    newCourtAlerts: user?.notification_settings?.newCourtAlerts ?? true
  });
  const [privacySettings, setPrivacySettings] = useState({
    profileVisibility: user?.privacy_settings?.profileVisibility || 'public',
    showReviews: user?.privacy_settings?.showReviews ?? true
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Update settings when user prop changes
  useEffect(() => {
    if (user) {
      setNotificationSettings({
        emailNotifications: user?.notification_settings?.emailNotifications ?? true,
        pushNotifications: user?.notification_settings?.pushNotifications ?? false,
        reviewReminders: user?.notification_settings?.reviewReminders ?? true,
        newCourtAlerts: user?.notification_settings?.newCourtAlerts ?? true
      });
      setPrivacySettings({
        profileVisibility: user?.privacy_settings?.profileVisibility || 'public',
        showReviews: user?.privacy_settings?.showReviews ?? true
      });
    }
  }, [user]);

  const handlePasswordChange = (e) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value
    });
  };

  const handleNotificationChange = (e) => {
    setNotificationSettings({
      ...notificationSettings,
      [e.target.name]: e.target.checked
    });
  };

  const handlePrivacyChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setPrivacySettings({
      ...privacySettings,
      [e.target.name]: value
    });
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match!' });
      return;
    }
    
    setLoading(true);
    setMessage(null);

    try {
      const result = await updatePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      
      if (result.error) {
        setMessage({ type: 'error', text: result.error });
        return;
      }
      
      setToast({ show: true, message: 'Password updated successfully!', type: 'success' });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update password. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationSettingsUpdate = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const result = await updateNotificationSettings(notificationSettings);
      
      if (result.error) {
        setMessage({ type: 'error', text: result.error });
        return;
      }
      
      setToast({ show: true, message: 'Notification settings updated successfully!', type: 'success' });
      if (onUserUpdate && result.user) {
        onUserUpdate(result.user);
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update notification settings. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handlePrivacySettingsUpdate = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const result = await updatePrivacySettings(privacySettings);
      
      if (result.error) {
        setMessage({ type: 'error', text: result.error });
        return;
      }
      
      setToast({ show: true, message: 'Privacy settings updated successfully!', type: 'success' });
      if (onUserUpdate && result.user) {
        onUserUpdate(result.user);
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update privacy settings. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setLoading(true);
    setMessage(null);
    
    try {
      const result = await deleteAccount();
      
      if (result.error) {
        setMessage({ type: 'error', text: result.error });
        return;
      }
      
      setToast({ show: true, message: 'Account deleted successfully. You will be logged out shortly.', type: 'success' });
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete account. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="profile-section-title">Account Settings</h2>
      
      {message && message.type === 'error' && (
        <div className={`alert-${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="settings-form">
        {/* Password Section */}
        <div className="settings-section">
          <h3 className="settings-section-title">Change Password</h3>
          <form onSubmit={handlePasswordSubmit}>
            <div className="form-group">
              <label className="form-label">Current Password</label>
              <input
                type="password"
                name="currentPassword"
                className="form-input"
                value={passwordData.currentPassword}
                onChange={handlePasswordChange}
                required
              />
            </div>
            <div className="settings-row">
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input
                  type="password"
                  name="newPassword"
                  className="form-input"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  className="form-input"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              className="form-button"
              disabled={loading}
              style={{ width: 'auto' }}
            >
              Update Password
            </button>
          </form>
        </div>

        {/* Notification Settings */}
        <div className="settings-section">
          <h3 className="settings-section-title">Notification Preferences</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                name="emailNotifications"
                checked={notificationSettings.emailNotifications}
                onChange={handleNotificationChange}
              />
              <span>Email notifications</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                name="pushNotifications"
                checked={notificationSettings.pushNotifications}
                onChange={handleNotificationChange}
              />
              <span>Push notifications</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                name="reviewReminders"
                checked={notificationSettings.reviewReminders}
                onChange={handleNotificationChange}
              />
              <span>Review reminders</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                name="newCourtAlerts"
                checked={notificationSettings.newCourtAlerts}
                onChange={handleNotificationChange}
              />
              <span>New court alerts in your area</span>
            </label>
          </div>
          <button
            type="button"
            onClick={handleNotificationSettingsUpdate}
            className="form-button"
            disabled={loading}
            style={{ width: 'auto', marginTop: '1rem' }}
          >
            Save Notification Settings
          </button>
        </div>

        {/* Privacy Settings */}
        <div className="settings-section">
          <h3 className="settings-section-title">Privacy Settings</h3>
          <div className="form-group">
            <label className="form-label">Profile Visibility</label>
            <select
              name="profileVisibility"
              className="form-input"
              value={privacySettings.profileVisibility}
              onChange={handlePrivacyChange}
            >
              <option value="public">Public</option>
              <option value="private">Private</option>
              <option value="friends">Friends Only</option>
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                name="showReviews"
                checked={privacySettings.showReviews}
                onChange={handlePrivacyChange}
              />
              <span>Show my reviews publicly</span>
            </label>
          </div>
          <button
            type="button"
            onClick={handlePrivacySettingsUpdate}
            className="form-button"
            disabled={loading}
            style={{ width: 'auto', marginTop: '1rem' }}
          >
            Save Privacy Settings
          </button>
        </div>

        {/* Account Actions */}
        <div className="settings-section">
          <h3 className="settings-section-title">Account Actions</h3>
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            disabled={loading}
            style={{
              padding: '0.875rem 1.5rem',
              background: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => e.target.style.background = '#b91c1c'}
            onMouseLeave={(e) => e.target.style.background = '#dc2626'}
          >
            Delete Account
          </button>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.5rem' }}>
            This action cannot be undone. All your data will be permanently deleted.
          </p>
        </div>
      </div>

      <ConfirmationModal
        show={showDeleteModal}
        onHide={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteAccount}
        title="Delete Account"
        message="Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently removed."
        confirmText="Delete Account"
        type="danger"
      />

      <Toast
        show={toast.show}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast({ ...toast, show: false })}
      />
    </div>
  );
}