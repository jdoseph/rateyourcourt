import React, { useEffect, useState } from 'react';
import { getToken, isCourtSavedByUser, saveCourtForUser, removeSavedCourt } from '../../api';
import { API_BASE_URL } from '../../constants';
import Toast from '../Toast/Toast';
import CourtVerification from './CourtVerification';
import PhotoGallery from '../Photos/PhotoGallery';
import ReviewPhotoUpload from '../Photos/ReviewPhotoUpload';
import ConfirmationModal from '../Profile/ConfirmationModal';

export default function CourtDetails({ courtId, user }) {
  const [court, setCourt] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loadingCourt, setLoadingCourt] = useState(true);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [error, setError] = useState(null);

  // Review form state
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitError, setSubmitError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Save court state
  const [isSaved, setIsSaved] = useState(false);
  const [savingCourt, setSavingCourt] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  
  // Photos state
  const [photos, setPhotos] = useState([]);
  const [loadingPhotos, setLoadingPhotos] = useState(true);
  
  // Review photo upload state
  const [reviewPhotos, setReviewPhotos] = useState([]);
  
  // Edit review state
  const [editingReview, setEditingReview] = useState(null);
  const [editRating, setEditRating] = useState(5);
  const [editComment, setEditComment] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState(null);
  const [editPhotos, setEditPhotos] = useState([]);
  
  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState({
    show: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    type: 'danger',
    onConfirm: null
  });

  useEffect(() => {
    async function fetchCourt() {
      try {
        const res = await fetch(`${API_BASE_URL}/courts/${courtId}`);
        if (!res.ok) {
          const errorText = await res.text();
          console.error('Court API error response:', errorText);
          throw new Error(`Failed to fetch court: ${res.status} - ${errorText}`);
        }
        const data = await res.json();
        setCourt(data);
      } catch (err) {
        console.error('fetchCourt error:', err);
        setError(err.message);
      } finally {
        setLoadingCourt(false);
      }
    }

    async function fetchReviews() {
      try {
        const token = getToken();
        const headers = {
          'Content-Type': 'application/json'
        };
        
        // Include authorization header if user is logged in
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        
        const res = await fetch(`${API_BASE_URL}/courts/${courtId}/reviews`, {
          headers
        });
        if (!res.ok) throw new Error('Failed to fetch reviews');
        const data = await res.json();
        setReviews(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoadingReviews(false);
      }
    }

    async function checkIfCourtIsSaved() {
      const token = getToken();
      if (!token) return; // Not logged in
      
      try {
        const data = await isCourtSavedByUser(courtId);
        if (!data.error) {
          setIsSaved(data.isSaved);
        }
      } catch (error) {
        console.error('Failed to check saved status:', error);
      }
    }

    async function fetchPhotosInternal() {
      try {
        const res = await fetch(`${API_BASE_URL}/courts/${courtId}/photos`);
        if (!res.ok) throw new Error('Failed to fetch photos');
        const data = await res.json();
        setPhotos(data);
      } catch (err) {
        console.error('Failed to fetch photos:', err);
      } finally {
        setLoadingPhotos(false);
      }
    }

    fetchCourt();
    fetchReviews();
    checkIfCourtIsSaved();
    fetchPhotosInternal();
  }, [courtId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitting(true);

    const token = getToken();
    if (!token) {
      setSubmitError('You must be logged in to submit a review');
      setSubmitting(false);
      return;
    }

    try {
      // First submit the review
      const reviewRes = await fetch(`${API_BASE_URL}/courts/${courtId}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ rating, comment }),
      });

      if (!reviewRes.ok) {
        const errData = await reviewRes.json();
        throw new Error(errData.error || 'Failed to submit review');
      }

      const reviewData = await reviewRes.json();
      
      // If there are photos, upload them and associate with the review
      if (reviewPhotos.length > 0) {
        const formData = new FormData();
        reviewPhotos.forEach((file) => {
          formData.append('photos', file);
        });
        formData.append('reviewId', reviewData.id);

        const photoRes = await fetch(`${API_BASE_URL}/courts/${courtId}/reviews/${reviewData.id}/photos`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        if (!photoRes.ok) {
          console.warn('Failed to upload review photos, but review was saved');
        }
      }

      // Reset form
      setComment('');
      setRating(5);
      setReviewPhotos([]);

      // Refresh reviews and photos after successful submit
      const refreshHeaders = {
        'Content-Type': 'application/json'
      };
      if (token) {
        refreshHeaders['Authorization'] = `Bearer ${token}`;
      }
      
      const refreshed = await fetch(`${API_BASE_URL}/courts/${courtId}/reviews`, {
        headers: refreshHeaders
      });
      const refreshedData = await refreshed.json();
      setReviews(refreshedData);
      
      // Refresh court photos as well since review photos contribute to the gallery
      await fetchPhotos();

      // Show success toast
      setToast({ show: true, message: 'Review submitted successfully!', type: 'success' });

      // Close modal after successful submission
      const modal = window.bootstrap?.Modal.getInstance(document.getElementById('addReviewModal'));
      if (modal) {
        modal.hide();
      } else {
        // Fallback for if Bootstrap JS isn't loaded
        document.getElementById('addReviewModal').style.display = 'none';
        document.body.classList.remove('modal-open');
        const backdrop = document.querySelector('.modal-backdrop');
        if (backdrop) backdrop.remove();
      }
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Save/unsave court functionality
  const handleSaveToggle = async () => {
    const token = getToken();
    if (!token) {
      setSaveMessage({ type: 'error', text: 'You must be logged in to save courts' });
      return;
    }

    setSavingCourt(true);
    setSaveMessage(null);

    try {
      if (isSaved) {
        const result = await removeSavedCourt(courtId);
        if (result.error) {
          setSaveMessage({ type: 'error', text: result.error });
          return;
        }
        setIsSaved(false);
        setToast({ show: true, message: 'Court removed from saved list!', type: 'success' });
      } else {
        const result = await saveCourtForUser(courtId);
        if (result.error) {
          setSaveMessage({ type: 'error', text: result.error });
          return;
        }
        setIsSaved(true);
        setToast({ show: true, message: 'Court saved to your profile!', type: 'success' });
      }
    } catch (error) {
      setSaveMessage({ type: 'error', text: 'Failed to update saved status. Please try again.' });
    } finally {
      setSavingCourt(false);
      // Auto-hide message after 3 seconds
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  // Helper function to render user avatar
  const renderUserAvatar = (review) => {
    if (!review.show_avatar || !review.avatar_colors) {
      // Anonymous avatar for users who chose not to show reviews publicly
      return (
        <div style={{
          width: '2.5rem',
          height: '2.5rem',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '1.2rem',
          fontWeight: 'bold',
          flexShrink: 0
        }}>
          👤
        </div>
      );
    }

    // Show custom avatar for users who allow reviews to be shown publicly or their own reviews
    return (
      <div style={{
        width: '2.5rem',
        height: '2.5rem',
        borderRadius: '50%',
        background: `linear-gradient(135deg, ${review.avatar_colors.start} 0%, ${review.avatar_colors.end} 100%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: '1rem',
        fontWeight: 'bold',
        flexShrink: 0,
        position: 'relative'
      }}>
        {review.username.charAt(0).toUpperCase()}
        {review.is_own_review && (
          <div style={{
            position: 'absolute',
            bottom: '-2px',
            right: '-2px',
            backgroundColor: '#10b981',
            borderRadius: '50%',
            width: '1rem',
            height: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.6rem',
            border: '2px solid white'
          }}>
            ✓
          </div>
        )}
      </div>
    );
  };

  // Helper function to render star rating
  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span
        key={i}
        style={{
          color: i < rating ? '#f59e0b' : '#e5e7eb',
          fontSize: '1.2rem'
        }}
      >
        ★
      </span>
    ));
  };

  // Review photo upload handlers
  const handleReviewPhotosSelected = (files) => {
    setReviewPhotos(files);
  };

  // Function to refresh photos (can be called externally)
  const fetchPhotos = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/courts/${courtId}/photos`);
      if (!res.ok) throw new Error('Failed to fetch photos');
      const data = await res.json();
      setPhotos(data);
    } catch (err) {
      console.error('Failed to fetch photos:', err);
    }
  };

  // Function to refresh reviews
  const fetchReviewsAgain = async () => {
    try {
      const token = getToken();
      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const res = await fetch(`${API_BASE_URL}/courts/${courtId}/reviews`, {
        headers
      });
      if (!res.ok) throw new Error('Failed to fetch reviews');
      const data = await res.json();
      setReviews(data);
    } catch (err) {
      console.error('Failed to fetch reviews:', err);
    }
  };

  // Edit review handlers
  const handleEditClick = (review) => {
    setEditingReview(review.id);
    setEditRating(review.rating);
    setEditComment(review.comment || '');
    setEditError(null);
    setEditPhotos([]);
  };

  const handleEditCancel = () => {
    setEditingReview(null);
    setEditRating(5);
    setEditComment('');
    setEditError(null);
    setEditPhotos([]);
  };

  const handleEditSubmit = async (reviewId) => {
    setEditSubmitting(true);
    setEditError(null);

    const token = getToken();
    if (!token) {
      setEditError('You must be logged in to edit reviews');
      setEditSubmitting(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/courts/${courtId}/reviews/${reviewId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ rating: editRating, comment: editComment }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update review');
      }

      const reviewData = await res.json();
      
      // If there are new photos to upload, upload them
      if (editPhotos.length > 0) {
        const formData = new FormData();
        editPhotos.forEach((file) => {
          formData.append('photos', file);
        });
        formData.append('reviewId', reviewData.id);

        const photoRes = await fetch(`${API_BASE_URL}/courts/${courtId}/reviews/${reviewData.id}/photos`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        if (!photoRes.ok) {
          console.warn('Failed to upload review photos, but review was updated');
        }
      }

      // Refresh reviews and photos, then close edit mode
      await Promise.all([fetchReviewsAgain(), fetchPhotos()]);
      handleEditCancel();
      setToast({ show: true, message: 'Review updated successfully!', type: 'success' });
    } catch (err) {
      setEditError(err.message);
    } finally {
      setEditSubmitting(false);
    }
  };

  // Delete review handler
  const handleDeleteReview = (reviewId) => {
    setConfirmModal({
      show: true,
      title: 'Delete Review',
      message: 'Are you sure you want to delete this review? This action cannot be undone.',
      confirmText: 'Delete Review',
      type: 'danger',
      onConfirm: () => performDeleteReview(reviewId)
    });
  };

  const performDeleteReview = async (reviewId) => {
    const token = getToken();
    if (!token) {
      setToast({ show: true, message: 'You must be logged in to delete reviews', type: 'error' });
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/courts/${courtId}/reviews/${reviewId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to delete review');
      }

      // Refresh reviews and photos
      await Promise.all([fetchReviewsAgain(), fetchPhotos()]);
      setToast({ show: true, message: 'Review deleted successfully!', type: 'success' });
    } catch (err) {
      setToast({ show: true, message: err.message, type: 'error' });
    }
  };

  // Delete individual photo from review
  const handleDeleteReviewPhoto = (reviewId, photoId) => {
    setConfirmModal({
      show: true,
      title: 'Remove Photo',
      message: 'Are you sure you want to remove this photo from your review?',
      confirmText: 'Remove Photo',
      type: 'danger',
      onConfirm: () => performDeleteReviewPhoto(reviewId, photoId)
    });
  };

  const performDeleteReviewPhoto = async (reviewId, photoId) => {
    const token = getToken();
    if (!token) {
      setToast({ show: true, message: 'You must be logged in to delete photos', type: 'error' });
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/courts/${courtId}/reviews/${reviewId}/photos/${photoId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to delete photo');
      }

      // Refresh reviews and photos
      await Promise.all([fetchReviewsAgain(), fetchPhotos()]);
      setToast({ show: true, message: 'Photo removed successfully!', type: 'success' });
    } catch (err) {
      setToast({ show: true, message: err.message, type: 'error' });
    }
  };


  if (loadingCourt) {
    return (
      <div className="court-details-container">
        <div className="court-details-content">
          <div className="court-details-loading">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading court details...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="court-details-container">
        <div className="court-details-content">
          <div className="court-details-error">
            Error: {error}
          </div>
        </div>
      </div>
    );
  }

  if (!court) {
    return (
      <div className="court-details-container">
        <div className="court-details-content">
          <div className="court-details-not-found">
            Court not found.
          </div>
        </div>
      </div>
    );
  }

  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)
    : '0.0';

  return (
    <div className="court-details-container">
      <div className="court-details-content">

        {/* Save Message */}
        {saveMessage && saveMessage.type === 'error' && (
          <div className="alert-error">
            {saveMessage.text}
          </div>
        )}

        {/* Court Header Section */}
        <div className="court-header-card">
          <div className="court-header-top">
            <div className="court-header-info">
              <h1 className="court-title">
                {court.name}
              </h1>
              {(() => {
                const missingFields = [
                  court.surface_type,
                  court.court_count,
                  court.lighting,
                  court.phone_number,
                  court.website_url,
                  court.opening_hours
                ].filter(field => field === null || field === undefined || field === '' || field === '?').length;
                
                const needsVerification = missingFields > 0 || court.verification_status === 'pending';
                
                return needsVerification && (
                  <div className="court-verification-status">
                    ⚠️ {missingFields > 0 ? `${missingFields} field${missingFields !== 1 ? 's' : ''} missing data` : 'Needs verification'}
                  </div>
                );
              })()}
            </div>
            <div className="court-header-actions">
              {/* Save Button */}
              {getToken() && (
                <button
                  onClick={handleSaveToggle}
                  disabled={savingCourt}
                  className={`court-save-button ${
                    isSaved ? 'court-save-button-saved' : 'court-save-button-unsaved'
                  }`}
                  onMouseEnter={(e) => {
                    if (!savingCourt) {
                      if (isSaved) {
                        e.target.style.backgroundColor = '#059669';
                        e.target.style.borderColor = '#059669';
                      } else {
                        e.target.style.backgroundColor = '#e5e7eb';
                        e.target.style.borderColor = '#9ca3af';
                      }
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!savingCourt) {
                      if (isSaved) {
                        e.target.style.backgroundColor = '#10b981';
                        e.target.style.borderColor = '#10b981';
                      } else {
                        e.target.style.backgroundColor = '#f3f4f6';
                        e.target.style.borderColor = '#d1d5db';
                      }
                    }
                  }}
                >
                  {savingCourt ? (
                    <div className="spinner-border spinner-border-sm court-details-spinner" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  ) : (
                    <>
                      {isSaved ? '🔖' : '🔖'}
                      <span className="d-none d-md-inline">
                        {isSaved ? 'Saved' : 'Save'}
                      </span>
                    </>
                  )}
                </button>
              )}
              
              {/* Rating Badge */}
              <div className={`court-rating-badge ${
                Number(averageRating) >= 4 ? 'court-rating-high' : 
                Number(averageRating) >= 3 ? 'court-rating-medium' : 'court-rating-low'
              }`}>
                {averageRating}
              </div>
            </div>
          </div>

          {court.address && (
            <div className="court-address">
              <span className="court-address-text">
                📍 {court.address}
              </span>
            </div>
          )}

          <div className="court-stats-grid">
            <div className="court-stats-card">
              <div className="court-stats-icon">🏆</div>
              <div className="court-stats-label">Sport Types</div>
              <div className="court-stats-value">
                {court.sport_types && court.sport_types.length > 0 
                  ? court.sport_types.join(', ') 
                  : 'Unknown'}
              </div>
            </div>

            <div className="court-stats-card">
              <div className="court-stats-icon">🏟️</div>
              <div className="court-stats-label">Surface Type</div>
              <div className="court-stats-value">{court.surface_type || 'Unknown'}</div>
            </div>

            <div className="court-stats-card">
              <div className="court-stats-icon">💡</div>
              <div className="court-stats-label">Lighting</div>
              <div className="court-stats-value">{court.lighting ? 'Available' : 'Not Available'}</div>
            </div>

            <div className="court-stats-card">
              <div className="court-stats-icon">🔢</div>
              <div className="court-stats-label">Number of Courts</div>
              <div className="court-stats-value">{court.court_count || 'N/A'}</div>
            </div>

            <div className="court-stats-card">
              <div className="court-stats-icon">⭐</div>
              <div className="court-stats-label">Reviews</div>
              <div className="court-stats-value">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</div>
            </div>
          </div>
        </div>

        {/* Verification Section */}
        <CourtVerification 
          courtId={courtId}
          court={court}
          onVerificationSubmitted={() => {
            // Refresh court data when verification is submitted
            setLoadingCourt(true);
            fetch(`${API_BASE_URL}/courts/${courtId}`)
              .then(res => res.json())
              .then(data => setCourt(data))
              .finally(() => setLoadingCourt(false));
          }}
          onShowToast={(toastData) => {
            setToast(toastData);
          }}
        />

        {/* Photos Section */}
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem', border: '1px solid #f0f0f0', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h2 style={{
              margin: 0,
              fontSize: '1.75rem',
              fontWeight: '600',
              color: '#1f2937'
            }}>
              📷 User Review Photos {photos.length > 0 && `(${photos.length})`}
            </h2>
          </div>

          {/* Photo Gallery */}
          {loadingPhotos ? (
            <div className="court-loading-section">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading photos...</span>
              </div>
            </div>
          ) : (
            <PhotoGallery
              courtId={courtId}
              photos={photos}
              onPhotosUpdate={fetchPhotos}
            />
          )}
          </div>
        </div>

        {/* Reviews Section */}
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem', border: '1px solid #f0f0f0', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <div className="court-section-info">
              <h2 style={{
                margin: 0,
                fontSize: '1.75rem',
                fontWeight: '600',
                color: '#1f2937'
              }}>
                Reviews ({reviews.length})
              </h2>
              {reviews.length > 0 && (
                <div className="court-rating-display">
                  {renderStars(Math.round(averageRating))}
                  <span className="court-rating-text">
                    {averageRating}
                  </span>
                </div>
              )}
            </div>

            {/* Add Review Button */}
            <button
              type="button"
              className="court-add-review-button"
              data-bs-toggle="modal"
              data-bs-target="#addReviewModal"
            >
              ✏️
              <span className="d-none d-md-inline"> Write Review</span>
            </button>

          </div>


          {loadingReviews ? (
            <div className="court-loading-section">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading reviews...</span>
              </div>
            </div>
          ) : reviews.length === 0 ? (
            <div className="court-empty-state">
              <div className="court-empty-icon">💬</div>
              <p className="court-empty-text">No reviews yet. Be the first to share your experience!</p>
            </div>
          ) : (
            <div className="court-reviews-grid">
              {reviews.map((review) => (
                <div
                  key={review.id}
                  className="court-review"
                >
                  <div className="court-review-header-flex">
                    <div className="court-review-user-flex">
                      {/* User Avatar */}
                      {renderUserAvatar(review)}
                      
                      <div>
                        <div style={{ fontWeight: '600', color: '#1f2937', marginBottom: '0.25rem', fontSize: '1.1rem' }}>
                          {review.show_avatar ? review.username : 'Anonymous'}
                        </div>
                        <div className="court-rating-display">
                          {renderStars(review.rating)}
                          <span style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                            {new Date(review.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <div style={{
                        backgroundColor: review.rating >= 4 ? '#dcfce7' : review.rating >= 3 ? '#fef3c7' : '#fee2e2',
                        color: review.rating >= 4 ? '#166534' : review.rating >= 3 ? '#92400e' : '#dc2626',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '20px',
                        fontSize: '0.9rem',
                        fontWeight: '600'
                      }}>
                        {review.rating}/5
                      </div>
                      
                      {/* Edit/Delete buttons for own reviews */}
                      {review.is_own_review && (
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          <button
                            onClick={() => handleEditClick(review)}
                            style={{
                              background: 'rgba(59, 130, 246, 0.1)',
                              color: '#3b82f6',
                              border: '1px solid rgba(59, 130, 246, 0.3)',
                              borderRadius: '6px',
                              padding: '0.25rem 0.5rem',
                              fontSize: '0.75rem',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.background = 'rgba(59, 130, 246, 0.2)';
                              e.target.style.borderColor = '#3b82f6';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.background = 'rgba(59, 130, 246, 0.1)';
                              e.target.style.borderColor = 'rgba(59, 130, 246, 0.3)';
                            }}
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDeleteReview(review.id)}
                            style={{
                              background: 'rgba(239, 68, 68, 0.1)',
                              color: '#ef4444',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              borderRadius: '6px',
                              padding: '0.25rem 0.5rem',
                              fontSize: '0.75rem',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.background = 'rgba(239, 68, 68, 0.2)';
                              e.target.style.borderColor = '#ef4444';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.background = 'rgba(239, 68, 68, 0.1)';
                              e.target.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                            }}
                          >
                            🗑️
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Edit form or display comment */}
                  {editingReview === review.id ? (
                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ marginBottom: '1rem' }}>
                        <label style={{
                          display: 'block',
                          marginBottom: '0.5rem',
                          fontWeight: '600',
                          color: '#1f2937',
                          fontSize: '0.9rem'
                        }}>
                          Rating
                        </label>
                        <select
                          value={editRating}
                          onChange={(e) => setEditRating(Number(e.target.value))}
                          style={{
                            width: '100%',
                            padding: '0.5rem',
                            fontSize: '0.9rem',
                            borderRadius: '6px',
                            border: '2px solid #e8eaed',
                            outline: 'none',
                            backgroundColor: 'white'
                          }}
                        >
                          {[5, 4, 3, 2, 1].map((n) => (
                            <option key={n} value={n}>
                              {n} Star{n !== 1 ? 's' : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div style={{ marginBottom: '1rem' }}>
                        <label style={{
                          display: 'block',
                          marginBottom: '0.5rem',
                          fontWeight: '600',
                          color: '#1f2937',
                          fontSize: '0.9rem'
                        }}>
                          Comment
                        </label>
                        <textarea
                          value={editComment}
                          onChange={(e) => setEditComment(e.target.value)}
                          rows="3"
                          placeholder="Share your experience with this court..."
                          style={{
                            width: '100%',
                            padding: '0.5rem',
                            fontSize: '0.9rem',
                            borderRadius: '6px',
                            border: '2px solid #e8eaed',
                            outline: 'none',
                            backgroundColor: 'white',
                            resize: 'vertical',
                            fontFamily: 'inherit'
                          }}
                        />
                      </div>
                      
                      {/* Photo upload for edit mode */}
                      <div style={{ marginBottom: '1rem' }}>
                        <label style={{
                          display: 'block',
                          marginBottom: '0.5rem',
                          fontWeight: '600',
                          color: '#1f2937',
                          fontSize: '0.9rem'
                        }}>
                          Add New Photos (optional)
                        </label>
                        <ReviewPhotoUpload
                          onPhotosSelected={setEditPhotos}
                          maxPhotos={3}
                        />
                        {editPhotos.length > 0 && (
                          <div style={{
                            marginTop: '0.5rem',
                            fontSize: '0.8rem',
                            color: '#6b7280'
                          }}>
                            {editPhotos.length} new photo{editPhotos.length !== 1 ? 's' : ''} selected for upload
                          </div>
                        )}
                      </div>
                      
                      {editError && (
                        <div style={{
                          backgroundColor: '#fee2e2',
                          color: '#dc2626',
                          padding: '0.5rem',
                          borderRadius: '6px',
                          marginBottom: '1rem',
                          fontSize: '0.8rem'
                        }}>
                          {editError}
                        </div>
                      )}
                      
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => handleEditSubmit(review.id)}
                          disabled={editSubmitting}
                          style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: editSubmitting ? '#9ca3af' : '#10b981',
                            color: 'white',
                            borderRadius: '6px',
                            border: 'none',
                            fontSize: '0.8rem',
                            fontWeight: '600',
                            cursor: editSubmitting ? 'not-allowed' : 'pointer',
                            transition: 'background-color 0.2s ease'
                          }}
                        >
                          {editSubmitting ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={handleEditCancel}
                          disabled={editSubmitting}
                          style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: '#6b7280',
                            color: 'white',
                            borderRadius: '6px',
                            border: 'none',
                            fontSize: '0.8rem',
                            fontWeight: '500',
                            cursor: editSubmitting ? 'not-allowed' : 'pointer',
                            transition: 'background-color 0.2s ease'
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    review.comment && (
                      <p style={{
                        color: '#4b5563',
                        margin: 0,
                        lineHeight: '1.6',
                        fontSize: '1rem',
                        marginBottom: review.photos && review.photos.length > 0 ? '1rem' : 0
                      }}>
                        {review.comment}
                      </p>
                    )
                  )}
                  
                  {/* Review Photos */}
                  {review.photos && review.photos.length > 0 && (
                    <div style={{
                      display: 'flex',
                      gap: '0.5rem',
                      marginTop: '1rem',
                      flexWrap: 'wrap'
                    }}>
                      {review.photos.map((photo, photoIndex) => (
                        <div
                          key={photoIndex}
                          style={{
                            position: 'relative',
                            width: '80px',
                            height: '80px',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            cursor: 'pointer',
                            border: '2px solid #e5e7eb',
                            transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                          }}
                          onClick={() => {
                            // Find this photo in the main photos array to open lightbox
                            const allPhotos = photos || [];
                            const photoIndex = allPhotos.findIndex(p => 
                              p.photo_url === photo.photo_url
                            );
                            if (photoIndex !== -1) {
                              // Open the main photo gallery at this photo
                              window.dispatchEvent(new CustomEvent('openPhotoGallery', {
                                detail: { index: photoIndex }
                              }));
                            }
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'scale(1.05)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'scale(1)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          <img
                              src={photo.thumbnail_url.startsWith('http') ? photo.thumbnail_url :
                                `http://localhost:5001${photo.thumbnail_url}`}
                            alt={`Review photo ${photoIndex + 1}`}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover'
                            }}
                          />
                          
                          {/* Delete button for own review photos - only show when editing */}
                          {review.is_own_review && editingReview === review.id && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteReviewPhoto(review.id, photo.id);
                              }}
                              style={{
                                position: 'absolute',
                                top: '2px',
                                right: '2px',
                                background: 'rgba(239, 68, 68, 0.9)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '50%',
                                fontSize: '0.7rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'background-color 0.2s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.target.style.background = 'rgba(239, 68, 68, 1)';
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.background = 'rgba(239, 68, 68, 0.9)';
                              }}
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          </div>
        </div>

        {/* Add Review Modal */}
        <div className="modal fade" id="addReviewModal" tabIndex="-1" aria-labelledby="addReviewModalLabel" aria-hidden="true">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content review-modal-content">
              <div className="modal-header review-modal-header">
                <h1 className="modal-title review-modal-title" id="addReviewModalLabel">
                  Add Your Review
                </h1>
                <button
                  type="button"
                  className="btn-close"
                  data-bs-dismiss="modal"
                  aria-label="Close"
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '1.5rem',
                    cursor: 'pointer',
                    padding: '0.5rem',
                    opacity: '0.7'
                  }}
                ></button>
              </div>

              <div className="modal-body" style={{ padding: '1rem 2rem 2rem 2rem' }}>
                {/* Privacy Reminder */}
                {user && user.privacy_settings && user.privacy_settings.showReviews === false && (
                  <div style={{
                    backgroundColor: '#fef3c7',
                    border: '1px solid #f59e0b',
                    borderRadius: '8px',
                    padding: '1rem',
                    marginBottom: '1.5rem',
                    fontSize: '0.9rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <span className="review-modal-privacy-icon">🔒</span>
                      <div>
                        <div className="review-modal-privacy-heading">
                          Posting Anonymously
                        </div>
                        <div className="review-modal-privacy-text">
                          Your review will be posted anonymously because you have disabled public reviews in your privacy settings. 
                          <span className="review-modal-privacy-note">
                            To show your name and avatar, update your privacy settings in your <strong>Profile → Account Settings</strong>.
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <form onSubmit={handleSubmit}>
                  <div className="modal-form-group">
                    <label className="modal-form-label">
                      Rating
                    </label>
                    <select
                      value={rating}
                      onChange={(e) => setRating(Number(e.target.value))}
                      className="modal-form-control"
                    >
                      {[5, 4, 3, 2, 1].map((n) => (
                        <option key={n} value={n}>
                          {n} Star{n !== 1 ? 's' : ''} {n === 5 ? '- Excellent' : n === 4 ? '- Good' : n === 3 ? '- Average' : n === 2 ? '- Poor' : '- Terrible'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="modal-form-group">
                    <label className="modal-form-label">
                      Comment
                    </label>
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      rows="4"
                      placeholder="Share your experience with this court..."
                      className="modal-form-control textarea review-modal-textarea"
                    />
                  </div>

                  {/* Review Photo Upload */}
                  <div className="modal-form-group">
                    <label className="modal-form-label">
                      Photos (optional)
                    </label>
                    <ReviewPhotoUpload
                      onPhotosSelected={handleReviewPhotosSelected}
                      maxPhotos={3}
                    />
                  </div>

                  {submitError && (
                    <div style={{
                      backgroundColor: '#fee2e2',
                      color: '#dc2626',
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      marginBottom: '1rem',
                      fontSize: '0.9rem'
                    }}>
                      {submitError}
                    </div>
                  )}

                  <div className="modal-footer" style={{
                    border: 'none',
                    padding: '1rem 0 0 0'
                  }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      data-bs-dismiss="modal"
                      style={{
                        padding: '0.75rem 1.5rem',
                        backgroundColor: '#6b7280',
                        color: 'white',
                        borderRadius: '8px',
                        border: 'none',
                        fontSize: '0.9rem',
                        fontWeight: '500',
                        cursor: 'pointer',
                        transition: 'background-color 0.3s ease'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#4b5563'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = '#6b7280'}
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      className={`review-modal-submit-button ${
                        submitting ? 'review-modal-submit-button-loading' : 'review-modal-submit-button-active'
                      }`}
                      disabled={submitting}
                    >
                      {submitting ? (
                        <>
                          <div className="spinner-border spinner-border-sm review-modal-spinner" role="status">
                            <span className="visually-hidden">Loading...</span>
                          </div>
                          Submitting...
                        </>
                      ) : (
                        <>
                          📝 Submit Review
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>

        {/* Modal close handler to reset form */}
        <div
          className="d-none"
          ref={(el) => {
            if (el) {
              const modal = document.getElementById('addReviewModal');
              if (modal) {
                modal.addEventListener('hidden.bs.modal', () => {
                  if (!submitting) {
                    setSubmitError(null);
                    setReviewPhotos([]);
                    // Don't reset form values to preserve user input
                  }
                });
              }
            }
          }}
        />

      <Toast
        show={toast.show}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast({ ...toast, show: false })}
      />
      
      {/* Confirmation Modal */}
      <ConfirmationModal
        show={confirmModal.show}
        onHide={() => setConfirmModal({ ...confirmModal, show: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        type={confirmModal.type}
      />
      </div>
    </div>
  );
}