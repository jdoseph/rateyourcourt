import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getUserSavedCourts, removeSavedCourt } from '../../api';
import ConfirmationModal from './ConfirmationModal';
import Toast from '../Toast/Toast';
import '../../App.css';

export default function SavedCourts({ user }) {
  const [savedCourts, setSavedCourts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('date'); // date, name, rating, sport
  const [message, setMessage] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [courtToRemove, setCourtToRemove] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Fetch user's saved courts from API
  useEffect(() => {
    const fetchSavedCourts = async () => {
      setLoading(true);
      try {
        const data = await getUserSavedCourts();
        
        if (data.error) {
          console.error('Failed to fetch saved courts:', data.error);
          setSavedCourts([]);
          return;
        }
        
        // Transform API data to match component expectations
        const transformedCourts = data.savedCourts.map(court => ({
          id: court.id,
          name: court.name,
          sportType: court.sport_types || 'Not specified',
          address: court.address || 'Address not available',
          averageRating: parseFloat(court.average_rating) || 0,
          reviewCount: parseInt(court.review_count) || 0,
          surface: court.surface_type || 'Unknown',
          courtCount: court.court_count || 1,
          savedDate: court.created_at.split('T')[0], // Format date
          description: `${court.sport_types || 'Not specified'} court with ${court.surface_type || 'Unknown'} surface.`,
          lighting: court.lighting
        }));
        
        setSavedCourts(transformedCourts);
      } catch (error) {
        console.error('Failed to fetch saved courts:', error);
        setSavedCourts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSavedCourts();
  }, []);

  const sortedCourts = [...savedCourts].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'rating':
        return b.averageRating - a.averageRating;
      case 'sport':
        return a.sportType.localeCompare(b.sportType);
      case 'date':
      default:
        return new Date(b.savedDate) - new Date(a.savedDate);
    }
  });

  const getRatingClass = (rating) => {
    const numRating = Number(rating);
    if (numRating >= 4) return 'rating-badge-high';
    if (numRating >= 3) return 'rating-badge-medium';
    return 'rating-badge-low';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleRemoveFromSaved = async (courtId) => {
    setLoading(true);
    setMessage(null);

    try {
      const result = await removeSavedCourt(courtId);

      if (result.error) {
        setMessage({ type: 'error', text: result.error });
        return;
      }

      // Remove the court from local state
      setSavedCourts(savedCourts.filter(court => court.id !== courtId));
      setToast({ show: true, message: 'Court removed from saved list successfully!', type: 'success' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to remove court. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const showRemoveConfirmation = (court) => {
    setCourtToRemove(court);
    setShowConfirmModal(true);
  };

  if (loading) {
    return (
      <div>
        <h2 className="profile-section-title">Saved Courts</h2>
        <div className="loading-container">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 className="profile-section-title" style={{ marginBottom: 0 }}>Saved Courts</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label className="form-label" style={{ marginBottom: 0 }}>Sort by:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="form-input"
            style={{ width: 'auto', padding: '0.5rem' }}
          >
            <option value="date">Date Saved</option>
            <option value="name">Court Name</option>
            <option value="rating">Rating</option>
            <option value="sport">Sport Type</option>
          </select>
        </div>
      </div>

      {message && message.type === 'error' && (
        <div className={`alert-${message.type}`} style={{ marginBottom: '1.5rem' }}>
          {message.text}
        </div>
      )}

      {sortedCourts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔖</div>
          <h3 className="empty-state-title">No Saved Courts</h3>
          <p className="empty-state-text">
            You haven't saved any courts yet. Save courts you're interested in to easily find them later!
          </p>
        </div>
      ) : (
        <div className="profile-list">
          {sortedCourts.map((court) => (
            <div key={court.id} className="profile-list-item">
              <div className="profile-list-header">
                <div style={{ flex: 1 }}>
                  <Link 
                    to={`/courts/${court.id}`}
                    className="profile-list-title"
                    style={{ textDecoration: 'none', color: '#1f2937' }}
                  >
                    {court.name}
                  </Link>
                  {(() => {
                    const missingFields = [
                      court.surface,
                      court.courtCount,
                      court.lighting,
                      // Note: phone_number, website_url, opening_hours not in this data structure
                    ].filter(field => field === null || field === undefined || field === '' || field === '?' || field === 'Unknown').length;
                    
                    return missingFields > 0 && (
                      <span style={{
                        marginLeft: '0.5rem',
                        backgroundColor: '#fef3c7',
                        color: '#92400e',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '6px',
                        fontSize: '0.7rem',
                        fontWeight: '600',
                        border: '1px solid #f59e0b'
                      }}>
                        ⚠️ {missingFields} missing
                      </span>
                    );
                  })()}
                  <div className="profile-list-meta">
                    {court.sportType} • Saved on {formatDate(court.savedDate)}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div className={`rating-badge ${getRatingClass(court.averageRating)}`}>
                    {court.averageRating.toFixed(1)}
                  </div>
                </div>
              </div>
              
              <div className="profile-list-content">
                <p style={{ margin: '0 0 0.75rem 0' }}>{court.description}</p>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                  gap: '0.5rem',
                  fontSize: '0.875rem',
                  color: '#6b7280'
                }}>
                  <div><strong>Address:</strong> {court.address}</div>
                  <div><strong>Surface:</strong> {court.surface}</div>
                  <div><strong>Courts:</strong> {court.courtCount}</div>
                  <div><strong>Reviews:</strong> {court.reviewCount}</div>
                </div>
              </div>
              
              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <Link 
                    to={`/courts/${court.id}`}
                    className="form-button"
                    style={{ 
                      width: 'auto', 
                      padding: '0.5rem 1rem',
                      fontSize: '0.875rem',
                      textDecoration: 'none',
                      display: 'inline-block',
                      background: '#4285f4'
                    }}
                  >
                    View Details
                  </Link>
                </div>
                <button 
                  className="form-button"
                  style={{ 
                    width: 'auto', 
                    padding: '0.5rem 1rem',
                    fontSize: '0.875rem',
                    background: '#dc2626'
                  }}
                  onClick={() => showRemoveConfirmation(court)}
                >
                  Remove from Saved
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {sortedCourts.length > 0 && (
        <div style={{ textAlign: 'center', marginTop: '2rem', color: '#6b7280' }}>
          <p>You have {sortedCourts.length} saved court{sortedCourts.length !== 1 ? 's' : ''}</p>
        </div>
      )}

      <ConfirmationModal
        show={showConfirmModal}
        onHide={() => setShowConfirmModal(false)}
        onConfirm={() => handleRemoveFromSaved(courtToRemove.id)}
        title="Remove Saved Court"
        message={`Are you sure you want to remove "${courtToRemove?.name}" from your saved courts?`}
        confirmText="Remove"
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