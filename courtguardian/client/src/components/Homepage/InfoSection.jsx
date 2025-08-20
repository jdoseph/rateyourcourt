import React from 'react';

export default function InfoSection() {
  return (
    <section className="section-card">
      <div className="info-section">
        <div>
          <div className="info-item-icon info-icon-blue">
            ⭐
          </div>
          <h3 className="info-item-title">
            Rate Courts You Play
          </h3>
          <p className="info-item-description">
            Share your honest reviews to help others find great courts in your area.
          </p>
        </div>
        
        <div>
          <div className="info-item-icon info-icon-green">
            🔒
          </div>
          <h3 className="info-item-title">
            Anonymous & Trusted
          </h3>
          <p className="info-item-description">
            Your privacy is protected while providing genuine feedback to the community.
          </p>
        </div>
        
        <div>
          <div className="info-item-icon info-icon-red">
            🗺️
          </div>
          <h3 className="info-item-title">
            Discover New Courts
          </h3>
          <p className="info-item-description">
            Find the best courts near you or when traveling to new places.
          </p>
        </div>
      </div>
    </section>
  );
}