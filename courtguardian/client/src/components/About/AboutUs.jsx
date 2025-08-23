import React from 'react';
import { Link } from 'react-router-dom';

export default function AboutUs() {
  return (
    <div className="rounded page-container">
      <div className="container-main">
        <div className="card-default">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <Link
              to="/"
              className="link-back"
            >
              ← Back to Home
            </Link>
          </div>

          <h1 className="text-primary-heading">About Rate Your Court</h1>

          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem', color: '#1f2937' }}>
                My Mission
              </h2>
              <p style={{ color: '#6b7280', lineHeight: '1.6', marginBottom: '1rem' }}>
                Hi, I’m Joseph, and I started Rate Your Court because I wanted to make it easier for athletes and sports lovers like you to 
                find the best "courts" to play. Whether it’s your next favorite tennis court, a great pickleball spot, 
                a hidden basketball gem, or any other sports facility, my goal is to connect you with the courts that 
                make your game better. I’d love for you to share your experiences, discover new spots, and be part of a 
                community that loves to play as much as I do.
              </p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem', color: '#1f2937' }}>
                What We Offer
              </h2>
              <div style={{ display: 'grid', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.5rem', color: '#1f2937' }}>
                    🗺️ Court Discovery
                  </h3>
                  <p style={{ color: '#6b7280', margin: 0 }}>
                    Find courts for tennis, pickleball, volleyball, basketball, badminton, and padel in your area using our advanced search and location-based discovery.
                  </p>
                </div>

                <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.5rem', color: '#1f2937' }}>
                    ⭐ Community Reviews
                  </h3>
                  <p style={{ color: '#6b7280', margin: 0 }}>
                    Read honest reviews from fellow players and share your own experiences to help build a trusted community resource.
                  </p>
                </div>

                <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.5rem', color: '#1f2937' }}>
                    📱 Progressive Web App
                  </h3>
                  <p style={{ color: '#6b7280', margin: 0 }}>
                    Install our app on your mobile device or desktop for quick access to court information wherever you go.
                  </p>
                </div>

                <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.5rem', color: '#1f2937' }}>
                    ✅ Data Verification
                  </h3>
                  <p style={{ color: '#6b7280', margin: 0 }}>
                    Help us maintain accurate court information through our community-driven verification system.
                  </p>
                </div>
              </div>
            </section>

            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem', color: '#1f2937' }}>
                How It Works
              </h2>
              <ol style={{ color: '#6b7280', lineHeight: '1.6', paddingLeft: '1.5rem' }}>
                <li style={{ marginBottom: '0.5rem' }}>
                  <strong>Search:</strong> Use our smart search to find courts by location, sport type, or specific features
                </li>
                <li style={{ marginBottom: '0.5rem' }}>
                  <strong>Discover:</strong> Browse detailed court information including photos, ratings, and amenities
                </li>
                <li style={{ marginBottom: '0.5rem' }}>
                  <strong>Review:</strong> Share your experience and help other players make informed decisions
                </li>
                <li style={{ marginBottom: '0.5rem' }}>
                  <strong>Connect:</strong> Build a community of sports enthusiasts in your area
                </li>
              </ol>
            </section>

            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem', color: '#1f2937' }}>
                Supported Sports
              </h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                {[
                  { sport: 'Tennis', emoji: '🎾' },
                  { sport: 'Pickleball', emoji: '🥒' },
                  { sport: 'Basketball', emoji: '🏀' },
                  { sport: 'Volleyball', emoji: '🏐' },
                  { sport: 'Badminton', emoji: '🏸' },
                  { sport: 'Padel', emoji: '🎯' }
                ].map(({ sport, emoji }) => (
                  <span key={sport} style={{
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    padding: '0.5rem 1rem',
                    borderRadius: '20px',
                    fontSize: '0.875rem',
                    fontWeight: '500'
                  }}>
                    {emoji} {sport}
                  </span>
                ))}
              </div>
            </section>

            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem', color: '#1f2937' }}>
                Get Started
              </h2>
              <p style={{ color: '#6b7280', lineHeight: '1.6', marginBottom: '1rem' }}>
                Ready to find your perfect court? Start by searching for courts in your area, or
                <a href="/login" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: '500' }}> create an account </a>
                to unlock additional features like saving favorite courts and leaving reviews.
              </p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem', color: '#1f2937' }}>
                Contact Me
              </h2>
              <p style={{ color: '#6b7280', lineHeight: '1.6', marginBottom: '1rem' }}>
                Have any questions, suggestions, or feedback? I’d love to hear from you!
                Reach out via <a href="https://instagram.com/jdoseph" target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: '500' }}> jdoseph </a>
                on Instagram or email me <a href="mailto:jdoseph02@gmail.com" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: '500' }}>here</a>.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}