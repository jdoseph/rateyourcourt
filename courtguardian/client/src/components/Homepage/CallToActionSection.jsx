import React from 'react';
import { Link } from 'react-router-dom';

export default function CallToActionSection() {
  return (
    <section className="section-card cta-section">
      <h2 className="cta-title">
        Join the Community!
      </h2>
      <p className="cta-description">
        Help others find amazing courts and discover your next favorite place to play.
      </p>
      <Link to="/about" className="cta-button">
        Learn More About Us
      </Link>
    </section>
  );
}