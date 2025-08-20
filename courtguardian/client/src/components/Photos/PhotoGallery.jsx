import React, { useState, useEffect, useCallback } from 'react';
import ImageGallery from 'react-image-gallery';
import 'react-image-gallery/styles/css/image-gallery.css';

export default function PhotoGallery({ courtId, photos, showUpload = false, onPhotosUpdate }) {
  const [galleryImages, setGalleryImages] = useState([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showLightbox, setShowLightbox] = useState(false);
  const [showAllPhotos, setShowAllPhotos] = useState(false);

  // Convert photos to gallery format
  useEffect(() => {
    if (photos && photos.length > 0) {
      const images = photos.map(photo => ({
        original: `http://localhost:5001${photo.photo_url}`,
        thumbnail: `http://localhost:5001${photo.thumbnail_url}`,
        description: '',
        originalAlt: `Court photo ${photo.id}`,
        thumbnailAlt: `Court photo thumbnail ${photo.id}`,
        photoId: photo.id,
        isPrimary: photo.is_primary,
        uploadedBy: photo.username || 'Anonymous',
        uploadDate: new Date(photo.created_at).toLocaleDateString()
      }));
      setGalleryImages(images);
    } else {
      setGalleryImages([]);
    }
  }, [photos]);

  const openLightbox = (index) => {
    setSelectedImageIndex(index);
    setShowLightbox(true);
  };

  const closeLightbox = useCallback(() => {
    setShowLightbox(false);
  }, []);

  // Keyboard navigation for fullscreen lightbox
  const handleKeyPress = useCallback((event) => {
    if (!showLightbox) return;
    
    switch (event.key) {
      case 'Escape':
        closeLightbox();
        break;
      case 'ArrowLeft':
        if (selectedImageIndex > 0) {
          setSelectedImageIndex(selectedImageIndex - 1);
        }
        break;
      case 'ArrowRight':
        if (selectedImageIndex < galleryImages.length - 1) {
          setSelectedImageIndex(selectedImageIndex + 1);
        }
        break;
      default:
        break;
    }
  }, [showLightbox, selectedImageIndex, galleryImages.length, closeLightbox]);

  // Add keyboard event listeners when lightbox is open
  useEffect(() => {
    if (showLightbox) {
      document.addEventListener('keydown', handleKeyPress);
      document.body.style.overflow = 'hidden'; // Prevent scrolling when lightbox is open
      return () => {
        document.removeEventListener('keydown', handleKeyPress);
        document.body.style.overflow = 'unset';
      };
    }
  }, [showLightbox, handleKeyPress]);

  // Listen for custom event to open photo gallery from reviews
  useEffect(() => {
    const handleOpenGallery = (event) => {
      const { index } = event.detail;
      openLightbox(index);
    };

    window.addEventListener('openPhotoGallery', handleOpenGallery);
    return () => {
      window.removeEventListener('openPhotoGallery', handleOpenGallery);
    };
  }, []);


  if (!photos || photos.length === 0) {
    return (
      <div className="photo-gallery-empty">
        <div className="photo-gallery-empty-content">
          <span className="photo-gallery-empty-icon">📷</span>
          <h4>No Photos Yet</h4>
          <p>Be the first to share photos of this court!</p>
        </div>
      </div>
    );
  }

  // Determine how many photos to show in compact view
  const maxPhotosToShow = 4;
  const photosToDisplay = showAllPhotos ? galleryImages : galleryImages.slice(0, maxPhotosToShow);
  const remainingPhotos = Math.max(0, galleryImages.length - maxPhotosToShow);

  return (
    <div className="photo-gallery-container">
      {/* Compact Photo Grid (Google Reviews style) */}
      <div className="photo-gallery-compact">
        {photosToDisplay.map((image, index) => (
          <div 
            key={image.photoId} 
            className="photo-compact-item"
            onClick={() => openLightbox(index)}
          >
            <img
              src={image.thumbnail}
              alt={image.thumbnailAlt}
              className="photo-compact-image"
            />
            {image.isPrimary && (
              <div className="photo-primary-badge-compact">
                📌
              </div>
            )}
          </div>
        ))}
        
        {/* Show More Button */}
        {!showAllPhotos && remainingPhotos > 0 && (
          <div 
            className="photo-show-more-button"
            onClick={() => setShowAllPhotos(true)}
          >
            <div className="photo-show-more-content">
              <span className="photo-show-more-plus">+{remainingPhotos}</span>
              <span className="photo-show-more-text">more</span>
            </div>
          </div>
        )}
      </div>

      {/* Show All Toggle */}
      {galleryImages.length > maxPhotosToShow && showAllPhotos && (
        <div className="photo-gallery-controls">
          <button 
            className="photo-show-less-button"
            onClick={() => setShowAllPhotos(false)}
          >
            Show less
          </button>
        </div>
      )}

      {/* Photo Count */}
      <div className="photo-gallery-count">
        {photos.length} photo{photos.length !== 1 ? 's' : ''}
      </div>

      {/* Fullscreen Lightbox */}
      {showLightbox && (
        <div className="photo-lightbox-overlay" onClick={closeLightbox}>
          <div className="photo-lightbox-content" onClick={(e) => e.stopPropagation()}>
            {/* Top controls bar */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              zIndex: 1000,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1rem',
              background: 'linear-gradient(180deg, rgba(0,0,0,0.8) 0%, transparent 100%)'
            }}>
              <button 
                style={{
                  background: 'rgba(239, 68, 68, 0.9)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  alert('Report functionality coming soon. For now, please contact support about inappropriate content.');
                }}
              >
                🚨 Report
              </button>

              {/* Photo counter */}
              <div style={{
                background: 'rgba(0, 0, 0, 0.7)',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '20px',
                fontSize: '0.9rem',
                fontWeight: '500'
              }}>
                {selectedImageIndex + 1} of {galleryImages.length}
              </div>

              <button 
                className="photo-lightbox-close"
                onClick={closeLightbox}
                style={{
                  background: 'rgba(0, 0, 0, 0.7)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '40px',
                  height: '40px',
                  fontSize: '1.2rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background-color 0.2s ease'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(0, 0, 0, 0.9)'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(0, 0, 0, 0.7)'}
              >
                ✕
              </button>
            </div>

            {/* Main gallery container - takes up most of the screen */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
              <ImageGallery
                items={galleryImages}
                startIndex={selectedImageIndex}
                showThumbnails={false}
                showPlayButton={false}
                showBullets={false}
                showNav={false}
                autoPlay={false}
                slideOnThumbnailOver={false}
                additionalClass="custom-image-gallery"
                onSlide={(currentIndex) => {
                  setSelectedImageIndex(currentIndex);
                }}
              />
              
              {/* Custom navigation arrows - always visible when multiple photos */}
              {galleryImages.length > 1 && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (selectedImageIndex > 0) {
                        setSelectedImageIndex(selectedImageIndex - 1);
                      }
                    }}
                    onMouseEnter={(e) => {
                      if (selectedImageIndex > 0) {
                        e.target.style.background = 'rgba(0, 0, 0, 0.8)';
                        e.target.style.borderColor = '#4285f4';
                        e.target.style.color = '#4285f4';
                        e.target.style.transform = 'translateY(-50%) scale(1.1)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = selectedImageIndex === 0 ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.5)';
                      e.target.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                      e.target.style.color = 'white';
                      e.target.style.transform = 'translateY(-50%)';
                    }}
                    disabled={selectedImageIndex === 0}
                    style={{
                      position: 'absolute',
                      left: '2rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: selectedImageIndex === 0 ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.5)',
                      color: 'white',
                      border: '2px solid rgba(255, 255, 255, 0.3)',
                      borderRadius: '50%',
                      width: '50px',
                      height: '50px',
                      fontSize: '1.5rem',
                      cursor: selectedImageIndex === 0 ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 1000,
                      transition: 'all 0.3s ease',
                      opacity: selectedImageIndex === 0 ? 0.5 : 1
                    }}
                  >
                    ‹
                  </button>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (selectedImageIndex < galleryImages.length - 1) {
                        setSelectedImageIndex(selectedImageIndex + 1);
                      }
                    }}
                    onMouseEnter={(e) => {
                      if (selectedImageIndex < galleryImages.length - 1) {
                        e.target.style.background = 'rgba(0, 0, 0, 0.8)';
                        e.target.style.borderColor = '#4285f4';
                        e.target.style.color = '#4285f4';
                        e.target.style.transform = 'translateY(-50%) scale(1.1)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      const isLastImage = selectedImageIndex === galleryImages.length - 1;
                      e.target.style.background = isLastImage ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.5)';
                      e.target.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                      e.target.style.color = 'white';
                      e.target.style.transform = 'translateY(-50%)';
                    }}
                    disabled={selectedImageIndex === galleryImages.length - 1}
                    style={{
                      position: 'absolute',
                      right: '2rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: selectedImageIndex === galleryImages.length - 1 ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.5)',
                      color: 'white',
                      border: '2px solid rgba(255, 255, 255, 0.3)',
                      borderRadius: '50%',
                      width: '50px',
                      height: '50px',
                      fontSize: '1.5rem',
                      cursor: selectedImageIndex === galleryImages.length - 1 ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 1000,
                      transition: 'all 0.3s ease',
                      opacity: selectedImageIndex === galleryImages.length - 1 ? 0.5 : 1
                    }}
                  >
                    ›
                  </button>
                </>
              )}
            </div>
            
            {/* Info section at bottom */}
            <div style={{
              backgroundColor: '#1f2937',
              borderTop: '1px solid #374151',
              padding: '1rem',
              display: 'flex',
              gap: '0.75rem',
              flexWrap: 'wrap',
              justifyContent: 'center',
              alignItems: 'center',
              position: 'relative',
              zIndex: 1000
            }}>
              {/* Date badge - always show */}
              <span style={{
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                color: 'white',
                padding: '0.4rem 0.8rem',
                borderRadius: '20px',
                fontSize: '0.875rem',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}>
                📅 {galleryImages[selectedImageIndex]?.uploadDate}
              </span>
              
              {/* Uploaded by badge - only show if not Anonymous */}
              {galleryImages[selectedImageIndex]?.uploadedBy && 
               galleryImages[selectedImageIndex]?.uploadedBy !== 'Anonymous' && (
                <span style={{
                  backgroundColor: 'rgba(59, 130, 246, 0.9)',
                  color: 'white',
                  padding: '0.4rem 0.8rem',
                  borderRadius: '20px',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}>
                  📷 {galleryImages[selectedImageIndex].uploadedBy}
                </span>
              )}
              
              {/* Primary photo badge */}
              {galleryImages[selectedImageIndex]?.isPrimary && (
                <span style={{
                  backgroundColor: 'rgba(16, 185, 129, 0.9)',
                  color: 'white',
                  padding: '0.4rem 0.8rem',
                  borderRadius: '20px',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}>
                  📌 Primary
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}