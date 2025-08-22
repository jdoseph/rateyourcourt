import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getUserReviews, updateReview, deleteReview } from '../../api';
import ConfirmationModal from './ConfirmationModal';
import Toast from '../Toast/Toast';
import '../../App.css';

export default function YourRatings({ user }) {
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('date'); // date, rating, court
  const [editingReview, setEditingReview] = useState(null);
  const [editForm, setEditForm] = useState({ rating: 1, comment: '' });
  const [message, setMessage] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [ratingToDelete, setRatingToDelete] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Fetch user's reviews from API
  useEffect(() => {
    const fetchRatings = async () => {
      setLoading(true);
      try {
        const data = await getUserReviews();
        
        if (data.error) {
          console.error('Failed to fetch reviews:', data.error);
          setRatings([]);
          return;
        }
        
        // Transform API data to match component expectations
        const transformedRatings = data.reviews.map(review => ({
          id: review.id,
          courtName: review.court_name,
          courtId: review.court_id,
          rating: review.rating,
          review: review.comment,
          date: review.created_at.split('T')[0], // Format date
          sportType: review.sport_types || 'Unknown'
        }));
        
        setRatings(transformedRatings);
      } catch (error) {
        console.error('Failed to fetch ratings:', error);
        setRatings([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRatings();
  }, []);

  const sortedRatings = [...ratings].sort((a, b) => {
    switch (sortBy) {
      case 'rating':
        return b.rating - a.rating;
      case 'court':
        return a.courtName.localeCompare(b.courtName);
      case 'date':
      default:
        return new Date(b.date) - new Date(a.date);
    }
  });

  const renderStars = (rating) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    const emptyStars = 5 - Math.ceil(rating);

    return (
      <span className="rating-stars">
        {'★'.repeat(fullStars)}
        {hasHalfStar && '☆'}
        {'☆'.repeat(emptyStars)}
      </span>
    );
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleEditClick = (rating) => {
    setEditingReview(rating);
    setEditForm({ rating: rating.rating, comment: rating.review });
    setMessage(null);
  };

  const handleEditCancel = () => {
    setEditingReview(null);
    setEditForm({ rating: 1, comment: '' });
    setMessage(null);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const result = await updateReview(editingReview.id, {
        rating: editForm.rating,
        comment: editForm.comment
      });

      if (result.error) {
        setMessage({ type: 'error', text: result.error });
        return;
      }

      // Update the rating in the local state
      setRatings(ratings.map(r => 
        r.id === editingReview.id 
          ? { ...r, rating: editForm.rating, review: editForm.comment }
          : r
      ));

      setToast({ show: true, message: 'Review updated successfully!', type: 'success' });
      setEditingReview(null);
      setEditForm({ rating: 1, comment: '' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update review. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = async (ratingId) => {
    setLoading(true);
    setMessage(null);

    try {
      const result = await deleteReview(ratingId);

      if (result.error) {
        setMessage({ type: 'error', text: result.error });
        return;
      }

      // Remove the rating from local state
      setRatings(ratings.filter(r => r.id !== ratingId));
      setToast({ show: true, message: 'Review deleted successfully!', type: 'success' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete review. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const showDeleteConfirmation = (rating) => {
    setRatingToDelete(rating);
    setShowDeleteModal(true);
  };

  if (loading) {
    return (
      <div>
        <h2 className="profile-section-title">Your Ratings</h2>
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
        <h2 className="profile-section-title" style={{ marginBottom: 0 }}>Your Ratings</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label className="form-label" style={{ marginBottom: 0 }}>Sort by:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="form-input"
            style={{ width: 'auto', padding: '0.5rem' }}
          >
            <option value="date">Date</option>
            <option value="rating">Rating</option>
            <option value="court">Court Name</option>
          </select>
        </div>
      </div>

      {message && message.type === 'error' && (
        <div className={`alert-${message.type}`} style={{ marginBottom: '1.5rem' }}>
          {message.text}
        </div>
      )}

      {sortedRatings.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">⭐</div>
          <h3 className="empty-state-title">No Ratings Yet</h3>
          <p className="empty-state-text">
            You haven't rated any courts yet. Start exploring and share your experience with others!
          </p>
        </div>
      ) : (
        <div className="profile-list">
          {sortedRatings.map((rating) => (
            <div key={rating.id} className="profile-list-item">
              <div className="profile-list-header">
                <div>
                  <Link 
                    to={`/courts/${rating.courtId}`}
                    className="profile-list-title"
                    style={{ textDecoration: 'none', color: '#1f2937' }}
                  >
                    {rating.courtName}
                  </Link>
                  <div className="profile-list-meta">
                    {rating.sportType} • Rated on {formatDate(rating.date)}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {renderStars(rating.rating)}
                  <span style={{ fontWeight: 'bold', color: '#1f2937' }}>
                    {rating.rating.toFixed(1)}
                  </span>
                </div>
              </div>
              <div className="profile-list-content">
                {rating.review}
              </div>
              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                <button 
                  className="form-button"
                  style={{ 
                    width: 'auto', 
                    padding: '0.5rem 1rem',
                    fontSize: '0.875rem',
                    background: '#6b7280'
                  }}
                  onClick={() => handleEditClick(rating)}
                >
                  Edit
                </button>
                <button 
                  className="form-button"
                  style={{ 
                    width: 'auto', 
                    padding: '0.5rem 1rem',
                    fontSize: '0.875rem',
                    background: '#dc2626'
                  }}
                  onClick={() => showDeleteConfirmation(rating)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {sortedRatings.length > 0 && (
        <div style={{ textAlign: 'center', marginTop: '2rem', color: '#6b7280' }}>
          <p>You have rated {sortedRatings.length} court{sortedRatings.length !== 1 ? 's' : ''}</p>
        </div>
      )}

      {/* Edit Review Modal */}
      {editingReview && (
        <div className="modal-overlay" onClick={(e) => {
          if (e.target === e.currentTarget) handleEditCancel();
        }}>
          <div className="modal-container">
            <div className="modal-header">
              <h2 className="modal-title">Edit Review</h2>
              <button className="modal-close-btn" onClick={handleEditCancel}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleEditSubmit}>
                <div className="form-group">
                  <label className="form-label">Court: {editingReview.courtName}</label>
                </div>
                
                <div className="form-group">
                  <label className="form-label">Rating</label>
                  <select
                    className="form-input"
                    value={editForm.rating}
                    onChange={(e) => setEditForm({ ...editForm, rating: parseInt(e.target.value) })}
                    required
                  >
                    <option value={1}>⭐ (1)</option>
                    <option value={2}>⭐⭐ (2)</option>
                    <option value={3}>⭐⭐⭐ (3)</option>
                    <option value={4}>⭐⭐⭐⭐ (4)</option>
                    <option value={5}>⭐⭐⭐⭐⭐ (5)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Review</label>
                  <textarea
                    className="form-input"
                    value={editForm.comment}
                    onChange={(e) => setEditForm({ ...editForm, comment: e.target.value })}
                    placeholder="Share your experience..."
                    rows={4}
                    required
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={handleEditCancel}
                    className="form-button"
                    style={{ background: '#6b7280' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="form-button"
                    disabled={loading}
                  >
                    {loading ? 'Updating...' : 'Update Review'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        show={showDeleteModal}
        onHide={() => setShowDeleteModal(false)}
        onConfirm={() => handleDeleteClick(ratingToDelete.id)}
        title="Delete Review"
        message={`Are you sure you want to delete your review for "${ratingToDelete?.courtName}"? This action cannot be undone.`}
        confirmText="Delete"
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