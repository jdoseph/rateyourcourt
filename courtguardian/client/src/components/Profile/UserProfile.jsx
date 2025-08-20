import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Profile from './Profile';
import AccountSettings from './AccountSettings';
import YourRatings from './YourRatings';
import SavedCourts from './SavedCourts';
import AdminPanel from './AdminPanel';
import '../../App.css';

export default function UserProfile({ user, onLogout, onUserUpdate }) {
  const [searchParams] = useSearchParams();
  const [activeSection, setActiveSection] = useState('profile');

  // Update active section based on URL parameter
  useEffect(() => {
    const section = searchParams.get('section');
    const validSections = ['profile', 'settings', 'ratings', 'saved'];
    if (user?.role === 'admin') {
      validSections.push('admin');
    }
    if (section && validSections.includes(section)) {
      setActiveSection(section);
    }
  }, [searchParams, user]);

  const navigationItems = [
    { id: 'profile', label: 'Profile', icon: 'bi-person' },
    { id: 'settings', label: 'Account Settings', icon: 'bi-gear' },
    { id: 'ratings', label: 'Your Ratings', icon: 'bi-star' },
    { id: 'saved', label: 'Saved Courts', icon: 'bi-bookmark' },
    ...(user?.role === 'admin' ? [{ id: 'admin', label: 'Admin Panel', icon: 'bi-shield-check', admin: true }] : [])
  ];

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'profile':
        return <Profile user={user} onUserUpdate={onUserUpdate} />;
      case 'settings':
        return <AccountSettings user={user} onUserUpdate={onUserUpdate} />;
      case 'ratings':
        return <YourRatings user={user} />;
      case 'saved':
        return <SavedCourts user={user} />;
      case 'admin':
        return user?.role === 'admin' ? <AdminPanel user={user} /> : <Profile user={user} onUserUpdate={onUserUpdate} />;
      default:
        return <Profile user={user} onUserUpdate={onUserUpdate} />;
    }
  };

  if (!user) {
    return (
      <div className="profile-container">
        <div className="profile-content">
          <div style={{
            textAlign: 'center',
            padding: '3rem',
            color: '#6b7280'
          }}>
            <h2>Please log in to view your profile.</h2>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <div className="profile-content">
        {/* Profile Header */}
        <div className="profile-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div 
              className="profile-avatar"
              style={{
                background: user.avatar_colors 
                  ? `linear-gradient(135deg, ${user.avatar_colors.start} 0%, ${user.avatar_colors.end} 100%)`
                  : 'linear-gradient(135deg, #3498db 0%, #2c3e50 100%)'
              }}
            >
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <h1 className="profile-name">{user.username}</h1>
                {user.role === 'admin' && (
                  <span style={{
                    backgroundColor: '#fef3c7',
                    color: '#92400e',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    border: '1px solid #f59e0b'
                  }}>
                    ADMIN
                  </span>
                )}
              </div>
              <p className="profile-email">{user.email}</p>
            </div>
          </div>
        </div>

        {/* Profile Sections */}
        <div className="profile-sections">
          {/* Sidebar Navigation */}
          <div className="profile-sidebar">
            <nav>
              <ul className="profile-nav">
                {navigationItems.map((item) => (
                  <li key={item.id} className="profile-nav-item">
                    <button
                      className={`profile-nav-link ${activeSection === item.id ? 'active' : ''}`}
                      onClick={() => setActiveSection(item.id)}
                      style={item.admin ? {
                        background: activeSection === item.id ? '#fef3c7' : '#fff7ed',
                        borderLeft: '3px solid #f59e0b',
                        color: '#92400e',
                        fontWeight: '600'
                      } : {}}
                    >
                      <i className={`${item.icon} profile-nav-icon`}></i>
                      {item.label}
                      {item.admin && <span style={{ fontSize: '0.75rem', marginLeft: '0.5rem' }}>⚠️</span>}
                    </button>
                  </li>
                ))}
                <li className="profile-nav-item" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #f0f0f0' }}>
                  <button
                    className="profile-nav-link"
                    onClick={onLogout}
                    style={{ color: '#dc2626' }}
                  >
                    <i className="bi-box-arrow-right profile-nav-icon"></i>
                    Logout
                  </button>
                </li>
              </ul>
            </nav>
          </div>

          {/* Main Content */}
          <div className="profile-main">
            {renderActiveSection()}
          </div>
        </div>
      </div>
    </div>
  );
}