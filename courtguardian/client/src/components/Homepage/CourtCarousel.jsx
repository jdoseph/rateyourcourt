import React from 'react';
import CourtCard from '../Court/CourtCard';

function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

export default function CourtCarousel({ courts, title, showRating = true, showReviews = false, carouselId }) {
  const courtChunks = chunkArray(courts, 3);

  return (
    <section className="mb-3">
      <div className="section-header">
        <h2 className="section-title">{title}</h2>
      </div>
      
      <div 
        id={carouselId}
        className="carousel slide carousel-container"
        data-bs-ride="carousel"
        data-bs-interval="10000"
      >
        <div className="carousel-inner">
          {courtChunks.map((chunk, index) => (
            <div key={index} className={`carousel-item ${index === 0 ? 'active' : ''}`}>
              <div className="row">
                {chunk.map((court) => (
                  <div key={court.id} className="col-md-4">
                    <CourtCard court={court} showRating={showRating} showReviews={showReviews} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        
        {courtChunks.length > 1 && (
          <>
            <button 
              className="carousel-control-prev carousel-button carousel-button-prev"
              type="button" 
              data-bs-target={`#${carouselId}`}
              data-bs-slide="prev"
            >
              <span className="carousel-arrow carousel-arrow-prev">‹</span>
              <span className="visually-hidden">Previous</span>
            </button>
            <button 
              className="carousel-control-next carousel-button carousel-button-next"
              type="button" 
              data-bs-target={`#${carouselId}`}
              data-bs-slide="next"
            >
              <span className="carousel-arrow carousel-arrow-next">›</span>
              <span className="visually-hidden">Next</span>
            </button>
          </>
        )}
      </div>
    </section>
  );
}