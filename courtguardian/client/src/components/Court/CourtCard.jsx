import React from 'react';
import { Link } from 'react-router-dom';

export default function CourtCard({ court, showRating = true, showReviews = false }) {
  const getRatingClass = (rating) => {
    const numRating = Number(rating);
    if (numRating >= 4) return 'rating-badge-high';
    if (numRating >= 3) return 'rating-badge-medium';
    return 'rating-badge-low';
  };


  return (
    <Link to={`/courts/${court.id}`} className="court-card">
      <div className="court-card-header">
        <h3 className="court-card-title">
          {court.name}
        </h3>
        {showRating && (
          <div className={`rating-badge ${getRatingClass(court.average_rating)}`}>
            {(Number(court.average_rating) || 0).toFixed(1)}
          </div>
        )}
        {showReviews && (
          <div className="review-badge">
            {court.review_count || 0}
          </div>
        )}
      </div>
      
      <div className="court-card-sport">
        <span>{court.sport_types || 'Sports Court'}</span>
      </div>
      
      <div className="court-card-footer">
        {showReviews ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="star-rating">
                ★ {(Number(court.average_rating) || 0).toFixed(1)}
              </span>
            </div>
            <span className="court-card-info">
              {court.location || court.address || 'Location TBD'}
            </span>
          </>
        ) : (
          <>
            <span className="court-card-info">
              {court.court_count || 1} court{(court.court_count || 1) !== 1 ? 's' : ''} • {court.surface_type || 'Unknown surface'}
            </span>
            <span className="court-card-info">
              {court.address || 'Address not available'}
            </span>
          </>
        )}
      </div>
    </Link>
  );
}